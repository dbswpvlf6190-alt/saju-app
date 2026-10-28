---
name: project-shorts-auto
description: daily.factlab 유튜브/틱톡/인스타 쇼츠 자동화 프로젝트 — 코드 위치와 최신 상태는 항상 C:\shorts_auto\CLAUDE.md 참고
metadata: 
  node_type: memory
  type: reference
  originSessionId: bc77b42a-e068-4c08-bfb6-179b6d577060
  modified: 2026-08-22T13:03:26.630Z
---

사용자는 부동산 경매·세금 정책 주제로 유튜브(@daily.factlab)·틱톡·인스타그램에 쇼츠를 올리는 1인 크리에이터이고, 노트북·데스크톱 두 컴퓨터에서 자동화 파이프라인(`run_queue.py`)을 운영 중.

**이 프로젝트에 대한 최신 정보는 항상 `C:\shorts_auto\CLAUDE.md`에서 확인할 것** — 프로젝트 구조, 파이프라인 단계, 알려진 이슈, 변경 이력이 전부 거기 있고 git으로 두 컴퓨터에 동기화됨. 이 메모리 파일은 auto-memory가 컴퓨터별로 안 묶여서(`~/.claude/`가 로컬 전용) 새 세션이 이 프로젝트를 처음부터 못 찾는 상황을 막기 위한 포인터일 뿐, 내용을 여기 복제하지 않음.

**2026-08-22 기준 핵심 아키텍처**: `C:\shorts_auto`(OneDrive 아님, 순수 로컬) + GitHub 비공개 저장소(`dbswpvlf6190-alt/shorts-auto-`)로 두 컴퓨터 동기화. 평일=노트북/주말=데스크톱으로 스케줄러 분리. 렌더링 결과물은 `~\ShortsAutoRender\`에 별도 저장.

관련: [[feedback-avoid-repetitive-manual-sync]]
