import { getSessionId } from "@/lib/session";
import { getChatState } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { Nav } from "./_components/Nav";
import { Footer } from "./_components/Footer";
import { Hero } from "./_components/Hero";
import { PainPoints } from "./_components/PainPoints";
import { HowItWorks } from "./_components/HowItWorks";
import { TrustSection } from "./_components/TrustSection";
import { FAQSection } from "./_components/FAQSection";
import { StartChat } from "./_components/StartChat";
import { ChatWidget } from "./_components/ChatWidget";
import { ChatWidgetProvider } from "./_components/ChatWidgetContext";

export default async function Home() {
  const sessionId = await getSessionId();
  const chatState = sessionId ? await getChatState(sessionId) : { kind: "none" as const };

  const sessionRow = sessionId
    ? await prisma.session.findUnique({ where: { id: sessionId }, select: { displayName: true } })
    : null;

  // The landing page always renders — an active chat lives in the floating
  // widget, not a full-page takeover, so clicking the Nav logo back to "/"
  // actually shows the marketing page again instead of a stuck queue view.
  return (
    <ChatWidgetProvider startOpen={chatState.kind !== "none"}>
      <Nav />
      <main className="flex-1">
        <Hero>
          <StartChat />
        </Hero>
        <PainPoints />
        <HowItWorks />
        <TrustSection />
        <FAQSection />
      </main>
      <Footer />
      <ChatWidget initial={chatState} initialDisplayName={sessionRow?.displayName ?? null} />
    </ChatWidgetProvider>
  );
}
