// Local prototype variation, sampled once at departure and saved with the run.
import { BEACON_LOOP, COOLANT_HOLD } from './encounterCircumstances';
import { reunionStory } from './reunionStory';
export const SIGNAL_AVAILABLE = 'field-signal-available';
export const SIGNAL_READ = 'field-signal-read';
export const RELEASE_SIGNAL = 'field-release-signal';
export function expeditionVariation(random = Math.random) {
  const sample = random();
  const flags = sample < 0.25 ? [SIGNAL_AVAILABLE] : sample < 0.5 ? [SIGNAL_AVAILABLE, RELEASE_SIGNAL] : [];
  if (random() < 0.25) flags.push(BEACON_LOOP);
  if (random() < 0.25) flags.push(COOLANT_HOLD);
  return flags;
}
export function rememberedHazards(scene, flags) {
  const reunion = reunionStory(scene, flags);
  if (reunion?.hazardId) return [reunion.hazardId];
  if (scene.id === 'generator-spine' && flags.includes('reservoir-timing-diagram')) return ['ring-closure'];
  return scene.id === 'turbine-hall' && flags.includes(SIGNAL_READ) && !flags.includes(RELEASE_SIGNAL) ? ['servo-cycle'] : [];
}
export function discoveryAccount(flags) {
  return flags.includes(RELEASE_SIGNAL)
    ? 'The indicator repeats an emergency release instruction for the archive authentication arms. It needs a maintenance code. The service markings in the underdeck may supply the missing part.'
    : 'The indicator repeats a maintenance warning: a turbine still turns every forty seconds. The crew carries its timing into the hall. You can anticipate that motion even without sending a scout.';
}
