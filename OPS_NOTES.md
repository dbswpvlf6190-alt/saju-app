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
- **9/27 Threads 자동화 가동**: Meta 앱 "sajulab threads"(앱 ID 1454906166696302, Threads 앱 ID 1017511271343753, 이용 사례 Threads API, 권한 basic/content_publish/manage_insights/manage_replies/read_replies, @sajulab_official = Threads 테스터). 토큰은 `credentials/threads_token.json`(60일, 50일 지나면 `threads_api.get_token()`이 자동 갱신) — **노트북에서도 돌리려면 이 파일을 복사해 둘 것**(git 제외). 새로 받을 땐 앱 > 이용 사례 > 맞춤 설정 > 설정 > 사용자 토큰 생성기 → `credentials/threads_token.txt`에 붙여넣고 `python scripts/threads_api.py --import-token`.
  - 게시: 작업 스케줄러 `SajuThreadsDaily` 매일 21:00 → `run_daily_threads.py`가 `threads_queue.json`의 다음 글 + 링크 댓글. 18시간 간격·직접 올린 글 8시간 이내면 건너뜀. 남은 글 3개 미만이면 ntfy 경고 → 새 글 추가 필요(아직 자동 생성 없음).
  - 성과: `fetch_insights.py`가 `performance/latest.json`의 `threads`에 팔로워·글별 views/likes/replies/reposts를 남김.
  - 무료 풀이 글(9/26 21:00, media 17896512387604733): 하룻밤 조회 1,988·좋아요 33·답글 46 — 설명형 원고(조회 64~344)보다 압도적. 답글은 `python scripts/threads_replies.py draft|show|send MEDIA_ID`(생일 파싱·풀이 문장은 Claude, 일간 계산은 앱과 같은 lunar-typescript). 초안은 로컬 `~/SajuAutoRender/threads_drafts/`(남의 생일 포함이라 git 제외), 답한 id만 `posted_state/threads_replies/`. send는 40~75초 간격(몰아 올리면 스팸 판정 위험). **사용자 승인 후에만 send.**
  - **9/27 무료 풀이 글 정기화**: `run_daily_threads.py`가 마지막 무료 풀이 글 후 약 3일(66시간+)이 지나면 그날은 대기열 대신 `threads_reading_posts.json`의 다음 변형(RD01~RD04 순환, 기록 파일 `RD0x-YYYYMMDD.json`, kind=reading)을 올린다. `SajuThreadsReplyDraft` 매일 10:00이 최근 4일 풀이 글의 새 답글 초안을 만들고 ntfy로 알림 → 사용자가 "올려"라고 하면 `threads_replies.py send MEDIA_ID`. 첫 풀이 글 답글 46개는 9/27 승인 후 게시.
  - 프로필 링크 주의: 웹에서 프로필 편집 창의 맨 아래 "완료"를 누르면 링크가 지워진 적 있음(9/27 재등록). 링크는 링크 하위 창에서 저장되자마자 반영되니, 링크 수정 후엔 "완료" 대신 Esc로 닫을 것.

## 2026-09-27 — 유료 전환 개편(1가지 1,900원 + 차액 3,000원)
- **왜**: 30일 퍼널이 유료 안내 노출 145 → 결제 버튼 10(7%) → 결제창 7 → 결제 5. 결제 과정이 아니라 "안내를 보고도 안 누름"이 병목.
- **무엇**: `PremiumOffer.tsx`(맨 위 항목 한 문단 흐림 없이 공개, "전체 5가지 4,900원(항목당 980원, 추천)" vs "궁금한 1가지만 1,900원" 선택, 하단 고정 바 `StickyPremiumBar`), 상품 `single_section`(1,900원, `Order.sectionKey`)·`section_upgrade`(3,000원, `Order.parentPaymentId` — 원래 주문의 생년월일·이미 만든 해석을 이어받아 나머지 4개만 생성), 결제 후 `SectionUpgradeCard`. 서버는 1가지 주문이면 산 항목만 생성·열람(`/api/orders/[id]`).
- **측정**: 새 이벤트 `premium_offer_seen`(가격 영역이 실제로 화면에 60% 이상 보였을 때만 — 예전 `premium_preview_view`는 결과 화면 열리자마자 찍혀 과대집계), `premium_sticky_click`. `fetch_insights.py`가 퍼널 이벤트를 `app.daily_events`에 같이 남김. **10/4경 offer_seen → cta_click → payment_success 비율을 이전(7%)과 비교할 것.** `premium_cta_click` meta의 productType(single_section/premium_report)으로 어떤 선택지가 눌리는지도 볼 수 있음.
- **테스트**: 로컬 API 13항목 + PortOne 테스트 채널(KG이니시스 INIpayTest)로 1,900원 실결제 흐름 확인(9/27). 차액 3,000원은 결제창 실테스트는 생략(API로만 확인) → 첫 실제 차액 결제가 들어오면 주문 기록 확인할 것. 로컬 `.env.development.local`에 테스트 채널 키가 있어 `next dev`에선 결제가 청구되지 않음(운영·미리보기는 Vercel 환경변수의 실채널).

## 2026-09-27 — Threads 집중 운영(자동)
- 게시: `SajuThreadsDaily` 12:30·21:00 하루 2개. 대기열(안 올린 글)이 5개 미만이면 `threads_refill.py`가 Claude로 6개 생성(반말·질문으로 끝남·본문 링크 금지·단정/뒷광고 문구 금지 검사, 성과 상위 글을 예시로). 무료 풀이 글(RD0x)은 3일에 한 번 저녁 슬롯에만.
- 풀이 답글: `SajuThreadsReplyDraft` 10:00·23:30 → 새 답글 초안 → **검사 통과분은 자동 게시**(사용자가 첫 46개 품질 확인 후 9/27 전환). 검사에 걸린 초안만 ntfy 알림 → "Threads 답글 확인해"로 사람이 처리. 임신·질병 등 건강 질문은 시기·결과 언급 금지(검사어 포함 시 수동 확인으로 빠짐).
- 사람 할 일: 인스타 프로필 링크에 `/exam-luck?ref=ig_profile` 추가(미완), 반응 좋은 Threads 글을 인스타 스토리에 공유(선택).

## 2026-09-27 — 노트북 인수인계 (내일 노트북 작업용)
- **먼저**: 노트북 저장소에서 `git pull origin main` (오늘 작업은 전부 main에 있음: Threads 자동화, 1가지 1,900원·차액 3,000원 결제, 유료 안내 개편, 퍼널 이벤트).
- **데스크톱에만 있는 것(git 제외)** — 노트북에서 Threads 스크립트를 돌리려면 필요:
  - `credentials/threads_token.json` (Threads 60일 토큰). 옮기는 법: USB 등으로 파일 복사, **또는** 노트북에서 새로 발급 — Meta 개발자 > 앱 "sajulab threads" > 이용 사례 > 맞춤 설정 > 설정 > 사용자 토큰 생성기 > sajulab_official "액세스 토큰 생성하기" → `credentials/threads_token.txt`에 붙여넣고 `python scripts/threads_api.py --import-token` → `--check`로 확인. 채팅·git에 토큰 붙이지 말 것.
  - `.env.development.local` (로컬 `next dev` 전용 PortOne 테스트 채널 키 — 노트북에서 결제 테스트할 때만 필요, 없어도 됨. 키는 PortOne 콘솔 > 결제 연동 > 채널 관리 > 테스트 탭).
- **자동 작업은 데스크톱 작업 스케줄러에서만 돈다**: SajuThreadsDaily(12:30·21:00), SajuThreadsReplyDraft(10:00·23:30), 기존 릴스(20:00)·카드뉴스(11:00)·인사이트(09:00). 데스크톱이 꺼져 있으면 그 시간 게시는 건너뛰고 켜질 때 StartWhenAvailable로 한 번 실행됨. 노트북에 같은 작업을 새로 등록하지 말 것(중복 게시 위험 — 게시 기록은 git 락으로 막지만 굳이 늘릴 이유 없음).
- **진행 중·확인할 것**: 9/29 21:00 무료 풀이 글 RD02 자동 게시 예정 / 첫 실제 차액(3,000원) 결제 들어오면 Order 기록 확인 / 10/4경 Threads·결제 퍼널 주간 보고 / 인스타 프로필 링크 `/exam-luck?ref=ig_profile` 추가(사람) / 9/30 중등 임용 공고 뒤 `src/lib/exam/seasons.ts`·`scripts/exam_season.py`·`scripts/threads_refill.py`(EXAMS) 날짜 수정.
- **풀이 답글 시기 짚기(9/27 사용자 요청)**: 임신·재회·취업 등 "언제" 질문은 `threads_ilgan.mjs`가 계산한 앞으로 5년·12개월의 십성 계열(식상/재성/관성/인성/비겁) 안에서만 시기를 짚는다(AI가 날짜를 지어내지 않게). 질병·완치 같은 의료 판단은 계속 금지.

## 2026-09-28 — 원석형 구버전 게시물 삭제 완료
2026-09-18 게시물(media_id 18086839340682411)을 사용자가 인스타그램 웹에서 직접 삭제 완료(API로 미디어 삭제 불가라 항상 사람이 해야 함). API로 재조회해서 실제 삭제 확인됨(400: 존재하지 않음). 이제 9/21 다듬은 버전(18450600577121724)만 남음 — 중복 이슈 해소.

프로필 링크(`/exam-luck?ref=ig_profile` 등) 추가는 여전히 미완 — 인스타그램이 "링크 수정은 모바일 앱에서만 가능"이라고 명시함(데스크톱 웹/브라우저 자동화로는 불가능, 확인됨). 휴대폰 인스타그램 앱에서 프로필 편집 > 소개 > 웹사이트로만 가능.

## 2026-09-28 — Threads 정기 게시(SajuThreadsDaily) 데스크톱에서 안 돎, 코드는 정상
9/27 12:30·21:00, 9/28 12:30 세 슬롯 모두 실제 게시가 안 나감(마지막 게시물이 계속 9/26 12:00에 멈춰있었음). 노트북에서 `python scripts/run_daily_threads.py`를 직접 실행해보니 **즉시 정상 게시됨**(T02, media_id 18122993797901258, 대기열 16개 남음) — 스킵 로직(`last_own_thread_at`이 답글을 오인식하는지 의심했으나 답글은 `/threads` 목록에 안 잡히는 것 확인, 무관)이나 `run_daily_threads.py` 코드 자체는 문제없음.
**→ 원인은 데스크톱 작업 스케줄러 쪽으로 좁혀짐**(등록 안 됨/트리거 시각 오류/비활성화 등). 릴스(20:00)·카드뉴스(11:00)는 오늘 데스크톱에서 정상 실행됐으므로 컴퓨터 자체가 꺼져있던 건 아님 — `SajuThreadsDaily` 작업 하나만의 문제로 보임. **데스크톱에서 작업 스케줄러 열어서 `SajuThreadsDaily`가 있는지, 트리거 시각(12:30·21:00, 로컬시간 기준)이 맞는지, 사용 설정이 켜져 있는지 확인 필요** — 원격으로는 확인 불가.
당장은 노트북에서 수동 실행으로 대체 가능(락으로 중복 안전).

## 2026-09-28 — Threads 자동화, 노트북에도 등록 (실제 원인: 데스크톱이 평일엔 꺼져있음)
사용자 확인: 데스크톱은 평일에 꺼져있어서 `SajuThreadsDaily`/`SajuThreadsReplyDraft`가 그동안 한 번도 못 돈 것이었음(코드 문제 아님, 위 섹션의 "원인 좁힘"은 스케줄러 미등록이 아니라 "실행 자체가 안 됨"까지였고 실제 이유는 이거였음). 릴스·카드뉴스(`SajuAutoQueue`/`SajuAutoQueueCardnews`)는 이미 노트북에도 등록돼 있어 평일엔 노트북이, 주말엔 데스크톱이 돌던 것과 같은 구조.
**조치**: 이 노트북에도 동일하게 등록함(둘 다 git 락으로 중복 게시 방지되므로 양쪽에 있어도 안전 — 기존 릴스/카드뉴스와 같은 패턴):
- `SajuThreadsDaily` — 매일 12:30·21:00, `python scripts/run_daily_threads.py`, StartWhenAvailable, 반복 트리거 없음(절대 걸지 말 것 — 위 "노트북 인수인계" 섹션 이유 참고)
- `SajuThreadsReplyDraft` — 매일 10:00·23:30, `python scripts/threads_replies.py auto`, 동일 설정
이제 어느 컴퓨터가 켜져있든 하루 2번씩 정상 게시됨. 데스크톱에도 이 두 작업이 실제로 등록·활성화돼 있는지는 다음에 데스크톱 사용 시 확인할 것(주말 몫).

## 2026-09-28 — 프로필 링크에 시험 시즌 주소 추가는 하지 않기로 결정
지금 프로필 링크(`saju-app-three-dusky.vercel.app?ref=ig_profile`) 하나로 충분하다고 판단, `/exam-luck?ref=ig_profile` 등 추가 링크는 진행하지 않기로 함(사용자 결정, 2026-09-28). 시험 시즌 고정댓글의 "프로필 링크에서…" 안내는 그대로 두되, 도착지는 메인 페이지로 유지. **앞으로 이 항목을 "남은 할 일"로 다시 올리지 말 것** — 위 9/26 섹션의 표에 있던 해당 항목은 이걸로 종결.

## 2026-10-04 — 무료 풀이 답글 첫 1시간 대응
- `SajuThreadsReplyDraft` 트리거를 10:00·21:30·22:30·23:30으로 늘림(무료 풀이 글은 21:00 게시 → 첫 1시간 답글 속도가 노출을 좌우). 데스크톱은 적용 완료.
- **노트북에도 같은 트리거 적용 필요**(노트북 PowerShell, 작업이 이미 있을 때):
  `$t = @("10:00","21:30","22:30","23:30" | % { New-ScheduledTaskTrigger -Daily -At $_ }); Set-ScheduledTask -TaskName SajuThreadsReplyDraft -Trigger $t`
- 두 컴퓨터가 동시에 돌아도 중복 답글이 안 나가게 `threads_replies.py auto`가 글마다 git 락(`posted_state/threads_replies/<media>.lock`)을 잡음.
- 10/4 기준 유입: 주간 방문 83→41로 감소, Threads 유입만 11→14로 증가(이번 주 방문의 1/3). 인스타 팔로워 5 정체. 실제 결제 0(9/21 주 5건은 9/27 테스트).

## 2026-10-04 — Threads 잘 된 글 분석 반영
- 실측(12개 글): 무료 풀이 RD01 "생일만 적어주면" 조회 2,396·실답글 ~50 ≫ "첫인상이랑 실제 성격 다르다는 말 듣는 사람?" 887 ≫ 나머지 22~379. 같은 무료 풀이라도 "고민 한 줄"(RD02 142)·"두 사람 생일"(RD03 209)처럼 적을 게 늘면 급감. 시험 소재 전부 하위(22~149).
- 반영: 무료 풀이 글은 "생일만" 변형만(RD01·RD05 연애 스타일·RD06 돈 타입·RD07 올해 남은 석 달·RD08 잘 맞는 사람, `promise` 필드로 답글 풀이 주제 지정), 주기 3일→2일. Threads 일반 글은 시험 소재 제외(대기 중이던 시험 글 5개 삭제), "~하는 사람?" 자기 찾기 중심·100자 안팎·한 마디로 답할 수 있는 마지막 줄(`threads_refill.py`).

## 2026-10-07 유료 리포트 "나 사용설명서"(6장) 적용
- **무엇**: 4,900원 `premium_report`의 본문을 주제 5개(연애·재물·직업·인간관계·올해)에서 6장(기본 설계도 / 내가 반복하는 선택 / 사람 앞에서의 나 / 일과 돈에서의 나 / 지금 시기 사용법 / 오늘부터 해볼 3가지)으로 바꿨다. **가격·상품명·결제 흐름은 그대로.** 점검에서 같은 근거 5번 반복·십성 용어 오류(병화의 재성을 수로 말함)·올해 정보 없음·건강 문장이 나와서 구조를 바꿨다.
- **구조**: 십성·올해/달별 흐름은 `src/lib/saju/manualFacts.ts`가 코드로 계산해 AI에게 고정값으로 준다(AI가 직접 계산 금지). 장별 병렬 생성은 `src/lib/ai/interpretManual.ts`(장마다 근거 배정, 금지어·분량 검사 후 1회 재시도). 장 제목·소개는 클라이언트용 `src/lib/reports/manualChapters.ts`.
- **기존 고객 보호**: 주문 캐시에 옛 주제 키가 있으면 결제 당시 방식 그대로(`src/lib/reports/layout.ts`의 `getReportLayout`). 1가지(1,900원)·차액(3,000원)은 계속 주제 방식. 새 방식은 캐시가 빈 새 premium_report 주문만.
- **긴급 롤백**: Vercel 환경변수 `NEXT_PUBLIC_REPORT_V2=0` 후 재배포 → 새 주문도 옛 주제 방식·옛 소개 문구로 돌아간다(이미 6장이 생성된 주문은 6장 유지).
- **문구**: 약관 제2조·FAQ·푸터(판매 상품에 1가지 1,900원·차액 3,000원 추가 표기). 약관 시행일자는 바꾸지 않았다.
- **검증**: 단위 테스트(십성·방식 판별·검사·화면 렌더링) + 실제 API로 두 프로필 생성(본인 7,066자, 여성 6,234자, 전부 검사 통과). 실결제 흐름은 이 개발 환경에서 못 해봄(DB·결제 없음) — 배포 후 테스트 결제로 한 번 확인할 것.
- **교훈**: 상극 표를 직접 옮기다 금극목·수극화를 거꾸로 적어 관성이 인성으로 분류됐다(테스트가 잡음). 오행 표는 반드시 단위 테스트로 고정한다.

## 2026-10-08 노트북 → 데스크톱 인수인계 (10/9 저녁 본가에서 접속 예정)
**데스크톱에서 먼저 할 것 (순서대로)**
1. 두 저장소(`C:\saju-app`, `C:\shorts_auto`)에서 `git status -sb` — **미커밋 변경이 있으면 안 된다**(스케줄러의 `git pull --rebase`가 조용히 실패해 노트북이 10/1~10/5 어긋났던 사고). 깨끗하면 `git pull --rebase origin main`.
2. `node -v`가 **스케줄러 환경에서도** 되는지(`where node`가 일반 경로인지). 노트북은 Claude 앱 저장소에만 있던 node 때문에 스케줄러에서 [WinError 2]가 났고, 10/8에 Node 24 정식 설치로 해결(`scripts/node_bin.py`가 정식 설치본을 먼저 찾는다).
3. `python scripts/notify.py --test`로 폰 알림이 오는지(`credentials/ntfy.json`은 컴퓨터별 파일 — 없으면 알림 없이 조용히 실패).
4. 작업 스케줄러 5개(SajuAutoQueue, SajuAutoQueueCardnews, SajuThreadsDaily, SajuThreadsReplyDraft, ShortsAutoQueue)의 마지막 실행 결과가 0인지.
5. `.env.local`에 ANTHROPIC_API_KEY가 있는지(노트북은 별도 키 saju-laptop 사용, 같은 키 아님).

**10/7~10/8에 바뀐 것**
- 사이트(실서비스 반영): 4,900원 리포트가 6장 "나 사용설명서"로 개편(가격·상품명·결제 흐름 그대로, 위 2026-10-07 항목 참고), 입력 화면 성별 기본값 제거(필수), 결제 전 미리보기가 캐릭터 궁금증에 연결, 입력 화면 배너 문구, 푸터 판매 상품에 1,900원·3,000원 표기. 긴급 롤백: `NEXT_PUBLIC_REPORT_V2=0`.
- 자동화: 릴스·카드뉴스 대기열 소진 시 ntfy 알림, 자동 채우기 JSON 파싱 3회 재시도, 스케줄러 PATH에 node·ffmpeg 자동 추가(`node_bin.py`, `git_sync.py`가 import), 쓰레드 풀이 답글을 반말·손실회피 마무리로 변경(시기는 코드가 골라 주는 `pick_timing`), 풀이 초안 실패 시 `%USERPROFILE%\SajuAutoRender\threads_replies_error.log`에 트레이스백.
- 점검에서 얻은 규칙: 오행 상극 표는 단위 테스트로 고정(`manualFacts.test.ts`), 스케줄러 오류는 **스케줄러 환경으로 재현**해서 확인(내 도구 화면에서는 보이는 파일이 스케줄러에는 없을 수 있다).

**보류 중(결정 대기)**
- 결제 단계 청약철회 안내·동의 체크(4개 결제 폼), 푸터·환불정책 문의 이메일(공개할 주소 미정), 약관 시행일자 갱신 여부, 가격 3단계(3,900원): `pricing-3tier` 브랜치는 **노트북 로컬에만** 있음.
- 카드 심사 담당(포트원/KG이니시스)에 "심사 중 수정 가능 범위" 문의, 새 리포트 **테스트 결제 1회**(6장이 순서대로 열리는지) — 아직 실결제 후 화면은 한 번도 못 봤다.

## 2026-10-08 3단계 가격 — 구성 확정, 반영은 카드 심사 후
- 확정 구성: 1가지 1,900원 / **3장 3,900원(사람 앞에서의 나·일과 돈에서의 나·지금 시기 사용법)** / 전체 6장 4,900원.
- 코드는 로컬 브랜치 `pricing-3tier-v2`(커밋 3ca1c37, 작업 폴더 `C:\saju-app-3tier`)에 있고 main·배포에는 **미반영**. 노트북에만 있다(origin 미푸시).
- 반영 순서: 6장 실결제 테스트 → PG 심사 통과/문의 → 머지. 머지 전 PG에 새 상품(3,900원) 안내 필요 여부 확인.
- 아직 없는 것: 3장 구매자가 차액 1,000원으로 6장으로 올리는 업셀 카드.
- 롤백: `NEXT_PUBLIC_REPORT_V2=0`이면 3장 옵션 숨김 + 서버 주문 거부.
- 같은 날 리포트 생성 API에 `maxDuration = 60` 추가(장당 20~45초 소요). 6가지 프로필 실생성 검증 통과.

## 2026-10-09 — 카드 결제 막힘 → "결제 오픈 알림 받기"로 임시 전환
- 원인: 실연동 MID 카드 결제가 PortOne 조회 결과 `[V104] [NO MPI SET] 미사용 설정 지불수단입니다`로 실패(10/4·10/6·10/9 결제 시도 4건 모두 실패, 나머지는 "사용자 취소"로 기록). 카드사 심사 미완료로 추정 — 사용자가 KG이니시스(1588-4954)에 확인 예정.
- 조치: `src/lib/payment/config.ts`의 `PAYMENTS_PAUSED = true` → 상세 풀이(4,900/1,900)·궁합 결제 버튼을 누르면 결제 폼 대신 `PaymentWaitlist`(이메일 + 필수 동의)가 뜨고 `WaitlistSignup` 테이블에 저장(같은 이메일·상품은 1번). 신년운세 업셀 카드는 숨김. 쿠폰 사용은 그대로. 개인정보처리방침에 항목·목적·보관기간(안내 1회 후 삭제, 최대 3개월) 추가, 시행일 10/9.
- **카드 결제가 열리면**: `PAYMENTS_PAUSED = false`로 바꿔 배포 → `WaitlistSignup` 이메일들에 오픈 안내 1회 발송(아직 메일 발송 기능 없음 — 그때 만들거나 수동 발송) → 보낸 뒤 행 삭제. 이벤트 `waitlist_view`/`waitlist_signup`으로 대기 수요 확인.
- 데스크톱 점검(노트북 인수인계 5항목): 저장소·node·AI 키·스케줄러 정상, **`credentials/ntfy.json` 없음**(데스크톱 실행분 알림 안 감 — 사용자에게 토픽 요청).
- **10/9 Threads 답글 → 사이트 유입**: 결제 일시 중단 중(`payments_paused()`가 config.ts의 `PAYMENTS_PAUSED` 읽음)엔 풀이 답글 마무리를 유료 상세 대신 "여덟 글자·오행 비율(두 사람이면 궁합 점수)은 아래 링크에서 30초 무료"로 바꾸고(`FREE_MODE_RULES`), 한 사람 답글에도 `/?ref=threads_reply` 링크를 붙임(두 사람은 기존 `/compatibility?ref=threads_reply`). 결제가 다시 열리면 자동으로 원래 마무리·링크(두 사람만)로 돌아감. 비교 기준: 이번 주 Threads 유입 7(지난주 22), `threads_reply` 누적 0 → 10/16경 비교.
