---
name: project_saju_app
description: 사주랩(saju-app) 최신 운영 상태·결정은 C:\saju-app\OPS_NOTES.md가 기준. 여기엔 포인터와 오래 가는 주의사항만.
metadata:
  node_type: memory
  type: project
  originSessionId: bc77b42a-e068-4c08-bfb6-179b6d577060
  modified: 2026-10-12T10:34:03.938Z
---

사주랩(`C:\saju-app`, Vercel 배포, 토스 미니앱 `toss-mini/`)의 최신 상태·절차·결정은 **`C:\saju-app\OPS_NOTES.md`** 맨 아래부터 읽을 것(날짜별 기록). 이 파일은 포인터 + 오래 가는 주의만 둔다. 관련: [[project_shorts_auto]], [[feedback_keep_automation_repos_clean]].

- 카드 결제는 카드사 심사 때문에 `PAYMENTS_PAUSED = true`(대기자 이메일 수집 중)였고, 열 때의 순서(이니시스 10곳 등록 확인 → 실결제 1회 → 플래그 해제 배포 → `/admin` 대기자 안내 메일 → 목록 삭제)가 OPS_NOTES에 있다. 현재 값은 `src/lib/payment/config.ts`에서 확인.
- 로컬 전용 브랜치 `pricing-3tier-v2`(가격 3단계)·`toss-v2`는 코드 백업 번들이 `바탕 화면\07_사주랩_인수인계\코드백업\`에 있다.

**Why:** 상태가 빨리 바뀌는 프로젝트라 요약을 여기 복제하면 금방 틀어진다.
**How to apply:** 사주랩 작업을 시작할 때 OPS_NOTES 끝부분을 먼저 읽고, 결제·가격·약관처럼 매출·심사에 걸린 변경은 사용자 동의를 받은 뒤 반영한다(사용자가 반복해서 요구한 방식). 약관 동의·로그인·비밀번호 입력은 사용자가 직접 한다.
