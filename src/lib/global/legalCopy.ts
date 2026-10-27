import type { GlobalLocale } from "./dayMasters";
import { CONTACT_EMAIL } from "@/lib/business";

/**
 * 해외판(/en·/ja) 이용약관·환불정책·개인정보 안내. 국내 /terms·/refund·/privacy와 같은 사실(사업자 정보, 보관 5년, 처리위탁)을
 * 영어·일본어로 옮긴 **초안**이다 — 일본·영어권 소비자법 기준의 법률 검토 전에는 결제를 열지 않는다(GLOBAL_PAYMENTS_ENABLED).
 * 검토가 필요한 지점: ① 부가가치세·소비세(일본 소비세, EU·영국 VAT 등 해외 디지털 서비스 과세) ② 일본 특정상거래법 표기
 * ③ EU 철회권 포기 동의 문구 ④ 개인정보(APPI·GDPR) 국외 이전 고지 ⑤ 구매자 삭제 요청의 실제 처리 절차.
 */

export interface LegalBlock {
  h: string;
  p?: string[];
  ul?: string[];
}
export interface LegalDoc {
  title: string;
  updated: string;
  blocks: LegalBlock[];
}
export interface GlobalLegal {
  home: string;
  navLabels: { terms: string; privacy: string; refund: string };
  terms: LegalDoc;
  privacy: LegalDoc;
  refund: LegalDoc;
}

// 국내 약관·환불·개인정보에 이미 공개된 사업자 정보(상호·대표자·주소·연락처)와 같은 값이다. 이름·주소는 원문(한글) 그대로 둔다.
export const OPERATOR_EN = [
  "Operator: 대국민스토어 (Daegukmin Store)",
  "Representative: 윤제필",
  "Business registration no.: 717-04-02822 (Republic of Korea)",
  "Address: 경상남도 창원시 의창구 동읍 용정길46번길 53 성진5차 1001호, Republic of Korea",
  `Phone: +82-55-255-3564 · Email: ${CONTACT_EMAIL}`,
];
export const OPERATOR_JA = [
  "運営者: 대국민스토어 (Daegukmin Store)",
  "代表者: 윤제필",
  "事業者登録番号: 717-04-02822（大韓民国）",
  "所在地: 경상남도 창원시 의창구 동읍 용정길46번길 53 성진5차 1001호（大韓民国）",
  `電話番号: +82-55-255-3564 · メール: ${CONTACT_EMAIL}`,
];

export const GLOBAL_LEGAL: Record<GlobalLocale, GlobalLegal> = {
  en: {
    home: "← Back to Saju Lab",
    navLabels: { terms: "Terms of Service", privacy: "Privacy Policy", refund: "Refund Policy" },
    terms: {
      title: "Terms of Service",
      updated: "Last updated: October 27, 2026",
      blocks: [
        {
          h: "1. About these terms",
          p: [
            "These terms apply to the English edition of Saju Lab (the \"Service\"), operated by the operator listed in section 9 (\"we\"). By using the Service or buying a report you agree to these terms.",
          ],
        },
        {
          h: "2. What the Service provides",
          p: [
            "From the birth date, optional birth time and gender you enter, the Service calculates a Korean Four Pillars (Saju) chart and shows a free summary. You can also buy a paid personal report (the \"Report\"), a six-chapter text written for you.",
            "The Report is generated with the help of an AI language model from facts we calculate from your chart. Saju is a traditional interpretation offered for self-reflection and entertainment. It does not predict or guarantee the future and is not medical, legal, financial or investment advice. Please talk to a qualified professional about important decisions.",
          ],
        },
        {
          h: "3. Paid reports and payment",
          ul: [
            "A Report is a one-time digital product shown on screen immediately after payment. It is not a subscription and does not renew.",
            "Prices are shown in US dollars on the English edition. The amount shown on the purchase screen is the amount charged.",
            "Payment is processed by PayPal through our payment provider, PortOne. We do not receive or store your card number or PayPal login.",
            "After payment you receive a personal report link. Anyone who has the link can read the Report, so please keep it private. We cannot restore a lost link automatically; contact us with your payment details and we will help.",
            "Refunds are described in the Refund Policy.",
          ],
        },
        {
          h: "4. Your responsibilities",
          p: [
            "Please do not enter another person's information without their permission, misuse the Service, or interfere with its operation. You are responsible for keeping your report link private.",
          ],
        },
        {
          h: "5. Intellectual property",
          p: [
            "The content of the Service (calculation logic, text, design) belongs to us. You may use your own Report for personal purposes, but you may not copy, resell or distribute it commercially without our written permission.",
          ],
        },
        {
          h: "6. Disclaimer",
          p: [
            "We do not guarantee that interpretations are accurate or suitable for any particular purpose. We are not responsible for interruptions caused by events outside our control, including problems at our payment, AI, hosting or other service providers. Nothing in these terms limits any rights you have under mandatory consumer protection law where you live.",
          ],
        },
        {
          h: "7. Governing law",
          p: ["These terms are governed by the laws of the Republic of Korea, without affecting the mandatory consumer protection rights of your country of residence."],
        },
        {
          h: "8. Changes",
          p: ["We may update these terms. The version on this page applies from the date shown above, and purchases are governed by the version in force at the time of purchase."],
        },
        { h: "9. Operator and contact", p: OPERATOR_EN },
      ],
    },
    refund: {
      title: "Refund Policy",
      updated: "Last updated: October 27, 2026",
      blocks: [
        {
          h: "1. The product",
          p: ["The Report is a one-time, personalised digital product (AI-written text) that you can read on screen right after payment."],
        },
        {
          h: "2. When we refund",
          ul: [
            "If you have not opened the Report, we refund the full amount when you ask within 7 days of payment.",
            "If the Report fails to load or cannot be delivered because of a problem on our side, we refund in full whether or not you opened it.",
            "If the same order was paid more than once, we refund the extra payment.",
          ],
        },
        {
          h: "3. When refunds are limited",
          p: [
            "Because the Report is digital content delivered immediately, refunds may be limited once you have opened and read it. By ticking the box before payment, you agree that delivery starts immediately and that you may lose your right to cancel or withdraw once the Report has been opened. This does not affect rights that the mandatory consumer law of your country gives you and that cannot be waived.",
          ],
        },
        {
          h: "4. How to ask",
          p: [
            `Email ${CONTACT_EMAIL} with the date and time of payment, the amount, and the email or PayPal account used (or your payment ID). We confirm your request and, if it qualifies, refund to the original payment method within 3 business days. PayPal and your bank may take additional time to show the refund.`,
          ],
        },
        {
          h: "5. Payment problems",
          p: ["If a payment did not complete (no charge was authorised), there is nothing to refund and the order is cancelled automatically. If you were charged but cannot see your Report, contact us and we will resolve it or refund you."],
        },
        { h: "6. Contact", p: OPERATOR_EN },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      updated: "Last updated: October 27, 2026",
      blocks: [
        {
          h: "1. What we collect",
          ul: [
            "Free reading: the birth date, optional birth time and gender you enter. We use them only to calculate and show your result, and we do not store them.",
            "Paid report: the same birth information, saved with your order so that we can generate and show your Report, plus the order record (payment status, amount, currency, time) and the generated Report text.",
            "Payment details: PayPal and PortOne process your payment and may share with us confirmation data such as a payment ID. We do not store your card number or PayPal password.",
            "Launch notice (optional): if you leave your email to be told when the paid report opens, we store only that email address and use it to send one notice, then delete it (within 3 months at the latest).",
            "Usage statistics: we record which screens and buttons are used (for example, that a result page was viewed). These records do not include your birth date, time, gender or contact details.",
          ],
        },
        {
          h: "2. How we use it",
          ul: [
            "To calculate and show your Saju result.",
            "To process payment and deliver and re-open your paid Report.",
            "To generate your Report with an AI service.",
            "To prevent duplicate payments, investigate payment problems and answer your requests.",
            "To improve the Service from anonymous usage statistics.",
          ],
        },
        {
          h: "3. Who processes it for us",
          ul: [
            "PortOne and PayPal: payment processing.",
            "Anthropic (Claude API): to write your Report we send your calculated chart information (pillars, element percentages, gender and age range). We do not send your name or contact details.",
            "Vercel and Neon: hosting and database for the Service and your order record.",
          ],
        },
        {
          h: "4. International transfers",
          p: ["We operate from the Republic of Korea, and the providers above process data in Korea, the United States and other countries. By using the Service you understand that your information may be transferred to and processed in these countries."],
        },
        {
          h: "5. How long we keep it",
          p: [
            "Free-reading input is not stored. For paid orders we keep the order record for 5 years, as required by Korean commerce law, and then delete it. If you ask us to, we will delete your birth information and Report text sooner; the payment record (status, amount, time) is kept for the legally required period.",
          ],
        },
        {
          h: "6. Your rights",
          p: [
            `You can ask us to show, correct or delete the personal information we hold about you, or to stop using it, by emailing ${CONTACT_EMAIL}. We respond without undue delay. Depending on where you live you may also have the right to complain to your local data protection authority.`,
          ],
        },
        {
          h: "7. Cookies and browser storage",
          p: [
            "After you start a purchase we set a signed, strictly necessary cookie so that your browser can open the Report you paid for (valid for 24 hours). Your personal report link works without the cookie. We also keep the name of the link you arrived from (for example a social media post) in your browser's local storage, only to learn which posts bring visitors; it contains no personal data. We do not use advertising or tracking cookies on the English edition.",
          ],
        },
        {
          h: "8. Children",
          p: ["The Service is not directed to children under 16, and we do not knowingly collect their information."],
        },
        { h: "9. Contact", p: OPERATOR_EN },
      ],
    },
  },
  ja: {
    home: "← サジュラボに戻る",
    navLabels: { terms: "利用規約", privacy: "プライバシーポリシー", refund: "返金ポリシー" },
    terms: {
      title: "利用規約",
      updated: "最終更新日: 2026年10月27日",
      blocks: [
        {
          h: "1. この規約について",
          p: ["この規約は、第9条に記載の運営者（以下「当社」）が運営する「サジュラボ」日本語版（以下「本サービス」）に適用されます。本サービスの利用または有料レポートの購入により、この規約に同意したものとみなします。"],
        },
        {
          h: "2. サービスの内容",
          p: [
            "本サービスは、入力された生年月日・生まれた時間（任意）・性別をもとに、韓国の四柱推命（サジュ）の命式を計算し、無料の診断結果を表示します。また、あなた専用の有料レポート（6章構成の文章。以下「レポート」）をご購入いただけます。",
            "レポートは、当社が命式から計算した事実をもとに、AI言語モデルを使って作成されます。四柱推命は伝統的な解釈にもとづく、自己理解と娯楽のためのコンテンツです。未来を予測・保証するものではなく、医療・法律・金融・投資などの助言でもありません。重要な判断は専門家にご相談ください。",
          ],
        },
        {
          h: "3. 有料レポートとお支払い",
          ul: [
            "レポートは、お支払い後すぐに画面で読める1回限りのデジタルコンテンツです。定期購入ではなく、自動更新もありません。",
            "日本語版の価格は日本円で表示します。購入画面に表示された金額が請求額です。",
            "お支払いは、決済代行会社PortOneを通じてPayPalで処理されます。当社はカード番号やPayPalのログイン情報を受け取らず、保存もしません。",
            "お支払い後に、あなた専用のレポートのリンクが表示されます。リンクを知っている人は誰でもレポートを読めるため、他の人に共有しないでください。リンクを紛失した場合は自動で復元できないため、お支払い情報を添えてご連絡ください。",
            "返金については、返金ポリシーをご覧ください。",
          ],
        },
        {
          h: "4. お客様の責任",
          p: ["他の方の情報を許可なく入力すること、本サービスの不正利用、運営の妨害はおやめください。レポートのリンクの管理はお客様の責任で行ってください。"],
        },
        {
          h: "5. 知的財産権",
          p: ["本サービスのコンテンツ（計算ロジック、文章、デザインなど）の権利は当社に帰属します。ご自身のレポートを個人の目的で利用することはできますが、当社の書面による許可なく複製・転売・商用配布することはできません。"],
        },
        {
          h: "6. 免責",
          p: ["解釈の正確性や特定の目的への適合性を保証するものではありません。決済・AI・ホスティングなど外部サービスの障害を含め、当社が管理できない事由によるサービスの中断について責任を負いません。ただし、お住まいの地域の強行法規である消費者保護法上のお客様の権利を制限するものではありません。"],
        },
        { h: "7. 準拠法", p: ["この規約は大韓民国の法律に準拠します。ただし、お住まいの国の強行法規である消費者保護上の権利には影響しません。"] },
        { h: "8. 規約の変更", p: ["当社は規約を変更することがあります。このページの内容は上記の日付から適用され、ご購入にはご購入時点で有効な規約が適用されます。"] },
        { h: "9. 運営者情報・お問い合わせ", p: OPERATOR_JA },
        {
          h: "特定商取引法に基づく表記",
          ul: [
            "販売事業者・代表者・所在地・連絡先: 第9条のとおり",
            "販売価格: 購入画面に日本円で表示（表示額が請求額です）",
            "商品代金以外の必要料金: ありません（通信料はお客様のご負担です）",
            "お支払い方法: PayPal（PayPalアカウントまたはカード）",
            "お支払い時期: 購入時に即時",
            "商品の引き渡し時期: お支払い完了後すぐに画面に表示されます",
            "返品・キャンセル: 返金ポリシーのとおり（デジタルコンテンツの性質上、開封後は制限されることがあります）",
          ],
        },
      ],
    },
    refund: {
      title: "返金ポリシー",
      updated: "最終更新日: 2026年10月27日",
      blocks: [
        { h: "1. 商品について", p: ["レポートは、お支払い後すぐに画面で読める、あなた専用の1回限りのデジタルコンテンツ（AIが作成する文章）です。"] },
        {
          h: "2. 返金できる場合",
          ul: [
            "レポートをまだ開いていない場合は、お支払いから7日以内のご連絡で全額を返金します。",
            "当社側の不具合でレポートが表示されない、または提供できない場合は、開いたかどうかにかかわらず全額を返金します。",
            "同じ注文が二重にお支払いされた場合は、重複分を返金します。",
          ],
        },
        {
          h: "3. 返金が制限される場合",
          p: ["レポートはお支払い後すぐに提供されるデジタルコンテンツのため、開いて読んだあとは返金が制限されることがあります。お支払い前のチェックにより、提供がすぐに始まること、およびレポートを開いたあとはキャンセルや返金の権利が制限される場合があることに同意いただきます。お住まいの国の強行法規により放棄できない権利には影響しません。"],
        },
        {
          h: "4. お申し込み方法",
          p: [`${CONTACT_EMAIL} 宛に、お支払いの日時、金額、ご利用のメールアドレスまたはPayPalアカウント（または決済ID）をお送りください。内容を確認し、対象となる場合は3営業日以内に元のお支払い方法へ返金します。PayPalやカード会社での反映には、さらに日数がかかることがあります。`],
        },
        {
          h: "5. お支払いのトラブル",
          p: ["お支払いが完了していない場合（請求が確定していない場合）は、返金は不要で、注文は自動的に取り消されます。請求されているのにレポートが表示されない場合は、ご連絡ください。解決するか、返金いたします。"],
        },
        { h: "6. お問い合わせ", p: OPERATOR_JA },
      ],
    },
    privacy: {
      title: "プライバシーポリシー",
      updated: "最終更新日: 2026年10月27日",
      blocks: [
        {
          h: "1. 取得する情報",
          ul: [
            "無料診断: 入力された生年月日、生まれた時間（任意）、性別。結果の計算と表示のためだけに使い、保存しません。",
            "有料レポート: 上記と同じ生年月日などの情報を、レポートの作成と表示のため注文情報とともに保存します。あわせて、注文記録（お支払い状況・金額・通貨・日時）と、作成されたレポートの文章を保存します。",
            "お支払い情報: PayPalとPortOneがお支払いを処理し、決済IDなどの確認情報を当社に共有することがあります。当社はカード番号やPayPalのパスワードを保存しません。",
            "公開のお知らせ（任意）: 有料レポートの公開通知を希望してメールアドレスを登録された場合は、そのメールアドレスのみを保存し、お知らせを1回送ったあとに削除します（遅くとも3か月以内）。",
            "利用統計: どの画面やボタンが使われたか（例: 結果画面が表示された）を記録します。生年月日・時間・性別・連絡先は含まれません。",
          ],
        },
        {
          h: "2. 利用目的",
          ul: [
            "四柱推命の診断結果の計算と表示",
            "お支払いの処理、有料レポートの提供と再表示",
            "AIサービスによるレポートの作成",
            "二重決済の防止、お支払いのトラブルの確認、お問い合わせへの対応",
            "匿名の利用統計にもとづくサービス改善",
          ],
        },
        {
          h: "3. 処理を委託する先",
          ul: [
            "PortOne・PayPal: お支払いの処理",
            "Anthropic（Claude API）: レポート作成のため、計算した命式の情報（四柱、五行の割合、性別、年代）を送信します。お名前や連絡先は送信しません。",
            "Vercel・Neon: 本サービスと注文記録のホスティング・データベース",
          ],
        },
        {
          h: "4. 国外への移転",
          p: ["当社は大韓民国から運営しており、上記の委託先は韓国、米国などでデータを処理します。本サービスをご利用になることで、お客様の情報がこれらの国に移転され処理されることを理解したものとみなします。"],
        },
        {
          h: "5. 保存期間",
          p: ["無料診断の入力内容は保存しません。有料注文の記録は、韓国の商取引関連法令にもとづき5年間保存し、その後削除します。ご希望があれば、生年月日などの情報とレポートの文章をより早く削除します（お支払い記録（状況・金額・日時）は法定の期間、保存します）。"],
        },
        {
          h: "6. お客様の権利",
          p: [`当社が保有するご自身の個人情報について、開示・訂正・削除・利用停止を ${CONTACT_EMAIL} 宛にご請求いただけます。遅滞なく対応します。`],
        },
        {
          h: "7. Cookieとブラウザの保存領域",
          p: ["購入手続きを始めると、お支払い済みのレポートをそのブラウザで開くために、署名付きの必須Cookieを設定します（有効期間24時間）。あなた専用のリンクはCookieがなくても利用できます。また、どの投稿などから来訪したかを知るため、アクセス元のリンク名（個人情報は含みません）をブラウザのローカルストレージに保存します。日本語版では広告用・追跡用のCookieは使用しません。"],
        },
        { h: "8. 未成年のお子様", p: ["本サービスは16歳未満のお子様を対象としておらず、その情報を意図して収集することはありません。"] },
        { h: "9. お問い合わせ", p: OPERATOR_JA },
      ],
    },
  },
};
