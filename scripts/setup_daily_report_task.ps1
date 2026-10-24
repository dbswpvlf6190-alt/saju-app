# 일일 보고(scripts/daily_report_pdf.py)를 이 컴퓨터에서 매일 20:00에 돌게 등록한다(데스크톱·노트북 공통).
# 예전 노트북 보고(C:\saju-reports\collect_and_build.py, 작업 SajuDailyReport 21:40)는 같은 내용을 다른 형식으로 만들어
# 알림이 두 번 오므로 끈다(삭제하지 않음 — 되돌리려면 Enable-ScheduledTask -TaskName SajuDailyReport).
# 실행: powershell -ExecutionPolicy Bypass -File scripts\setup_daily_report_task.ps1
$repo = Split-Path -Parent $PSScriptRoot
$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { $py = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" }
$action = New-ScheduledTaskAction -Execute $py -Argument "`"$repo\scripts\daily_report_pdf.py`"" -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -At "20:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "SajuDailyReportPdf" -Action $action -Trigger $trigger -Settings $settings -Description "사주랩 일일 보고 PDF(매일 20:00, 채널·토스·해외판 포함)" -Force | Out-Null
if (Get-ScheduledTask -TaskName "SajuDailyReport" -ErrorAction SilentlyContinue) {
    Disable-ScheduledTask -TaskName "SajuDailyReport" | Out-Null
    Write-Host "예전 보고 작업 SajuDailyReport(21:40)를 껐습니다."
}
Write-Host ("SajuDailyReportPdf 다음 실행: " + (Get-ScheduledTask -TaskName SajuDailyReportPdf | Get-ScheduledTaskInfo).NextRunTime)
