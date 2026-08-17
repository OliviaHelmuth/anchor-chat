const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

/**
 * No BREVO_API_KEY/BREVO_SENDER_EMAIL yet (see docs/hosting-and-scaling.md —
 * free tier not provisioned for this milestone) falls back to logging the
 * link, the same pattern already used for OTP-over-SMS. This keeps the
 * whole flow testable without blocking on another account signup; add a
 * real key and sender and real sends start happening with no code change.
 *
 * A plain `fetch` against Brevo's REST API rather than their SDK — one
 * endpoint, no reason to pull in a generated client for it. sender.email
 * must be a Brevo-verified sender (Senders, Domains & Dedicated IPs in
 * their dashboard); unlike Resend's shared onboarding@resend.dev sandbox
 * address, Brevo has no address you can send from without verifying one
 * yourself.
 */
async function sendEmail(params: { to: string; subject: string; text: string }): Promise<boolean> {
  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) return false;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "overshare.io", email: BREVO_SENDER_EMAIL },
      to: [{ email: params.to }],
      subject: params.subject,
      textContent: params.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status} ${await res.text()}`);
  }
  return true;
}

export async function sendMagicLinkEmail(email: string, url: string) {
  const text = `Sign in here: ${url}\n\nThis link expires in 15 minutes and only works once.`;
  const sent = await sendEmail({ to: email, subject: "Your sign-in link", text });
  if (!sent) console.log(`[dev] Magic link for ${email}: ${url}`);
}

/** Same shape as sendMagicLinkEmail, separate copy so it's unmistakably a Listener link. */
export async function sendListenerLoginEmail(email: string, url: string) {
  const text = `Sign in here: ${url}\n\nThis link expires in 15 minutes and only works once.`;
  const sent = await sendEmail({ to: email, subject: "Your Listener sign-in link", text });
  if (!sent) console.log(`[dev] Listener sign-in link for ${email}: ${url}`);
}

/** FR-8.2 — notifies the admin (Menty B) that a new Listener application needs review. */
export async function sendApplicationNotificationEmail(
  adminEmail: string,
  application: { name: string; email: string; message: string },
  reviewUrl: string
) {
  const text = `${application.name} <${application.email}> applied to become a Listener:\n\n"${application.message}"\n\nReview it here: ${reviewUrl}`;
  const sent = await sendEmail({ to: adminEmail, subject: "New Listener application", text });
  if (!sent) {
    console.log(
      `[dev] New Listener application from ${application.name} <${application.email}>: ${reviewUrl}`
    );
  }
}
