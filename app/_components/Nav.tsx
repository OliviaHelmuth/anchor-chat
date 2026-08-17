import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-bg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3v18M12 21c-4 0-7-2.5-7-6M12 21c4 0 7-2.5 7-6M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-lg tracking-tight">Anchor Chat</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
          <a href="#how-it-works" className="hover:text-ink">
            How it works
          </a>
          <a href="#trust" className="hover:text-ink">
            Privacy
          </a>
        </nav>

        <Link
          href="/listener/login"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
        >
          Login
        </Link>
      </div>
    </header>
  );
}
