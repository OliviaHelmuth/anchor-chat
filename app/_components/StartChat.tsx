"use client";

import { useChatWidget } from "./ChatWidgetContext";
import { useI18n } from "@/lib/i18n";

// Just opens the widget — ChatWidget's own welcome/name step (not this
// button) is what actually creates the session (POST /api/chat/start), so
// there's nothing async to do here anymore.
export function StartChat() {
  const { t } = useI18n();
  const { openWidget } = useChatWidget();

  return (
    <button
      onClick={openWidget}
      className="nb-pill nb-press bg-accent px-8 py-3 text-base font-bold text-accent-ink"
    >
      {t.hero.cta}
    </button>
  );
}
