export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" className="text-xs text-foreground-muted underline underline-offset-4 hover:text-accent-gold-soft">
        로그아웃
      </button>
    </form>
  );
}
