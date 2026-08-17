import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * No RESEND_API_KEY yet (see docs/hosting-and-scaling.md — free tier not
 * provisioned for this milestone) falls back to logging the link, the same
 * pattern already used for OTP-over-SMS. This keeps the whole flow testable
 * without blocking on another account signup; swap in a real key and real
 * sends start happening with no code change.
 */
export async function sendMagicLinkEmail(email: string, url: string) {
  if (!resend) {
    console.log(`[dev] Magic link for ${email}: ${url}`);
    return;
  }

  await resend.emails.send({
    from: "Anchor Chat <onboarding@resend.dev>",
    to: email,
    subject: "Your sign-in link",
    text: `Sign in here: ${url}\n\nThis link expires in 15 minutes and only works once.`,
  });
}

/** Same shape as sendMagicLinkEmail, separate copy so it's unmistakably a Listener link. */
export async function sendListenerLoginEmail(email: string, url: string) {
  if (!resend) {
    console.log(`[dev] Listener sign-in link for ${email}: ${url}`);
    return;
  }

  await resend.emails.send({
    from: "Anchor Chat <onboarding@resend.dev>",
    to: email,
    subject: "Your Listener sign-in link",
    text: `Sign in here: ${url}\n\nThis link expires in 15 minutes and only works once.`,
  });
}

/** FR-8.2 — notifies the admin (Menty B) that a new Listener application needs review. */
export async function sendApplicationNotificationEmail(
  adminEmail: string,
  application: { name: string; email: string; message: string },
  reviewUrl: string
) {
  if (!resend) {
    console.log(
      `[dev] New Listener application from ${application.name} <${application.email}>: ${reviewUrl}`
    );
    return;
  }

  await resend.emails.send({
    from: "Anchor Chat <onboarding@resend.dev>",
    to: adminEmail,
    subject: "New Listener application",
    text: `${application.name} <${application.email}> applied to become a Listener:\n\n"${application.message}"\n\nReview it here: ${reviewUrl}`,
  });
}
