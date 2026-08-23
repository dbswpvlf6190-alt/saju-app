# 사주랩 릴스 템플릿 시스템

R25_REELS_FINAL의 디자인 시스템(남색+금색, 링 장식, 브랜드 배지, 실제 앱 화면, 화음 전조 오디오)을 그대로 재사용해 새 릴스를 대량 생산하는 파이프라인입니다.

## 파일 구성

- `theme.mjs` — 색상·폰트·프레임·세이프존 등 공유 디자인 토큰
- `content.mjs` — 릴스별 카피 데이터(HOOK/INFO/CURIOSITY/캡션). **새 릴스를 추가하려면 이 파일에 항목만 추가하면 됩니다.**
- `render-scenes.mjs` — 콘텐츠 1건을 5장 PNG(HOOK→INFO→CURIOSITY→실제 앱 화면→CTA)로 렌더링
- `build.mjs` — 전체 항목을 순회하며 PNG 렌더링 + ffmpeg로 영상·오디오 조립 → `/reels` 폴더에 출력
- `assets/result-screen-crop.png` — 실제 사주랩 앱에서 캡처한 결과 화면(모든 릴스가 공유)

## 실행 방법

```bash
node scripts/reel-template/build.mjs
```

`/reels` 폴더에 `{업로드순서 2자리}_{콘텐츠코드}_{카테고리}.mp4` 형식으로 저장됩니다.

## 새 릴스 추가하기

`content.mjs`의 `REELS` 배열에 아래 형식으로 항목을 추가하세요.

```js
{
  order: 10,                    // 업로드 순서(파일명 앞자리)
  id: "R04",                    // 콘텐츠 코드
  category: "jaemul",           // 카테고리 슬러그(파일명에 사용)
  categoryLabel: "재물운",       // 화면에 표시될 한글 라벨
  title: "...",                  // 참고용 제목(화면에는 안 나감)
  hook: ["첫 줄", "둘째 줄"],     // 0~2초, 최대 3줄 권장
  info: {
    pre: "강조 전 문장",
    emphasis: "금색으로 강조할 핵심 키워드",
    post: "강조 후 문장",
    sub: ["보조 설명 1", "보조 설명 2"],  // 선택
  },
  curiosity: ["궁금증 문장 1줄~2줄"],
  screenshotCaption: "실제 화면 아래 캡션",
}
```

`node scripts/reel-template/build.mjs`를 다시 실행하면 전체(기존 항목 포함) 재생성됩니다. 특정 항목만 다시 만들고 싶으면 `content.mjs`에서 `REELS` 배열을 임시로 필터링한 뒤 실행하세요.

## 고정 타임라인 (모든 릴스 공통, 약 20초)

| 장면 | 길이 | 내용 |
|---|---|---|
| HOOK | 2초 | 후킹 문장 |
| INFO | 5초 | 핵심 정보 + 키워드 강조 |
| CURIOSITY | 3초 | 궁금증 유발 질문 |
| 실제 앱 화면 | 3초 | 진짜 사주랩 결과 화면 캡처 |
| CTA | 4초 | "내 사주는 어떨까?" + 프로필 링크 버튼 |

오디오도 동일 구조(화음 전조 + 후킹 아르페지오 + CTA 확인음 + 전환 whoosh 2회)를 모든 영상에 일관 적용합니다. 상세 설계는 [R25_AUDIO_LICENSE.md](../../R25_AUDIO_LICENSE.md) 참고 — 전부 ffmpeg 오리지널 합성이라 저작권 문제가 없습니다.
