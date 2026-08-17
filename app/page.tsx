import { getSessionId } from "@/lib/session";
import { getQueuePosition, getWaitEstimateSeconds } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { Nav } from "./_components/Nav";
import { Footer } from "./_components/Footer";
import { Hero } from "./_components/Hero";
import { PainPoints } from "./_components/PainPoints";
import { HowItWorks } from "./_components/HowItWorks";
import { TrustSection } from "./_components/TrustSection";
import { StartChat } from "./_components/StartChat";
import { ChatWidget } from "./_components/ChatWidget";
import { ChatWidgetProvider } from "./_components/ChatWidgetContext";

export default async function Home() {
  const sessionId = await getSessionId();
  const position = sessionId ? await getQueuePosition(sessionId) : null;

  const identified = sessionId
    ? await Promise.all([
        prisma.session.findUnique({ where: { id: sessionId }, select: { email: true, phone: true } }),
        prisma.passkeyCredential.findFirst({ where: { sessionId }, select: { id: true } }),
      ]).then(([session, passkey]) => Boolean(session?.email || session?.phone || passkey))
    : false;

  // The landing page always renders — an active chat lives in the floating
  // widget, not a full-page takeover, so clicking the Nav logo back to "/"
  // actually shows the marketing page again instead of a stuck queue view.
  return (
    <ChatWidgetProvider startOpen={position !== null}>
      <Nav />
      <main className="flex-1">
        <Hero>
          <StartChat />
        </Hero>
        <PainPoints />
        <HowItWorks />
        <TrustSection />
      </main>
      <Footer />
      <ChatWidget
        initial={position !== null ? { position, waitSeconds: await getWaitEstimateSeconds(position) } : null}
        identified={identified}
      />
    </ChatWidgetProvider>
  );
}
