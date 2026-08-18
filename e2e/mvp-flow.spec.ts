import { test, expect } from "@playwright/test";
import { E2E_SERVER_LOG_PATH } from "../integration/config";
import { loadTestEnv } from "../integration/env";
import { scrapeSignInUrl } from "./scrape-magic-link";
import { prisma } from "../lib/prisma";

const { LISTENER_ADMIN_EMAIL } = loadTestEnv();

// Unique per run (not a fixed "River") so a prior failed run's leftover
// queue entry can never be mistaken for this run's — belt-and-suspenders
// alongside the afterEach cleanup below, which is the actual fix.
const visitorName = `E2E-River-${Date.now()}`;

test.afterEach(async () => {
  const session = await prisma.session.findFirst({ where: { displayName: visitorName } });
  if (!session) return;
  await prisma.message.deleteMany({ where: { sessionId: session.id } });
  await prisma.queueEntry.deleteMany({ where: { sessionId: session.id } });
  await prisma.session.delete({ where: { id: session.id } });
});

// docs/technical-requirements.md's mandated E2E slice. The visitor stays
// anonymous — BindIdentity (the visitor's own magic-link sign-in block) is
// intentionally unmounted from ChatWidget (Milestone 4.98), so "sign in" in
// this flow is the Listener's: they're seeded, not self-serve, and must
// authenticate to see the queue at all.
test("start chat, Listener signs in and claims it, messages round-trip both ways", async ({
  browser,
}) => {
  const visitorContext = await browser.newContext();
  const listenerContext = await browser.newContext();
  // AdminDashboard/ListenerChat are i18n (lib/i18n.tsx), defaulting to
  // German for a fresh visitor with no stored preference — force English so
  // the selectors below don't have to juggle both locales.
  await listenerContext.addInitScript(() => window.localStorage.setItem("anchor_locale", "en"));

  const visitor = await visitorContext.newPage();
  const listener = await listenerContext.newPage();
  const visitorMessage = "hey, is anyone there? I just need to vent.";
  const listenerReply = `Hey ${visitorName}, I'm here. What's going on?`;

  await test.step("visitor starts a chat and sends the first message", async () => {
    await visitor.goto("/");
    await visitor.getByRole("button", { name: "Reopen chat" }).click();
    await visitor.getByLabel("Your display name").fill(visitorName);
    await visitor.getByRole("button", { name: "Start chatting" }).click();

    await visitor.getByLabel("Type a message").fill(visitorMessage);
    await visitor.getByRole("button", { name: "Send" }).click();
    await expect(visitor.getByText(visitorMessage)).toBeVisible();
  });

  await test.step("Listener signs in via the console-logged magic link", async () => {
    await listener.goto("/listener/login");
    await listener.getByLabel("Email address").fill(LISTENER_ADMIN_EMAIL);
    await listener.getByRole("button", { name: "Send link" }).click();

    const verifyUrl = await scrapeSignInUrl(
      E2E_SERVER_LOG_PATH,
      LISTENER_ADMIN_EMAIL,
      "Listener sign-in link",
    );
    await listener.goto(verifyUrl);
    await expect(listener).toHaveURL(/\/listener\/queue/);
  });

  await test.step("Listener claims the chat and sees the visitor's message", async () => {
    await listener
      .locator("li")
      .filter({ hasText: visitorName })
      .getByRole("button", { name: "Claim" })
      .click();
    await expect(listener.getByText(visitorMessage)).toBeVisible();
  });

  await test.step("Listener replies and the visitor sees it live via Ably", async () => {
    await listener.getByLabel("Type a message…").fill(listenerReply);
    await listener.getByRole("button", { name: "Send" }).click();

    await expect(visitor.getByText(listenerReply)).toBeVisible({ timeout: 10_000 });
  });
});
