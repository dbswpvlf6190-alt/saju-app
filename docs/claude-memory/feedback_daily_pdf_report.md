---
name: feedback-daily-pdf-report
description: 사용자는 매일 같은 형식의 PDF 일일 보고서(영상·쓰레드·인스타·토스·결제·계획 포함)를 받기를 원한다. 생성기와 형식 위치.
metadata:
  node_type: memory
  type: feedback
  originSessionId: bc77b42a-e068-4c08-bfb6-179b6d577060
  modified: 2026-10-20T11:26:00.657Z
---

매일 **PDF 형식의 일일 운영 보고서**를 만들어 보낸다(10/20 사용자: "매일 이런 형식으로 보고서를 작성해서 보내줘").

**Why:** 사용자가 반복해서 보고서 형식을 요구했고, 영상(데일리 팩트랩 쇼츠·사주랩 릴스)·쓰레드·인스타·토스·웹 결제를 한 번에 보고 싶어 한다. 관련: [[feedback-report-format]].

**How to apply:**
- 생성기: `C:\saju-reports\make_daily_report.py <data_YYYY-MM-DD.json>` → `바탕 화면\07_사주랩_인수인계\일일보고서\YYYY-MM-DD_일일보고서.pdf`(reportlab, 맑은 고딕). 데이터 JSON 구조는 `data_2026-10-20.json`을 본보기로 쓴다.
- 구성: 한눈에 보기 표(영역·상태·평가) → 데일리 팩트랩 → 사주랩 릴스 → 쓰레드 → 인스타 → 토스·웹 결제(오늘 한 일/문제 표) → 앞으로의 계획 → 결정 필요 → 확인하지 못한 것.
- 수치 출처: 유튜브 Data API(`C:\shorts_auto\credentials\token.json`), 인스타 `scripts/fetch_insights.py`, 쓰레드 `scripts/threads_weekly_report.py`·`threads_replies`, 웹 결제는 DB(`.env.local`의 DATABASE_URL), 토스 콘솔은 로그인 필요(Chrome). 못 구한 값은 지어내지 말고 "확인 못 함"에 적는다.
- 유튜브 API 시각은 UTC → 한국시간(+9)으로 바꿔 쓴다.
- 보낼 때는 SendUserFile로 파일을 전달하고 대화에는 요약을 같이 쓴다.
