// 페이지가 openGraph를 따로 지정하면 루트(layout)의 openGraph가 통째로 대체되어, app/opengraph-image.tsx가
// 만든 기본 이미지도 같이 빠진다(카톡·인스타 DM에 링크를 보내면 이미지 없이 글자만 뜸). 그래서 openGraph를
// 직접 쓰는 페이지는 images에 이 기본 이미지를 명시한다.
export const DEFAULT_OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "사주랩" };
