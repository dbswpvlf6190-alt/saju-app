import type { Metadata } from "next";
import { EXAM_SEASONS, sanitizeCheerName, type ExamKind } from "@/lib/exam/seasons";

/** 수능·임용 페이지 메타데이터. 응원 링크(?cheer=민지)를 카톡에 붙이면 미리보기 제목·이미지에 보낸
 * 사람 이름이 들어간다. 미리보기 캐시가 링크마다 따로 잡히도록 og:url과 이미지 주소에도 같은 응원
 * 파라미터를 붙인다. */
export function examMetadata(
  kind: ExamKind,
  { title, description }: { title: string; description: string },
  rawCheer: string | string[] | undefined,
): Metadata {
  const season = EXAM_SEASONS[kind];
  const cheer = sanitizeCheerName(rawCheer);
  const ogTitle = cheer === null ? title : `${cheer ? `${cheer}님이` : "친구가"} 보낸 ${season.noun} 응원이 도착했어요 📚`;
  const cheerQuery = cheer === null ? "" : `cheer=${encodeURIComponent(cheer)}`;
  const image = {
    url: `/api/og/exam?kind=${kind}${cheerQuery && `&${cheerQuery}`}`,
    width: 1200,
    height: 630,
    alt: ogTitle,
  };
  return {
    title,
    description,
    alternates: { canonical: season.path },
    openGraph: {
      title: ogTitle,
      description,
      url: `${season.path}${cheerQuery && `?${cheerQuery}`}`,
      type: "website",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: [image] },
  };
}
