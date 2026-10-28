# 해외판(/en·/ja) PayPal 결제 — 인계 문서 (10/28 밤, 노트북 → 본가 데스크톱)

새 대화(Claude)가 이 문서와 `PREP_NOTES.md`, 메모리(없으면 이 문서)를 읽고 이어갈 것. **비밀값은 이 저장소에 없다.**

## 결정 사항 (10/27 사장님)
- 해외판도 국내와 같은 상품 구성을 번역해서 판다(지금은 사용설명서 `premium_report` 하나. 궁합·신년운세는 이후).
- 포트원은 사업자 명의. 결제는 **포트원 + PayPal(SPB)**. Stripe는 한국 사업자 불가 자료가 일관.
- 가격(미확정): 사용설명서 **$3.99 / ¥580**. 단위: USD는 센트(399), JPY는 엔(580). 실제 포트원 응답으로 확인함(`currency`, `amount.total` 최상위).
- 사장님 규칙: 로그인·비밀번호·API 시크릿·최종 클릭은 사장님이 직접. 채팅에 비밀값 붙이지 않음. 푸시·배포·콘솔 변경은 승인 후.

## 코드 현황 (브랜치 `work/global-payment`, 10/28 main 병합 완료, **미배포**)
- 스위치 `GLOBAL_PAYMENTS_ENABLED=false`(`src/lib/payment/config.ts`, 컴파일 상수). 켜지 않으면 해외 주문·구매 UI·법률 페이지 색인이 모두 잠겨 있다. **main에 합쳐도 사용자에게는 안 보인다.**
- 1단계 주문 통화(마이그레이션 `20261027120000_add_order_currency`), 2단계 구매 UI·PayPal SPB 버튼, 3단계 영어·일본어 AI 6장(`src/lib/ai/interpretManualGlobal.ts`), 4단계 약관·환불·개인정보(`src/lib/global/legalCopy.ts`, 일본어 특정상거래법 표기 포함), 5단계 테스트 채널 점검.
- 같이 고친 기존 버그: 장별 병렬 요청이 캐시를 덮어쓰던 문제(`8707582`, 국내 리포트에도 영향 — 별도 커밋이라 되돌릴 수 있음). 10/28 일본어 `必ず` 반복 실패 수정(`59da5a7`).
- 일일 PDF 보고서(`scripts/daily_report_pdf.py`)는 원화 매출만 집계(통화 칸이 없어도 동작).

## 검증한 것 / 못 한 것
- 한 것: 서버 흐름 통합 테스트(영어·일본어, 포트원 결제 조회만 가짜) 통과. PayPal 채널 USD 결제창(샌드박스)이 열리고 포트원 결제 기록에 `USD/399`로 남는 것까지. AI 비용 실측: **영어 약 $0.10, 일본어 약 $0.14/건**, 마진 약 85%(포트원 수수료·세금 제외).
- **못 한 것:** PayPal 승인 후 `onPaymentSuccess` → 완료 처리 → 리포트 열림, **환불**, 일본어 JPY 실결제 흐름. (샌드박스 구매자 계정으로 사장님이 로그인·승인해야 함. 사장님이 10/28에 보류.)

## 포트원 설정 (콘솔 상태)
- 테스트 채널 `사주랩 PayPal 테스트`(paypal_v2, TEST). 상점 ID·채널 키는 `.env.development.local`에만(Git 제외).
- 10/28에 로컬 테스트용 V2 API 시크릿 `saju-global-paypal-test`(무기한) 발급 — 값은 노트북의 `.env.development.local`에만 있고 **다시 볼 수 없다.** 본가에서 필요하면 새로 발급(콘솔 → 결제 연동 → 식별코드·API Keys).
- 실운영 채널은 아직 없다(전자결제 신청 필요). PayPal 비즈니스 계정은 이미 있음(대국민스토어, 한국 사업자).

## 본가에서 이어가는 방법
```bash
git fetch origin && git worktree add C:\saju-app-global work/global-payment   # 또는 기존 폴더에서 git checkout
cd C:\saju-app-global && npm ci
```
1. `.env.development.local` 직접 만들기(Git 제외 파일, 변수 이름만): `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_PAYPAL_CHANNEL_KEY`, `NEXT_PUBLIC_SITE_URL`(http://localhost:3100), `ORDER_ACCESS_SECRET`, `SESSION_SECRET`(둘 다 아무 긴 문자열), `ANTHROPIC_API_KEY`, `DATABASE_URL`(로컬 테스트 DB), `PORTONE_API_SECRET`(새로 발급). **운영 DB 주소를 넣지 말 것.**
2. 로컬 DB: `embedded-postgres.mjs` 상단 주석대로 설치 후 실행 → `npx prisma migrate deploy`.
3. 서버 흐름 시험: `GLOBAL_E2E=1 npx vitest run src/app/api/orders/__tests__/globalOrderFlow.integration.test.ts` (AI 비용이 든다. 로컬 DB에서만 돈다).
4. 결제창 시험: `src/lib/payment/config.ts`의 `GLOBAL_PAYMENTS_ENABLED`를 **로컬에서만** true로(커밋 금지) → `npx next dev -p 3100` → http://localhost:3100/en 에서 무료 결과 → 구매 → PayPal 버튼. 팝업 주소가 `sandbox.paypal.com`인지 먼저 확인하고, 테스트 구매자 계정(developer.paypal.com → Sandbox Accounts → Personal)으로만 로그인. 끝나면 스위치 원복.
5. 확인 항목: 포트원 결제 조회의 `currency`·`amount.total`, 영어 6장 생성, 콘솔에서 환불, 일본어 엔화.

## 남은 일 (우선순위)
1. 포트원 문의 발송(`PREP_NOTES.md` 1번 문안), 전자결제 신청(PayPal SPB)으로 실운영 채널 개설, PayPal Merchant ID 연결.
2. 세무·법률 확인(`PREP_NOTES.md` 3번), 일본어 원어민 감수, 가격 확정.
3. PayPal 승인·환불 시험(위 4번) 완료 후, 운영 환경변수(`NEXT_PUBLIC_PORTONE_PAYPAL_CHANNEL_KEY`, 실운영 `PORTONE_API_SECRET`) 추가.
4. main 병합 → 스위치 켜기 → 본인 소액 실결제·환불 확인 후 공개. 병합 전 `npm test`·`npx next build`(DB 주소는 로컬 테스트 DB) 통과 확인.
5. 이후: 궁합·신년운세 해외판, PayPal 위젯 언어 고정(영어 페이지에서 카드 버튼이 한국어로 나옴).
