import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { SajuInput } from "@/lib/saju";
import { checkQuota, tokenMatches, type FamilyProfile } from "@/lib/consult/pass";
import { answerConsultQuestion, buildConsultFacts, ConsultAiError } from "@/lib/consult/answer";
import { CRISIS_REPLY, MAX_QUESTION_CHARS, isCrisisQuestion } from "@/lib/consult/safety";
import { rateLimit, rateLimitByIdentifier } from "@/lib/security/rateLimit";

// 답변 생성은 보통 10~25초. 여유를 둔다(모든 요금제 공통 상한 60초).
export const maxDuration = 60;

const HISTORY_TURNS = 6;

interface AskBody {
  k?: string;
  question?: string;
  profileKey?: string;
}

/** 상담권으로 질문 하나에 답한다. 횟수·하루 상한·AI 비용 상한을 지키고, 위기 신호에는 상담 전화를 먼저 안내한다(차감 없음). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ passId: string }> }) {
  const { ok } = rateLimit(req, "consult:ask", { limit: 10, windowMs: 60_000 });
  if (!ok) return NextResponse.json({ error: "잠시 후 다시 물어봐 주세요." }, { status: 429 });

  const { passId } = await params;
  let body: AskBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const question = String(body.question ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
  if (!question) return NextResponse.json({ error: "궁금한 것을 적어 주세요." }, { status: 400 });
  if (question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: `질문은 ${MAX_QUESTION_CHARS}자까지 적을 수 있어요.` }, { status: 400 });
  }

  const pass = await prisma.consultPass.findUnique({ where: { id: passId } });
  if (!pass || !tokenMatches(pass.token, body.k)) {
    return NextResponse.json({ error: "상담권을 찾을 수 없어요." }, { status: 404 });
  }
  // 같은 상담권으로 동시에 여러 질문을 보내 횟수를 넘기는 것을 막는다.
  if (!rateLimitByIdentifier(pass.id, "consult:ask:pass", { limit: 1, windowMs: 8_000 }).ok) {
    return NextResponse.json({ error: "앞 질문의 답을 쓰고 있어요. 잠시만 기다려 주세요." }, { status: 429 });
  }

  const profileKey = body.profileKey && body.profileKey !== "owner" ? body.profileKey : "owner";
  let input: SajuInput | null = null;
  let who = pass.ownerName ? `${pass.ownerName} 님(본인)` : "본인";
  if (profileKey === "owner") {
    input = pass.ownerInputJson ? (JSON.parse(pass.ownerInputJson) as SajuInput) : null;
  } else {
    const fam = (JSON.parse(pass.familyJson) as FamilyProfile[]).find((f) => f.key === profileKey);
    if (fam) {
      input = fam.input;
      who = `${fam.rel}${fam.name ? `(${fam.name})` : ""}`;
    }
  }
  if (!input) return NextResponse.json({ error: "상담받을 분의 생년월일이 없어요." }, { status: 400 });

  if (isCrisisQuestion(question)) {
    await prisma.consultMessage.createMany({
      data: [
        { passId: pass.id, profileKey, role: "user", content: question },
        { passId: pass.id, profileKey, role: "assistant", content: CRISIS_REPLY },
      ],
    });
    return NextResponse.json({ answer: CRISIS_REPLY, charged: false });
  }

  const quota = await checkQuota(pass);
  if (!quota.ok) return NextResponse.json({ error: quota.message, reason: quota.reason }, { status: 402 });

  const recent = await prisma.consultMessage.findMany({
    where: { passId: pass.id, profileKey },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS * 2,
    select: { role: true, content: true },
  });
  const history = recent
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  // 대화는 user로 시작해야 한다(앞에 사주 데이터 소개 턴이 붙으므로 assistant로 시작하면 순서가 꼬인다).
  while (history.length && history[0].role !== "user") history.shift();

  let answer: string;
  let costKrw: number;
  try {
    ({ text: answer, costKrw } = await answerConsultQuestion({ facts: buildConsultFacts(input), who, history, question }));
  } catch (e) {
    if (e instanceof ConsultAiError) console.error("상담 답변 생성 실패:", e.message);
    else console.error("상담 답변 생성 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "답변을 만들지 못했어요. 잠시 후 다시 물어봐 주세요(횟수는 차감되지 않았어요)." }, { status: 503 });
  }

  await prisma.$transaction([
    prisma.consultMessage.create({ data: { passId: pass.id, profileKey, role: "user", content: question } }),
    prisma.consultMessage.create({ data: { passId: pass.id, profileKey, role: "assistant", content: answer, costKrw } }),
    prisma.consultPass.update({
      where: { id: pass.id },
      data: {
        costUsedKrw: { increment: costKrw },
        ...(pass.creditsLeft !== null ? { creditsLeft: { decrement: 1 } } : {}),
      },
    }),
  ]);

  const after = await prisma.consultPass.findUnique({ where: { id: pass.id } });
  return NextResponse.json({ answer, charged: true, quota: after ? await checkQuota(after) : null });
}
