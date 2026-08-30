# 사주랩 프로덕션 출시 전 최종 보안 감사 (2026-08-30)

전체 코드베이스(모든 API 라우트, 미들웨어, DB 스키마, 클라이언트 저장소 사용처)를 직접 읽고, git 히스토리를 직접 조회해서 확인했습니다. 코드는 전혀 수정하지 않았습니다. 기존 두 개인정보 감사(`PRIVACY_AUDIT.md`, `PRIVACY_DB_API_AUDIT.md`)에서 이미 확인된 내용은 결론만 인용하고, 이번에 새로 요청하신 항목(XSS/SQLi, CORS, CSRF, Git 노출, 보안 헤더 등)을 중심으로 추가 점검했습니다.

## 요약 — 심각도별

| 심각도 | 항목 | 상태 |
|---|---|---|
| 🟠 High → **패치 완료** | GET `/api/orders/[paymentId]` — paymentId만으로 제3자가 유료 리포트 열람 가능 | ✅ 지난 세션에서 이미 수정·테스트·배포 완료 |
| 🟠 High → **패치 완료** | 궁합 상대방(제3자) 원본 생년월일 장기 보관 | ✅ 지난 세션에서 90일 자동 파기로 수정·테스트·배포 완료 |
| 🟡 Medium → **패치 완료** | POST `/api/orders/[paymentId]/complete`에 접근 통제 없음 (상태 정보 노출 + 불필요한 재검증 유발 가능) | ✅ 수정·테스트·배포 완료 (아래 참고) |
| 🟡 Medium | 보안 헤더 전무 (`X-Frame-Options`/CSP/`Referrer-Policy` 등) — 클릭재킹 방어 없음 | 미수정 |
| 🟢 Low | 후기 등록 API가 paymentId 소유 여부를 쿠키로 재확인하지 않음(IDOR 유사 패턴) | 미수정 |
| 🟢 Low | Rate limit이 서버 메모리 기반이라 다중 인스턴스·재배포 시 무력화 | 미수정(기존 주석에 이미 명시된 한계) |
| 🟢 Low | Admin 세션 로그아웃 버튼 부재(8시간 자동 만료로 완화됨) | 미수정 |
| ⚪ 확인됨, 문제 없음 | SQL Injection, XSS, CORS, Git 시크릿 유출, 결제 금액 위변조 | 전부 안전 확인 |
| ℹ️ 참고(코드 밖 영역) | DB 백업(Neon 인프라 레벨) | 코드로 확인 불가, 수동 점검 권장 |

---

## 1. 다른 사용자의 주문·리포트에 접근 가능한 경로 (최우선 확인 항목)

### 1-1. GET `/api/orders/[paymentId]` — 🟠 High, **이미 패치됨**
직전 세션에서 발견·수정·배포·테스트 완료된 항목입니다. paymentId(UUID) 하나만 알면 인증 없이 누구나 유료 리포트(사주/궁합 해석 전문)를 조회할 수 있었습니다. 지금은 주문 생성 시 발급되는 브라우저 전용 서명 쿠키(`saju_order_{paymentId}`, httpOnly)로 보호됩니다(`src/lib/payment/orderAccess.ts`, `src/app/api/orders/[paymentId]/route.ts:41-44`). 쿠키 없이 조회 시 403, 존재하지 않는 주문은 404. 실제 프로덕션 DB의 기존 PAID 주문으로 재검증까지 완료했습니다.

### 1-2. POST `/api/orders/[paymentId]/complete` — 🟡 Medium, **✅ 패치 완료**
**(추가 업데이트, 같은 날 수정됨)** GET 라우트와 동일한 `saju_order_{paymentId}` 쿠키 검증을 이 라우트에도 추가했습니다(`complete/route.ts:35-41`). 기존 PortOne 검증·금액 대조·멱등 처리 로직은 전혀 건드리지 않았고, 쿠키 확인은 그 앞에 게이트로만 추가됐습니다. 실제 API로 테스트 완료: 쿠키 없음/위조 쿠키 → 403, 정상 쿠키(미결제 주문) → 기존과 동일하게 PortOne 검증까지 정상 도달(502 "결제 없음"), 실제 기존 PAID 주문에 쿠키 없이 조회 → 403(수정 전엔 상태가 노출되던 지점), 올바른 쿠키로는 기존과 동일하게 `{"status":"PAID"}` 반환. 아래는 수정 전 발견 당시의 원문입니다.

이 엔드포인트는 수정 전까지 접근 통제가 없었습니다(`src/app/api/orders/[paymentId]/complete/route.ts:12-37`). paymentId만 알면 누구나:
- 그 주문의 결제 상태(PENDING/PAID/FAILED/CANCELED)를 알아낼 수 있습니다(정보 노출).
- 아직 PENDING인 주문이면 PortOne 실제 결제 조회 API를 다시 호출시킬 수 있습니다.

**왜 High가 아니라 Medium인가**: (1) 응답에 리포트 내용이나 생년월일 같은 개인정보는 전혀 없고 상태값 하나뿐입니다. (2) PortOne 조회는 실제 결제 사실을 그대로 반영하는 검증 절차라, 이걸 트리거해도 결제를 위조하거나 없는 결제를 PAID로 조작할 수는 없습니다(`payment.status === "PAID" && payment.amount.total === order.amount` 이중 검증, `complete/route.ts:49-58`). (3) paymentId는 UUID(v4)라 무작위 추측이 사실상 불가능합니다 — 실제 위험은 paymentId가 다른 경로(공유 링크, 브라우저 히스토리 동기화 등)로 유출됐을 때만 발생합니다.

**수정 방법(제안)**: GET 라우트와 동일한 `saju_order_{paymentId}` 쿠키 검증을 이 라우트 맨 앞에도 추가합니다. 단, 결제 직후 흐름에서 이 쿠키는 이미 결제창을 연 그 브라우저에 존재하므로 정상 흐름에는 영향이 없습니다.

### 1-3. 그 외 리포트 접근 경로 — 문제 없음
- `POST /api/orders`(주문 생성)는 항상 새 주문만 만들고, 응답에 자기 자신의 정보만 포함합니다.
- Admin 대시보드(`/admin`)는 paymentId·상태·금액만 보여주고 리포트 본문이나 생년월일은 노출하지 않습니다(`src/app/admin/page.tsx` 직접 확인).
- `robots.txt`가 `/admin`·`/api` 전체를 크롤링 차단 중입니다(`src/app/robots.ts:12`) — 실질적 보안 통제는 아니지만 검색엔진 노출 자체는 막아둠.

---

## 2. IDOR / BOLA 추가 확인

### 2-1. POST `/api/reviews` — 🟢 Low
결제 완료(PAID) 주문의 paymentId를 body로 제시하면 후기를 남길 수 있습니다(`src/app/api/reviews/route.ts:56-74`). paymentId 소유를 증명하는 별도 검증(예: 1-1에서 만든 접근 쿠키 확인)이 없어서, **다른 사람의 실제 결제 paymentId를 알아낸 제3자가 그 주문 이름으로 후기를 남길 수 있습니다**. 다만:
- Review 스키마에 이름·연락처가 없어 PII 유출은 아니고, "그 주문에 후기가 하나 더 달린다"는 정도의 영향입니다.
- 한 주문당 후기 1건 제한(unique constraint)이라 진짜 구매자가 나중에 후기를 못 남기게 막는 부작용은 있을 수 있습니다.
- paymentId 추측 자체가 사실상 불가능해 실제 악용 가능성은 낮습니다.

**수정 방법(제안)**: 1-1과 동일한 접근 쿠키를 여기서도 확인하거나, 최소한 후기 작성 UI 자체가 이미 리포트를 열람한 화면(`ReviewForm`은 `PremiumUnlock`/`CompatibilityUnlock`의 unlocked 분기에서만 렌더링됨, `PremiumUnlock.tsx:269`)에서만 노출되므로 실질적으로는 이미 어느 정도 방어되어 있습니다 — API 자체의 방어선을 한 겹 더 두는 정도의 개선입니다.

### 2-2. 다른 리소스(Order 생성/조회, Review 목록) — 문제 없음
후기 목록(`GET /api/reviews`)은 `visible: true`만 반환하고 개인정보가 없어 IDOR 대상이 아닙니다. `Order` 생성은 항상 새 리소스를 만들 뿐 기존 리소스를 대상으로 하지 않습니다.

---

## 3. DB 직접 접근 / SQL Injection — 문제 없음
전체 코드베이스에서 `prisma.$queryRaw`/`$executeRaw`류의 raw SQL 사용이 **한 곳도 없습니다**(전체 검색 확인). 모든 DB 접근이 Prisma의 타입 안전 쿼리 빌더를 통해서만 이뤄져, 클래식한 SQL Injection 벡터가 구조적으로 차단되어 있습니다.

## 4. XSS — 문제 없음
`dangerouslySetInnerHTML` 사용처가 애플리케이션 코드에 전혀 없습니다(Prisma가 생성한 내부 라이브러리 코드에만 무관한 매치가 있었을 뿐). AI가 생성한 해석 텍스트나 후기 내용은 전부 `{text}` 형태의 JSX 텍스트 노드로만 렌더링되어(`PremiumUnlock.tsx:189`, `CompatibilityUnlock.tsx:189` 등) React가 자동으로 이스케이프합니다. 저장형 XSS 벡터가 없습니다.

## 5. 환경변수·비밀키 노출 / GitHub 노출 가능성 — 문제 없음
- `git log --all --diff-filter=A`로 저장소 전체 히스토리를 직접 조회한 결과, 실제 값이 든 `.env*`나 `credentials/` 파일이 **커밋된 적이 한 번도 없습니다** — 유일하게 커밋된 관련 파일은 값이 없는 템플릿 `.env.example`뿐입니다.
- `.gitignore`가 `credentials/`, `.env*`(예외: `.env.example`)를 정확히 제외하고 있습니다.
- Vercel에 등록된 모든 비밀키(`ADMIN_PASSWORD`, `ORDER_ACCESS_SECRET`, `CRON_SECRET`, `PORTONE_API_SECRET`, `ANTHROPIC_API_KEY`, `KAKAO_CLIENT_SECRET` 등)는 "Secret" 타입으로 등록돼 있어 대시보드에서도 값이 가려지고 `vercel env pull`로도 못 받아옵니다(직접 `vercel env ls` 조회로 확인).
- `NEXT_PUBLIC_*`로 노출되는 값(PortOne Store ID/Channel Key, Kakao JS Key)은 각 서비스가 "공개돼도 되는 식별자"로 설계한 값들이라 문제 없습니다(`.env.example` 주석에도 명시).

## 6. CORS — 문제 없음
코드베이스 전체에 `Access-Control-Allow-*` 헤더를 설정하는 곳이 없습니다. Next.js 기본값(별도 설정 없음 = 동일 출처만 허용)이 그대로 적용되어, 다른 사이트의 JS가 우리 API 응답을 직접 읽어갈 수 없습니다.

## 7. CSRF — 낮은 위험, 구조적으로 어느 정도 완화됨
- 관리자 인증 쿠키(`saju_admin_auth`)와 새로 추가한 주문 접근 쿠키(`saju_order_*`) 모두 `sameSite: "lax"`로 설정돼 있습니다(`src/app/admin/login/actions.ts:33`, `src/lib/payment/orderAccess.ts` 사용처). SameSite=Lax는 다른 사이트에서의 크로스사이트 POST/PUT 요청에 쿠키를 실어 보내지 않으므로, 이 두 쿠키를 이용한 상태 변경형 CSRF(예: 관리자가 모르는 사이 후기 숨김 처리)는 현대 브라우저에서 기본적으로 막힙니다.
- CSRF 토큰 자체는 없지만, 결제 생성(`POST /api/orders`)이나 완료 확인(`/complete`)은 "로그인 세션 탈취"형 공격의 이득이 없는 구조입니다(가격은 서버가 카탈로그에서만 결정하고, 완료 처리는 PortOne 검증을 통과해야만 하므로 CSRF로 위조 결제를 만들 수 없습니다).
- **명시적 CSRF 토큰이 없다는 점 자체는 사실**이라, 완벽한 방어는 아니지만 실질적 피해로 이어질 상태변경 경로는 찾지 못했습니다.

## 8. 보안 헤더 부재 — 🟡 Medium
`next.config.ts`가 사실상 빈 설정입니다(`next.config.ts:3-5`) — `X-Frame-Options`/`Content-Security-Policy`의 `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options` 등 어떤 보안 헤더도 명시적으로 설정돼 있지 않습니다.
- **가장 실질적인 영향**: 클릭재킹 방어가 없습니다 — 다른 사이트가 사주랩 결제 페이지를 `<iframe>`으로 감싸서 UI를 속이는 공격이 이론적으로 가능합니다(PortOne 자체 결제창은 별도 보안이 있을 가능성이 높지만, 그 앞단인 우리 사이트의 "결제하기" 버튼 화면은 무방비).
- 브라우저 자체 기본값(`Referrer-Policy: strict-origin-when-cross-origin`)이 어느 정도 완화해주지만, 명시적으로 설정하는 게 안전합니다.

**수정 방법(제안)**: `next.config.ts`에 `headers()` 함수를 추가해 최소한 `X-Frame-Options: DENY`(또는 CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`을 전역 적용합니다.

## 9. 입력값 검증 — 양호
- 사주 계산 입력(연/월/일/시/분/윤달/자시 처리 등)에 대해 서버 단에서 촘촘한 범위 검증이 이미 있습니다(`src/lib/saju/engine.ts:32-103`, 연도 1900~2100, 월 1~12, 일 실제 존재 여부, 시 0~23, 분 0~59 등 전부 확인).
- 후기 입력은 별점 1~5 정수, 길이 5~500자, 전화번호·이메일·URL·광고성 문구·욕설 키워드까지 필터링합니다(`src/lib/review/validate.ts`).
- 결제 금액은 클라이언트 입력을 절대 신뢰하지 않고 서버의 `PRODUCT_CATALOG`에서만 결정합니다(`src/app/api/orders/route.ts:56-57`) — 가격 위변조가 구조적으로 불가능합니다.

## 10. Rate Limit — 🟢 Low (기존에 이미 알려진 한계)
`src/lib/security/rateLimit.ts:8-11`의 주석에 이미 명시된 대로, 서버 메모리(`Map`) 기반이라 Vercel처럼 여러 인스턴스로 스케일되는 환경에서는 인스턴스별로 카운트가 따로 집계되고, 재배포 시 초기화됩니다. 지금 트래픽 규모에서는 실질적 위협이 낮지만, 트래픽이 늘면 Upstash Redis 같은 공유 저장소 기반으로 교체가 필요합니다(코드 주석에도 이미 이렇게 기록돼 있음 — 새로 발견한 문제라기보다 기존에 인지된 부채).

## 11. 서버 로그의 개인정보 저장 — 문제 없음
전체 `console.error`/`console.log` 호출부를 확인한 결과, 생년월일·이름·이메일·전화번호 등을 로그에 찍는 코드가 없습니다. 손상된 데이터 관련 로그도 `paymentId`만 남깁니다(`route.ts` 여러 곳에서 패턴 확인).

## 12. 브라우저 localStorage / 쿠키 — `PRIVACY_DB_API_AUDIT.md`에서 이미 상세 확인
- `saju:lastBirthInfo`(localStorage, 본인 이름+생년월일, 서버 미전송), `saju:pendingPurchase`/`saju:pendingCompatibilityPurchase`(sessionStorage, 결제 재개용, 명시적 삭제+자동 소멸), `saju_admin_auth`/`saju_order_*`(httpOnly 쿠키) — 전부 이전 감사에서 항목별로 위험도까지 정리됨. 이번 감사에서 추가로 발견된 문제 없음.

## 13. 외부 API 전달 — 문제 없음 (재확인)
- **PortOne**: 결제자 이름·이메일·휴대폰이 브라우저→PortOne으로 직접 전달되고 우리 서버는 받지도 않습니다(`PremiumUnlock.tsx:197`, `CompatibilityUnlock.tsx:163`).
- **Anthropic**: 오행비율·일간·년주·성별 등 추상화된 값만 전달, 이름·생년월일 원본·연락처는 전달되지 않음을 코드로 재확인(`interpretSaju.ts`, `interpretCompatibility.ts:39-46`).
- **Kakao**: 결제 알림은 서비스 운영자 본인 계정으로만 전송되며, 알림 문구에도 구매자 개인정보는 포함되지 않습니다(`src/lib/kakao/notify.ts` — 금액·상품종류·시각만 전송).

## 14. DB 백업 및 개인정보 보관·삭제 구조
- **애플리케이션 레벨**(코드로 구현·확인 완료): 유료 주문은 5년 보관(전자상거래법 준수), 궁합 상대방 원본은 결제 후 90일 뒤 자동 파기(직전 세션에서 구현·테스트·배포 완료), 무료 이용 데이터는 저장 자체가 없음.
- **인프라 레벨**(Neon 관리형 Postgres): 자동 백업/PITR(Point-in-Time Recovery) 정책은 Neon 콘솔 설정 영역이라 **코드로는 확인할 수 없습니다**. 90일 후 파기한 상대방 데이터가 오래된 백업 스냅샷에는 여전히 남아있을 수 있다는 점을 감안해, Neon 프로젝트의 백업 보관 기간 설정을 별도로 확인하시길 권장합니다(이건 제가 코드 감사로 대신할 수 없는 부분입니다).

---

## 다음 조치 제안 (우선순위순)

1. **(Medium)** `POST /api/orders/[paymentId]/complete`에 `saju_order_*` 쿠키 검증 추가 — 1-1과 동일한 패턴, 기존 정상 흐름에 영향 없음
2. **(Medium)** `next.config.ts`에 `X-Frame-Options`/`Referrer-Policy`/`X-Content-Type-Options` 헤더 추가
3. **(Low)** `POST /api/reviews`에도 접근 쿠키 검증 추가
4. **(참고)** Neon 콘솔에서 백업 보관 기간 직접 확인

원하시는 항목부터 순서대로 코드에 반영해드리겠습니다.
