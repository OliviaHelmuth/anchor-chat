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
import { WaitingRoom } from "./_components/WaitingRoom";

export default async function Home() {
  const sessionId = await getSessionId();
  const position = sessionId ? await getQueuePosition(sessionId) : null;
  const inChat = position !== null;

  const identified = sessionId
    ? await Promise.all([
        prisma.session.findUnique({ where: { id: sessionId }, select: { email: true, phone: true } }),
        prisma.passkeyCredential.findFirst({ where: { sessionId }, select: { id: true } }),
      ]).then(([session, passkey]) => Boolean(session?.email || session?.phone || passkey))
    : false;

  return (
    <>
      <Nav />
      <main className="flex-1">
        {inChat ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24">
            <WaitingRoom
              initial={{ position, waitSeconds: await getWaitEstimateSeconds(position) }}
              identified={identified}
            />
          </div>
        ) : (
          <>
            <Hero>
              <StartChat />
            </Hero>
            <PainPoints />
            <HowItWorks />
            <TrustSection />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
