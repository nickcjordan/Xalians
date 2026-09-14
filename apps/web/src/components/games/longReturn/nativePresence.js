// Leaving contact does not remove the creature from its territory.
export function nativeRemains(resolution) {
  return !resolution || !['cleared', 'befriended'].includes(resolution.resolution);
}
