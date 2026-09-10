import { CREATURES, MISSION, MAX_STRAIN, MAX_INSTABILITY } from './longReturnData';

export const CHECKPOINT_KEY = 'xalians.long-return.checkpoint.v1';
const VERSION = 1;
// Integrity check catches truncated/edited payloads, not a security boundary.
function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
function validCheckpoint(run) {
  if (!run || !Array.isArray(run.selectedCrew) || run.selectedCrew.length !== 3 || new Set(run.selectedCrew).size !== 3) return false;
  if (!run.selectedCrew.every(id => CREATURES.some(creature => creature.id === id))) return false;
  if (!integer(run.sceneIndex, 0, MISSION.scenes.length - 1) || !['scout', 'result'].includes(run.phase)) return false;
  if (!run.strain || !run.selectedCrew.every(id => integer(run.strain[id], 0, MAX_STRAIN))) return false;
  if (!integer(run.pressure, 0, MAX_INSTABILITY) || !integer(run.salvage, 0, 1000) || !integer(run.commands, 0, 2)) return false;
  if (!['simple', 'guided', 'standard', 'expert'].includes(run.guidanceLevel) || typeof run.objectiveReached !== 'boolean') return false;
  if (!['spentAbilities', 'runFlags', 'journal', 'log'].every(key => Array.isArray(run[key]))) return false;
  if (run.phase === 'scout') return run.sceneIndex === 0 && run.journal.length === 0 && !run.lastResult;
  const result = run.lastResult;
  return !!(MISSION.scenes[run.sceneIndex].routes.some(route => route.id === run.routeId)
    && run.selectedCrew.includes(run.leadId) && run.selectedCrew.includes(run.supportId) && run.leadId !== run.supportId
    && run.scan && Array.isArray(run.scan.hazards) && Array.isArray(run.scan.revealedIds)
    && result && typeof result.story === 'string' && Array.isArray(result.causes)
    && Array.isArray(result.crewChanges) && result.crewChanges.length === 2
    && result.instabilityChange && Array.isArray(result.unseenHazards));
}

export function readCheckpoint(storage) {
  try {
    storage = storage || window.localStorage;
    const raw = storage.getItem(CHECKPOINT_KEY);
    if (!raw || raw.length > 500000) return null;
    const envelope = JSON.parse(raw);
    if (envelope.version !== VERSION || envelope.mission !== MISSION.id || typeof envelope.payload !== 'string' || envelope.checksum !== checksum(envelope.payload)) return null;
    const run = JSON.parse(envelope.payload);
    return validCheckpoint(run) ? run : null;
  } catch { return null; }
}

export function writeCheckpoint(run, storage) {
  try {
    storage = storage || window.localStorage;
    if (!validCheckpoint(run)) return false;
    const payload = JSON.stringify(run);
    storage.setItem(CHECKPOINT_KEY, JSON.stringify({ version: VERSION, mission: MISSION.id, payload, checksum: checksum(payload) }));
    return true;
  } catch { return false; }
}

export function clearCheckpoint(storage) {
  try { (storage || window.localStorage).removeItem(CHECKPOINT_KEY); return true; } catch { return false; }
}
