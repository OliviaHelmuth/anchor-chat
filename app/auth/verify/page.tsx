"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
          <p className="text-sm text-neutral-500">Signing you in…</p>
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  // Absent for every existing visitor magic-link email already sent/queued
  // before this param existed — default keeps those links working.
  const provider = params.get("provider") ?? "magic-link";
  const [status, setStatus] = useState<"pending" | "error">(token ? "pending" : "error");

  useEffect(() => {
    if (!token) return;

    signIn(provider, { token, redirect: false }).then((result) => {
      if (result?.ok) {
        router.replace(provider === "listener-login" ? "/listener/queue" : "/");
      } else {
        setStatus("error");
      }
    });
  }, [token, provider, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      {status === "pending" ? (
        <p className="text-sm text-neutral-500">Signing you in…</p>
      ) : (
        <>
          <p className="text-sm text-red-600">
            That link didn&apos;t work — it may have expired or already been used.
          </p>
          <Link href="/" className="text-sm underline">
            Back to chat
          </Link>
        </>
      )}
    </main>
  );
}
