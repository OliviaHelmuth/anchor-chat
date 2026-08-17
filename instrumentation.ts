import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Demo project, not a production service under real load — keep
      // tracing off rather than paying for spans nobody will read.
      tracesSampleRate: 0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
