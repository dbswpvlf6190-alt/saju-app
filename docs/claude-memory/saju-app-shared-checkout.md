---
name: saju-app-shared-checkout
description: saju-app 폴더는 자동 게시 스크립트가 같은 체크아웃에서 git pull/push 하므로 작업 중 변경을 방치하거나 로컬 커밋하면 안 됨
metadata:
  node_type: memory
  type: project
  originSessionId: cd13d65c-cdf4-40ec-a784-33d8b22e39af
  modified: 2026-10-24T01:56:30.412Z
---

saju-app(C:\Users\dbswp\Desktop\사주 어플 제작\saju-app)은 이 컴퓨터(DESKTOP-RT3IQO3)의 작업 스케줄러 자동화(Threads/인스타 게시, scripts/git_sync.py)가 같은 폴더에서 `git pull --rebase` 후 락 파일을 커밋·`git push origin main` 한다.
- 작업 트리가 더러우면 pull이 실패 → push 거부 → 락 선점 실패로 게시를 건너뛸 수 있다.
- 로컬에 커밋만 해 두면 자동화의 다음 push에 실려 main(=Vercel 운영)으로 배포된다.

**Why:** 2026-10-24 해외판(/ja,/en) 작업 중 확인. 승인 전 운영 배포·자동 게시 실패를 막기 위해.
**How to apply:** saju-app 수정은 끝나면 바로 커밋·푸시(사용자 승인 후)하거나, 승인 전이면 `git stash`로 보관해 작업 트리를 깨끗하게 둔다. 해외판 변경은 stash "global-pages"에 보관됨 ([[saju-global-launch]]).
