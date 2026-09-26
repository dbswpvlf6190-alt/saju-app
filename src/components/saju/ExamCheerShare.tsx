"use client";

import { useState } from "react";
import { EXAM_SEASONS, type ExamKind } from "@/lib/exam/seasons";
import { ShareButton } from "./ShareButton";

/** 합격운 결과 아래 "친구에게 응원 보내기". 받은 친구는 같은 시험 페이지에서 응원 배너를 보고
 * 자기 합격운을 확인한 뒤 다시 응원을 보낼 수 있어서, 단톡방·오픈채팅 안에서 이어진다.
 * 저장하는 데이터는 없고, 보낸 사람 이름(선택)만 링크에 실린다. */
export function ExamCheerShare({ examKind }: { examKind: ExamKind }) {
  const season = EXAM_SEASONS[examKind];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const trimmed = name.trim().slice(0, 20);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-sky-300/50 bg-sky-300/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-sky-300"
      >
        📚 친구에게 {season.noun} 응원 보내기
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-sky-300/50 bg-sky-300/10 p-3 text-left">
      <label htmlFor="cheer-name" className="text-xs text-foreground-muted">
        내 이름 (선택, 받는 친구에게 보여요)
      </label>
      <input
        id="cheer-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        placeholder="예: 민지"
        className="w-full rounded-lg border border-border-subtle bg-background-card px-3 py-2 text-sm text-foreground outline-none focus:border-sky-300"
      />
      <ShareButton
        title="사주랩 합격운"
        text={`💪 ${trimmed ? `${trimmed}의 ` : ""}${season.noun} 응원이 도착했어! 네 합격운 흐름은 어떤 타입일까? (30초, 무료)`}
        shareLabel="💬 카카오톡으로 응원 보내기"
        ctaLabel="내 합격운 확인하기"
        sharePath={season.path}
        shareParams={{ cheer: trimmed }}
        source={`exam_cheer_${examKind}`}
      />
    </div>
  );
}
