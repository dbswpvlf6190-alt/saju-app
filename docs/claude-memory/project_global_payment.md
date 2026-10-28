---
name: project_global_payment
description: "사주랩 해외판(/ja,/en) 외국인 결제 도입 계획 — 포트원+PayPal, 현재 코드는 원화 전용, 가격안·필요 절차(10/27 조사)"
metadata:
  node_type: memory
  type: project
  originSessionId: e5d609b5-248d-4c77-b36e-967bb52dd0cb
  modified: 2026-10-29T06:40:00.000Z
---

**결정(10/27 사장님):** 해외판도 국내와 같은 상품 구성을 번역해 판다. 포트원은 사업자 명의. 결제는 포트원 + PayPal(스트라이프는 한국 사업자 가입 불가 자료가 일관). PayPal 계좌 인증은 사장님이 10/27 완료(비즈니스 계정 전환 여부는 미확인).

**조사 사실:** PayPal은 원화 미지원(엔·달러로 가격 별도). 실운영 채널은 PayPal 비즈니스 Merchant ID + 포트원 일반결제(SPB) 전자결제 신청. PayPal 한국 해외수취 수수료 4.40%+고정(USD 0.30·JPY 40), 디지털상품 소액결제 5.50%+고정(USD 0.05·JPY 7), 환전 1%/3%. 엔화 지원·최소금액·포트원 수수료·정산 주기는 미확인(포트원 문의 필요).

**코드 현황:** `Order.amount`가 Int 하나뿐(통화 없음), 결제 검증도 원화 기준. 해외판은 무료 진단(GlobalSajuFlow)만 있음. 개발 범위: 주문 통화 칸+마이그레이션, 검증 통화별, 결제·결과 화면, 일본어·영어 AI 프롬프트, 약관·환불 문서.

**가격 제안(미확정, 환율 7월말 기준 $1≈1,424원·100엔≈888원):** 사용설명서·궁합 $3.99/¥580, 신년 $2.99/¥480, 개별 항목은 소액결제 적용이 확인될 때만($1.49/¥240).

**Why:** 해외 유입(쓰레드 JA/EN)은 시작 단계(조회 3~21, 팔로워 0)라 결제 개발은 유입 반응과 병행. **How to apply:** 가입·신청·결제 연동은 사장님 확인 후만. 로그인·금융정보 입력은 사장님이 직접. 새 세션은 이 메모리와 OPS_NOTES를 읽고 이어갈 것. 관련: [[project_newyear_fortune]].

**진행(10/27 저녁):** worktree `C:\saju-app-global`, 브랜치 `work/global-payment`(로컬만, 미푸시·미배포). 1단계(주문 통화·USD/JPY 카탈로그·통화 검증, 33cfa12), 2단계(/en·/ja 구매 UI·PayPal SPB 버튼·`GLOBAL_PAYMENTS_ENABLED=false`로 잠금, 47c76df), 3단계(영어·일본어 AI 6장 생성 `interpretManualGlobal.ts`, 주문 통화→언어, 내 리포트 링크 `/en|ja/report?id&k`, f7d6358) 완료. 지금은 사용설명서(premium_report) 하나만 판매 가능. USD는 센트 단위가 SDK 문서로 확정. 남은 일: 4단계(약관·환불·개인정보 영어·일본어 — 무료 화면 "저장하지 않음" 문구 충돌), 5단계(포트원 PayPal 테스트 채널로 결제·환불 점검), 6단계(스위치 켜고 소액 실결제 후 노출). 궁합·신년운세 해외판은 이후. 사장님 몫: 포트원 문의 발송, PayPal 비즈니스 전환.

**5단계 진행(10/27 밤):** 포트원에 테스트 채널 `사주랩 PayPal 테스트`(paypal_v2, 공용 테스트 MID) 생성, 채널 키·상점 ID는 `C:\saju-app-global\.env.development.local`(git 제외). PayPal은 이미 비즈니스 계정 `대국민스토어`(판매자 ID·연결 계좌는 PayPal 화면에서 확인 — 공개 저장소라 값은 적지 않음) — 실운영 채널은 포트원 "전자결제 신청"(SPB) 후 생성. 테스트 DB는 Neon 로그인 불가라 노트북 로컬 임베디드 Postgres 17(포트 54329, 스크래치패드 `pgtool/start.mjs`로 기동, 데이터 `scratchpad/pgdata`). 서버 흐름은 `GLOBAL_E2E=1 npx vitest run src/app/api/orders/__tests__/globalOrderFlow.integration.test.ts`로 en·ja 모두 통과(결제 조회만 가짜). 같이 발견·수정: 장별 병렬 요청이 캐시를 서로 덮어쓰던 기존 버그(8707582, 국내 리포트에도 영향 있는 별도 커밋). 남은 일: 사장님이 `PORTONE_API_SECRET`을 env 파일에 직접 붙이면 실제 PayPal 팝업 테스트(플래그 임시 true), 포트원 문의 답변, 전자결제 신청, 세금·법률 검토.

**10/28 밤 진행·인계:** 포트원 V2 API 시크릿 새로 발급(로컬 테스트용 `saju-global-paypal-test`, 무기한; 노트북 `.env.development.local`에만, 재조회 불가) → 인증 200. 영어 사이트 구매 박스·PayPal 버튼($3.99, `sandbox.paypal.com` 팝업, 포트원 기록 `USD/399`)까지 확인. **PayPal 승인·환불·엔화는 사장님이 보류**(샌드박스 구매자 로그인 필요; developer.paypal.com 샌드박스 Personal 계정 있음). AI 비용 실측 영어 ≈$0.10·일본어 ≈$0.14/건, 일본어 `必ず` 반복 실패 수정(59da5a7). 브랜치는 main 병합 후 **GitHub에 푸시**(f91dd63), 인계 문서 `docs/global-payments/HANDOFF.md`(브랜치) + OPS_NOTES 10/28 밤 항목(main). 본가에는 로컬 DB·비밀값이 없어 HANDOFF대로 재구성. 사장님 몫: 포트원 문의(`PREP_NOTES.md` 문안), 전자결제 신청, 세무·법률, 가격 확정. 규칙: 로컬 스위치(GLOBAL_PAYMENTS_ENABLED) true는 커밋 금지.
