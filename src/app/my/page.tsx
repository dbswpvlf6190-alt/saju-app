import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session";
import { PRODUCT_CATALOG, type ProductType } from "@/lib/payment/config";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

/** 카카오 로그인으로 계정에 연결해둔 과거 결제 리포트 목록. 기기를 바꾸거나 쿠키가
 * 지워져도 로그인만 하면 여기서 다시 찾을 수 있다(게스트 결제는 계정 연결을 안 했다면
 * 이 목록에 안 뜬다 — 결제 완료 화면의 "로그인하고 저장하기"로 연결해야 한다). */
export default async function MyPage() {
  const cookieStore = await cookies();
  const userId = await verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!userId) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 px-5 py-16 text-center">
        <h1 className="font-serif text-xl text-accent-gold-soft">내 구매내역</h1>
        <p className="text-sm text-foreground-muted">
          카카오로 로그인하면, 기기를 바꾸거나 브라우저를 새로 깔아도 예전에 구매한 리포트를
          다시 확인할 수 있어요.
        </p>
        <a
          href="/api/auth/kakao/start"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#fee500] px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90"
        >
          카카오로 로그인
        </a>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { userId, status: "PAID" },
    orderBy: { paidAt: "desc" },
  });

  return (
    <div className="flex w-full max-w-md flex-col gap-4 px-5 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl text-accent-gold-soft">내 구매내역</h1>
        <LogoutButton />
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-foreground-muted">
          아직 계정에 연결된 리포트가 없어요. 결제 완료 화면에서 &ldquo;로그인하고 저장하기&rdquo;를
          누르면 다음부터 여기서 다시 볼 수 있어요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => {
            const product = PRODUCT_CATALOG[order.productType as ProductType];
            return (
              <Link
                key={order.id}
                href={`/my/report/${order.paymentId}`}
                className="flex items-center justify-between rounded-2xl border border-border-subtle bg-background-card/70 px-4 py-3.5 transition-colors hover:border-accent-gold"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{product?.name ?? order.productType}</span>
                  <span className="text-xs text-foreground-muted">
                    {order.paidAt?.toLocaleDateString("ko-KR") ?? order.createdAt.toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <span className="text-sm text-accent-gold-soft">보기 →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
