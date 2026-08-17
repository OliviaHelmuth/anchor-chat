import type { Metadata } from "next";
import { Nav } from "../_components/Nav";
import { Footer } from "../_components/Footer";

export const metadata: Metadata = { title: "Datenschutz / Privacy — overshare.io" };

export default function DatenschutzPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl">Datenschutz / Privacy</h1>

          <div className="mt-6 rounded-2xl bg-accent-2-tint p-5 text-sm text-ink">
            This is a practice project, not a real support service. The demo
            deployment is genuinely reachable and genuinely processes
            whatever you type into it (that&apos;s the point — it&apos;s a real,
            working app) — so please don&apos;t enter real personal
            information or anything you wouldn&apos;t want stored in a
            hobby project&apos;s database.
          </div>

          <section className="mt-8 space-y-2 text-sm">
            <h2 className="font-semibold text-base">What we collect</h2>
            <p className="text-muted">
              An anonymous session identifier the moment you click &ldquo;Chat
              now&rdquo; — nothing else at that point. If you choose to leave an
              email, phone number, or set up a passkey so the chat can find
              you again, that gets bound to your session. Nothing else is
              ever asked for: no name, no date of birth, no address.
            </p>
          </section>

          <section className="mt-6 space-y-2 text-sm">
            <h2 className="font-semibold text-base">Where it lives</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>Database: Neon Postgres, EU (Frankfurt)</li>
              <li>Realtime messaging: Ably</li>
              <li>Magic-link email: Brevo, if configured</li>
              <li>Error monitoring: Sentry</li>
              <li>Hosting: Vercel</li>
            </ul>
            <p className="text-muted">
              Full reasoning behind each of these — including the
              cross-border trade-offs — is public:{" "}
              <a
                href="https://github.com/OliviaHelmuth/anchor-chat/blob/main/docs/hosting-and-scaling.md"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                docs/hosting-and-scaling.md
              </a>
              .
            </p>
          </section>

          <section className="mt-6 space-y-2 text-sm">
            <h2 className="font-semibold text-base">What we don&apos;t do</h2>
            <p className="text-muted">
              No ad tracking, no analytics resale, no cookies beyond what
              keeps the chat session working. No AI model call ever
              includes your email, phone, or session id — see{" "}
              <a
                href="https://github.com/OliviaHelmuth/anchor-chat/blob/main/docs/challenges/ai-triage.md"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                the write-up on that
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
