import { prisma } from "@/lib/db/prisma";
import { AdminReviewToggle } from "@/components/admin/AdminReviewToggle";
import { CouponIssuer } from "@/components/admin/CouponIssuer";
import { CopyableCode } from "@/components/admin/CopyableCode";
import { WaitlistPanel } from "@/components/admin/WaitlistPanel";
import { AdminPreviewTool } from "@/components/admin/AdminPreviewTool";
import { reconcileStalePendingOrders } from "@/lib/payment/reconcile";
import { getFunnelSummary } from "@/lib/analytics/funnelSummary";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import { getDashboard, parseRange, formatKst, RANGE_LABEL, PRODUCT_LABEL, type RangeKey } from "@/lib/admin/dashboard";

// 매출/주문 데이터는 요청마다 최신 상태여야 하므로 빌드 시점 정적 캐싱을 막는다.
export const dynamic = "force-dynamic";

// 2026-11-28 개편: 큰 사이트 관리자 화면(Shopify 홈·Stripe 홈·스마트스토어 판매자센터)처럼
// ① 큰 숫자 4개 + 이전 기간 비교 → ② 확인할 일 → ③ 추이 → ④ 결제 흐름 → ⑤ 유입·글·상품 → ⑥ 최근 결제·실패 → 도구는 접어 둠.

// 전체 이벤트 숫자(접어 두는 칸)에 쓰는 이름표.
const EVENT_LABEL: Record<AnalyticsEventName, string> = {
  landing_view: "랜딩 조회",
  saju_start: "무료 사주 시작",
  saju_complete: "사주 계산 완료",
  free_result_view: "무료 결과 조회",
  premium_preview_view: "상세분석 미리보기 노출",
  premium_cta_click: "상세분석 CTA 클릭",
  premium_offer_seen: "가격·상품 선택 영역 실제로 봄",
  premium_sticky_click: "하단 고정 바 클릭",
  checkout_start: "결제 시작",
  payment_success: "결제 성공",
  payment_fail: "결제 실패",
  compatibility_start: "궁합 페이지 방문",
  compatibility_complete: "궁합 계산 완료",
  compatibility_form_touch: "궁합 입력 시작",
  compatibility_premium_click: "궁합 상세분석 CTA 클릭",
  daily_fortune_view: "오늘의 운세 조회",
  share_click: "공유 클릭",
  review_submit: "후기 작성",
  push_opt_in_view: "푸시 알림 배너 노출",
  push_subscribe: "푸시 알림 구독",
  push_subscribe_denied: "푸시 알림 거부",
  coupon_redeemed: "쿠폰 사용",
  referral_reward_view: "초대 보상 쿠폰 확인",
  exam_promo_click: "합격운 카드 → 상세 분석 클릭",
  waitlist_view: "결제 오픈 알림 화면 봄",
  waitlist_signup: "결제 오픈 알림 신청",
  good_year_view: "좋은 해 카드 봄",
  good_year_cta_click: "좋은 해 → 시기 사용법 클릭",
  new_year_result_view: "신년운세 단독 → 무료 결과 보기",
  compat_invite_create: "궁합 링크 생성",
  compat_invite_open: "궁합 링크 열람(받은 사람)",
  compat_invite_complete: "궁합 링크 완성",
  compat_invite_notify: "궁합 결과 알림 신청",
  global_landing_view: "해외판 랜딩 조회",
  global_saju_complete: "해외판 무료 결과",
  global_waitlist_signup: "해외판 오픈 알림 신청",
  consult_ask: "AI 상담 질문",
  consult_upsell_view: "신년운세 뒤 상담 카드 노출",
  consult_upsell_click: "신년운세 뒤 상담 카드 클릭",
  checkout_retry_view: "결제 실패 → 다시 결제하기",
  payment_fail_detail: "결제 실패 사유(서버 확인)",
  y2027_view: "2027 띠·나이 페이지 방문",
  ny_teaser_view: "신년운세 결제 전 미리보기",
  ny_paycard_seen: "신년운세 결제 카드 보임",
  ny_pay_open: "신년운세 1단계 버튼 누름",
  ny_pay_click: "신년운세 결제 버튼 누름",
};

const RANGES: RangeKey[] = ["today", "7d", "30d"];

type SearchParams = Promise<{ range?: string }>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  // 관리자가 열 때마다 정체된 PENDING 주문을 재검증한다(하루 1회 크론과 별개의 안전망).
  await reconcileStalePendingOrders();

  const range = parseRange((await searchParams).range);
  const [d, funnel, reviews, coupons, waitlistCount] = await Promise.all([
    getDashboard(range),
    getFunnelSummary(range === "30d" ? 30 : range === "today" ? 1 : 7),
    prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.waitlistSignup.count(),
  ]);
  const k = d.kpi;
  const prevLabel = range === "today" ? "어제 같은 시각까지" : "그 전 같은 기간";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 bg-background px-4 py-8 text-foreground sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-accent-gold-soft">사주랩 관리자</h1>
          <p className="mt-1 text-xs text-foreground-muted">
            {formatKst(d.generatedAt)} 기준 · 한국 시간 · 사장님 시험 결제와 0원 주문은 매출에서 뺌
          </p>
        </div>
        <nav className="flex rounded-full border border-border-subtle p-1 text-sm" aria-label="기간">
          {RANGES.map((r) => (
            <a
              key={r}
              href={`/admin?range=${r}`}
              aria-current={r === range ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 ${r === range ? "bg-accent-gold font-semibold text-background" : "text-foreground-muted hover:text-foreground"}`}
            >
              {RANGE_LABEL[r]}
            </a>
          ))}
        </nav>
      </header>

      {/* ① 큰 숫자 4개 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="손님 매출" value={`${k.revenue.toLocaleString()}원`} cur={k.revenue} prev={k.revenuePrev} prevLabel={prevLabel} />
        <KpiCard label="손님 결제" value={`${k.paid}건`} cur={k.paid} prev={k.paidPrev} prevLabel={prevLabel} />
        <KpiCard label="사이트 방문" value={`${k.visits.toLocaleString()}번`} cur={k.visits} prev={k.visitsPrev} prevLabel={prevLabel} />
        <KpiCard label="결제창 열림" value={`${k.checkouts}번`} cur={k.checkouts} prev={k.checkoutsPrev} prevLabel={prevLabel} />
      </section>

      {/* ② 확인할 일 */}
      <section className="rounded-2xl border border-border-subtle bg-background-card/70 px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">확인할 일</h2>
        {d.attention.length === 0 ? (
          <p className="mt-2 text-sm text-foreground-muted">✓ 지금 확인할 일은 없어요.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {d.attention.map((a) => (
              <li
                key={a.label}
                className={`rounded-full border px-3 py-1 text-sm ${a.tone === "warn" ? "border-[#c0573e]/60 text-[#e0876f]" : "border-border-subtle text-foreground-muted"}`}
              >
                {a.tone === "warn" ? "⚠ " : "• "}
                {a.label} {a.value}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ③ 30일 추이 */}
      <Panel title="최근 30일 방문과 결제" note="회색 막대 = 하루 방문 · 막대 위 금색 숫자 = 그날 손님 결제 건수 · 막대에 마우스를 올리면 자세히">
        <TrendChart rows={d.trend} />
      </Panel>

      {/* ④ 결제 흐름 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title={`신년운세 결제 흐름 · ${RANGE_LABEL[range]}`} note="오른쪽 %는 바로 앞 단계에서 넘어온 비율">
          <FunnelBars steps={d.newYearFunnel} />
        </Panel>
        <Panel title={`나 사용설명서 결제 흐름 · ${RANGE_LABEL[range]}`} note="무료 결과를 본 사람 기준">
          <FunnelBars steps={d.manualFunnel} />
        </Panel>
      </section>

      {/* ⑤ 유입·블로그·상품 */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="어디서 들어왔나">
          <SimpleTable head={["경로", "방문"]} rows={d.channels.slice(0, 8).map((c) => [c.key, `${c.count}`])} empty="방문 기록 없음" />
        </Panel>
        <Panel title="블로그 글별 성과" note="글 이름표(post) 기준 · 11/21 이후 글부터">
          <SimpleTable
            head={["글", "조회", "결제창", "결제"]}
            rows={d.blogPosts.map((p) => [p.post, `${p.views}`, `${p.checkouts}`, `${p.paid}`])}
            empty="블로그 조회 없음"
          />
        </Panel>
        <Panel title="상품별 손님 매출">
          <SimpleTable
            head={["상품", "웹", "토스", "매출"]}
            rows={d.products.map((p) => [p.label, `${p.web}`, `${p.toss}`, `${p.revenue.toLocaleString()}원`])}
            empty="이 기간 손님 결제 없음"
          />
          <p className="mt-3 text-xs text-foreground-muted">토스 첫 질문 무료(0원) {d.freeQuestions}건은 매출에서 뺌</p>
        </Panel>
      </section>

      {/* ⑥ 최근 결제 · 실패 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="최근 손님 결제" note="최근 30일 · 시험·0원 제외">
          <SimpleTable
            head={["시각", "상품", "금액", "어디서"]}
            rows={d.recentPaid.map((o) => [formatKst(o.when), o.product, `${o.amount.toLocaleString()}원`, o.where])}
            empty="최근 30일 손님 결제 없음"
          />
        </Panel>
        <Panel title={`결제 실패 · ${RANGE_LABEL[range]}`} note="사유는 결제사가 알려 준 문장">
          <SimpleTable
            head={["시각", "상품", "금액", "사유"]}
            rows={d.failures.map((f) => [formatKst(f.when), f.product, `${f.amount.toLocaleString()}원`, f.reason])}
            empty="실패 없음"
          />
        </Panel>
      </section>

      {/* 접어 두는 도구 */}
      <section className="flex flex-col gap-3">
        <Fold title={`후기 관리 (${reviews.length}개)`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-foreground-muted">
                <tr>
                  <th className="px-3 py-2 font-normal">별점</th>
                  <th className="px-3 py-2 font-normal">내용</th>
                  <th className="px-3 py-2 font-normal">상품</th>
                  <th className="px-3 py-2 font-normal">상태</th>
                  <th className="px-3 py-2 font-normal">작성</th>
                  <th className="px-3 py-2 font-normal">관리</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2">{"★".repeat(review.rating)}</td>
                    <td className="max-w-xs truncate px-3 py-2">{review.content}</td>
                    <td className="px-3 py-2 text-foreground-muted">{PRODUCT_LABEL[review.productType] ?? review.productType}</td>
                    <td className="px-3 py-2 text-foreground-muted">{review.visible ? "노출" : "숨김"}</td>
                    <td className="px-3 py-2 text-foreground-muted">{formatKst(review.createdAt)}</td>
                    <td className="px-3 py-2">
                      <AdminReviewToggle id={review.id} visible={review.visible} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Fold>
        <Fold title="AI 콘텐츠 미리보기 (결제 없음)">
          <AdminPreviewTool />
        </Fold>
        <Fold title={`쿠폰 발급 (${coupons.length}개)`}>
          <CouponIssuer />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-foreground-muted">
                <tr>
                  <th className="px-3 py-2 font-normal">코드</th>
                  <th className="px-3 py-2 font-normal">상태</th>
                  <th className="px-3 py-2 font-normal">발급</th>
                  <th className="px-3 py-2 font-normal">만료</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2">
                      <CopyableCode code={coupon.code} />
                    </td>
                    <td className="px-3 py-2">{couponStatusLabel(coupon)}</td>
                    <td className="px-3 py-2 text-foreground-muted">{formatKst(coupon.createdAt)}</td>
                    <td className="px-3 py-2 text-foreground-muted">{formatKst(coupon.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Fold>
        <Fold title={`결제 오픈 알림 대기자 (${waitlistCount}명)`}>
          <WaitlistPanel count={waitlistCount} />
        </Fold>
        <Fold title={`전체 이벤트 숫자 · ${RANGE_LABEL[range]}`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(EVENT_LABEL) as AnalyticsEventName[]).map((name) => (
              <div key={name} className="rounded-xl border border-border-subtle px-3 py-2">
                <p className="text-xs text-foreground-muted">{EVENT_LABEL[name]}</p>
                <p className="text-sm font-semibold tabular-nums">{funnel.counts[name]}</p>
              </div>
            ))}
          </div>
        </Fold>
      </section>
    </div>
  );
}

function couponStatusLabel(coupon: { usedAt: Date | null; expiresAt: Date }): string {
  if (coupon.usedAt) return "사용됨";
  if (coupon.expiresAt < new Date()) return "만료됨";
  return "사용 가능";
}

function KpiCard({ label, value, cur, prev, prevLabel }: { label: string; value: string; cur: number; prev: number; prevLabel: string }) {
  let delta = "비교할 값 없음";
  let tone = "text-foreground-muted";
  if (prev > 0) {
    const p = Math.round(((cur - prev) / prev) * 100);
    delta = `${p > 0 ? "▲" : p < 0 ? "▼" : "–"} ${Math.abs(p)}%`;
    tone = p > 0 ? "text-[#7fbf8f]" : p < 0 ? "text-[#e0876f]" : "text-foreground-muted";
  } else if (cur > 0) {
    delta = "▲ 새로 생김";
    tone = "text-[#7fbf8f]";
  }
  return (
    <div className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className={`mt-1 text-xs ${tone}`}>
        {delta} <span className="text-foreground-muted">· {prevLabel} 대비</span>
      </p>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-background-card/70 p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-foreground-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-2xl border border-border-subtle bg-background-card/40 px-5 py-3">
      <summary className="cursor-pointer text-sm text-foreground-muted hover:text-foreground">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function SimpleTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-foreground-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-foreground-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`pb-2 font-normal ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-border-subtle">
              {r.map((cell, i) => (
                <td key={i} className={`py-2 ${i > 0 ? "pl-3 text-right tabular-nums" : "max-w-[14rem] truncate"}`} title={cell}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FunnelBars({ steps }: { steps: { label: string; count: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].count : 0;
        const rate = i === 0 ? "" : prev > 0 ? `${Math.round((s.count / prev) * 100)}%` : "—";
        const width = s.count === 0 ? 0 : Math.max(2, (s.count / max) * 100);
        return (
          <li key={s.label} className="grid grid-cols-[9.5rem_1fr_3.5rem_3rem] items-center gap-2 text-sm" title={`${s.label}: ${s.count}`}>
            <span className="truncate text-foreground-muted">{s.label}</span>
            <span className="h-3 rounded-r bg-background-elevated">
              <span className="block h-3 rounded-r bg-accent-gold" style={{ width: `${width}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{s.count.toLocaleString()}</span>
            <span className="text-right text-xs tabular-nums text-foreground-muted">{rate}</span>
          </li>
        );
      })}
    </ol>
  );
}

function TrendChart({ rows }: { rows: { day: string; visits: number; paid: number; revenue: number }[] }) {
  const W = 900;
  const H = 180;
  const padB = 22;
  const padT = 18;
  const max = Math.max(1, ...rows.map((r) => r.visits));
  const slot = W / rows.length;
  const bw = Math.max(4, slot - 6);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full min-w-[600px]" role="img" aria-label="최근 30일 하루 방문 막대 그래프">
        <line x1="0" x2={W} y1={H - padB} y2={H - padB} stroke="currentColor" className="text-border-subtle" strokeWidth="1" />
        {rows.map((r, i) => {
          const h = ((H - padB - padT) * r.visits) / max;
          const x = i * slot + (slot - bw) / 2;
          const y = H - padB - h;
          const label = r.day.slice(5).replace("-", "/");
          return (
            <g key={r.day}>
              <title>{`${label} · 방문 ${r.visits}번 · 결제 ${r.paid}건${r.revenue ? ` (${r.revenue.toLocaleString()}원)` : ""}`}</title>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              <rect x={x} y={y} width={bw} height={Math.max(h, r.visits ? 2 : 0)} rx="3" className="fill-foreground-muted/50" />
              {r.paid > 0 && (
                <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="11" className="fill-accent-gold font-semibold">
                  {r.paid}
                </text>
              )}
              {(i % 5 === 0 || i === rows.length - 1) && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" className="fill-foreground-muted">
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
