# 해외판 Threads(@sajulab.jp / @sajulab.en) 자동 게시·답글 작업을 이 컴퓨터의 작업 스케줄러에 등록한다(2026-10-26).
# 두 컴퓨터를 번갈아 쓰는 운영(평일 노트북, 금요일 저녁~주말 데스크톱)이라 작업 정의를 저장소에 둔다.
#
# - 토큰 파일(credentials\threads_token_ja.json / threads_token_en.json)이 이 컴퓨터에 있는 시장만 등록한다. 없으면 건너뛰고 안내만 한다.
# - 이미 등록된 작업은 건드리지 않는다(데스크톱에서 따로 조정한 시각을 덮어쓰지 않으려고). 다시 등록하려면 -Force.
# - 게시는 코드가 스스로 시간대(ja 18~24시, en 9~15시)·20시간 간격·git 락을 확인하므로 시각이 조금 달라도 중복·엉뚱한 시간 게시가 없다.
# 실행: powershell -ExecutionPolicy Bypass -File scripts\setup_global_threads_tasks.ps1
param([switch]$Force)
$repo = Split-Path -Parent $PSScriptRoot
$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { $py = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" }

# 이름, 시장, 스크립트, 인자, 시각들, 설명 (시각은 데스크톱 운영 기록 기준: 답글 ja 09:00·22:30, en 12:30·15:30)
$defs = @(
  @{ Name = "SajuThreadsGlobalJA";        Market = "ja"; Script = "run_global_threads.py";     Args = "--market ja";      Times = @("21:30");         Desc = "해외판 Threads 일본어 하루 1개 게시" },
  @{ Name = "SajuThreadsGlobalEN";        Market = "en"; Script = "run_global_threads.py";     Args = "--market en";      Times = @("10:30");         Desc = "해외판 Threads 영어 하루 1개 게시" },
  @{ Name = "SajuThreadsGlobalJAReplies"; Market = "ja"; Script = "global_threads_replies.py"; Args = "--market ja auto"; Times = @("09:00", "22:30"); Desc = "해외판 Threads 일본어 답글 풀이" },
  @{ Name = "SajuThreadsGlobalENReplies"; Market = "en"; Script = "global_threads_replies.py"; Args = "--market en auto"; Times = @("12:30", "15:30"); Desc = "해외판 Threads 영어 답글 풀이" }
)

foreach ($d in $defs) {
  $token = Join-Path $repo ("credentials\threads_token_" + $d.Market + ".json")
  if (-not (Test-Path $token)) {
    Write-Host ("건너뜀 {0}: credentials\threads_token_{1}.json 이 이 컴퓨터에 없습니다(다른 컴퓨터에서 복사하거나 threads_api.py --market {1} --import-token)." -f $d.Name, $d.Market)
    continue
  }
  if ((Get-ScheduledTask -TaskName $d.Name -ErrorAction SilentlyContinue) -and -not $Force) {
    Write-Host ("그대로 둠 {0}: 이미 등록돼 있습니다(다시 등록하려면 -Force)." -f $d.Name)
    continue
  }
  $action = New-ScheduledTaskAction -Execute $py -Argument ("`"$repo\scripts\" + $d.Script + "`" " + $d.Args) -WorkingDirectory $repo
  $triggers = $d.Times | ForEach-Object { New-ScheduledTaskTrigger -Daily -At $_ }
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
  Register-ScheduledTask -TaskName $d.Name -Action $action -Trigger $triggers -Settings $settings -Description $d.Desc -Force | Out-Null
  Write-Host ("등록 {0}: 다음 실행 {1}" -f $d.Name, (Get-ScheduledTask -TaskName $d.Name | Get-ScheduledTaskInfo).NextRunTime)
}
