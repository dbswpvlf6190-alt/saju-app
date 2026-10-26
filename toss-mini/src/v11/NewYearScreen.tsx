import { useEffect, useMemo, useRef, useState } from "react";
import { Share } from "@apps-in-toss/web-framework";
import type { SajuResult } from "@saju/types";
import { buildNewYearHook, monthList, weekdayKor } from "@saju/newYearHook";
import { groupNewYearBlocks, parseNewYearText } from "@newyear/format";
import { loadNewYear, type Purchase } from "../iap";
import { NY_YEAR, nyTrack } from "./ny";
import "./v11.css";

// 신년운세를 산 사람이 보는 화면(2026-10-26).
// 결제 직후 AI 글은 20~45초 걸리므로, 기다리는 동안 빈 화면이 되지 않게 **달별 카드는 기기에서 바로 계산해 즉시 보여 준다**
// (결제 전 카드가 약속한 것: 달 이름·좋은 날짜·재물·가족·할 일). AI 글(총평·분기 키워드·한 줄 풀이·실천 조언)은 도착하는 대로
// 채운다. 읽는 도중 화면이 밀리지 않도록 총평 같은 AI 문단은 맨 아래에 붙이고, 위에는 진행 상태 한 줄만 둔다.

type LoadState = "loading" | "done" | "error";

export function NewYearScreen({
  purchase,
  result,
  onBack,
  previewText,
}: {
  purchase: Purchase;
  result: SajuResult;
  onBack: () => void;
  /** 개발 미리보기 전용(v11-preview.html): 서버 없이 글을 바로 채운다. 실제 앱에서는 넘기지 않는다. */
  previewText?: string;
}) {
  const hook = useMemo(() => buildNewYearHook(result, NY_YEAR), [result]);
  const [text, setText] = useState<string | null>(previewText ?? null);
  const [state, setState] = useState<LoadState>(previewText ? "done" : "loading");
  const [tries, setTries] = useState(0);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewText) return;
    let alive = true;
    nyTrack("ny_screen_view", { year: hook.year });
    loadNewYear(purchase)
      .then((t) => {
        if (!alive) return;
        setText(t);
        setState("done");
        nyTrack("ny_text_ready", { year: hook.year });
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [purchase, hook.year, tries, previewText]);

  const grouped = useMemo(() => (text ? groupNewYearBlocks(parseNewYearText(text)) : null), [text]);
  const bestSet = new Set(hook.best.map((m) => m.month));
  const aiSections = grouped?.sections.filter((s) => s.heading !== "월별 흐름") ?? [];

  async function share() {
    nyTrack("ny_share_click", { year: hook.year });
    try {
      const link = await Share.createLink({ path: "intoss://sajulab-app" });
      await Share.sendMessage({
        message: `내 ${hook.year}년은 '${hook.label}'이래요 🎍 흐름이 좋은 달은 ${monthList(hook.best.map((m) => m.month))}! 생일만 넣으면 나도 볼 수 있어요\n${link}`,
      });
    } catch {
      /* 토스 밖(개발 화면)에서는 공유 시트가 없다 */
    }
  }

  return (
    <main className="page ny-page">
      <header className="hero">
        <div className="eyebrow">AI가 작성한 결과 · 내 사주 풀이</div>
        <h1>{hook.year}년 신년운세</h1>
        <p>
          {hook.label} · 흐름이 좋은 달 {monthList(hook.best.map((m) => m.month))}
        </p>
      </header>

      <section className="ny-status" role="status">
        {state === "loading" && (
          <>
            <span className="ny-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>총평과 한 줄 풀이를 쓰고 있어요 (약 30초). 달별 풀이는 먼저 읽어 보세요.</span>
          </>
        )}
        {state === "done" && (
          <>
            <span>✅ 총평이 준비됐어요.</span>
            <button type="button" className="ny-link" onClick={() => aiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              총평 보러 가기 ↓
            </button>
          </>
        )}
        {state === "error" && (
          <>
            <span>총평을 아직 불러오지 못했어요. 달별 풀이는 그대로 볼 수 있어요.</span>
            <button
              type="button"
              className="ny-link"
              onClick={() => {
                setState("loading");
                setTries((n) => n + 1);
              }}
            >
              다시 불러오기
            </button>
          </>
        )}
      </section>

      {hook.flow.map((m) => {
        const best = bestSet.has(m.month);
        const ai = grouped?.monthLines[m.month];
        return (
          <section key={m.month} className={`card ny-month${best ? " best" : ""}`}>
            <div className="ny-month-head">
              <span className="ny-m-no">{m.month}월</span>
              <span className="ny-m-title">{m.title}</span>
              {best && <span className="ny-m-star">★ 흐름이 좋은 달</span>}
            </div>
            {m.month === 1 && <p className="ny-m-note">사주에서는 입춘(2월 4일경)부터 새해로 봐요. 1월은 아직 지난해 기운이 이어지는 달이에요.</p>}
            <dl className="ny-m-rows">
              <div>
                <dt>좋은 날</dt>
                <dd className="ny-chips">
                  {m.goodDays.length > 0 ? (
                    m.goodDays.map((d) => (
                      <span key={d} className="ny-chip">
                        {d}일({weekdayKor(hook.year, m.month, d)})
                      </span>
                    ))
                  ) : (
                    <span className="ny-none">날짜보다 마음을 챙기는 달이에요</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>재물</dt>
                <dd>{m.money}</dd>
              </div>
              <div>
                <dt>가족·사람</dt>
                <dd>{m.people}</dd>
              </div>
              <div>
                <dt>이달의 할 일</dt>
                <dd>{m.tip}</dd>
              </div>
            </dl>
            <p className={`ny-m-ai${ai ? "" : " pending"}`}>
              {ai ?? (state === "loading" ? "내 사주로 한 줄 풀이를 쓰는 중이에요…" : "")}
            </p>
          </section>
        );
      })}

      <div ref={aiRef} className="ny-ai-anchor" />
      {state === "loading" && (
        <section className="card ny-wait">
          <h2>내 사주로 쓰는 총평</h2>
          <p className="muted">잠시 후 이 자리에 총평, 분기별 키워드, 실천 조언이 나타나요.</p>
        </section>
      )}
      {grouped && grouped.intro.length > 0 && (
        <section className="card ny-ai-card">
          <h2>내 사주로 쓴 {hook.year}년 풀이</h2>
          {grouped.intro.map((p, i) => (
            <p key={i} style={{ whiteSpace: "pre-line" }}>{p}</p>
          ))}
        </section>
      )}
      {aiSections.map((s) => (
        <section key={s.heading} className="card ny-ai-card">
          <h2>{s.heading}</h2>
          {s.paras.map((p, i) => (
            <p key={i} style={{ whiteSpace: "pre-line" }}>{p}</p>
          ))}
        </section>
      ))}

      <button type="button" className="cta" onClick={() => void share()}>
        가족에게도 알려주기
      </button>
      <button type="button" className="ghost" onClick={onBack}>
        돌아가기
      </button>
      <p className="foot">이 내용은 AI가 작성한 결과물이며, 전통 명리학 해석을 바탕으로 한 참고용이에요. 산 풀이는 다시 열어볼 수 있어요.</p>
    </main>
  );
}
