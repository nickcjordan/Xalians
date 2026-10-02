// Choreography must leave room for the accompanying sentence, not race it.
// This is an initial reading allowance, not a claim that everyone reads at
// this speed: pause, manual stepping and persistent text remain essential.
export function beatDuration(kind, text = '', maximum = 12000) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const tick = ['energy', 'stability', 'salvage', 'preserve'].includes(kind);
  if (tick && words <= 4) return 600;
  return Math.min(maximum, Math.max(1600, 450 + words * 220));
}
