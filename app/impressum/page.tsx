import type { Metadata } from "next";
import { Nav } from "../_components/Nav";
import { Footer } from "../_components/Footer";

export const metadata: Metadata = { title: "Impressum — Anchor Chat" };

export default function ImpressumPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl">Impressum</h1>

          <div className="mt-6 rounded-2xl bg-accent-2-tint p-5 text-sm text-ink">
            Anchor Chat is a portfolio/practice project, not a real company —
            there is no registered legal entity behind it. German sites are
            legally required to publish an Impressum (§5 TMG); this page
            shows that structure honestly, with each field marked as N/A
            rather than filled with invented details that could be mistaken
            for a real registration.
          </div>

          <dl className="mt-8 space-y-6 text-sm">
            <div>
              <dt className="font-semibold">Anbieter (provider)</dt>
              <dd className="mt-1 text-muted">
                Anchor Chat — a demo project. No registered entity exists.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Vertreten durch</dt>
              <dd className="mt-1 text-muted">N/A — no legal entity, no legal representative.</dd>
            </div>
            <div>
              <dt className="font-semibold">Kontakt</dt>
              <dd className="mt-1 text-muted">
                Source code and contact:{" "}
                <a
                  href="https://github.com/OliviaHelmuth/anchor-chat"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/OliviaHelmuth/anchor-chat
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Registereintrag / USt-IdNr.</dt>
              <dd className="mt-1 text-muted">N/A — not a registered business.</dd>
            </div>
            <div>
              <dt className="font-semibold">
                Verantwortlich für den Inhalt nach § 18 MStV
              </dt>
              <dd className="mt-1 text-muted">N/A — demo project, no publisher of record.</dd>
            </div>
          </dl>
        </div>
      </main>
      <Footer />
    </>
  );
}
