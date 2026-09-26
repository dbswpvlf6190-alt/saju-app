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

## 2026-09-19 릴스 자동 제작 규칙 + 목소리 교체 + 성과 기록

- **목소리**: 릴스 나레이션은 Supertonic M3(남성) — `reel-template/build.mjs`가 `C:\shorts_auto\vendor\supertonic_clone`(엔진)과 `C:\shorts_auto\assets\voice_style_M3.json`을 씀. 엔진이 없는 컴퓨터(노트북 미설치)에선 edge-tts 여성 목소리로 자동 대체되고 "[경고]"가 로그에 남음 → 노트북에도 shorts_auto `CLAUDE.md`의 엔진 설치 절차를 따르면 통일됨. 경로는 환경변수 `SUPERTONIC_DIR`/`SUPERTONIC_STYLE`로 바꿀 수 있음.
- **대본 규칙** (`scripts/reel_rules.py`, 사용자 기획서 반영): 사람의 관심사에서 출발하는 소재(연애/궁합/재물/직장/성격/인간관계/운세/사주 사실)를 스스로 고르고, HOOK → CURIOSITY → 핵심 → 내 사주 확인 유도(앱 화면) → CTA 순서(`structure: 2`), 20~35초. `refill_queue.py`가 큐 3개 미만일 때 생성하며, 결과는 코드로 검증한다(글자수 예산, 단정·공포 표현 금지어, "무료"는 여덟 글자·오행 비율·일간·성향 해석만 가리킬 것, 최근 콘텐츠와 제목·훅·소재 유사도). 탈락 항목은 사유를 알려 최대 3회 재생성.
- **CTA**: A/B/C를 번갈아 코드가 붙임(LLM이 쓰지 않음). 무료 쿠폰 조건이 "팔로우 + 댓글 '사주'"라서 쿠폰을 언급하는 A/B에는 팔로우 조건을 명시함(기획서 원문 A에는 팔로우가 없었음). **쿠폰 DM은 아직 수동**.
- **고정댓글**: 릴스마다 문구가 `reel_manifest.json`의 `pinned_comment`에 생김. 인스타 API는 댓글 고정을 지원하지 않아 **사람이 직접 댓글 달고 고정**해야 함. 게시 후 `~/SajuAutoRender/pinned_comment_latest.txt`와 `posted_state/reel/NN.json`에 남음(자동 댓글 게시는 아직 안 함).
- **성과 기록**: `fetch_insights.py`(매일 09:00)가 `scripts/performance/latest.json`(게시물별 지표 + 대본 정보 + 팔로워 증감 + 앱 이벤트/쿠폰 사용)과 `followers_log.json`을 git에 커밋. 대본 생성 시 상·하위 성과가 프롬프트에 참고로 들어감(게시 24시간 이상 지난 릴스 4개 이상일 때). 한계: 앱 이벤트에 유입 경로가 없어 "어느 릴스에서 왔는지"는 못 구하고 일자별 총량만 봄.
- **git 커밋 범위 버그 수정**: `git_sync.git_commit_push`/`refill_queue.git_commit_push`가 이제 지정한 경로만 커밋함(예전엔 무관하게 staged된 파일이 락 커밋에 딸려 들어갔음).
- **콘텐츠 형식 다양화** (`reel_rules.FORMATS`, 10가지: 자기진단·궁금증·관계·상황·반전·비교·리스트·댓글참여·결과확인·스토리): 형식은 코드가 배정(`pick_formats`)해서 직전 릴스와 같은 형식이 연속되지 않고 최근 3개 형식도 피함. 릴스마다 `format` 필드가 `reels.json`에 남고 성과 파일(`performance/latest.json`)에도 실려서 형식별 반응을 비교할 수 있음. "사주에서는 ~라고 봅니다", "중요한 건 ~입니다", "내 사주는 어떨까요?" 구조는 검증에서 탈락시키고, 핵심 문장 시작이 최근 5개 중 2개 이상과 같아도 탈락. 화면 자막(screenshotCaption)에 궁합·택일·삼재·대운 등 화면에 없는 기능을 쓰면 탈락(화면은 한 사람의 무료 결과).
- **훅 규칙 강화 + 상단 고정 CTA 자막** (2026-09-20, 성과 분석 결과 반영): 릴스 평균 시청 시간이 3초 안팎(영상 길이의 약 13%)이고 댓글이 0이라, ① 훅을 공백 제외 24자·2~3조각으로 줄이고 첫 조각은 짧게, 설명투 끝맺음("~이유가 있어요")·제작자 시점 금지, `hookAccent`(훅 안의 핵심 어구)를 화면에서 금색 강조. ② CTA를 영상 후반에만 두면 대부분 못 보므로 `cta.pill` 한 줄을 처음부터 끝까지 상단(세이프존 아래)에 고정 노출(`render-scenes.mjs`가 pill.png 생성, `build.mjs`가 전 구간 오버레이). 효과 검증은 `performance/latest.json`의 `avg_watch_sec`/`watch_ratio`로 R35 이후 게시분을 이전과 비교. pill은 마지막 CTA 장면에서는 숨김(같은 문구 중복 방지, `build.mjs`의 overlay enable). 2026-09-20 옛 규칙으로 만든 R34는 큐에서 뺐고(reel_manifest.json에서만 삭제, reels.json 기록과 mp4는 남김) 2026-09-20 저녁 20:00부터 새 방식(R35~)으로 게시.
- **카드뉴스 2주 실험** (2026-09-20 ~ 10/4쯤 평가): 카드뉴스 18편 평균 도달이 2(사실상 팔로워만 봄)이고 소재가 용어 해설형이라, `scripts/cardnews_rules.py`로 ① 사람의 관심사에서 출발하는 소재 + 표지=훅(핵심 어구 금색) ② 마지막 장 CTA A/B/C 로테이션 ③ 형식 배정(자기진단·리스트·댓글참여·비교·반전·궁금증·상황) ④ 캡션/고정댓글은 릴스와 같은 방식(고정댓글은 `~/SajuAutoRender/pinned_comment_cardnews_latest.txt`)을 적용. 게시 빈도는 `run_daily_cardnews.py`의 `MIN_HOURS_BETWEEN_POSTS = 60`(약 3일에 1회)로 제한 — 작업 스케줄러 트리거는 매일 11:00 그대로이고 코드에서 건너뜀(git 공유 게시 기록 기준이라 노트북에도 동일 적용). 평가 방법: `performance/latest.json`에서 C20 이후 카드뉴스의 도달/조회를 이전(도달 2, 조회 약 7)과 비교하고, 개선이 없으면 중단 검토.

## 2026-09-21 — 훅 릴스(원석형) 새 버전 게시 (중복 주의)
- `scripts/reel-template/render-hook-wonseok.mjs` + `build-hook-wonseok.mjs`로 만든 20초 릴스(앱 카드형 입력 4컷, 단계 라벨, 효과음, CTA에 "편당 1,200자 사주 명리 분석 · 현직 사주 명리 지식 기반")를 @sajulab_official에 게시함(media_id 18450600577121724, 호스팅 파일 `saju_hook_wonseok_v3.mp4`, 매니페스트 밖 수동 게시라 posted_state 기록 없음).
- **같은 주제의 이전 버전(v2)이 2026-09-19 08:22 KST에 이미 게시돼 있었음**(호스팅 `saju_hook_wonseok_v2.mp4`, 다른 세션이 올림). 인스타 API로는 삭제/교체가 안 돼서 사용자가 앱에서 v2 게시물을 직접 삭제하기로 함 — 새 세션에서 이 릴스를 또 올리지 말 것.
- zoompan 함정: 그림 입력에 `-loop 1`/`-t`를 걸면 프레임이 곱연산으로 폭발함(20초가 31분/수백MB로 깨짐). 그림은 1프레임만 넣고 길이는 `d=`로만 정할 것.

## 2026-09-21 — media_host push "fetch first" 거부 방지
`publish_instagram.py`/`publish_carousel.py`가 push 전에 `git pull --no-rebase`로 최신을 합치고, 거부되면 한 번 더 합쳐 재시도하도록 수정(노트북·데스크톱이 같은 saju-media-host를 번갈아 써서 생기는 non-fast-forward 대응, shorts_auto 노트북 38/39번 인스타 실패에서 발견). 같은 파일의 재시도는 커밋을 건너뛴다.

## 2026-09-21 — 게시 결과 푸시 보고 (ntfy)
`scripts/notify.py` + `credentials/ntfy.json`(git 제외, 컴퓨터마다 필요 — 데스크톱엔 사용자에게 토픽을 물어 `{"topic": "...", "server": "https://ntfy.sh"}`로 생성). `run_daily.py`/`run_daily_cardnews.py`가 게시 완료 시 ✅(고정댓글 문구 포함), 예외 시 ❌ 푸시를 보냄. 자세한 설명은 shorts_auto CLAUDE.md의 같은 날짜 섹션 참고.

## 2026-09-22/23 — 추석 연휴 데스크톱 인수인계
- **ntfy 폰 푸시(9/21 도입)가 아직 데스크톱엔 연결 안 됨**: `credentials/ntfy.json`이 컴퓨터마다 로컬(git 제외) — 데스크톱에서 Claude에게 "ntfy 설정해줘"라고 하면 토픽 값(사용자가 알고 있음, 보안상 git엔 안 적음)을 물어서 만들어줄 것. 안 만들어도 게시 자체는 정상 동작(알림만 조용히 생략).
- **훅 릴스(원석형) 구버전 인스타 게시물 아직 미삭제**: 2026-09-18에 다른 세션이 올린 media_id `18086839340682411`이 여전히 live — 9/21에 새 다듬은 버전(`18450600577121724`)을 올리면서 사용자가 구버전을 앱에서 직접 삭제하기로 했는데 아직 안 함. 데스크톱 세션에서 또 올리지 말고, 사용자에게 삭제를 상기시켜도 됨.
- **유튜브 관련 아님**(saju-app은 유튜브 미사용) — shorts_auto CLAUDE.md의 같은 날짜 섹션은 무관.
- 그 외 media_host push 충돌 방지, 릴스 훅 규칙 강화, 카드뉴스 실험 등은 이 파일 위쪽 섹션 참고.
- **릴스 캡션에 사이트 주소 추가** (2026-09-26): `reel_rules.add_link_line`이 캡션의 CTA 뒤·해시태그 앞에 `🔗 내 유형 확인: saju-app-three-dusky.vercel.app/type-test?ref=ig_reel` 한 줄을 넣는다(자동 생성분은 `build_caption`이, 대기 중이던 R41~R45는 manifest를 직접 갱신). 인스타 캡션 속 주소는 눌러도 이동되지 않는 글자라 복사·검색해서 오는 사람용이고, `ref=ig_reel`이 `landing_view` 이벤트에 기록돼서 `performance/latest.json`의 `app.landing_by_ref_30d`(ig_profile=프로필 링크, ig_reel=캡션 주소, share_*=앱 안 공유)로 유입을 구분해 볼 수 있다. 카드뉴스 캡션은 아직 해당 없음.

## 2026-09-26 — 시험 시즌 콘텐츠(수능·임용) + 채널별 결제 추적
- **3편 중 1편 수험생 소재**: `scripts/exam_season.py`가 릴스·카드뉴스 자동 생성 때 시즌 슬롯을 배정한다(시험 60일 전부터, 시험 8일 전까지만 새로 만듦 — 대기열이 시험 뒤에 게시되지 않게). 수능·임용을 번갈아 쓰고, 항목마다 `exam`(suneung/imyong/null)이 `reels.json`·`cardsets.json`·`performance/latest.json`에 남아 시즌 편 성과를 따로 볼 수 있다. 검증에서 합격 보장·불합격 공포·확률·"D-N" 표기를 탈락시킨다.
- **캡션 주소**: 시즌 편 릴스는 `…/exam-luck(/imyong)?ref=ig_reel`, 카드뉴스는 `?ref=ig_cardnews`. 고정댓글 끝에 "○○ 합격운 흐름은 프로필 링크에서…"가 붙으므로 **인스타 프로필 링크에 수능·임용 합격운 주소를 추가해둘 것**(`/exam-luck?ref=ig_profile`, `/exam-luck/imyong?ref=ig_profile`).
- **시험 날짜는 두 곳**: 앱 `src/lib/exam/seasons.ts`와 `scripts/exam_season.py`. 중등 임용(11/28 예정)은 9/30 공고 뒤 둘 다 고칠 것.
- **채널별 결제**: 첫 방문 `?ref=`를 브라우저에 30일 기억해서 결제 쪽 이벤트에 `src`로 싣는다(`src/lib/analytics/source.ts`). /admin "결제 완료 첫 유입 경로", `performance/latest.json`의 `app.payments_by_src_30d`에서 채널별 결제 수를 본다. 오픈채팅·커뮤니티 홍보 링크는 채널마다 ref를 다르게 붙일 것(kakao_open, suman, orbi, everytime, threads 등).
- **홍보 원고**: 오픈채팅·수만휘·오르비·에브리타임·지인 카톡·Threads(첫 2주 12개) 원고와 채널별 추적 링크는 `docs/marketing/2026-exam-season-posts.md`. 원칙: '사주랩' 브랜드 공지 톤, 이용자인 척하는 후기 금지(표시광고법 뒷광고), 같은 날 같은 글 여러 방 금지.

### 남은 할 일 (2026-09-26 기준)
| 할 일 | 누가 | 시점 |
|---|---|---|
| 인스타 프로필 링크에 `/exam-luck?ref=ig_profile`, `/exam-luck/imyong?ref=ig_profile` 추가 | 사람 | 지금 |
| Threads 계정 만들고 `docs/marketing/2026-exam-season-posts.md` 원고 12개를 하루 1개씩 게시 | 사람 | 지금~2주 |
| 중등 임용 공고 확인 후 `src/lib/exam/seasons.ts`와 `scripts/exam_season.py` 날짜 **둘 다** 수정 | Claude | 9/30 이후 |
| /admin "결제 완료 첫 유입 경로"와 `app.payments_by_src_30d`로 채널별 방문·결제 비교 | Claude | 약 1주 뒤(10/3경) |
| 다음 홍보 단계: SEO 페이지(`/ilgan` 11개는 9/26 배포 완료, 시험 소재 글은 미작성), 네이버 블로그 | Claude | 위 비교 후 |

### Threads 운영 기록
- 2026-09-26 개설(@sajulab_official, 데스크톱 크롬에서 인스타 사주랩 계정으로 로그인). 프로필: 소개 4줄, 링크 2개(`/?ref=threads`, `/exam-luck?ref=threads`), 관심사 사주·운세 사주·mbti·수능응원.
- 9/26 게시: 소개 글(프로필 고정, 주제 "사주"), 원고 1번(주제 "수능응원") + 내 댓글에 C 설명·`/exam-luck?ref=threads` 링크(미리보기 카드 정상). 다음은 원고 2번부터, 하루 1~2개.
- 9/26 21:00 예약: "생일만 적어주면 내 사주 타입 무료로 알려줄게" 글(주제 "사주"). Threads 사주 인기글이 대부분 이 형식(생일+고민 답글 → 풀이 답글)이라 도입. **약속대로 그날 달린 답글엔 전부 답할 것.** 답글 풀이는 `node scripts/threads_ilgan.mjs YYYY-MM-DD [lunar]`로 일간·유형을 구하고 `src/lib/saju/ilganPages.ts`의 해당 일간 내용(물어본 주제: 성격/연애/일/돈)으로 2~3문장 + "자세한 풀이는 프로필 링크에서 30초 무료"로 쓴다(답글마다 링크를 붙이면 스팸으로 보일 수 있어 프로필 링크로 유도). 올리기 전에 사용자 승인.
