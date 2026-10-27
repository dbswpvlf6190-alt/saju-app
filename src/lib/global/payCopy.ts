import type { GlobalLocale } from "./dayMasters";
import type { ManualChapterKey } from "@/lib/reports/manualChapters";

/** 해외판 유료 리포트 화면 문구(일본어·영어). 서버 오류 메시지는 한국어라 화면에는 여기 문구만 보여준다.
 * 약관·환불 규정 문구는 법적 검토가 필요해 4단계에서 확정한다 — 아래 consent·refundNote는 임시 초안이다. */
export interface GlobalPayCopy {
  offerTitle: string;
  offerSub: string;
  includesTitle: string;
  digitalNote: string;
  consent: string;
  refundNote: string;
  refundLink: string;
  continueButton: string;
  creating: string;
  payWith: string;
  verifying: string;
  consentRequired: string;
  orderError: string;
  payFailed: string;
  verifyFailed: string;
  chargedNote: string;
  reportTitle: string;
  chapterLoading: string;
  chapterFailed: string;
  retry: string;
  linkTitle: string;
  linkNote: string;
  copy: string;
  copied: string;
  invalidLink: string;
  chapters: Record<ManualChapterKey, { title: string; promise: string }>;
}

export const GLOBAL_PAY_COPY: Record<GlobalLocale, GlobalPayCopy> = {
  ja: {
    offerTitle: "あなた専用の詳細レポート",
    offerSub: "生年月日をもとに、あなただけの「取扱説明書」を6章でお届けします。",
    includesTitle: "読んだあとに得られること",
    digitalNote: "お支払い後すぐに画面で読める、1回限りのデジタルコンテンツです。",
    consent: "デジタルコンテンツの性質上、レポートを開いたあとの返金には制限があることに同意します。",
    refundNote: "レポートが表示されないなどの不具合があった場合は、全額返金します。",
    refundLink: "返金ポリシー（韓国語）",
    continueButton: "お支払いへ進む",
    creating: "ご注文を準備しています…",
    payWith: "PayPalまたはカードでお支払い",
    verifying: "お支払いを確認しています…",
    consentRequired: "同意にチェックを入れてください。",
    orderError: "ご注文を作成できませんでした。しばらくしてからもう一度お試しください。",
    payFailed: "お支払いが完了しませんでした。もう一度お試しください。",
    verifyFailed: "お支払いの確認に失敗しました。時間をおいてもう一度お試しください。",
    chargedNote: "お支払い済みなのにレポートが表示されない場合は、お問い合わせください。",
    reportTitle: "あなたの取扱説明書",
    chapterLoading: "この章を書いています…",
    chapterFailed: "読み込めませんでした。",
    retry: "もう一度読み込む",
    linkTitle: "あなたのレポートのリンク",
    linkNote: "このリンクがあれば、あとからもう一度レポートを開けます。ブックマークするか、自分宛てに送って保存してください。リンクを知っている人は誰でも読めるため、他の人に共有しないでください。",
    copy: "リンクをコピー",
    copied: "コピーしました",
    invalidLink: "このリンクは無効です。お支払い後に表示されたリンクをご確認ください。",
    chapters: {
      overview: { title: "基本の設計図", promise: "生まれ持った設計と、いま気になることへの答えがわかります" },
      patterns: { title: "繰り返してしまう選択", promise: "なぜ同じ選択をしてしまうのか、そのコストと変え方がわかります" },
      people: { title: "人の前でのわたし", promise: "誤解されやすいポイントと、すぐ使える伝え方が手に入ります" },
      workmoney: { title: "仕事とお金のわたし", promise: "働き方とお金の扱い方、損しやすい点とルールがわかります" },
      timing: { title: "いまの時期の使い方", promise: "今年とこれからの流れで、始めること・待つこと・備えることがわかります" },
      actions: { title: "今日から試す3つのこと", promise: "読んだ内容を、今日5分で始められる行動に変えます" },
    },
  },
  en: {
    offerTitle: "Your personal full report",
    offerSub: "A six-chapter \"owner's manual\" built from your birth date.",
    includesTitle: "What you'll get",
    digitalNote: "A one-time digital report you can read on screen right after payment.",
    consent: "I understand that, because this is digital content, refunds are limited once I've opened the report.",
    refundNote: "If the report fails to load or something goes wrong on our side, we'll refund you in full.",
    refundLink: "Refund policy (Korean)",
    continueButton: "Continue to payment",
    creating: "Preparing your order…",
    payWith: "Pay with PayPal or card",
    verifying: "Confirming your payment…",
    consentRequired: "Please tick the box to continue.",
    orderError: "We couldn't create your order. Please try again in a moment.",
    payFailed: "The payment wasn't completed. Please try again.",
    verifyFailed: "We couldn't confirm your payment. Please try again in a moment.",
    chargedNote: "If you were charged but can't see your report, please contact us.",
    reportTitle: "Your owner's manual",
    chapterLoading: "Writing this chapter…",
    chapterFailed: "This chapter didn't load.",
    retry: "Try again",
    linkTitle: "Your personal report link",
    linkNote: "Use this link to reopen your report later. Bookmark it or send it to yourself. Anyone who has the link can read the report, so please don't share it.",
    copy: "Copy link",
    copied: "Copied",
    invalidLink: "This link isn't valid. Please check the link shown after your payment.",
    chapters: {
      overview: { title: "Your core blueprint", promise: "Understand your built-in design, plus an answer to what's on your mind" },
      patterns: { title: "Choices you keep repeating", promise: "See why you repeat them, what they cost, and how to try something different" },
      people: { title: "You around other people", promise: "Learn where others misread you, with words you can use right away" },
      workmoney: { title: "You at work and with money", promise: "Your style with work and money, where you lose out, and rules that help" },
      timing: { title: "How to use this season of life", promise: "What to start, what to postpone, and what to prepare for this year and beyond" },
      actions: { title: "3 things to try starting today", promise: "Turn what you read into actions you can start in five minutes" },
    },
  },
};
