---
name: project_two_computer_ops
description: "두 컴퓨터 운영 모델 — 평일 기숙사 노트북, 금요일 저녁~주말 본가 데스크톱, 한 번에 한 대만 켜짐. 양쪽 작업 모두 '사용'으로 둘 것"
metadata:
  node_type: memory
  type: project
  originSessionId: e5d609b5-248d-4c77-b36e-967bb52dd0cb
  modified: 2026-10-26T02:51:39.481Z
---

사용자는 **평일엔 회사 기숙사에서 노트북(DESKTOP-BNNQ4D5)으로 운영**하고, **금요일 저녁부터 주말엔 본가 데스크톱(DESKTOP-RT3IQO3)을 쓴다. 한 번에 한 대만 켜져 있다**(노트북이 켜져 있으면 데스크톱은 꺼져 있음, 반대도 같음).

**Why:** 자동화(릴스·쓰레드·인스타·보고)가 켜진 컴퓨터에서만 돌기 때문에, 켜진 컴퓨터가 항상 운영 컴퓨터가 된다. 게시 중복은 git 락이 막는다.

**How to apply:**
- 예약 작업은 **두 컴퓨터 모두 '사용'으로 둔다. 어느 쪽도 '사용 안 함'으로 끄라고 안내하지 말 것**(10/26에 내가 데스크톱 작업을 끄라고 잘못 적었다가 정정함).
- 컴퓨터를 켜면 먼저 "변경내용 가져와"(`C:\saju-app\docs\SYNC_CHECKLIST.md`) 절차. 새 작업을 만들면 **양쪽에 같은 작업을 등록**해야 함(작업 정의는 컴퓨터마다 따로 저장됨).
- 컴퓨터마다 다른 것: 비밀 파일(`credentials/`, `.env.local`, `.env.production`)과 토큰 사본(나이 확인), 해외판 Threads 토큰(`threads_token_ja/en.json`)은 데스크톱에만 있어 해외판은 주말에만 돎, 바탕 화면 위치(노트북은 `OneDrive\바탕 화면`).
- 노트북은 꺼져 있으면 자동화 정지, 22:30 절전(`SajuNightSleep`).
- 코드(브랜치)는 컴퓨터 간에 GitHub를 거쳐야 넘어감: `work/**` 브랜치는 Vercel 배포가 꺼져 있음(옛 main에서 갈라진 브랜치는 vercel.json이 옛것이라 그대로 올리면 배포됨 — main을 먼저 합치고 올릴 것). 10/26에 `work/new-year-v2`·`work/toss-v10`을 올렸고 배포 0건 확인함.
- 해외판 Threads(10/26 사장님 결정: 평일에도 돌림): **10/26 완료.** 사장님이 Meta 개발자 앱 `sajulab threads` 사용자 토큰 생성기에서 `@sajulab.jp`·`@sajulab.en` 토큰을 직접 발급해 노트북 `credentials/threads_token_ja/en.txt`에 넣었고, `threads_api.py --market ja|en --import-token`으로 저장 + `scripts\setup_global_threads_tasks.ps1`로 작업 4개 등록. 데스크톱은 기존 토큰 사본 사용 — 새 토큰이 기존 것을 무효로 만들었을 가능성이 있어, **주말에 데스크톱에서 해외판 토큰 오류가 나면 같은 방법으로 새 토큰을 넣을 것.** 토큰 발급·복사는 비밀이라 사용자가 직접(채팅·git에 값 금지).
