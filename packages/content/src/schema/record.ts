// Schema for the ratified Xalian creature record: the six-layer, generator-produced
// description of one individual creature (docs/design/xalian-creature-data-structure.md
// section 2; worked example there and in docs/design/sample-record-graviclaw.json).
// Records describe nature, never game mechanics (no HP, no cooldowns) -- every field here
// is a fact about the creature, and every game derives its own stats from it.
import { z } from 'zod';
import { ActionSchema, PassiveSchema, SignatureSchema, checkSignature } from './ability.ts';
import { AbilitySchema as StructuredAbilitySchema, LegacyStructuredAbilitySchema } from './legacyAbility.ts';
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
import { GRADED_SENSE_KEYS, SPECIAL_SENSE_KEYS } from '../registriesConst.ts';

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

// The five temperament axes are not a registries.json list (temperament is a fixed part
// of the record shape, not a species-editable registry), so this object schema is the one
// hand-authored source for the axis names; TemperamentKey below derives from its own keys
// rather than duplicating them, and packages/rules/src/generator/types.ts re-exports that
// type instead of hand-writing the union (issue #181).
const TemperamentSchema = z.object({
  boldness: zeroToHundred,
  curiosity: zeroToHundred,
  energy: zeroToHundred,
  aggression: zeroToHundred,
  sociability: zeroToHundred,
});

export type TemperamentKey = keyof z.infer<typeof TemperamentSchema>;

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
// Both halves of the split are generated from registries.json's `special` flag into
// GRADED_SENSE_KEYS / SPECIAL_SENSE_KEYS (registriesConst.ts, scripts/bundleLore.js), so
// this file names the schemas but does not hand-list the keys a second time.
export const GradedSenseKeySchema = z.enum(GRADED_SENSE_KEYS);
export type GradedSenseKey = z.infer<typeof GradedSenseKeySchema>;

const SpecialSenseKeySchema = z.enum(SPECIAL_SENSE_KEYS);

const SensesSchema = z.object({
  sight: zeroToHundred,
  hearing: zeroToHundred,
  smell: zeroToHundred,
  special: z.array(SpecialSenseKeySchema).optional(),
});

// Instance-level chirality is levo/dextro (rolled 50/50) or achiral (species-declared) --
// see the TODO(lever) note where this is used in PhysiologySchema.genome below. Named and
// exported here so packages/rules/src/generator/types.ts can re-export the type instead
// of hand-writing the union (issue #181).
const ChiralitySchema = z.enum(['levo', 'dextro', 'achiral']);
export type Chirality = z.infer<typeof ChiralitySchema>;

const ProvenanceSchema = z.object({
  seed: z.string().min(1),
  // Algorithm version; releaseId resolves the archived code AND content snapshot.
  generatorVersion: z.string().min(1),
  // Absent on historical records and experimental generation with custom tables.
  releaseId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/).optional(),
  schemaVersion: z.string().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  origin: z.string().min(1), // planet key the generator ran on
  serial: z.number().int().positive(),
  // The generator profile a seed was expanded under (issue #197): 'full' is the
  // unconstrained generator, 'showroom' is the finish-pinned, no-rare-trait,
  // no-secondary-affinity preview lever behind the visible site toggle. Optional so
  // every record stored before this field existed still validates; absent means 'full',
  // matching the generator's own default. Travels with the record so a seed re-expands
  // identically later (the vision doc's claim step re-expands "under the preview
  // profile").
  profile: z.enum(['full', 'showroom']).optional(),
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
    genome: z.object({ chirality: ChiralitySchema }),
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

// Not a registries.json list -- a fixed cosmetic-rarity enum defined here, the one
// hand-authored source; packages/rules/src/generator/types.ts re-exports the type
// (issue #181).
const FinishSchema = z.enum(['standard', 'gleam', 'prismatic', 'eclipse']);
export type Finish = z.infer<typeof FinishSchema>;

const AppearanceSchema = z
  .object({
    finish: FinishSchema,
  })
  // Reserved fields may be added to appearance later (cosmetic overlay is documented as
  // "global rarity overlay", not a closed record); passthrough keeps unknown future keys
  // from breaking validation, per the optional-field contract.
  .passthrough();

const LegacyRecordSchema = z.object({
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

export const XalianRecordV2Schema = LegacyRecordSchema.extend({
  abilities: z.array(LegacyStructuredAbilitySchema).min(1).refine(
    abilities => new Set(abilities.map(a => a.key)).size === abilities.length,
    'ability keys must be unique',
  ),
}).superRefine((record, ctx) => {
  if (record.provenance.schemaVersion !== '2.0.0') ctx.addIssue({ code: 'custom', path: ['provenance', 'schemaVersion'], message: 'structured abilities require schemaVersion 2.0.0' });
});
export const XalianRecordV3Schema = LegacyRecordSchema.extend({
  abilities: z.array(StructuredAbilitySchema).min(1).superRefine((abilities, ctx) => {
    if (abilities.filter(a => a.role === 'signature').length !== 1) ctx.addIssue({code:'custom', message:'exactly one signature ability is required'});
    if (new Set(abilities.map(a => a.key)).size !== abilities.length) ctx.addIssue({code:'custom', message:'ability keys must be unique'});
  }),
}).superRefine((record, ctx) => {
  if (record.provenance.schemaVersion !== '3.0.0') ctx.addIssue({code:'custom', message:'signature/pool records require schemaVersion 3.0.0'});
});
// Old persisted records remain readable. They are never silently reinterpreted as v2.
export const LegacyXalianRecordSchema = LegacyRecordSchema.superRefine((record, ctx) => {
  if (record.provenance.schemaVersion !== '1.0.0') ctx.addIssue({ code: 'custom', message: 'legacy abilities require schemaVersion 1.0.0' });
});
export const XalianRecordV4Schema=LegacyRecordSchema.omit({abilities:true}).extend({
 signature:SignatureSchema,actions:z.array(ActionSchema),passives:z.array(PassiveSchema),
}).superRefine((r,c)=>{checkSignature(r,c);if(r.provenance.schemaVersion!=='4.0.0')c.addIssue({code:'custom',message:'Actions/passives require schema 4.0.0'});});
export const XalianRecordSchema = z.union([XalianRecordV4Schema, XalianRecordV3Schema, XalianRecordV2Schema, LegacyXalianRecordSchema]);
export type XalianRecord = z.infer<typeof XalianRecordV4Schema>;

export type StoredXalianRecord = z.infer<typeof XalianRecordSchema>;
