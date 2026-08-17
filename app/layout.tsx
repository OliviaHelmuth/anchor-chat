import type { Metadata } from "next";
import { Archivo_Black, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "./_components/CookieBanner";
import { I18nProvider } from "@/lib/i18n";

// Runs before paint so the toggled theme applies immediately on load
// instead of flashing the light-mode default first.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("anchor_theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

const display = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "overshare.io — say the unhinged thing, we're listening",
  description:
    "Free, anonymous chat support for whatever's going on — ADHD brain, autistic meltdown, OCD loop, depression, or just a Tuesday that got too loud. A practice project, not a real support service — see the footer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      data-theme="light"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--ink)] font-body">
        <I18nProvider>
          {children}
          <CookieBanner />
        </I18nProvider>
      </body>
    </html>
  );
}
