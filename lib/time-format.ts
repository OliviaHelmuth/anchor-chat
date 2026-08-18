export type DurationAgoLabels = {
  justNow: string;
  oneMinuteAgo: string;
  minutesAgo: string; // "{n} minutes ago" — {n} is replaced
  hoursAgo: string; // "{n}h ago"
  daysAgo: string; // "{n}d ago"
};

// Shared by the queue's "waiting since" (always minutes, in practice — see
// docs/challenges/queue-design.md) and the claimed-chat list/archive view's
// "since last reply"/"last online", which can genuinely be days out. One
// scale-aware formatter instead of two, so a stale claimed chat doesn't
// render as "57600 minutes ago."
export function formatDurationAgo(date: Date | string, t: DurationAgoLabels): string {
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return t.justNow;
  if (minutes === 1) return t.oneMinuteAgo;
  if (minutes < 60) return t.minutesAgo.replace("{n}", String(minutes));

  const hours = Math.round(minutes / 60);
  if (hours < 24) return t.hoursAgo.replace("{n}", String(hours));

  const days = Math.round(hours / 24);
  return t.daysAgo.replace("{n}", String(days));
}
