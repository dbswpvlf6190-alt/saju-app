---
name: keep-automation-repos-clean
description: C:\saju-app / C:\shorts_auto main 작업 폴더에 커밋 안 된 변경을 남기면 스케줄러 pull이 조용히 실패해 자동화가 멈춘다
metadata:
  node_type: memory
  type: feedback
  originSessionId: bc77b42a-e068-4c08-bfb6-179b6d577060
  modified: 2026-10-06T04:17:13.358Z
---

자동화 저장소(C:\saju-app, C:\shorts_auto)의 main 작업 폴더에 커밋 안 된 변경을 남기지 말 것. 새 기능은 별도 브랜치(예: pricing-3tier)에 커밋해두고 main은 항상 깨끗하게 유지.

**Why:** 스케줄러가 쓰는 `git pull --rebase`는 작업 폴더가 더러우면 실패하고 "무시하고 계속"으로 넘어간다. 2026-10-01에 가격 3단계 코드를 커밋 없이 남겨 노트북이 원격과 어긋났고, 그 사이 데스크톱이 릴스 대기열을 채워 올렸는데 노트북은 빈 줄 알고 10/5 릴스를 못 올렸다. 원인을 ANTHROPIC_API_KEY 탓으로 잘못 진단했었다.

**How to apply:** 코드 작업 중 main에서 파일을 수정했다면 바로 커밋·푸시하거나 브랜치로 옮긴다. 작업 폴더를 non-main 브랜치에 둔 채 끝내지 말 것(스케줄러가 그 브랜치에서 돈다). 자동화가 멈췄다고 하면 키 문제 전에 `git status -sb`(ahead/behind)부터 확인.

관련: 데스크톱은 본가에 있고 평일엔 꺼져 있다. 노트북 C:\saju-app\.env.local에 ANTHROPIC_API_KEY(키 이름 saju-laptop, 만료 없음)를 2026-10-06에 설정함. 대기열 소진 시 ntfy 알림 추가됨.
