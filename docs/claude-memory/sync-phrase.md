---
name: sync-phrase
description: "사용자가 \"변경내용 가져와\"라고 하면 다른 컴퓨터 변경을 이 컴퓨터에 반영하는 절차를 묻지 않고 실행"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cd13d65c-cdf4-40ec-a784-33d8b22e39af
  modified: 2026-10-24T03:53:44.939Z
---

사용자는 데스크톱·노트북 두 대를 쓰고, 다른 컴퓨터에 필요한 설정을 명령어로 직접 실행하는 걸 번거로워한다. "변경내용 가져와"라고만 하면 Claude가 알아서 맞추길 원한다(2026-10-24).

**Why:** 노트북에서 PowerShell 명령을 직접 실행해 달라는 안내에 혼란·피로감을 보였다.
**How to apply:** saju-app의 docs/SYNC_CHECKLIST.md(CLAUDE.md에서 불러옴) 순서대로 git pull → 스케줄 맞춤 → 비밀 파일 존재 확인 → 보고서 시험 생성 → 짧은 보고. 다른 컴퓨터에서 할 일이 생기면 명령어를 알려주는 대신 "그 컴퓨터에서 '변경내용 가져와'라고 하세요"로 안내. [[saju-app-shared-checkout]]
