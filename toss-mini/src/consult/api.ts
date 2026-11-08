import type { SajuInput } from "@saju/types";
import { API_BASE_URL, CONSULT_PRODUCTS, iapAvailable, type ConsultProduct } from "../iap";

export function consultAvailable(): boolean {
  return CONSULT_PRODUCTS.some((p) => iapAvailable(p));
}

// v15 AI 사주 상담: 상담방은 웹과 같은 서버 API를 쓴다(/api/consult/[passId]). 사전 확인 요청이 없도록 GET은 헤더 없이, POST는 text/plain으로 보낸다.

/** 토스 콘솔 판매가(공급가 10원 단위 × 1.1). 서버 TOSS_CONSULT_PRICES_KRW와 같아야 한다. */
export const CONSULT_PRICE: Record<ConsultProduct, number> = {
  consult5: Number(import.meta.env.VITE_CONSULT5_PRICE) || 4950,
  consultNy: Number(import.meta.env.VITE_CONSULT_NY_PRICE) || 14850,
  consultBundle: Number(import.meta.env.VITE_CONSULT_BUNDLE_PRICE) || 29700,
};

export const CONSULT_INFO: Record<ConsultProduct, { name: string; points: string[]; badge?: string }> = {
  consultNy: {
    name: "2027 신년운세 + AI 상담 15회",
    points: ["열두 달 신년운세 리포트(좋은 날·조심할 달)", "궁금한 것 15번 물어보기 · 1년 안에 나눠서"],
    badge: "가장 많이 골라요",
  },
  consultBundle: {
    name: "평생·신년운세 + 가족 2명 + 30일 상담",
    points: ["평생 사용설명서 6장 + 2027 신년운세", "배우자·자녀 등 가족 2명까지 함께 상담", "30일 동안 하루 20개까지 질문"],
  },
  consult5: {
    name: "AI 사주 상담 5회",
    points: ["궁금한 것 5번 물어보기", "1년 안에 나눠서 써도 돼요"],
  },
};

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export interface PassSummary {
  label: string;
  metaphor: string;
  birth: string;
}
export interface PassView {
  id: string;
  productName: string;
  ownerName: string | null;
  owner: PassSummary | null;
  family: { key: string; rel: string; name: string | null; summary: PassSummary }[];
  familyMax: number;
  expiresAt: string;
  quota: { ok: true; remainingLabel: string } | { ok: false; reason: string; message: string };
  reports: { kind: "ny" | "pr"; title: string }[];
  messages: { id: string; role: string; content: string; profileKey: string }[];
  notice: string;
}

async function readJson<T>(res: Response): Promise<T & { error?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string };
}

export async function fetchPass(passId: string, k: string): Promise<PassView> {
  const res = await fetch(`${API_BASE_URL}/api/consult/${encodeURIComponent(passId)}?k=${encodeURIComponent(k)}`, { cache: "no-store" });
  const data = await readJson<PassView>(res);
  if (!res.ok) throw new Error(data.error ?? "상담방을 열지 못했어요.");
  return data;
}

export async function askQuestion(passId: string, k: string, question: string, profileKey: string): Promise<{ answer?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/consult/${encodeURIComponent(passId)}/ask`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ k, question, profileKey }),
    });
    const data = await readJson<{ answer?: string }>(res);
    return res.ok ? { answer: data.answer } : { error: data.error ?? "답변을 받지 못했어요." };
  } catch {
    return { error: "연결이 끊겼어요. 잠시 후 다시 물어봐 주세요." };
  }
}

export async function addFamilyMember(passId: string, k: string, rel: string, input: SajuInput, name?: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/consult/${encodeURIComponent(passId)}/family`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ k, rel, name, input }),
  });
  const data = await readJson<{ key?: string }>(res);
  if (!res.ok || !data.key) throw new Error(data.error ?? "가족을 등록하지 못했어요.");
  return data.key;
}

/** 답변 끝의 "다음에 물어볼 만한 것: A / B"를 버튼으로 꺼내고 본문에서는 뺀다. */
export function splitFollowUps(text: string): { body: string; next: string[] } {
  const m = text.match(/\n?\s*다음에 물어볼 만한 것\s*[:：]\s*(.+)\s*$/);
  if (!m) return { body: text, next: [] };
  return {
    body: text.slice(0, m.index).trim(),
    next: m[1].split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean).slice(0, 3),
  };
}
