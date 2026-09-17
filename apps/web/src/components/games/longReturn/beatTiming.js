// Resource ticks are quick; discoveries and creature interventions get room.
// The final beat remains until the player explicitly continues.
export function beatDuration(kind, text = '') {
  const base = ['energy', 'stability', 'salvage', 'preserve'].includes(kind) ? 600
    : ['hazard', 'encounter', 'companion', 'warning'].includes(kind) ? 1500 : 1000;
  return Math.min(2400, Math.max(base, text.split(/\s+/).length * 65));
}
