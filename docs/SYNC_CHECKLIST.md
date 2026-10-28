# "변경내용 가져와" 절차 (데스크톱·노트북 공통)

사장님이 어느 컴퓨터에서든 **"변경내용 가져와"**(또는 "최신으로 맞춰", "업데이트 가져와")라고 하면, 다른 컴퓨터에서 바뀐 내용을
이 컴퓨터에 반영하는 아래 순서를 **묻지 않고** 끝까지 진행하고, 마지막에 결과만 짧게 보고한다.

1. **코드 받기**: `git status`로 작업 중 변경이 없는지 보고 `git pull --rebase origin main`.
   - 자동 게시 스크립트가 같은 폴더를 쓰므로 작업 트리를 더럽힌 채 두지 않는다. 충돌·미커밋 변경이 있으면 멈추고 무엇인지 보고.
   - `package.json`이 바뀌었으면 `npm install`.
   - **Claude 메모리 받기:** `python scripts/claude_memory_sync.py import` — 다른 컴퓨터가 남긴 `docs/claude-memory/` 스냅샷을 이 컴퓨터 메모리에
     반영한다(없는 파일 추가, `modified:`가 더 새로운 파일만 덮어씀, MEMORY.md는 없는 줄만 덧붙임). "확인 필요"로 나온 파일은 두 내용을 비교해 합친다.
   - **진행 중 브랜치 확인:** `git fetch --prune` 후 `git branch -r`. 이어갈 작업이 있으면 해당 브랜치의 문서를 먼저 읽는다 —
     해외판 결제 `work/global-payment` → `docs/global-payments/HANDOFF.md`, 토스 v11 `work/toss-v11` → `docs/toss-v11.md`, 신년운세 웹 `work/new-year-v2`.
     브랜치 작업은 `C:\saju-app`이 아니라 별도 worktree(`git worktree add C:\saju-app-<이름> <브랜치>`)에서 한다(main 폴더는 자동화가 쓴다).
   - 그다음 `OPS_NOTES.md` 맨 아래 며칠 치를 읽어 최근 결정을 확인한다.
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
   - **주의(10/26~):** 노트북이 10/26에 해외판 Threads 토큰을 **새로 발급**했다. 새 토큰이 데스크톱의 옛 토큰을 무효로 만들었을 수 있으니,
     데스크톱 일일 보고·작업 로그에서 해외 Threads가 "토큰 오류"면 노트북의 두 파일을 USB로 가져오거나 Meta 토큰 생성기에서 다시 발급한다.
   - 인스타·Threads 토큰 사본의 **나이**도 확인한다(한쪽 컴퓨터만 갱신되면 다른 쪽 사본은 늙는다 — 10/23 사례).
4. **확인**: `python scripts/daily_report_pdf.py --no-notify`로 보고서가 만들어지는지 한 번 확인(알림은 보내지 않음).
5. **보고**: 받아온 커밋 수·바뀐 주요 내용(커밋 제목 기준 3줄 이내)·스케줄 변경 여부·필요한 사장님 할 일만.

## 이 컴퓨터를 떠날 때 ("정리하고 넘겨줘", "본가 간다", "노트북으로 간다")
1. 진행 중인 브랜치 작업은 커밋하고 GitHub에 푸시(`work/**` 이름 — Vercel 배포 꺼짐. 옛 main에서 갈라진 브랜치는 main을 먼저 합치고 올린다). 비밀값이 섞이지 않았는지 확인.
2. `python scripts/claude_memory_sync.py export` → `docs/claude-memory` 커밋·푸시(docs만 바뀌면 Vercel 빌드는 건너뜀). **이 저장소는 공개(public)라** 메모리·OPS_NOTES에 계좌·판매자 ID·토큰·개인 연락처를 적지 않는다.
3. `OPS_NOTES.md`에 인계 한 단락(무엇을 했고, 무엇이 남았고, 다른 컴퓨터에 없는 것 — 로컬 DB·비밀 파일·임시 설정).
4. 로컬 임시 설정 원복(테스트용 스위치·개발 서버·로컬 DB 종료), `C:\saju-app` main 깨끗한지 확인.
