# 일일 보고서 생성기(백업 사본)
- 실제 실행 위치는 `C:\saju-reports\`(작업 스케줄러 `SajuDailyReport` 매일 21:40, 정오 전 밀린 실행은 어제 날짜로 생성). 이 폴더는 코드 백업이다.
- 결과 PDF: `바탕 화면\사주랩_보고서\`. `refund_sync.py`는 토스 환불 확정 주문을 서버에서 CANCELED로 정리(`--apply`).
- 토스 mTLS 키는 `C:\saju-secrets\toss-mtls\`에만 있다(이 저장소에 넣지 말 것).
