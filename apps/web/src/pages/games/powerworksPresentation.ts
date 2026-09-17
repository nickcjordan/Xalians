import { useEffect, useRef, useState } from "react";
import type { Frame } from "@xalians/rules/dungeon";

// Presentation only. The rules still produce the same complete round and save.
export function useBattlePresentation(
  frame: Frame | undefined,
  index: number,
  speed: number,
  paused: boolean
) {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
  const [landed, setLanded] = useState("");
  const [sound, setSound] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const key = `${index}:${frame?.text || ""}`;
  const animated = !!frame?.event?.actorId;
  const impact = reducedMotion || paused || !animated || landed === key;
  const frameDuration = reducedMotion
    ? 1200
    : !animated
    ? 800
    : frame?.event?.kind === "redirect"
    ? 1100
    : 1900;
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media?.matches ?? false);
    media?.addEventListener?.("change", change);
    return () => media?.removeEventListener?.("change", change);
  }, []);
  useEffect(() => {
    if (!frame || !animated) return;
    // Inspection or stepping reveals the result. Resuming must not rewind HP.
    if (paused || reducedMotion) {
      setLanded(key);
      return;
    }
    const timer = window.setTimeout(() => setLanded(key), 500 / speed);
    return () => clearTimeout(timer);
  }, [key, speed, paused, reducedMotion, animated]);
  useEffect(() => {
    const audio = context.current;
    if (!sound || !impact || !frame?.event || !audio || paused) return;
    const kind = frame.event.kind;
    if (!["hit", "snare", "ward", "charge"].includes(kind)) return;
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    const start = audio.currentTime,
      pitch = kind === "hit" ? 150 : kind === "charge" ? 110 : 440;
    oscillator.type = kind === "hit" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(pitch, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "charge" ? 440 : pitch / 2,
      start + 0.18
    );
    gain.gain.setValueAtTime(0.035, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(start + 0.24);
  }, [key, impact, sound, paused]);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    []
  );
  function toggleSound() {
    if (!sound) {
      try {
        context.current ||= new AudioContext();
        void context.current.resume();
      } catch {
        return;
      }
    }
    setSound((v) => !v);
  }
  return { impact, reducedMotion, sound, toggleSound, frameDuration };
}
