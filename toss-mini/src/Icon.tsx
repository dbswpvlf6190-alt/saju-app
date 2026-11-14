// v16 고급 테마: 화면 속 이모지 대신 쓰는 선 아이콘. 이모지는 기기마다 모양이 달라 싸 보여서(약 100곳 조사, 11/9) 한 가지 굵기로 통일한다.
const PATHS = {
  star: <path d="M12 3l2.2 5.3 5.8.7-4.3 3.9 1.3 6.1-5-3-5 3 1.3-6.1L4 9l5.8-.7z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 9l1.8 6 1.7-5 1.7 5 1.8-6M8 12h8" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  book: <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10" />,
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.5l2.7 2.7L16 10" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <span className="ico" aria-hidden="true">
      <svg viewBox="0 0 24 24">{PATHS[name]}</svg>
    </span>
  );
}
