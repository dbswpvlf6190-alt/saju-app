# "변경내용 가져와" 절차 (데스크톱·노트북 공통)

사장님이 어느 컴퓨터에서든 **"변경내용 가져와"**(또는 "최신으로 맞춰", "업데이트 가져와")라고 하면, 다른 컴퓨터에서 바뀐 내용을
이 컴퓨터에 반영하는 아래 순서를 **묻지 않고** 끝까지 진행하고, 마지막에 결과만 짧게 보고한다.

1. **코드 받기**: `git status`로 작업 중 변경이 없는지 보고 `git pull --rebase origin main`.
   - 자동 게시 스크립트가 같은 폴더를 쓰므로 작업 트리를 더럽힌 채 두지 않는다. 충돌·미커밋 변경이 있으면 멈추고 무엇인지 보고.
   - `package.json`이 바뀌었으면 `npm install`.
2. **작업 스케줄러 맞추기** (이미 맞으면 건너뜀):
   - 일일 보고: `SajuDailyReportPdf`가 매일 20:00이 아니면 `powershell -ExecutionPolicy Bypass -File scripts\setup_daily_report_task.ps1`
     (예전 노트북 보고 `SajuDailyReport` 21:40도 이 스크립트가 끈다).
   - 해외판 Threads 자동 게시·답글(`SajuThreadsGlobalJA/EN`, `SajuThreadsGlobalJAReplies/ENReplies`): 평일 노트북·주말 데스크톱 모두에서 돌려야 하므로
     `powershell -ExecutionPolicy Bypass -File scripts\setup_global_threads_tasks.ps1`을 실행한다. **토큰 파일(`credentials\threads_token_ja/en.json`)이
     있는 시장만 등록하고, 이미 등록된 작업은 건드리지 않는다.** 토큰이 없으면 건너뛰고 안내만 나오니 3번으로 간다.
3. **비밀 파일 확인**(git에 없음 — 값은 절대 출력하지 말고 있는지만 확인):
   - `credentials/threads_token_ja.json`, `credentials/threads_token_en.json` — 없으면 일일 보고의 해외 Threads 칸만 "토큰 오류"로 나오고
     해외판 게시·답글이 그 컴퓨터에서는 멈춘다(다른 기능은 정상). 사장님께 "데스크톱의 두 파일을 이 컴퓨터 같은 폴더로 복사해 주세요"라고 한 줄 안내하고,
     복사된 뒤 2번의 `setup_global_threads_tasks.ps1`을 다시 실행한다. 토큰은 비밀이라 채팅·git·OneDrive 공유 폴더에 두지 말고 USB 등으로 옮긴다.
4. **확인**: `python scripts/daily_report_pdf.py --no-notify`로 보고서가 만들어지는지 한 번 확인(알림은 보내지 않음).
5. **보고**: 받아온 커밋 수·바뀐 주요 내용(커밋 제목 기준 3줄 이내)·스케줄 변경 여부·필요한 사장님 할 일만.
