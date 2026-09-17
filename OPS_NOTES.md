# 운영 노트 (인프라/자동화 이슈 기록)

노트북·데스크톱 둘 다 이 저장소를 공유하지만, Claude Code 대화 세션과 `credentials/` 폴더는 컴퓨터마다 로컬이라 git으로 안 넘어간다. 새 컴퓨터/새 세션에서 인프라 관련 작업을 시작하기 전에 이 파일을 먼저 확인할 것.

## 2026-09-16/17 — 릴스 16번(R31) 22시간 멈춤 + 인스타그램 게시 사고, 근본 원인: GCM 인증 프롬프트 무한 대기 + 공유 토큰 만료 (⚠️ 데스크톱에서 추가 조치 필요)

**증상**: 2026-09-16 저녁 8시 릴스 처리(day 16, R31)가 그대로 멈춰서 Windows 작업 스케줄러가 강제 종료(`LastTaskResult` = 강제종료 코드). `scripts/posted_state/reel/16.lock`이 22시간 넘게 풀리지 않은 채 방치됨 — 그동안 릴스 게시가 하루 통째로 안 나감. 같은 시기 shorts_auto(다른 프로젝트) 쪽 인스타그램도 이틀 연속 실패(그쪽 CLAUDE.md 참고).

**근본 원인**:
- `publish_instagram.py`/`publish_carousel.py`가 릴스/카드뉴스 영상 호스팅용 `saju-media-host` 저장소에 push할 때 쓰는 토큰이 **만료/폐기됨**(GitHub API로 401 직접 확인). 이 저장소는 Git Credential Manager(GCM) 캐시로 몰래 땜빵되던 게 없어서, 인증 실패 시 GCM이 **데스크톱 세션 없는 Task Scheduler 환경에서 응답 없는 인증창을 띄우려다 그대로 멈춤**.
- **부수 발견(중요)**: saju-app **메인 저장소**(락/언락 자동화, `git_sync.py`)의 origin remote도 이 죽은 토큰을 그대로 쓰고 있었는데, 지금까지는 GCM 캐시가 우연히 계속 버텨줘서 티가 안 났던 것. 즉 메인 저장소 자동화도 언제든 같은 방식으로 멈출 수 있는 잠재 위험 상태였음.

**조치 (코드, 완료·push됨)**:
- `scripts/git_sync.py`, `scripts/publish_instagram.py`, `scripts/publish_carousel.py`, `scripts/refill_queue.py`의 모든 git subprocess 호출에 `GIT_TERMINAL_PROMPT=0` + `GCM_INTERACTIVE=Never` env, `timeout=120` 추가. 앞으로 인증 문제가 또 생겨도 몇 시간~하루 멈추는 대신 **2분 안에 빠르게 실패**함.
- `publish_instagram.py`/`publish_carousel.py`에 `sys.stderr.reconfigure(encoding="utf-8")` 추가 — 에러 로그 mojibake 방지.

**조치 (토큰 교체, ⚠️ 이 컴퓨터에서만 완료 — 데스크톱은 아직 예전 만료 토큰 그대로임)**:
새 fine-grained PAT 발급함(2026-09-17, 이름 "media-host-and-saju-app-write", 대상 저장소: `saju-app`/`saju-media-host`/`shorts-media-host` 3개, Contents: Read and write, 만료 없음). 이 컴퓨터에서 아래 반영 완료:
- `C:\saju-app\credentials\github_token.txt` — 새 토큰으로 교체
- saju-app 메인 저장소(`C:\saju-app\.git\config`)의 origin remote — 새 토큰으로 교체
- `~\SajuAutoRender\media_host\.git\config`의 origin remote(saju-media-host) — 새 토큰으로 교체
- shorts_auto 쪽 `credentials/github_token.txt`와 `~\ShortsAutoRender\media_host` remote도 같이 교체함(그쪽 CLAUDE.md 참고)

**`credentials/`는 `.gitignore` 대상이고 `.git/config`의 remote URL도 로컬 전용이라, 이 교체는 git으로 안 넘어감 — 데스크톱 컴퓨터에서 다음에 작업할 때 반드시 위 세 곳을 새 토큰으로 수동 교체할 것.** 토큰 값 자체는 보안상 여기 안 적음 — 사용자에게 직접 물어보거나(이미 알고 있음), 안 되면 GitHub Settings → Developer settings → Fine-grained tokens에서 "media-host-and-saju-app-write" 토큰이 있는지 확인(단, 토큰 값은 발급 시점에만 보이고 재조회 불가 — 잃어버렸으면 재발급 필요).

**캐치업 완료**: 릴스 16번(R31)은 `instagram_upload.upload_reel()`을 이미 push된 영상 URL로 직접 호출해서 수동 게시 완료(media_id 확인됨) → `run_daily.mark_posted(16, ...)`로 posted 기록 남기고 `git_sync.release_lock()`으로 락 해제까지 정상 마무리함. 데스크톱이 그동안 못 올렸던 카드뉴스/릴스 파일들(`saju_12_R27.mp4` 등)도 이번에 merge되어 `saju-media-host`에 같이 push됨.

**앞으로 확인할 것**: 새 세션에서 "오늘 릴스/카드뉴스 잘 올라갔나" 확인할 때, `scripts/posted_state/reel/`, `scripts/posted_state/cardnews/`에 오래된(3시간 이상) `.lock` 파일이 남아있는지부터 볼 것 — 남아있으면 그 처리가 멈춘 채 방치된 것.
