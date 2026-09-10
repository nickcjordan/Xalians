// Schema for the ratified Xalian creature record: the six-layer, generator-produced
// description of one individual creature (docs/design/xalian-creature-data-structure.md
// section 2; worked example there and in docs/design/sample-record-graviclaw.json).
// Records describe nature, never game mechanics (no HP, no cooldowns) -- every field here
// is a fact about the creature, and every game derives its own stats from it.
import { z } from 'zod';
import {
  ActionKeySchema,
  AnatomyKeySchema,
  ArchetypeKeySchema,
  AttributeKeySchema,
  BodyPlanKeySchema,
  CommunicationKeySchema,
  CompositionKeySchema,
  CorporealityKeySchema,
  CoveringKeySchema,
  DietKeySchema,
  ElementKeySchema,
  InstrumentKeySchema,
  LifespanKeySchema,
  MediumPhaseKeySchema,
  TraitKeySchema,
} from './registries.ts';

// The 10 frozen attributes and the 5 temperament axes are always all present (the
// "explicit-none" contract: universal dimensions are never omitted), so each is spelled
// out as its own required field rather than a z.record, which would let a consumer omit
// one silently.
const zeroToHundred = z.number().min(0).max(100);

const AttributeBlockSchema = z.object({
  strength: zeroToHundred,
  vitality: zeroToHundred,
  endurance: zeroToHundred,
  agility: zeroToHundred,
  reflex: zeroToHundred,
  intelligence: zeroToHundred,
  willpower: zeroToHundred,
  instinct: zeroToHundred,
  charisma: zeroToHundred,
  resilience: zeroToHundred,
});

const TemperamentSchema = z.object({
  boldness: zeroToHundred,
  curiosity: zeroToHundred,
  energy: zeroToHundred,
  aggression: zeroToHundred,
  sociability: zeroToHundred,
});

const CapabilitiesSchema = z.object({
  flight: zeroToHundred,
  swim: zeroToHundred,
  burrow: zeroToHundred,
  climb: zeroToHundred,
  sprint: zeroToHundred,
  leap: zeroToHundred,
  manipulation: zeroToHundred,
});

// registries.senses lists sight/hearing/smell (always-present, graded) plus six special
// senses (echolocation, tremorsense, electroreception, psychic, heat-sense, void-sense),
// which are additive extras named in the `special` list only when the creature has them.
const SpecialSenseKeySchema = z.enum([
  'echolocation',
  'tremorsense',
  'electroreception',
  'psychic',
  'heat-sense',
  'void-sense',
]);

const SensesSchema = z.object({
  sight: zeroToHundred,
  hearing: zeroToHundred,
  smell: zeroToHundred,
  special: z.array(SpecialSenseKeySchema).optional(),
});

const ProvenanceSchema = z.object({
  seed: z.string().min(1),
  // Pins the entire content-table snapshot (registries, name catalogs, odds); frozen
  // forever once a record exists, so this is a free-form version string, not an enum.
  generatorVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  origin: z.string().min(1), // planet key the generator ran on
  serial: z.number().int().positive(),
});

const CompositionSchema = z.object({
  primary: CompositionKeySchema,
  secondary: CompositionKeySchema.optional(),
});

const EnvironmentalToleranceSchema = z.object({
  ambientMedia: z.array(MediumPhaseKeySchema).min(1),
  temperatureC: z.object({ min: z.number(), max: z.number() }),
});

const PhysiologySchema = z
  .object({
    corporeality: CorporealityKeySchema,
    composition: CompositionSchema,
    bodyPlan: BodyPlanKeySchema,
    anatomy: z.array(AnatomyKeySchema).min(1),
    covering: CoveringKeySchema,
    heightCm: z.number().positive(),
    weightKg: z.number().positive(),
    lifespan: LifespanKeySchema,
    // Instance-level chirality is levo/dextro (rolled 50/50) or achiral (species-declared),
    // per docs/design/xalian-creature-system-redesign.md:343. registries.json's
    // physiology.chirality entry ("rolled" | "achiral") describes the TEMPLATE's roll
    // MODE, not this domain, so it is intentionally not reused here.
    // TODO(lever): if a future registries.json revision adds the instance-value domain,
    // point this at it instead of the literal enum.
    genome: z.object({ chirality: z.enum(['levo', 'dextro', 'achiral']) }),
    diet: DietKeySchema,
    communication: z.array(CommunicationKeySchema),
    breathes: z.array(MediumPhaseKeySchema),
    environmentalTolerance: EnvironmentalToleranceSchema,
    capabilities: CapabilitiesSchema,
    senses: SensesSchema,
  })
  .check((ctx) => {
    // Invariant from the data-structure doc: "breathes ⊆ ambientMedia".
    const media = new Set(ctx.value.environmentalTolerance.ambientMedia);
    for (const phase of ctx.value.breathes) {
      if (!media.has(phase)) {
        ctx.issues.push({
          code: 'custom',
          message: `physiology.breathes contains "${phase}", which is not in environmentalTolerance.ambientMedia`,
          input: ctx.value,
          path: ['breathes'],
        });
      }
    }
  });

const ArchetypeSchema = z
  .object({
    key: ArchetypeKeySchema,
    // Each SHAPED archetype favors exactly two attributes; "balanced" favors none.
    favors: z.array(AttributeKeySchema).max(2),
  })
  .refine((archetype) => archetype.key === 'balanced' || archetype.favors.length === 2, {
    message: 'a non-balanced archetype must favor exactly two attributes',
    path: ['favors'],
  })
  .refine((archetype) => archetype.key !== 'balanced' || archetype.favors.length === 0, {
    message: 'the balanced archetype favors no attributes',
    path: ['favors'],
  });

const ElementSchema = z
  .object({
    primary: ElementKeySchema,
    // Primary is duplicated at 100 on purpose; a graded secondary may also appear. Most
    // elements are absent (75% of records have no secondary at all), so this is a partial
    // record, not an exhaustive one.
    affinities: z.partialRecord(ElementKeySchema, zeroToHundred),
  })
  .refine((element) => element.affinities[element.primary] === 100, {
    message: 'element.affinities must include the primary element at 100',
    path: ['affinities'],
  });

const AbilitySchema = z.object({
  name: z.string().min(1),
  signature: z.boolean(),
  instrument: InstrumentKeySchema,
  action: ActionKeySchema,
  medium: ElementKeySchema,
  // Presence asserts the ability exists, so intensity is 1-100, never 0.
  intensity: z.number().min(1).max(100),
  description: z.string().min(1).optional(),
});

const AppearanceSchema = z
  .object({
    finish: z.enum(['standard', 'gleam', 'prismatic', 'eclipse']),
  })
  // Reserved fields may be added to appearance later (cosmetic overlay is documented as
  // "global rarity overlay", not a closed record); passthrough keeps unknown future keys
  // from breaking validation, per the optional-field contract.
  .passthrough();

export const XalianRecordSchema = z.object({
  id: z.string().regex(/^xal_/, 'record id must start with "xal_"'),
  species: z.string().min(1),
  provenance: ProvenanceSchema,
  physiology: PhysiologySchema,
  archetype: ArchetypeSchema,
  attributes: AttributeBlockSchema,
  element: ElementSchema,
  // Open list: rolled trait keys landed for this individual. Absence of a trait is
  // expressed by omission (explicit-none applies to closed sets, not open lists), so an
  // empty array is a valid "nothing landed" result.
  traits: z.array(TraitKeySchema),
  temperament: TemperamentSchema,
  appearance: AppearanceSchema,
  abilities: z
    .array(AbilitySchema)
    .min(1)
    .refine((abilities) => abilities.filter((a) => a.signature).length === 1, {
      message: 'a record must have exactly one signature ability',
    }),
});

export type XalianRecord = z.infer<typeof XalianRecordSchema>;
