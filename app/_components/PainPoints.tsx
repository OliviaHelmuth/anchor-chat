"use client";

import { useI18n } from "@/lib/i18n";

const SCENARIOS_EN = [
  {
    tag: "the group chat",
    line: "Family drama has its own extended universe at this point.",
  },
  {
    tag: "executive dysfunction",
    line: "The dishes have been visible from space for a week and you know exactly why you can't touch them.",
  },
  {
    tag: "the hyperfixation",
    line: "You now know everything about deep sea creatures. Slept? Absolutely not.",
  },
  {
    tag: "rejection sensitive tea",
    line: "One “k.” text and you're already planning your exile.",
  },
  {
    tag: "the scroll",
    line: "Three hours gone and you couldn't tell anyone what you watched.",
  },
  {
    tag: "the mask slipping",
    line: "Held it together all day. Now you're crying in a parking lot about nothing.",
  },
];

const SCENARIOS_DE = [
  {
    tag: "der Gruppenchat",
    line: "Familiendrama hat mittlerweile sein eigenes Universum.",
  },
  {
    tag: "exekutive Dysfunktion",
    line: "Das Geschirr ist seit einer Woche von der ISS aus sichtbar, und du weißt genau, warum du's nicht anfasst.",
  },
  {
    tag: "der Hyperfokus",
    line: "Du weißt jetzt alles über Tiefseefische. Geschlafen? Nicht mal ansatzweise.",
  },
  {
    tag: "die Rejection-Spirale",
    line: "Eine „k.“-Antwort und du planst schon deine Auswanderung.",
  },
  {
    tag: "der Scroll",
    line: "Drei Stunden weg, und du könntest nicht sagen, was du geschaut hast.",
  },
  {
    tag: "die Maske rutscht",
    line: "Den ganzen Tag zusammengerissen. Jetzt weinst du auf dem Parkplatz wegen nichts.",
  },
];

export function PainPoints() {
  const { t, locale } = useI18n();
  const scenarios = locale === "de" ? SCENARIOS_DE : SCENARIOS_EN;

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs tracking-widest text-ink">
          {t.painPoints.eyebrow}
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          {t.painPoints.heading}
        </h2>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {scenarios.map((s, i) => (
            <div
              key={s.tag}
              className={`nb nb-press-sm bg-surface p-6 ${i % 2 === 0 ? "-rotate-1" : "rotate-1"}`}
            >
              <span className="nb-sm inline-block bg-accent-3 px-3 py-1 text-xs font-bold text-accent-3-ink">
                {s.tag}
              </span>
              <p className="mt-4 text-base leading-snug">{s.line}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-lg text-ink sm:mt-14">
          {t.painPoints.closing}
        </p>
      </div>
    </section>
  );
}
