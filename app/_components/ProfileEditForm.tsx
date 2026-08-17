"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ProfileEditForm({
  initialDisplayName,
  initialBio,
}: {
  initialDisplayName: string;
  initialBio: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/listeners/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not save");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="profile-name"
          required
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded border border-border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-bio" className="text-sm font-medium">
          Bio
        </label>
        <textarea
          id="profile-bio"
          rows={4}
          maxLength={1000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded border border-border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>

      {saved && <p className="text-sm text-muted">Saved.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
