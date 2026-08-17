"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Lets StartChat (in Hero) and ChatWidget (fixed bottom-right) coordinate
// open/closed state without being parent-child — Home() renders them as
// siblings under this provider.
type ChatWidgetContextValue = {
  open: boolean;
  openWidget: () => void;
  closeWidget: () => void;
};

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function ChatWidgetProvider({
  children,
  startOpen,
}: {
  children: ReactNode;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <ChatWidgetContext.Provider
      value={{ open, openWidget: () => setOpen(true), closeWidget: () => setOpen(false) }}
    >
      {children}
    </ChatWidgetContext.Provider>
  );
}

export function useChatWidget(): ChatWidgetContextValue {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) throw new Error("useChatWidget must be used within ChatWidgetProvider");
  return ctx;
}
