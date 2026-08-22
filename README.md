# 사주풀이

생년월일시로 사주팔자를 계산하고, 무료 결과와 유료 상세 리포트(AI 해석)를 제공하는 Next.js 앱입니다.

## 기술 스택

- **Next.js 16** (App Router, TypeScript) + Tailwind CSS
- **Prisma** + **PostgreSQL** (주문/결제 데이터)
- **PortOne(포트원) V2** — 결제 연동
- **Claude API** (`@anthropic-ai/sdk`) — 유료 리포트 AI 해석
- **Vitest** — 사주 계산 엔진 테스트

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 아래 "환경변수" 참고해서 값 채우기
npx prisma migrate deploy    # DB 스키마 적용 (최초 1회)
npm run dev
```

http://localhost:3000 에서 확인.

## 환경변수

`.env.example` 참고. `.env.local`에 실제 값을 채워야 합니다(git에 커밋되지 않음).

| 변수 | 필수 여부 | 설명 |
|---|---|---|
| `DATABASE_URL` | 필수 | PostgreSQL 연결 문자열 |
| `ADMIN_PASSWORD` | 필수 | `/admin` 대시보드 로그인 비밀번호 |
| `ANTHROPIC_API_KEY` | 유료 리포트 AI 해석에 필요 | [console.anthropic.com](https://console.anthropic.com)에서 발급 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | 결제 기능에 필요 | 브라우저에 노출되는 값(비밀 아님) |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | 결제 기능에 필요 | 브라우저에 노출되는 값(비밀 아님) |
| `PORTONE_API_SECRET` | 결제 기능에 필요 | 서버 전용, 절대 노출 금지 |

## 스크립트

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run start    # 빌드된 앱 실행
npm run lint     # ESLint
npm run test     # 사주 계산 엔진 테스트
```

## 배포

Vercel에 배포하며, PostgreSQL은 Neon(Vercel Postgres 통합)을 사용합니다. `main` 브랜치에 push하면
Vercel이 자동으로 Production 배포를 진행합니다. 환경변수는 Vercel Project Settings →
Environment Variables에 Production/Preview/Development 별로 등록합니다.
