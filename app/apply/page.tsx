import { ApplyForm } from "@/app/_components/ApplyForm";

export default function ApplyPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl">Become a Listener</h1>
        <p className="mt-3 text-sm text-muted">
          Listeners are volunteers, not therapists or counselors — no
          clinical license required or implied. Every application is read
          and decided by a real person (Menty B), not an algorithm.
          Anchor Chat is a practice/portfolio project, so this vetting exists
          to demonstrate the flow, not to broker real crisis support.
        </p>
      </div>
      <ApplyForm />
    </main>
  );
}
