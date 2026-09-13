/** 홈 화면 하단 FAQ. 검색엔진 FAQPage 리치 스니펫을 노리는 목적도 있지만, 그 전에
 * 실제로 사용자가 자주 묻는 내용을 담아야 한다(JSON-LD가 화면에 없는 내용을 담으면
 * 구글 가이드라인 위반) — 그래서 화면에 보이는 문구와 JSON-LD의 answer 텍스트를 동일하게
 * 유지한다. 서버 컴포넌트라 클라이언트 JS 없이도 검색엔진이 바로 읽을 수 있다. */
const FAQS: { question: string; answer: string }[] = [
  {
    question: "사주랩은 무료인가요?",
    answer:
      "네, 오행 비율·일간 같은 기본 사주 정보와 오늘의 운세는 무료로 확인할 수 있어요. 연애운·재물운·직업운·인간관계·올해의 흐름을 항목별로 깊게 풀어주는 상세 분석 리포트만 4,900원의 유료 콘텐츠예요.",
  },
  {
    question: "태어난 시간을 몰라도 사주를 볼 수 있나요?",
    answer:
      "네, 생시를 몰라도 나머지 정보만으로 오행 균형과 성향을 확인할 수 있어요. 다만 시주(태어난 시간에 해당하는 두 글자)가 빠지는 만큼 해석의 정확도는 조금 낮아질 수 있어요.",
  },
  {
    question: "음력과 양력 중 어떤 걸로 입력해야 하나요?",
    answer:
      "아시는 달력 기준 그대로 입력하시면 돼요. 음력으로 입력해도 자동으로 변환해서 계산하기 때문에 양력·음력 어느 쪽이든 상관없어요.",
  },
  {
    question: "궁합은 어떻게 계산되나요?",
    answer:
      "두 사람의 사주에 담긴 오행 관계(상생·상극·비화)를 바탕으로 궁합 점수와 해석을 보여드려요. 관계를 결정짓는 절대적인 기준이 아니라, 서로를 이해하는 참고 자료로 봐주시면 좋아요.",
  },
  {
    question: "결제한 상세 리포트는 언제, 어떻게 확인하나요?",
    answer:
      "결제가 완료되면 별도 대기 없이 바로 화면에서 확인할 수 있어요. 이후에도 같은 브라우저에서 다시 방문하면 결과를 이어서 볼 수 있어요.",
  },
];

export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section className="mt-12 w-full max-w-md">
      <h2 className="mb-3 text-center font-serif text-xl text-foreground">자주 묻는 질문</h2>
      <div className="flex flex-col gap-2">
        {FAQS.map((f) => (
          <details
            key={f.question}
            className="group rounded-xl border border-border-subtle px-4 py-3 open:border-accent-gold/40"
          >
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none">
              {f.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{f.answer}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        // JSON-LD는 고정된 FAQS 배열에서만 만들어져 외부 입력이 섞이지 않지만, </script>로
        // 스크립트 태그를 조기 종료시키는 걸 막기 위해 "<"만 유니코드 이스케이프한다
        // (Next.js 공식 문서가 권장하는 JSON-LD 삽입 방식).
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </section>
  );
}
