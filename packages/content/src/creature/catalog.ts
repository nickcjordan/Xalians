/** The redesign's catalog. This entry point is deliberately independent of game adapters. */
import { z } from 'zod';
import { DEFAULT_STATUS_INTENSITY } from './benchmarks.ts';
export {
  ElementKeySchema, InstrumentKeySchema, AnatomyKeySchema, CompositionKeySchema,
  BodyPlanKeySchema, CoveringKeySchema, DietKeySchema, CommunicationKeySchema,
  MediumPhaseKeySchema, LifespanKeySchema,
} from '../schema/registries.ts';

export const Continuity = z.enum(['discrete', 'ongoing']);
export const Trigger = z.enum(['contact', 'harmed', 'ally-harmed']);
export const Delivery = z.enum(['contact', 'projectile', 'stream', 'pulse', 'field', 'signal', 'self']);
export const Reception = z.enum(['visual', 'auditory']);
export const Approach = z.enum(['stationary', 'closing']);
export const Range = z.enum(['contact', 'short', 'medium', 'long']);
export const Shape = z.enum(['line', 'cone', 'radial', 'sweep']);
export const Extent = z.enum(['small', 'medium', 'large']);
export const Anchor = z.enum(['self', 'target', 'location']);
export const Target = z.enum(['self', 'other']);
export const Recipient = z.enum(['self', 'target', 'area']);
export const Preparation = z.enum(['immediate', 'brief', 'prolonged']);
export const Recovery = z.enum(['repeatable', 'brief', 'prolonged']);
export const Onset = z.enum(['instant', 'gradual']);
export const Persistence = z.enum(['resolved', 'sustained', 'lingering']);
export const Duration = z.enum(['brief', 'prolonged']);
export const Likelihood = z.enum(['consistent', 'likely', 'occasional']);
export const Harm = z.enum(['impact', 'cutting', 'piercing', 'compression', 'elemental']);
export const Removal = z.enum(['cooling', 'smothering', 'warming', 'cleansing', 'detoxifying', 'freeing', 'stabilizing', 'disrupting']);
export const Function = z.enum(['reactions', 'mobility', 'force', 'perception', 'composure', 'recovery']);
export const Traversal = z.enum(['phase', 'seep']);
export const SpecialSense = z.enum(['echolocation', 'tremorsense', 'electroreception', 'psychic', 'heat-sense', 'void-sense', 'lowlight']);
export const Status = z.enum([
  'burning', 'overheated', 'chilled', 'corroding', 'poisoned', 'slowed', 'restrained',
  'pinned', 'frozen', 'buried', 'blinded', 'deafened', 'disoriented', 'frightened',
  'entranced', 'sedated', 'stunned', 'paralyzed', 'mending', 'shielded', 'reinforced', 'protected',
  'stimulated', 'focused', 'concealed', 'revealed', 'marked', 'phased', 'dispersed',
]);
export type StatusKey = z.infer<typeof Status>;

const definitions: Record<StatusKey, string> = {
  burning: 'An ongoing burning process.', overheated: 'Excess heat impairs functioning without requiring combustion.',
  chilled: 'Cold impairs functioning without requiring immobilization.', corroding: 'An ongoing corrosive process degrades material, including organic material.',
  poisoned: 'An introduced toxin disrupts bodily functioning; damage is not mandatory.', slowed: 'Movement remains possible but is impaired.',
  restrained: 'A binding or holding force restricts movement.', pinned: 'Pressure or an obstructing mass holds the recipient in place.',
  frozen: 'Freezing restricts movement, with frost or ice present.', buried: 'Surrounding material covers or confines the recipient.',
  blinded: 'Vision is impaired or unavailable.', deafened: 'Hearing is impaired or unavailable.',
  disoriented: 'Orientation or coordination is disrupted.', frightened: 'An induced fear response interferes with behavior.',
  entranced: 'Attention is captured; this is not possession.', sedated: 'Alertness and responsiveness are reduced.',
  stunned: 'An acute shock disrupts responses.',
  paralyzed: 'Voluntary movement is impaired or unavailable without necessarily reducing awareness; not physical binding or merely slower movement.',
  mending: 'An applied process continues bodily repair.',
  shielded: 'An added barrier intercepts harm.', reinforced: 'An applied change strengthens existing structure.',
  protected: 'An applied protection grants its explicitly declared scope and degree.', stimulated: 'An applied process enhances the specified function.',
  focused: 'Attention or mental steadiness is improved.', concealed: 'Detectability is reduced without implying universal invisibility.',
  revealed: 'An applied process continues exposing presence or location.', marked: 'An identifying signal supports recognition or tracking.',
  phased: 'Temporary traversal through solid matter; no protection or concealment is implied.',
  dispersed: 'Temporary traversal through existing openings by dispersing; no solid-wall passage is implied.',
};

export interface StatusDefinition {
  definition: string;
  intensity: number;
  traversal?: z.infer<typeof Traversal>;
  harm?: { mechanism: 'elemental'; element: 'fire' | 'chemical'; required: boolean };
}
export const STATUS_CATALOG: Readonly<Record<StatusKey, Readonly<StatusDefinition>>> = Object.freeze(
  Object.fromEntries(Status.options.map(key => [key, Object.freeze({
    definition: definitions[key], intensity: DEFAULT_STATUS_INTENSITY,
    ...(key === 'phased' ? { traversal: 'phase' as const } : {}),
    ...(key === 'dispersed' ? { traversal: 'seep' as const } : {}),
    ...(['burning', 'corroding', 'poisoned'].includes(key) ? { harm: Object.freeze({
      mechanism: 'elemental' as const, element: key === 'burning' ? 'fire' as const : 'chemical' as const,
      required: key !== 'poisoned',
    }) } : {}),
  })])) as Record<StatusKey, Readonly<StatusDefinition>>,
);

/** Ratings compare outputs. They are not percentages or linear physical ratios. */
export const Intensity = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const Rating = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const Key = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
export function band(value: z.ZodNumber) {
  return z.tuple([value, value]).refine(([min, max]) => min <= max, 'band minimum exceeds maximum');
}
export const Output = z.union([Intensity, band(Intensity)]);
export function choices<T extends z.ZodType>(value: T) {
  return z.array(value).nonempty().refine(values => new Set(values.map(v => JSON.stringify(v))).size === values.length, 'duplicate choices');
}
