"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildBadgedFavicon } from "./favicon-badge";

// Shared across the visitor widget and Listener dashboard (localStorage
// key isn't role-scoped — this is a device-level "pop up desktop
// notifications" preference, not a security setting, so sharing it across
// the rare dual-role browser session someone here already tests with
// (see Milestone 3.5's verification notes) isn't a real problem).
const DESKTOP_ENABLED_STORAGE_KEY = "anchor-chat:desktop-notifications-enabled";

type NotifyPermissionState = NotificationPermission | "unsupported";

/**
 * T4.7 — two layers, always-on plus opt-in:
 * 1. Tab title prefix + a small red dot composited onto the favicon
 *    (lib/favicon-badge.ts) whenever a message arrives while the tab is
 *    hidden or unfocused. No permission needed, clears itself the moment
 *    the tab becomes visible/focused again.
 * 2. A native `Notification`, gated on both the browser permission *and*
 *    a separate on/off preference (so granting permission once doesn't
 *    permanently commit to OS popups) — body text is caller-supplied and
 *    kept generic by convention (no real message content), matching this
 *    project's PII-redaction posture elsewhere.
 */
export function useUnreadTabNotifier(notificationTitle: string, notificationBody: string) {
  const [notifyPermission, setNotifyPermission] = useState<NotifyPermissionState>("default");
  const [desktopEnabled, setDesktopEnabled] = useState(false);

  const baseTitleRef = useRef<string | null>(null);
  const faviconLinkRef = useRef<HTMLLinkElement | null>(null);
  const plainFaviconHrefRef = useRef<string | null>(null);
  const badgedFaviconHrefRef = useRef<string | null>(null);
  const unreadCountRef = useRef(0);

  useEffect(() => {
    baseTitleRef.current = document.title;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    faviconLinkRef.current = link;
    plainFaviconHrefRef.current = link.href || "/favicon.ico";

    // Reading the ambient Notification permission and localStorage is the
    // "sync with an external system after mount" case react-hooks/set-state
    // -in-effect's own message calls out as fine (same reasoning as
    // AdminDashboard's localStorage-restore effect) — neither is available
    // during SSR, so this can't be a lazy useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifyPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    setDesktopEnabled(window.localStorage.getItem(DESKTOP_ENABLED_STORAGE_KEY) === "true");
  }, []);

  const isTabActive = useCallback(
    () => document.visibilityState === "visible" && document.hasFocus(),
    [],
  );

  const clearUnread = useCallback(() => {
    unreadCountRef.current = 0;
    if (baseTitleRef.current !== null) document.title = baseTitleRef.current;
    if (faviconLinkRef.current && plainFaviconHrefRef.current) {
      faviconLinkRef.current.href = plainFaviconHrefRef.current;
    }
  }, []);

  // Auto-clears on both signals — visibilitychange alone misses "tab stayed
  // visible but the browser window lost OS focus" (e.g. alt-tabbing to
  // another app), which is exactly one of the two states this feature
  // exists to detect in the first place.
  useEffect(() => {
    const handleActive = () => {
      if (isTabActive()) clearUnread();
    };
    document.addEventListener("visibilitychange", handleActive);
    window.addEventListener("focus", handleActive);
    return () => {
      document.removeEventListener("visibilitychange", handleActive);
      window.removeEventListener("focus", handleActive);
    };
  }, [isTabActive, clearUnread]);

  const notifyNewMessage = useCallback(() => {
    if (isTabActive()) return;

    unreadCountRef.current += 1;
    if (baseTitleRef.current !== null) {
      document.title = `(${unreadCountRef.current}) ${baseTitleRef.current}`;
    }

    const link = faviconLinkRef.current;
    const plainHref = plainFaviconHrefRef.current;
    if (link && plainHref) {
      if (badgedFaviconHrefRef.current) {
        link.href = badgedFaviconHrefRef.current;
      } else {
        buildBadgedFavicon(plainHref)
          .then((href) => {
            badgedFaviconHrefRef.current = href;
            // Only apply if still relevant — the tab may have regained
            // focus (clearing unread) while the canvas composite was
            // still in flight.
            if (!isTabActive()) link.href = href;
          })
          .catch(() => {
            // Decorative — a browser that can't composite the favicon
            // (e.g. .ico unsupported in canvas) still gets the title
            // prefix and, if opted in, the native notification below.
          });
      }
    }

    if (desktopEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(notificationTitle, { body: notificationBody, tag: "overshare-new-message" });
      } catch {
        // A Notification constructor failure (e.g. no service worker in
        // some restricted contexts) shouldn't break message delivery —
        // same never-block-core-function posture as FR-6.3's AI fallback.
      }
    }
  }, [isTabActive, desktopEnabled, notificationTitle, notificationBody]);

  const toggleDesktopNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setNotifyPermission(result);
      if (result !== "granted") return;
    } else if (Notification.permission !== "granted") {
      // Previously denied — browsers don't allow re-prompting from script;
      // the caller's UI should point at browser settings instead.
      return;
    }

    setDesktopEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(DESKTOP_ENABLED_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { notifyNewMessage, notifyPermission, desktopEnabled, toggleDesktopNotifications };
}
