"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ children }: { children?: React.ReactNode }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/listener/login" })}
      className="nb-sm nb-press-sm bg-surface px-3 py-1.5 text-xs font-bold text-ink"
    >
      {children ?? "Sign out"}
    </button>
  );
}
