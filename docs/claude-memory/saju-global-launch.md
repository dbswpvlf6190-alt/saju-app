---
name: saju-global-launch
description: "사주랩 해외판(일본어·영어) 진행 상황 — 계획 파일, PayPal 계정, /ja·/en 페이지, 결정 사항"
metadata:
  node_type: memory
  type: project
  originSessionId: cd13d65c-cdf4-40ec-a784-33d8b22e39af
  modified: 2026-10-24T03:49:45.515Z
---

2026-10-24 시작. 외화 수익 목적. 계획: C:\Users\dbswp\.claude\plans\fluffy-watching-eich.md
- 결정: 일본어·영어 동시, 광고비 0원, 국내 계정과 분리한 언어별 새 Threads 계정, 홍보는 국내에서 통한 "생일 알려주면 풀이" 답글형 복제.
- 결제: PortOne + PayPal(SPB). Paddle은 AUP에서 운세 금지라 불가. PayPal 비즈니스 계정 생성 완료(기존 사업자, 업종 MCC 7996 '점술가' — 사용자 선택). 농협 계좌 등록 시도, 소액입금 확인 대기.
- 코드: /ja, /en 무료 결과 + 오픈 알림(waitlist src "ja:"/"en:" 접두) + 이벤트 global_landing_view/global_saju_complete/global_waitlist_signup. 2026-10-24 커밋 dea7f4b로 운영 배포 완료(https://saju-app-three-dusky.vercel.app/ja, /en). 결제 없음 ([[saju-app-shared-checkout]]).
- PayPal 농협 계좌 "확인 대기 중"(10/24 등록) → 소액입금 2건 10/26~28 예상, 사용자가 금액 입력.
- 10/24 해외 계정 개설: 인스타·Threads @sajulab.jp / @sajulab.en (프로필 완료, Threads 바이오 링크는 새 계정 제한으로 미등록 가능). Meta 앱 "sajulab threads"(1454906166696302) Threads 테스터 등록, 토큰 credentials/threads_token_ja.json·_en.json 저장(60일, threads_api 갱신 로직 사용). 토큰 생성기는 크롬에 로그인된 Threads 계정 기준이라 계정 바꿔 로그인해야 함.
- 10/24 자동 게시 가동(커밋 701ded4): scripts/run_global_threads.py --market ja|en, 대기열 scripts/global_threads_{ja,en}.json(첫 주 7개씩, 답글 풀이 불필요 형식), 링크 댓글 ref=th_{ja,en}_형식. 작업 스케줄러 SajuThreadsGlobalJA 21:10 / SajuThreadsGlobalEN 10:40. EN01 첫 글 10/24 12:16 게시.
- 10/24 일일 보고(scripts/daily_report_pdf.py) 확장·매일 20:00(사용자 요청): 2쪽 채널 퍼널, 3쪽 토스 입점(등록/심사/출시/매출 구분)·30일 과제·해외판·핵심 질문. 토스 콘솔 수치는 Claude가 report_notes.json toss_console(as_of_date)에 갱신해야 함. 알림은 먼저 만든 컴퓨터만(posted_state/daily_report). 노트북도 10/26 SYNC_CHECKLIST로 맞춤(해외 토큰 새로 발급, 데스크톱 토큰도 10/29 정상 확인).
- 다음: 답글 자동 풀이(threads_replies --market) → "생일 알려주면" 형식 시작, 대기열 보충, PayPal 결제 → scripts --market 일반화 → PayPal 확인 후 포트원 PayPal 채널·달러/엔 가격 → 전용 도메인(ksaju.com 등) 검토.
- 10/28 노트북에서 PayPal 결제 코드는 브랜치 work/global-payment로 진행(상세 docs/global-payments/HANDOFF.md, [[project_global_payment]]). 10/29 본가 데스크톱 동기화 완료.
