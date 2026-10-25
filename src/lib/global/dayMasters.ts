import type { WuXing } from "@/lib/saju/ganzhi";

export type GlobalLocale = "ja" | "en";

/** 해외판(/ja, /en) 무료 결과의 일간(日干) 10종 소개. 국내 ILGAN_PAGES(ilganPages.ts)의 비유·성향을
 * 현지 독자에게 맞게 다시 쓴 것이라 문장을 그대로 번역하지 않았다. 국내판과 같이 단정하지 않는 어조
 * (ja: 〜タイプです/〜と読みます, en: you tend to ~)를 유지한다. */
export interface DayMasterCopy {
  /** ja: "甲（きのえ）", en: "Jia · Yang Wood" */
  label: string;
  /** ja: "大樹", en: "The Great Tree" */
  image: string;
  keywords: string[];
  summary: string;
}

export const DAY_MASTERS: Record<string, Record<GlobalLocale, DayMasterCopy>> = {
  甲: {
    ja: {
      label: "甲（きのえ）",
      image: "まっすぐ伸びる大樹",
      keywords: ["推進力", "リーダーシップ", "誠実さ", "プライド"],
      summary:
        "空へまっすぐ伸びる大樹のように、目標が決まると回り道より前進を選ぶタイプと読みます。始める力と責任感が強み。しなやかさが加わると、さらに遠くまで行けます。",
    },
    en: {
      label: "Jia · Yang Wood",
      image: "The Great Tree",
      keywords: ["Drive", "Leadership", "Honesty", "Pride"],
      summary:
        "Like a tall tree growing straight toward the sky, you tend to push forward once your goal is set. Your strength is the courage to start things and own them — add a little flexibility and you'll go even further.",
    },
  },
  乙: {
    ja: {
      label: "乙（きのと）",
      image: "風にしなる草花",
      keywords: ["適応力", "気配り", "粘り強さ", "繊細さ"],
      summary:
        "風に揺れても折れない草花のように、状況に合わせて柔軟に動きながら、望む方向へ少しずつ伸びていくタイプです。やわらかく見えて、内側には粘り強さを秘めています。",
    },
    en: {
      label: "Yi · Yin Wood",
      image: "The Flowering Vine",
      keywords: ["Adaptability", "Care", "Quiet persistence", "Sensitivity"],
      summary:
        "Like a vine that bends in the wind but never breaks, you adapt to any situation while quietly growing toward what you want. Gentle on the outside, surprisingly persistent inside.",
    },
  },
  丙: {
    ja: {
      label: "丙（ひのえ）",
      image: "空を照らす太陽",
      keywords: ["情熱", "明るさ", "表現力", "おおらかさ"],
      summary:
        "空を照らす太陽のように、明るさと情熱で周りを元気にするタイプ。隠しごとが苦手で、気持ちがそのまま表に出やすい人です。",
    },
    en: {
      label: "Bing · Yang Fire",
      image: "The Sun",
      keywords: ["Passion", "Optimism", "Expression", "Generosity"],
      summary:
        "Like the sun lighting up the sky, you energize people with warmth and passion. You're not one to hide things — what you feel usually shows on your face.",
    },
  },
  丁: {
    ja: {
      label: "丁（ひのと）",
      image: "夜を灯すろうそくの火",
      keywords: ["温かさ", "洞察力", "集中力", "献身"],
      summary:
        "暗い夜を照らすろうそくの灯のように、静かな温かさで人の心を照らすタイプ。集中力が高く、ひとつのことを深く掘り下げる力があります。",
    },
    en: {
      label: "Ding · Yin Fire",
      image: "The Candle Flame",
      keywords: ["Warmth", "Insight", "Focus", "Devotion"],
      summary:
        "Like a candle in the dark, you light up people's hearts with quiet warmth. You have deep focus and love to dig into one thing until you truly understand it.",
    },
  },
  戊: {
    ja: {
      label: "戊（つちのえ）",
      image: "どっしりとした山",
      keywords: ["包容力", "安定感", "信頼", "忍耐"],
      summary:
        "どっしりとした大きな山のように、ぶれない安定感で周りに安心を与えるタイプ。頼られることが多く、懐の深さが魅力です。",
    },
    en: {
      label: "Wu · Yang Earth",
      image: "The Mountain",
      keywords: ["Stability", "Reliability", "Patience", "Big heart"],
      summary:
        "Like a great mountain, you give others a sense of steadiness and safety. People tend to lean on you, and your calm, big-hearted presence is your charm.",
    },
  },
  己: {
    ja: {
      label: "己（つちのと）",
      image: "作物を育てる畑の土",
      keywords: ["育てる力", "現実感覚", "気配り", "柔軟さ"],
      summary:
        "作物を育てる畑の土のように、人や物事をじっくり育てるのが得意なタイプ。現実的で、細やかな気配りができる人です。",
    },
    en: {
      label: "Ji · Yin Earth",
      image: "The Fertile Field",
      keywords: ["Nurturing", "Practicality", "Attentiveness", "Flexibility"],
      summary:
        "Like rich soil that grows crops, you're good at nurturing people and ideas over time. Practical and attentive, you notice the small details others miss.",
    },
  },
  庚: {
    ja: {
      label: "庚（かのえ）",
      image: "鍛えられた鋼",
      keywords: ["決断力", "正義感", "行動力", "義理堅さ"],
      summary:
        "鍛えられた鋼のように、決断力と行動力で道を切り開くタイプ。正義感が強く、白黒はっきりさせたい性格です。",
    },
    en: {
      label: "Geng · Yang Metal",
      image: "The Steel Blade",
      keywords: ["Decisiveness", "Justice", "Action", "Loyalty"],
      summary:
        "Like forged steel, you cut your own path with decisiveness and action. You have a strong sense of justice and prefer things clear-cut.",
    },
  },
  辛: {
    ja: {
      label: "辛（かのと）",
      image: "磨かれた宝石",
      keywords: ["美意識", "繊細さ", "こだわり", "品格"],
      summary:
        "磨かれた宝石のように、繊細な美意識と高いプライドを持つタイプ。こだわりが強く、本当に質の良いものを見抜く目があります。",
    },
    en: {
      label: "Xin · Yin Metal",
      image: "The Jewel",
      keywords: ["Refined taste", "Sensitivity", "High standards", "Grace"],
      summary:
        "Like a polished gem, you carry refined taste and quiet pride. You hold high standards and have a real eye for quality.",
    },
  },
  壬: {
    ja: {
      label: "壬（みずのえ）",
      image: "海へ流れる大河",
      keywords: ["自由", "知性", "包容力", "行動範囲の広さ"],
      summary:
        "海へ流れる大河のように、スケールが大きく自由を愛するタイプ。好奇心旺盛で、どこへでも流れていける柔軟さがあります。",
    },
    en: {
      label: "Ren · Yang Water",
      image: "The Great River",
      keywords: ["Freedom", "Intellect", "Open-mindedness", "Wanderlust"],
      summary:
        "Like a great river flowing to the sea, you think big and love your freedom. Curious by nature, you can flow wherever life takes you.",
    },
  },
  癸: {
    ja: {
      label: "癸（みずのと）",
      image: "大地をうるおす雨",
      keywords: ["直感", "やさしさ", "想像力", "順応性"],
      summary:
        "大地をうるおす雨のように、静かに周りを支えるやさしいタイプ。感受性と直感が鋭く、人の気持ちを察するのが得意です。",
    },
    en: {
      label: "Gui · Yin Water",
      image: "The Gentle Rain",
      keywords: ["Intuition", "Kindness", "Imagination", "Empathy"],
      summary:
        "Like gentle rain that nourishes the earth, you quietly support the people around you. Intuitive and empathetic, you read others' feelings with ease.",
    },
  },
};

export const ELEMENT_NAMES: Record<WuXing, Record<GlobalLocale, string>> = {
  목: { ja: "木", en: "Wood" },
  화: { ja: "火", en: "Fire" },
  토: { ja: "土", en: "Earth" },
  금: { ja: "金", en: "Metal" },
  수: { ja: "水", en: "Water" },
};

/** 오행 분포에서 가장 많은/적은 요소에 붙이는 한 줄 해석. */
export const ELEMENT_NOTES: Record<WuXing, Record<GlobalLocale, { strong: string; weak: string }>> = {
  목: {
    ja: { strong: "成長と挑戦のエネルギーが豊か。新しいことを始めると運が動きやすいタイプ。", weak: "新しく始める力を意識して補うと、流れが良くなります。" },
    en: { strong: "Full of growth energy — things move when you start something new.", weak: "Consciously starting small new things helps your energy flow." },
  },
  화: {
    ja: { strong: "表現力と情熱があふれる命式。人前に出るほど輝きます。", weak: "楽しむ時間、人と会う時間を増やすと運気が上がりやすいです。" },
    en: { strong: "Overflowing with passion and expression — you shine in front of people.", weak: "More fun and more time with people tends to lift your luck." },
  },
  토: {
    ja: { strong: "安定と信頼の力が強く、周りの支えになる命式です。", weak: "生活リズムを整えると、心も運気も落ち着きます。" },
    en: { strong: "Strong stability and trust — you're the anchor for others.", weak: "A steady daily routine brings calm to both mind and luck." },
  },
  금: {
    ja: { strong: "決断力と集中力が高く、やると決めたらやり切る命式です。", weak: "優先順位を決める習慣が、大きな助けになります。" },
    en: { strong: "Sharp focus and decisiveness — once you commit, you finish.", weak: "A habit of setting clear priorities will help you a lot." },
  },
  수: {
    ja: { strong: "知恵と柔軟性に恵まれ、変化に強い命式です。", weak: "休息と学びの時間をしっかり取ると、流れが整います。" },
    en: { strong: "Blessed with wisdom and flexibility — you handle change well.", weak: "Make real time for rest and learning to keep things flowing." },
  },
};

/** 지지(地支) 12종의 띠 이름. en은 병음 + 동물. */
export const BRANCH_ANIMALS: Record<string, Record<GlobalLocale, string>> = {
  子: { ja: "ね", en: "Rat" },
  丑: { ja: "うし", en: "Ox" },
  寅: { ja: "とら", en: "Tiger" },
  卯: { ja: "う", en: "Rabbit" },
  辰: { ja: "たつ", en: "Dragon" },
  巳: { ja: "み", en: "Snake" },
  午: { ja: "うま", en: "Horse" },
  未: { ja: "ひつじ", en: "Goat" },
  申: { ja: "さる", en: "Monkey" },
  酉: { ja: "とり", en: "Rooster" },
  戌: { ja: "いぬ", en: "Dog" },
  亥: { ja: "い", en: "Pig" },
};
