import type { GlobalLocale } from "./dayMasters";

/** 해외판(/ja, /en) 화면 문구. 서버 API의 오류 메시지는 한국어라 화면에는 여기 문구만 보여준다. */
export interface GlobalMessages {
  badge: string;
  headline: string;
  sub: string;
  birthDate: string;
  year: string;
  month: string;
  day: string;
  birthTime: string;
  timeUnknown: string;
  gender: string;
  female: string;
  male: string;
  submit: string;
  privacyNote: string;
  /** 결제가 열린 뒤의 안내 — 유료 주문은 생년월일을 주문과 함께 보관하므로 "저장하지 않는다"고만 쓸 수 없다. */
  privacyNotePaid: string;
  loading: string;
  inputError: string;
  networkError: string;
  dayMasterTitle: string;
  chartTitle: string;
  pillarLabels: [string, string, string, string];
  unknown: string;
  balanceTitle: string;
  strongest: string;
  weakest: string;
  lockedTitle: string;
  lockedItems: string[];
  lockedNote: string;
  emailPlaceholder: string;
  consent: string;
  privacyLink: string;
  notifyButton: string;
  saving: string;
  emailInvalid: string;
  consentRequired: string;
  saveError: string;
  done: string;
  restart: string;
  disclaimer: string;
}

export const GLOBAL_MESSAGES: Record<GlobalLocale, GlobalMessages> = {
  ja: {
    badge: "K-SAJU · 韓国の四柱推命",
    headline: "生年月日だけで、\nあなたの「本質」がわかる",
    sub: "韓国で人気の四柱推命サービス「サジュラボ」の日本語版。30秒・無料・登録不要。",
    birthDate: "生年月日",
    year: "年",
    month: "月",
    day: "日",
    birthTime: "生まれた時間（わからなくてもOK）",
    timeUnknown: "わからない",
    gender: "性別",
    female: "女性",
    male: "男性",
    submit: "無料で診断する",
    privacyNote: "※生年月日は診断のためだけに使い、保存しません。",
    privacyNotePaid: "※無料診断では生年月日を保存しません。有料レポートをご購入の場合のみ、レポート作成のため注文情報として保存します。",
    loading: "命式を計算しています…",
    inputError: "入力内容をご確認ください。",
    networkError: "通信エラーが発生しました。もう一度お試しください。",
    dayMasterTitle: "あなたの日干（本質）",
    chartTitle: "あなたの命式",
    pillarLabels: ["年柱", "月柱", "日柱", "時柱"],
    unknown: "不明",
    balanceTitle: "五行バランス",
    strongest: "いちばん強い",
    weakest: "いちばん少ない",
    lockedTitle: "詳細レポート（近日公開）",
    lockedItems: ["恋愛・相性の傾向", "仕事と才能", "お金の流れ", "運気が上がる年"],
    lockedNote: "日本語版の詳細レポートは準備中です。公開したらメールでいちばんにお知らせします。",
    emailPlaceholder: "メールアドレス",
    consent: "（必須）公開のお知らせメールを送るためにメールアドレスを利用します。お知らせ1回のあと削除し、遅くとも3か月以内に削除します。",
    privacyLink: "プライバシーポリシー",
    notifyButton: "🔔 公開を知らせてもらう",
    saving: "登録中…",
    emailInvalid: "メールアドレスを正しく入力してください。",
    consentRequired: "メール利用への同意が必要です。",
    saveError: "登録できませんでした。しばらくしてからもう一度お試しください。",
    done: "登録しました 🔔 公開したらお知らせします。",
    restart: "もう一度診断する",
    disclaimer: "※四柱推命は伝統的な解釈にもとづく占いです。娯楽としてお楽しみください。",
  },
  en: {
    badge: "K-SAJU · Korean Four Pillars",
    headline: "Your birthday reveals\nwho you really are",
    sub: "The English edition of Saju Lab, a Korean fortune app. Korea's traditional birth chart reading — 30 seconds, free, no sign-up.",
    birthDate: "Date of birth",
    year: "Year",
    month: "Month",
    day: "Day",
    birthTime: "Time of birth (optional)",
    timeUnknown: "I don't know",
    gender: "Gender",
    female: "Female",
    male: "Male",
    submit: "Get my free reading",
    privacyNote: "Your birth date is only used for the reading and is never stored.",
    privacyNotePaid: "Your free reading is never stored. If you buy a report, your birth information is saved with the order so we can create it.",
    loading: "Calculating your Four Pillars…",
    inputError: "Please check your birth date.",
    networkError: "Something went wrong. Please try again.",
    dayMasterTitle: "Your Day Master (your core self)",
    chartTitle: "Your Four Pillars",
    pillarLabels: ["Year", "Month", "Day", "Hour"],
    unknown: "Unknown",
    balanceTitle: "Five Elements balance",
    strongest: "Strongest",
    weakest: "Weakest",
    lockedTitle: "Full report (coming soon)",
    lockedItems: ["Love & compatibility", "Career & talents", "Money flow", "Your luckiest years"],
    lockedNote: "The English full report is on its way. Leave your email and you'll be the first to know when it launches.",
    emailPlaceholder: "you@example.com",
    consent: "(Required) We'll use your email only to send one launch notice, then delete it — within 3 months at the latest.",
    privacyLink: "Privacy policy",
    notifyButton: "🔔 Notify me at launch",
    saving: "Saving…",
    emailInvalid: "Please enter a valid email address.",
    consentRequired: "Please agree to the email notice.",
    saveError: "We couldn't save your email. Please try again later.",
    done: "You're on the list 🔔 We'll email you at launch.",
    restart: "Start over",
    disclaimer: "Saju is a traditional interpretation for entertainment purposes only.",
  },
};
