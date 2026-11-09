// 2026-11 토스 v16과 같은 선 아이콘. 이모지는 기기마다 모양이 달라 싸 보여서, 화면 속 장식은 한 가지 굵기의 선 아이콘으로 통일한다.
// 공유 문구(카톡·SNS로 나가는 글)에 들어간 이모지는 그대로 둔다.
const PATHS = {
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 9l1.8 6 1.7-5 1.7 5 1.8-6M8 12h8" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  book: <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10" />,
  star: <path d="M12 3l2.2 5.3 5.8.7-4.3 3.9 1.3 6.1-5-3-5 3 1.3-6.1L4 9l5.8-.7z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" />,
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.5l2.7 2.7L16 10" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <span className={`ico ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">{PATHS[name]}</svg>
    </span>
  );
}
