import type { SajuResult } from "./types";
import type { WuXing } from "./ganzhi";

export interface DayMasterProfile {
  /** 예: "갑목(甲木)" */
  label: string;
  /** 자연물에 빗댄 한 줄 별칭 */
  metaphor: string;
  personality: string;
}

// 일간(日干, 태어난 날의 천간)은 사주 명리학에서 '나 자신'을 상징하는 기준점으로 가장 널리 쓰인다.
// 10개 천간 각각의 특성을 자연물 비유로 풀어 설명한다.
const DAY_MASTER_PROFILES: Record<string, DayMasterProfile> = {
  갑: {
    label: "갑목(甲木)",
    metaphor: "곧게 뻗어 오르는 큰 나무",
    personality:
      "목표를 정하면 곧장 나아가는 추진력이 있는 편이에요. 새로운 일을 시작하는 데 두려움이 적고 리더 역할이 자연스럽게 따라오는 경우가 많아요. 다만 유연하게 굽히기보다 정면 돌파를 택하는 경향이 있어서, 때로는 주변과 속도를 맞추는 여유가 도움이 될 수 있어요.",
  },
  을: {
    label: "을목(乙木)",
    metaphor: "바람에 유연하게 흔들리는 풀과 넝쿨",
    personality:
      "상황에 맞춰 유연하게 대처하는 적응력이 돋보여요. 겉으로는 부드러워 보여도 원하는 것을 향해 꾸준히 뻗어나가는 은근한 끈기를 지니고 있어요. 관계 속에서 배려심이 깊은 편이라 주변 사람들에게 편안한 존재로 여겨지는 경우가 많아요.",
  },
  병: {
    label: "병화(丙火)",
    metaphor: "온 세상을 비추는 태양",
    personality:
      "밝고 에너지 넘치는 기운으로 주변 분위기를 이끄는 편이에요. 표현이 솔직하고 감정을 숨기지 않아 사람들과 빠르게 가까워지는 매력이 있어요. 열정이 앞설 때 속도 조절이 필요할 수 있으니, 잠깐씩 숨을 고르는 습관을 들이면 좋아요.",
  },
  정: {
    label: "정화(丁火)",
    metaphor: "은은하게 어둠을 밝히는 촛불",
    personality:
      "겉으로 화려하기보다 섬세하고 따뜻한 배려로 사람의 마음을 헤아리는 편이에요. 감수성이 풍부해 예술적 감각이나 세심한 관찰력이 강점으로 작용하는 경우가 많아요. 혼자만의 시간을 통해 에너지를 회복하는 성향도 함께 지니고 있어요.",
  },
  무: {
    label: "무토(戊土)",
    metaphor: "묵직하게 자리를 지키는 큰 산",
    personality:
      "쉽게 흔들리지 않는 안정감과 신뢰감을 주는 편이에요. 맡은 일을 묵묵히 끝까지 책임지는 성실함이 강점으로 꼽혀요. 변화보다 안정을 선호하는 편이라, 가끔은 새로운 시도를 향해 한 걸음 내딛는 유연함이 균형을 더해줄 수 있어요.",
  },
  기: {
    label: "기토(己土)",
    metaphor: "만물을 길러내는 기름진 밭",
    personality:
      "주변 사람을 세심하게 챙기고 조율하는 능력이 돋보이는 편이에요. 겉으로 드러내지 않아도 계획적이고 꼼꼼하게 일을 준비하는 성향이 있어요. 다른 사람을 먼저 배려하다 보니 정작 본인의 마음을 표현하는 데는 소극적일 수 있어요.",
  },
  경: {
    label: "경금(庚金)",
    metaphor: "제련되지 않은 강한 원석",
    personality:
      "결단력이 뚜렷하고 옳다고 믿는 방향으로 밀고 나가는 힘이 있는 편이에요. 의리와 원칙을 중요하게 여겨서 신뢰가 쌓이면 오래가는 관계를 만드는 편이에요. 직설적인 표현이 때로 강하게 느껴질 수 있어 표현의 완급 조절이 도움이 될 수 있어요.",
  },
  신: {
    label: "신금(辛金)",
    metaphor: "정교하게 다듬어진 보석",
    personality:
      "섬세하고 예리한 감각으로 디테일을 놓치지 않는 편이에요. 취향이 분명하고 완성도에 대한 기준이 높아 맡은 일을 정교하게 마무리하는 힘이 있어요. 자존심이 상하는 상황에는 예민하게 반응할 수 있어, 스스로를 다독이는 여유가 필요할 때가 있어요.",
  },
  임: {
    label: "임수(壬水)",
    metaphor: "쉼 없이 흘러가는 큰 강물",
    personality:
      "생각의 폭이 넓고 새로운 정보와 사람을 받아들이는 포용력이 큰 편이에요. 상황 변화에 대한 순발력이 좋아 다양한 분야에서 두각을 나타낼 잠재력이 있어요. 다만 넓게 벌여둔 일들을 하나로 모으는 집중력을 함께 챙기면 더 큰 힘을 발휘할 수 있어요.",
  },
  계: {
    label: "계수(癸水)",
    metaphor: "만물을 적시는 이슬비",
    personality:
      "조용하지만 깊은 통찰력으로 상황을 꿰뚫어 보는 편이에요. 감정이 섬세하고 공감 능력이 뛰어나 사람들의 마음을 잘 헤아려요. 내면의 생각이 많은 편이라, 마음속 고민을 믿을 수 있는 사람과 나누는 것이 스스로에게 큰 도움이 될 수 있어요.",
  },
};

const WUXING_BALANCE_NOTE: Record<WuXing, string> = {
  목: "성장과 확장의 기운(목)이 두드러져서 새로운 시도와 도전에 강한 에너지를 쓰는 편이에요.",
  화: "표현과 열정의 기운(화)이 두드러져서 감정 표현이 풍부하고 추진력이 돋보이는 편이에요.",
  토: "안정과 신뢰의 기운(토)이 두드러져서 꾸준함과 책임감이 강점으로 나타나는 편이에요.",
  금: "결단과 원칙의 기운(금)이 두드러져서 맺고 끊음이 분명하고 완성도를 중시하는 편이에요.",
  수: "지혜와 유연함의 기운(수)이 두드러져서 생각이 깊고 상황 판단이 빠른 편이에요.",
};

export interface FreeContent {
  dayMasterLabel: string;
  dayMasterMetaphor: string;
  personality: string;
  dominantWuxing: WuXing;
  weakestWuxing: WuXing;
  balanceNote: string;
}

export function generateFreeContent(result: SajuResult): FreeContent {
  const dayGanKor = result.dayPillar.ganKor;
  const profile = DAY_MASTER_PROFILES[dayGanKor];
  if (!profile) {
    throw new Error(`알 수 없는 일간: ${dayGanKor}`);
  }

  const entries = Object.entries(result.wuxingCount) as [WuXing, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const dominantWuxing = sorted[0][0];
  const weakestWuxing = sorted[sorted.length - 1][0];

  return {
    dayMasterLabel: profile.label,
    dayMasterMetaphor: profile.metaphor,
    personality: profile.personality,
    dominantWuxing,
    weakestWuxing,
    balanceNote: WUXING_BALANCE_NOTE[dominantWuxing],
  };
}

export type PremiumSectionKey = "love" | "wealth" | "career" | "relationship" | "yearly";

export interface PremiumSection {
  key: PremiumSectionKey;
  title: string;
  teaser: string;
  /** 잠금 화면에서 블러 처리해 보여주는 미리보기 문단. 실제 유료 AI 해석과 같은 결(오행
   * 근거 → 패턴 지적 → 궁금증)로 직접 작성했고, 결정적인 답은 일부러 밝히지 않는다 —
   * 존재하지 않는 내용을 지어내는 게 아니라 실제로 다루는 주제를 예고만 하는 것이다. */
  previewSnippet: string;
}

const PREMIUM_TEASERS: Record<PremiumSectionKey, { title: string; teaserByWuxing: Record<WuXing, string> }> = {
  love: {
    title: "연애운",
    teaserByWuxing: {
      목: "인연을 향해 먼저 다가가는 힘이 강해지는 흐름이 보여요.",
      화: "감정 표현이 풍부해지며 새로운 만남의 기회가 열리는 흐름이에요.",
      토: "관계를 안정적으로 다져가는 힘이 강해지는 시기예요.",
      금: "인연을 신중하게 가려보는 눈이 예리해지는 흐름이에요.",
      수: "마음이 유연해지며 예상치 못한 인연이 다가올 수 있는 흐름이에요.",
    },
  },
  wealth: {
    title: "재물운",
    teaserByWuxing: {
      목: "새로운 시도가 재물의 씨앗이 될 수 있는 흐름이에요.",
      화: "적극적인 행동이 수입으로 이어질 가능성이 엿보이는 흐름이에요.",
      토: "차곡차곡 쌓아온 노력이 결실을 맺기 좋은 흐름이에요.",
      금: "지출과 수입을 정리하면 흐름이 더 좋아질 수 있는 시기예요.",
      수: "정보와 기회를 빠르게 포착하는 감각이 살아나는 흐름이에요.",
    },
  },
  career: {
    title: "직업운",
    teaserByWuxing: {
      목: "새로운 도전과 확장의 기회가 열릴 수 있는 흐름이에요.",
      화: "존재감을 드러낼 좋은 기회가 다가오는 흐름이에요.",
      토: "맡은 역할에서 신뢰를 단단히 쌓아가는 흐름이에요.",
      금: "성과를 명확히 인정받을 수 있는 흐름이 엿보여요.",
      수: "아이디어와 기획력이 빛을 발할 수 있는 흐름이에요.",
    },
  },
  relationship: {
    title: "인간관계운",
    teaserByWuxing: {
      목: "새로운 사람들과의 만남이 활발해지는 흐름이에요.",
      화: "주변에서 먼저 다가오는 인연이 늘어나는 흐름이에요.",
      토: "오래된 인연이 더 깊어질 수 있는 흐름이에요.",
      금: "관계를 정리하고 핵심 인맥에 집중하기 좋은 흐름이에요.",
      수: "폭넓은 네트워크가 예상치 못한 도움으로 돌아올 흐름이에요.",
    },
  },
  yearly: {
    title: "올해의 흐름",
    teaserByWuxing: {
      목: "새로운 시작을 향한 기운이 올해 전반에 퍼져 있어요.",
      화: "활동적이고 역동적인 에너지가 올해를 채우고 있어요.",
      토: "안정과 다지기에 집중하기 좋은 한 해의 흐름이에요.",
      금: "정리와 결실이 함께 따라오는 한 해의 흐름이에요.",
      수: "변화에 유연하게 대응하는 지혜가 필요한 한 해의 흐름이에요.",
    },
  },
};

const PREVIEW_SNIPPETS: Record<PremiumSectionKey, Record<WuXing, string>> = {
  love: {
    목: "연애에서 먼저 다가가는 힘이 강한 편이지만, 정작 마음을 표현하는 타이밍에서는 의외로 신중해지는 경향이 있어요. 이 균형이 무너지는 순간이 있는데, 그건 바로",
    화: "감정 표현이 풍부해서 호감을 사기 쉬운 반면, 관계가 깊어질수록 드러나는 성향이 하나 있어요. 이 부분을 미리 알아두면",
    토: "관계를 안정적으로 다져가는 힘이 있지만, 정작 결정적인 순간에 머뭇거리게 만드는 습관적 패턴이 있어요. 그 패턴은",
    금: "인연을 보는 눈이 예리한 편인데, 이 기준이 오히려 좋은 인연을 놓치게 만드는 경우가 있어요. 어떤 상황에서 그런지 보면",
    수: "마음이 유연해서 예상치 못한 인연이 다가오는 편이지만, 그 인연을 계속 이어가는 데 필요한 태도가 따로 있어요. 그건",
  },
  wealth: {
    목: "새로운 시도가 재물의 씨앗이 되는 편이지만, 그 씨앗을 실제 수익으로 키우는 단계에서 자주 놓치는 습관이 있어요. 바로",
    화: "적극적인 행동이 수입으로 이어지기 쉬운 반면, 들어온 돈을 관리하는 방식에서 반복되는 패턴이 있어요. 이 패턴이",
    토: "차곡차곡 쌓는 힘은 있지만, 정작 기회가 왔을 때 움직이지 못하게 만드는 이유가 있어요. 그 이유를 알면",
    금: "지출과 수입을 정리하는 감각은 좋은데, 특정 시기에 유독 계획이 틀어지는 흐름이 있어요. 그 시기는",
    수: "정보와 기회를 빠르게 포착하는 편이지만, 그 기회를 실제 재물로 연결하는 데 걸리는 시간에 특징이 있어요. 그 특징은",
  },
  career: {
    목: "새로운 도전을 두려워하지 않는 편이지만, 조직 안에서 이 성향이 오히려 발목을 잡는 순간이 있어요. 그 순간은",
    화: "존재감을 드러내는 데는 강하지만, 그만큼 놓치기 쉬운 부분이 하나 있어요. 이걸 놓치면 인정받는 속도가",
    토: "맡은 일을 묵묵히 해내는 신뢰감이 있지만, 이 성향 때문에 커리어에서 손해 보는 지점이 있어요. 그 지점은",
    금: "성과로 인정받는 편이지만, 특정 관계에서 유독 마찰이 반복되는 이유가 있어요. 그 이유는",
    수: "아이디어와 기획력이 강점이지만, 실행 단계에서 이 강점이 오히려 방해가 되는 순간이 있어요. 언제냐면",
  },
  relationship: {
    목: "새로운 인연이 활발하게 생기는 편이지만, 그 관계가 오래가지 못하는 이유가 반복되는 경향이 있어요. 그 이유는",
    화: "먼저 다가오는 사람이 많은 편이지만, 그 관계 속에서 유독 지치게 되는 패턴이 있어요. 그 패턴은",
    토: "오래된 인연을 소중히 여기는 편이지만, 새로운 관계를 시작할 때 유독 망설이게 되는 이유가 있어요. 그건",
    금: "핵심 인맥에 집중하는 스타일이지만, 그 과정에서 놓치고 있는 관계 유형이 있어요. 바로",
    수: "넓은 네트워크가 강점이지만, 정작 깊은 관계로 발전하지 못하는 이유가 하나 있어요. 그 이유는",
  },
  yearly: {
    목: "새로운 시작의 기운이 강한 해지만, 이 흐름을 제대로 못 살리면 오히려 힘만 빠지는 시기가 있어요. 그 시기는",
    화: "활동적인 에너지가 넘치는 한 해지만, 이 에너지를 어디에 쓰느냐에 따라 결과가 크게 갈려요. 특히",
    토: "안정과 다지기에 좋은 흐름이지만, 이 시기를 놓치면 다음 기회까지 오래 기다려야 할 수 있어요. 그 시기는",
    금: "정리와 결실이 함께 오는 해지만, 정리해야 할 것과 지켜야 할 것을 구분하는 게 중요해요. 그 기준은",
    수: "변화에 유연하게 대응해야 하는 해인데, 유독 신중해야 하는 결정의 순간이 있어요. 바로",
  },
};

export function getPremiumSections(result: SajuResult): PremiumSection[] {
  const { dominantWuxing } = generateFreeContent(result);
  return (Object.keys(PREMIUM_TEASERS) as PremiumSectionKey[]).map((key) => {
    const entry = PREMIUM_TEASERS[key];
    return {
      key,
      title: entry.title,
      teaser: entry.teaserByWuxing[dominantWuxing],
      previewSnippet: PREVIEW_SNIPPETS[key][dominantWuxing],
    };
  });
}
