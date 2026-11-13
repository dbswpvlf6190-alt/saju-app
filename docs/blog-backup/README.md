# 블로그 초안 보조 사본 (OneDrive가 안 될 때)

원본은 OneDrive `바탕 화면\클로드코드1\사주랩_블로그_초안\` 이다. 두 컴퓨터는 보통 OneDrive로 같은 폴더를 본다.
OneDrive 동기화가 안 되는 컴퓨터에서는 이 폴더(`C:\saju-app\docs\blog-backup`, git pull로 받음)를 대신 쓴다.

- `00_도구/` 초안 도구(fetch_2027.py, make_blog_images.py, queue.json, README.txt)
- `<YYYY-MM-DD>/` 그날 올릴 글(txt + `_이미지` 폴더 4장 + `_올릴_순서.txt`)

쓰는 법: 여기서 바로 열어 올리면 된다(파일을 고치지는 말 것 — `C:\saju-app`은 자동화가 쓰는 폴더라 변경을 남기면 안 된다).
초안을 새로 만들거나 [올림] 표시를 바꿨으면 worktree에서 이 폴더에 복사해 커밋·푸시한다(docs만 바뀌면 Vercel 빌드 건너뜀).
공개 저장소라 개인 정보(블로그 개인 아이디·연락처)는 넣지 않는다 — 초안 본문에는 사이트 주소만 있다.
