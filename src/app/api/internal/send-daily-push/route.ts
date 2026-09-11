import { NextRequest, NextResponse } from "next/server";
import { sendDailyFortunePush } from "@/lib/push/send";

/**
 * Vercel Cron이 매일 호출한다(vercel.json 참고). CRON_SECRET으로만 실행되는 내부 전용
 * 엔드포인트라 공개 API가 아니다. 구독된 브라우저 전체에 "오늘의 운세" 재방문 유도
 * 푸시를 보낸다.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await sendDailyFortunePush();
  return NextResponse.json({ ok: true, ...result });
}
