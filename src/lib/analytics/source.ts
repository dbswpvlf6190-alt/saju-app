// 첫 유입 경로(첫 방문 때 URL의 ?ref=) 기억. 랜딩 이벤트에만 ref가 남으면 "어느 채널이 방문을 많이 데려왔나"만
// 알 수 있고 "어느 채널이 결제로 이어졌나"는 알 수 없어서, 결제 쪽 이벤트에 이 값을 src로 같이 싣는다.
// 30일 안에 다시 들어오면 첫 경로를 유지한다(나중에 다른 링크로 와도 덮어쓰지 않음).
const KEY = "saju:firstSource";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function rememberSource(ref: string | null | undefined): void {
  if (!ref) return;
  try {
    const saved = readSaved();
    if (saved) return;
    localStorage.setItem(KEY, JSON.stringify({ ref: ref.slice(0, 40), at: Date.now() }));
  } catch {
    // 저장이 막힌 브라우저면 경로만 못 남길 뿐이다.
  }
}

export function firstSource(): string | undefined {
  try {
    return readSaved()?.ref;
  } catch {
    return undefined;
  }
}

function readSaved(): { ref: string; at: number } | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as { ref?: unknown; at?: unknown };
  if (typeof parsed.ref !== "string" || typeof parsed.at !== "number" || Date.now() - parsed.at > TTL_MS) {
    localStorage.removeItem(KEY);
    return null;
  }
  return { ref: parsed.ref, at: parsed.at };
}
