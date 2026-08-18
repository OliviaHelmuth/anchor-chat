import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUnreadTabNotifier } from "@/lib/useUnreadTabNotifier";

describe("useUnreadTabNotifier", () => {
  beforeEach(() => {
    document.title = "overshare.io";
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports 'unsupported' when the Notification API doesn't exist (jsdom has none)", () => {
    const { result } = renderHook(() => useUnreadTabNotifier("Title", "Body"));
    expect(result.current.notifyPermission).toBe("unsupported");
    expect(result.current.desktopEnabled).toBe(false);
  });

  it("prefixes the tab title with an unread count when the tab isn't active", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const { result } = renderHook(() => useUnreadTabNotifier("Title", "Body"));

    act(() => result.current.notifyNewMessage());
    expect(document.title).toBe("(1) overshare.io");

    act(() => result.current.notifyNewMessage());
    expect(document.title).toBe("(2) overshare.io");
  });

  it("does not change the title when the tab is active", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const { result } = renderHook(() => useUnreadTabNotifier("Title", "Body"));

    act(() => result.current.notifyNewMessage());
    expect(document.title).toBe("overshare.io");
  });

  it("clears the unread title prefix once the tab regains focus", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const { result } = renderHook(() => useUnreadTabNotifier("Title", "Body"));
    act(() => result.current.notifyNewMessage());
    expect(document.title).toBe("(1) overshare.io");

    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    act(() => window.dispatchEvent(new Event("focus")));
    expect(document.title).toBe("overshare.io");
  });

  it("toggleDesktopNotifications is a no-op when Notification is unsupported", async () => {
    const { result } = renderHook(() => useUnreadTabNotifier("Title", "Body"));
    await act(async () => {
      await result.current.toggleDesktopNotifications();
    });
    expect(result.current.desktopEnabled).toBe(false);
  });
});
