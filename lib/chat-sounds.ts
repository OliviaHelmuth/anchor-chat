// Client-only, no audio asset: short tones synthesized with the Web Audio
// API. Avoids shipping/licensing a sound file for two one-shot blips, and
// keeps this dependency-free like the rest of the realtime stack.
//
// Browsers block audio output until a user gesture has occurred on the
// page. The "sent" sound always fires from one (clicking Send or pressing
// Enter in the composer), which is what unlocks the shared AudioContext —
// the "received" sound can otherwise be the very first audio call of the
// session (a Listener's message arriving before the visitor has typed
// anything). No prior gesture just means that particular sound is
// silently skipped, not an error.

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function playTone(startFreq: number, endFreq: number, durationMs: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const duration = durationMs / 1000;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(startFreq, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

  // Short attack, quick exponential fade — a "blip," not a beep that lingers.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/** Rising tone — plays when the current user sends a message. */
export function playSentSound() {
  playTone(600, 900, 90);
}

/** Falling tone — plays when a message arrives from the other participant. */
export function playReceivedSound() {
  playTone(760, 520, 110);
}
