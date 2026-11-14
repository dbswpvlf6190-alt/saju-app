# 사주랩 블로그 초안 (기본 위치, 11/13~)

사장님 결정(11/13): 블로그 초안은 OneDrive 대신 **이 폴더(GitHub)** 로 주고받는다. 두 컴퓨터 모두 `C:\saju-app\docs\blog-backup`에서 연다.

- `00_도구/` 초안 도구(fetch_2027.py, make_blog_images.py, queue.json, README.txt)
- `<YYYY-MM-DD>/` 그날 올릴 글(txt + `_이미지` 폴더 4장 + `_올릴_순서.txt`)

만들기·[올림] 표시·queue 갱신은 worktree에서 하고 main에 푸시한다(docs만 바뀌면 Vercel 빌드 건너뜀). 그다음 `git -C C:\saju-app pull --ff-only origin main`.
`C:\saju-app`에서 직접 고치지 않는다(자동화가 쓰는 폴더). 공개 저장소라 개인 아이디·연락처는 넣지 않는다.
옛 위치: OneDrive `바탕 화면\클로드코드1\사주랩_블로그_초안`(11/13까지), 노트북 `C:\saju-reports\blog`.
