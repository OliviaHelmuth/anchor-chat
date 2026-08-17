import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <span className="font-display text-base">Anchor Chat</span>
            <p className="mt-3 max-w-xs text-sm text-muted">
              Free, anonymous chat support. No account, no diagnosis, no
              judgment — just someone to talk to.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="hover:underline">
                  How it works
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:underline">
                  Privacy &amp; trust
                </a>
              </li>
              <li>
                <a href="#chat" className="hover:underline">
                  Start a chat
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Legal
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/impressum" className="hover:underline">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:underline">
                  Datenschutz / Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Anchor Chat.</p>
          <p>
            A practice project, not a real support service —{" "}
            <a
              href="https://github.com/OliviaHelmuth/anchor-chat"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              view the code
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
