import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/consult/cors";
import { prisma } from "@/lib/db/prisma";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { tokenMatches, type FamilyProfile } from "@/lib/consult/pass";
import { rateLimit } from "@/lib/security/rateLimit";

const RELS = ["배우자", "아들", "딸", "어머니", "아버지", "형제자매", "손주", "기타"];

/** 묶음 상담권에 가족 생년월일을 등록한다(상품별 최대 인원까지, 지금은 추가만). */
async function handle(req: NextRequest, { params }: { params: Promise<{ passId: string }> }) {
  const { ok } = rateLimit(req, "consult:family", { limit: 10, windowMs: 60_000 });
  if (!ok) return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });

  const { passId } = await params;
  let body: { k?: string; rel?: string; name?: string; input?: SajuInput };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const pass = await prisma.consultPass.findUnique({ where: { id: passId } });
  if (!pass || !tokenMatches(pass.token, body.k)) {
    return NextResponse.json({ error: "상담권을 찾을 수 없어요." }, { status: 404 });
  }
  const family = JSON.parse(pass.familyJson) as FamilyProfile[];
  if (family.length >= pass.familyMax) {
    return NextResponse.json({ error: `가족은 ${pass.familyMax}명까지 등록할 수 있어요.` }, { status: 400 });
  }
  const rel = RELS.includes(String(body.rel)) ? String(body.rel) : "기타";
  const name = typeof body.name === "string" ? body.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 20) || undefined : undefined;
  try {
    if (!body.input) throw new SajuInputError("생년월일을 넣어 주세요.");
    calculateSaju(body.input);
  } catch (e) {
    if (e instanceof SajuInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const profile: FamilyProfile = { key: `f_${randomBytes(4).toString("hex")}`, rel, name, input: body.input };
  await prisma.consultPass.update({ where: { id: pass.id }, data: { familyJson: JSON.stringify([...family, profile]) } });
  return NextResponse.json({ key: profile.key });
}

export function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ passId: string }> }) {
  return withCors(req, await handle(req, ctx));
}
