// Small presentational atom shared by ChatWidget and ListenerChat — the
// three-dot "typing…" indicator. Pure UI, no state of its own; each caller
// decides when to render it based on its own Ably presence data.
export function TypingDots() {
  return (
    <div
      className="flex w-fit items-center gap-1 self-start rounded-2xl rounded-bl-sm bg-bg px-3 py-2.5"
      aria-label="Typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
