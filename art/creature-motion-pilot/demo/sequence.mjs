export const READY_MS = 420;
export const RECOVERY_MS = 520;

export function clipDuration(clip) {
  return Number.isFinite(clip.duration_ms)
    ? clip.duration_ms
    : clip.frames.length * 1000 / clip.fps;
}

export function battleTiming(attacker, defender) {
  const action = attacker.manifest.clips.action;
  const hit = defender.manifest.clips.hit;
  const marker = action.markers?.find((item) => Number.isFinite(item.time_ms));
  if (!marker) throw new Error(`${attacker.manifest.species} has no action timing marker`);
  const impactMs = READY_MS + marker.time_ms;
  const actionEndMs = READY_MS + clipDuration(action);
  const hitEndMs = impactMs + clipDuration(hit);
  return {
    marker: marker.name,
    impactMs,
    actionEndMs,
    hitEndMs,
    durationMs: Math.max(actionEndMs, hitEndMs) + RECOVERY_MS,
  };
}

export function sampleBattle(timing, elapsedMs) {
  const time = Math.max(0, Math.min(timing.durationMs, elapsedMs));
  const actionTime = time - READY_MS;
  const hitTime = time - timing.impactMs;
  const attackerClip = actionTime >= 0 && time < timing.actionEndMs ? 'action' : 'idle';
  const defenderClip = hitTime >= 0 && time < timing.hitEndMs ? 'hit' : 'idle';
  const flash = hitTime < 0 ? 0 : Math.max(0, 1 - hitTime / 270);
  const approach = actionTime < 0 ? 0 : Math.max(0, Math.sin(Math.PI * Math.min(1, actionTime / (timing.actionEndMs - READY_MS))));
  const recoil = hitTime < 0 ? 0 : Math.max(0, Math.sin(Math.PI * Math.min(1, hitTime / (timing.hitEndMs - timing.impactMs))));
  return {
    time,
    attackerClip,
    attackerElapsed: attackerClip === 'action' ? actionTime : time,
    defenderClip,
    defenderElapsed: defenderClip === 'hit' ? hitTime : time,
    impacted: time >= timing.impactMs,
    flash,
    approach,
    recoil,
    done: time >= timing.durationMs,
  };
}
