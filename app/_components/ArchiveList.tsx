"use client";

import type { OngoingSession } from "@/lib/queue";
import { formatDurationAgo } from "@/lib/time-format";
import { useI18n } from "@/lib/i18n";

// Read-only per FR-11.6 — no claim/open-panel affordance here, this view
// exists to confirm what aged out of AdminDashboard's claimed-chat list,
// not to act on it. Rows span every Listener's claimed chats (unlike the
// dashboard's own list, scoped to the caller), since this is an admin-only
// view (app/admin/archive/page.tsx).
export function ArchiveList({ sessions }: { sessions: OngoingSession[] }) {
  const { t } = useI18n();

  if (sessions.length === 0) {
    return <p className="text-sm text-ink/70">{t.admin.archivePage.empty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((session) => {
        const lastActivity =
          session.lastMessageAt && session.claimedAt
            ? new Date(Math.max(new Date(session.lastMessageAt).getTime(), new Date(session.claimedAt).getTime()))
            : (session.lastMessageAt ?? session.claimedAt);
        return (
          <li key={session.sessionId} className="nb-sm flex flex-col gap-1 bg-bg px-3 py-2 text-sm">
            <span className="flex items-center justify-between gap-2">
              <span className="font-bold">{session.displayName ?? t.admin.dashboard.anonymous}</span>
              {lastActivity && (
                <span className="text-xs text-ink/70">
                  {t.admin.archivePage.lastActivity}: {formatDurationAgo(lastActivity, t.admin.dashboard)}
                </span>
              )}
            </span>
            <span className="text-xs text-ink/70">
              {t.admin.dashboard.claimedBy} {session.listenerDisplayName?.trim() || t.admin.chat.defaultListenerName}
            </span>
            {session.claimedAt && (
              <span className="text-xs text-ink/70">
                {t.admin.archivePage.claimedOn} {new Date(session.claimedAt).toLocaleDateString()}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
