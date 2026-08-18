"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "de" | "en";

const STORAGE_KEY = "anchor_locale";

interface Dictionary {
  nav: { howItsUsed: string; trust: string; faq: string; login: string };
  hero: {
    badge: string;
    headline1: string;
    headline2: string;
    body: string;
    cta: string;
    trustLine: string;
  };
  painPoints: { eyebrow: string; heading: string; closing: string };
  howItsUsed: {
    eyebrow: string;
    heading: string;
    cardCaption: string;
    steps: { title: string; body: string }[];
  };
  trust: {
    eyebrow: string;
    heading: string;
    facts: { title: string; body: string }[];
  };
  faq: {
    eyebrow: string;
    heading: string;
    items: { q: string; a: string }[];
  };
  footer: {
    tagline: string;
    product: string;
    howItsUsed: string;
    trust: string;
    startChat: string;
    becomeListener: string;
    meetListeners: string;
    legal: string;
    impressum: string;
    datenschutz: string;
    disclaimer: string;
    viewCode: string;
  };
  cookie: { text: string; privacy: string; accept: string };
  admin: {
    nav: {
      subtitle: string;
      dashboard: string;
      yourProfile: string;
      applications: string;
      listeners: string;
      archive: string;
      signOut: string;
    };
    queuePage: { title: string; signedInAdmin: string; signedInListener: string };
    profilePage: { title: string; shownOn: string; yourPublicPage: string; noRealName: string };
    applicationsPage: { title: string; subtitle: string };
    listenersPage: { title: string; subtitle: string };
    archivePage: {
      title: string;
      subtitle: string;
      empty: string;
      backToDashboard: string;
      visitor: string;
      claimedOn: string;
      lastActivity: string;
    };
    dashboard: {
      queue: string;
      claim: string;
      claiming: string;
      nobodyWaiting: string;
      waitingSince: string;
      anonymous: string;
      ongoingChats: string;
      noClaimedChats: string;
      open: string;
      emptyPanels: string;
      closePanel: string;
      justNow: string;
      oneMinuteAgo: string;
      minutesAgo: string;
      hoursAgo: string;
      daysAgo: string;
      claimedBy: string;
      lastMessage: string;
      sinceLastReply: string;
      noMessagesYet: string;
      online: string;
      lastOnline: string;
      sortBy: string;
      sortLastOnline: string;
      sortLastAnswered: string;
      viewArchive: string;
    };
    chat: { noMessages: string; typeMessage: string; send: string; defaultListenerName: string };
    applications: {
      pending: string;
      nothingWaiting: string;
      approve: string;
      reject: string;
      reviewed: string;
      noDecisionsYet: string;
    };
    listenersPanel: {
      noDisplayName: string;
      admin: string;
      remove: string;
      removeListing: string;
      removeConfirm: string;
      aListener: string;
    };
    profileForm: {
      displayName: string;
      bio: string;
      save: string;
      saving: string;
      saved: string;
    };
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  de: {
    nav: {
      howItsUsed: "So läuft's",
      trust: "Ehrlich gesagt",
      faq: "FAQ",
      login: "Login",
    },
    hero: {
      badge: "✦ kein Account · keine Diagnose · kein Cent",
      headline1: "OVERSHARE",
      headline2: "LAUT & UNGEFILTERT.",
      body: "Hirn macht wieder 3-Uhr-Overtime. ADHS-Brain will nicht abschalten, die Gedankenspirale dreht sich, ein Meltdown klopft an — sag's einfach hier. Kein Diagnose-Zettel nötig, kein Filter, safe.",
      cta: "overshare starten — kostenlos",
      trustLine: "🔒 Komplett anonym  ·  🧠 Echte Menschen, keine Bots  ·  🆓 Immer kostenlos, no cap",
    },
    painPoints: {
      eyebrow: "01 — IYKYK",
      heading: "Du brauchst keine Krise, um zu overshare-n.",
      closing:
        "Was auch immer es ist — klein, riesig, „idk, einfach alles“ — es muss noch keinen Sinn ergeben. Dafür ist der Chat da.",
    },
    howItsUsed: {
      eyebrow: "02 — DER ABLAUF",
      heading: "Drei Schritte. Kein Papierkram. Kein Cringe.",
      cardCaption: "Kein Gatekeeping, kein Bewerbungsessay fürs Reden-dürfen. Nur du, ungefiltert.",
      steps: [
        {
          title: "Klick „overshare starten“",
          body: "Keine Anmeldung, kein Formular, kein Vibe-Check vorher. Du bist direkt in der Warteschlange.",
        },
        {
          title: "Sieh deinen Platz live",
          body: "Eine echte Wartezeit, die sich live aktualisiert — keine Floskel a la „gleich ist jemand da“.",
        },
        {
          title: "Sprich mit einem echten Menschen",
          body: "Ein:e Listener meldet sich. E-Mail oder Passkey hinterlegen, um später weiterzumachen, ist optional — kein Druck.",
        },
      ],
    },
    trust: {
      eyebrow: "03 — DIE RECEIPTS",
      heading: "„Vertrau uns“ ist keine Antwort. Hier ist der Beweis.",
      facts: [
        {
          title: "Wirklich anonym, nicht Marketing-anonym",
          body: "Kein Name, kein Geburtsdatum, keine Adresse — nie. Wir fragen nicht danach, also können wir's auch nicht leaken. E-Mail oder Passkey sind komplett optional.",
        },
        {
          title: "Ein echter Mensch, kein Bot im Hoodie",
          body: "Jeder Chat wird von einem:einer echten Listener übernommen. (Eine KI-Bestie ist in Arbeit — klar gekennzeichnet, sobald sie da ist, versprochen.)",
        },
        {
          title: "Kostenlos. Keine Premium-Gefühle.",
          body: "Kein Abo, kein „erstes Overshare gratis“, kein Upselling. Du bist hier nicht das Produkt.",
        },
        {
          title: "Offen entwickelt, keine NDA",
          body: "Das ist ein Übungsprojekt, keine Firma — Code, Datenmodell und jede Design-Entscheidung sind öffentlich einsehbar.",
        },
      ],
    },
    faq: {
      eyebrow: "04 — FAQ (diesmal wirklich)",
      heading: "Noch Fragen? Sag Bescheid.",
      items: [
        {
          q: "Für wen ist das hier überhaupt?",
          a: "Für dich. Egal ob echte Krise, ADHS-Brain dreht durch, autistischer Meltdown im Anmarsch, Zwangsgedanken-Loop, Depression legt alles flach, oder einfach ein Dienstag, der zu laut wurde — du brauchst keinen Erlaubnisschein.",
        },
        {
          q: "Wann schreibe ich am besten?",
          a: "Jederzeit. 3-Uhr-Spirale, Panik mitten im Unterricht, ganz normaler Dienstag — es gibt keine „schlimm genug“-Grenze. Du musst nicht warten, bis es schlimmer wird.",
        },
        {
          q: "Wie lange dauert das Ganze?",
          a: "Die Wartezeit siehst du live, sobald du startest. Das Gespräch selbst dauert so lange, wie du es brauchst — kein Timer, kein „bitte fass dich kurz“.",
        },
        {
          q: "Wer liest das hier eigentlich wirklich?",
          a: "Ein echter, geprüfter Mensch aus unserem Listener-Team. Nie ein Bot, nie ein Algorithmus, der deine Probleme als Trainingsdaten mitliest. Öffentliches Profil gibt's als Beweis.",
        },
      ],
    },
    footer: {
      tagline: "Kostenloser, anonymer Chat-Support. Kein Account, keine Diagnose, kein Urteil — nur ein Ort, um es loszuwerden.",
      product: "Das Wichtige",
      howItsUsed: "So läuft's",
      trust: "Vertrauen & Receipts",
      startChat: "Overshare starten",
      becomeListener: "Listener werden",
      meetListeners: "Unsere Listener",
      legal: "Der langweilige Pflichtteil",
      impressum: "Impressum",
      datenschutz: "Datenschutz",
      disclaimer: "Ein Übungsprojekt, kein echter Support-Dienst —",
      viewCode: "Code ansehen",
    },
    cookie: {
      text: "Wir nutzen nur Cookies, die den Chat am Laufen halten — kein Tracking, keine Werbe-Creeps.",
      privacy: "Datenschutz",
      accept: "safe",
    },
    admin: {
      nav: {
        subtitle: "Admin-Bereich",
        dashboard: "Dashboard",
        yourProfile: "Dein Profil",
        applications: "Bewerbungen",
        listeners: "Listener",
        archive: "Archiv",
        signOut: "Abmelden",
      },
      queuePage: {
        title: "Dashboard",
        signedInAdmin: "Angemeldet als Admin.",
        signedInListener: "Angemeldet als Listener.",
      },
      profilePage: {
        title: "Dein öffentliches Profil",
        shownOn: "Sichtbar auf",
        yourPublicPage: "deiner öffentlichen Seite",
        noRealName: "Kein echter Name nötig — wähl, womit du dich wohlfühlst.",
      },
      applicationsPage: {
        title: "Listener-Bewerbungen",
        subtitle: "Nur für Admins: Bewerbungs-Review.",
      },
      listenersPage: {
        title: "Listener",
        subtitle: "Nur für Admins: Listing-Verwaltung.",
      },
      archivePage: {
        title: "Archiv",
        subtitle: "Chats ohne Aktivität seit 40+ Tagen — nur lesbar.",
        empty: "Noch nichts archiviert.",
        backToDashboard: "Zurück zum Dashboard",
        visitor: "Besuchende",
        claimedOn: "Übernommen am",
        lastActivity: "Letzte Aktivität",
      },
      dashboard: {
        queue: "Warteschlange",
        claim: "Übernehmen",
        claiming: "Wird übernommen…",
        nobodyWaiting: "Gerade wartet niemand.",
        waitingSince: "wartet seit",
        anonymous: "Anonym",
        ongoingChats: "Laufende Chats",
        noClaimedChats: "Noch keine übernommenen Chats.",
        open: "(offen)",
        emptyPanels: "Übernimm einen Chat aus der Warteschlange oder öffne einen aus „Laufende Chats“, um zu starten.",
        closePanel: "Chat-Panel schließen",
        justNow: "gerade eben",
        oneMinuteAgo: "vor 1 Minute",
        minutesAgo: "vor {n} Minuten",
        hoursAgo: "vor {n} Std.",
        daysAgo: "vor {n} Tagen",
        claimedBy: "Übernommen von",
        lastMessage: "Letzte Nachricht",
        sinceLastReply: "seit letzter Antwort",
        noMessagesYet: "Noch keine Nachricht",
        online: "Online",
        lastOnline: "Zuletzt online",
        sortBy: "Sortieren nach",
        sortLastOnline: "Zuletzt online (Besuchende)",
        sortLastAnswered: "Deine letzte Antwort",
        viewArchive: "Archiv ansehen",
      },
      chat: {
        noMessages: "Noch keine Nachrichten.",
        typeMessage: "Nachricht schreiben…",
        send: "Senden",
        defaultListenerName: "Listener",
      },
      applications: {
        pending: "Ausstehend ({n})",
        nothingWaiting: "Nichts wartet auf Review.",
        approve: "Annehmen",
        reject: "Ablehnen",
        reviewed: "Entschieden",
        noDecisionsYet: "Noch keine Entscheidungen.",
      },
      listenersPanel: {
        noDisplayName: "(kein Anzeigename gesetzt)",
        admin: "Admin",
        remove: "Entfernen",
        removeListing: "Listing entfernen",
        removeConfirm: "Dieses Listener-Listing entfernen? Das kann nicht rückgängig gemacht werden.",
        aListener: "Ein:e Listener",
      },
      profileForm: {
        displayName: "Anzeigename",
        bio: "Bio",
        save: "Profil speichern",
        saving: "Wird gespeichert…",
        saved: "Gespeichert.",
      },
    },
  },
  en: {
    nav: {
      howItsUsed: "How it works",
      trust: "No cap",
      faq: "FAQ",
      login: "Login",
    },
    hero: {
      badge: "✦ no account · no diagnosis · no cost",
      headline1: "OVERSHARE",
      headline2: "LOUD & UNFILTERED.",
      body: "Brain's doing the unhinged 3am thing again. ADHD brain won't shut up, the spiral's spiraling, a meltdown's knocking — just say it here. No diagnosis required, no filter, no cap.",
      cta: "start overshare-ing — free",
      trustLine: "🔒 Fully anonymous  ·  🧠 Real humans, not bots  ·  🆓 Always free, no cap",
    },
    painPoints: {
      eyebrow: "01 — IYKYK",
      heading: "You don't need a crisis to overshare.",
      closing:
        "Whatever it is — small, huge, or just \"idk, everything?\" — it doesn't have to make sense yet. That's what the chat is for.",
    },
    howItsUsed: {
      eyebrow: "02 — THE LOWDOWN",
      heading: "Three steps. Zero paperwork. Zero cringe.",
      cardCaption: "No gatekeeping, no essay to earn the right to vent. Just you, unfiltered.",
      steps: [
        {
          title: "Hit “start overshare-ing”",
          body: "No sign-up, no form, no vibe check first. You're straight into the queue.",
        },
        {
          title: "Watch your spot, live",
          body: "An actual wait estimate updating in real time — not a fake “someone will be right with you.”",
        },
        {
          title: "Talk to an actual human",
          body: "A real Listener shows up. Leave an email or set up a passkey to pick it back up later — totally optional, zero pressure.",
        },
      ],
    },
    trust: {
      eyebrow: "03 — NO CAP",
      heading: "“Trust us” isn't a vibe. Here are the receipts.",
      facts: [
        {
          title: "Actually anonymous, not marketing-anonymous",
          body: "No name, no birthday, no address — ever. We don't ask, so we can't leak it. Leaving an email or passkey to resume later is fully optional.",
        },
        {
          title: "A real human, not a bot in a hoodie",
          body: "Every chat is picked up by a real Listener. (An AI bestie is in the works — clearly labeled the second it lands, promise.)",
        },
        {
          title: "Free. No premium tier for your feelings.",
          body: "No subscription, no “first overshare free,” no upsell. You are not the product here.",
        },
        {
          title: "Built in public, no NDAs",
          body: "This is a practice project, not a company — the code, the data model, every decision is public. See the footer.",
        },
      ],
    },
    faq: {
      eyebrow: "04 — FAQ (for real this time)",
      heading: "Still got questions? Say less.",
      items: [
        {
          q: "Who's this even for?",
          a: "You. Whether it's a full-blown crisis, ADHD brain won't quit, an autistic meltdown incoming, an OCD loop, depression flatlining everything, or just a Tuesday that got too loud — you don't need a permission slip.",
        },
        {
          q: "When do I actually text?",
          a: "Whenever. 3am spiral, mid-class panic, a completely normal Tuesday — there's no “bad enough yet” threshold. You don't have to wait for it to get worse.",
        },
        {
          q: "How long is this gonna take?",
          a: "You'll see a live wait estimate the second you start. The chat itself runs as long as you need — no timer, no “wrap it up” energy.",
        },
        {
          q: "Who's actually reading this?",
          a: "A real, vetted human from our Listener team. Never a bot, never an algorithm skimming your stuff for training data. Check their public profile for receipts.",
        },
      ],
    },
    footer: {
      tagline: "Free, anonymous chat support. No account, no diagnosis, no judgment — just somewhere to put it down.",
      product: "The stuff that matters",
      howItsUsed: "How it works",
      trust: "Trust & receipts",
      startChat: "Start overshare-ing",
      becomeListener: "Become a Listener",
      meetListeners: "Meet the Listeners",
      legal: "The boring required part",
      impressum: "Impressum",
      datenschutz: "Datenschutz / Privacy",
      disclaimer: "A practice project, not a real support service —",
      viewCode: "peep the code",
    },
    cookie: {
      text: "We only use cookies that keep the chat alive — no tracking, no ad creeps.",
      privacy: "Privacy",
      accept: "bet",
    },
    admin: {
      nav: {
        subtitle: "Admin Panel",
        dashboard: "Dashboard",
        yourProfile: "Your profile",
        applications: "Applications",
        listeners: "Listeners",
        archive: "Archive",
        signOut: "Sign out",
      },
      queuePage: {
        title: "Dashboard",
        signedInAdmin: "Signed in as admin.",
        signedInListener: "Signed in as Listener.",
      },
      profilePage: {
        title: "Your public profile",
        shownOn: "Shown on",
        yourPublicPage: "your public page",
        noRealName: "No real legal name required — pick whatever you're comfortable showing.",
      },
      applicationsPage: {
        title: "Listener applications",
        subtitle: "Admin-only review queue.",
      },
      listenersPage: {
        title: "Listeners",
        subtitle: "Admin-only listing management.",
      },
      archivePage: {
        title: "Archive",
        subtitle: "Chats with no activity for 40+ days — read-only.",
        empty: "Nothing archived yet.",
        backToDashboard: "Back to dashboard",
        visitor: "Visitor",
        claimedOn: "Claimed on",
        lastActivity: "Last activity",
      },
      dashboard: {
        queue: "Queue",
        claim: "Claim",
        claiming: "Claiming…",
        nobodyWaiting: "Nobody's waiting right now.",
        waitingSince: "waiting since",
        anonymous: "Anonymous",
        ongoingChats: "Ongoing chats",
        noClaimedChats: "No claimed chats yet.",
        open: "(open)",
        emptyPanels: "Claim a chat from the queue, or reopen one from “Ongoing chats,” to start.",
        closePanel: "Close chat panel",
        justNow: "just now",
        oneMinuteAgo: "1 minute ago",
        minutesAgo: "{n} minutes ago",
        hoursAgo: "{n}h ago",
        daysAgo: "{n}d ago",
        claimedBy: "Claimed by",
        lastMessage: "Last message",
        sinceLastReply: "since last reply",
        noMessagesYet: "No messages yet",
        online: "Online",
        lastOnline: "Last online",
        sortBy: "Sort by",
        sortLastOnline: "Visitor last online",
        sortLastAnswered: "Time you last answered",
        viewArchive: "View archive",
      },
      chat: {
        noMessages: "No messages yet.",
        typeMessage: "Type a message…",
        send: "Send",
        defaultListenerName: "Listener",
      },
      applications: {
        pending: "Pending ({n})",
        nothingWaiting: "Nothing waiting on review.",
        approve: "Approve",
        reject: "Reject",
        reviewed: "Reviewed",
        noDecisionsYet: "No decisions yet.",
      },
      listenersPanel: {
        noDisplayName: "(no display name set)",
        admin: "admin",
        remove: "Remove",
        removeListing: "Remove listing",
        removeConfirm: "Remove this Listener's listing? This can't be undone.",
        aListener: "A Listener",
      },
      profileForm: {
        displayName: "Display name",
        bio: "Bio",
        save: "Save profile",
        saving: "Saving…",
        saved: "Saved.",
      },
    },
  },
};

const LocaleContext = createContext<{
  locale: Locale;
  t: Dictionary;
  setLocale: (l: Locale) => void;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial: Locale = stored === "en" || stored === "de" ? stored : "de";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(initial);
    document.documentElement.lang = initial;
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }

  return (
    <LocaleContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
