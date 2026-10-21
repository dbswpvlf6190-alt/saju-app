# -*- coding: utf-8 -*-
"""토스 인앱 결제 주문의 환불 상태를 토스에 직접 물어 서버 주문과 맞춘다.
  python refund_sync.py            → 조회만(환불된 주문이 있으면 목록 출력)
  python refund_sync.py --apply    → 토스에서 REFUNDED인 주문을 서버에서 CANCELED로 바꿔 6장 접근을 막는다
mTLS 인증서는 C:\\saju-secrets\\toss-mtls 에 있다(원본 키는 이 폴더 밖으로 복사하지 말 것)."""
import json, os, re, ssl, sys, urllib.request, http.client

sys.stdout.reconfigure(encoding="utf-8")
SAJU = r"C:\saju-app"
CERT = r"C:\saju-secrets\toss-mtls\sajulabiap_public.crt"
KEY = r"C:\saju-secrets\toss-mtls\sajulabiap_private.key"
sys.path.insert(0, os.path.join(SAJU, "scripts"))
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(SAJU, ".env.local"))
import fetch_insights as fi  # noqa: E402


def toss_status(order_id):
    ctx = ssl.create_default_context()
    ctx.load_cert_chain(CERT, KEY)
    conn = http.client.HTTPSConnection("apps-in-toss-api.toss.im", context=ctx, timeout=20)
    body = json.dumps({"orderId": order_id})
    conn.request("POST", "/api-partner/v1/apps-in-toss/order/get-order-status", body, {"Content-Type": "application/json"})
    data = json.loads(conn.getresponse().read().decode("utf-8"))
    conn.close()
    return (data.get("success") or {}).get("status", "UNKNOWN")


def check():
    rows = fi.neon_query("""SELECT "paymentId", status, amount, "createdAt" FROM "Order" WHERE "paymentId" LIKE 'toss-%' ORDER BY "createdAt" DESC LIMIT 200""")
    result = []
    for r in rows:
        oid = r["paymentId"].replace("toss-", "", 1)
        try:
            st = toss_status(oid)
        except Exception as e:  # noqa: BLE001
            st = f"ERR({str(e)[:30]})"
        result.append({"paymentId": r["paymentId"], "server": r["status"], "toss": st, "createdAt": r["createdAt"]})
    return result


def main():
    apply = "--apply" in sys.argv
    res = check()
    refunded = [x for x in res if x["toss"] == "REFUNDED" and x["server"] == "PAID"]
    for x in res:
        print(f"{x['paymentId'][:14]} 서버:{x['server']} 토스:{x['toss']}")
    if refunded and apply:
        ids = ", ".join("'" + x["paymentId"].replace("'", "") + "'" for x in refunded)
        fi.neon_query(f"""UPDATE "Order" SET status = 'CANCELED' WHERE "paymentId" IN ({ids}) AND status = 'PAID' RETURNING "paymentId" """)
        print(f"환불된 {len(refunded)}건을 서버에서 CANCELED로 정리했습니다.")
    elif refunded:
        print(f"환불된 주문 {len(refunded)}건 있음(정리하려면 --apply).")
    else:
        print("환불 확정된 주문 없음.")
    return res


if __name__ == "__main__":
    main()
