// Schema for one species template (docs/species-templates/<key>.json, bundled into
// speciesRecords.json by scripts/bundleLore.js) and for the speciesRecords.json bundle
// itself. A template is the fixed facts + rollable bands a species defines; an individual
// XalianRecord (see record.ts) is one roll within these bands.
import { z } from 'zod';
import {
  ActionKeySchema,
  AnatomyKeySchema,
  ArchetypeKeySchema,
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

const zeroToHundred = z.number().min(0).max(100);

function range(inner: z.ZodNumber) {
  return z.tuple([inner, inner]).refine(([lo, hi]) => lo <= hi, {
    message: 'range minimum must not exceed maximum',
  });
}

const zeroToHundredRange = range(zeroToHundred);

const SizeSchema = z.object({
  heightCm: range(z.number().positive()),
  weightKg: range(z.number().positive()),
});

const SpecialSenseKeySchema = z.enum([
  'echolocation',
  'tremorsense',
  'electroreception',
  'psychic',
  'heat-sense',
  'void-sense',
]);

const TemplateSensesSchema = z.object({
  sight: zeroToHundredRange,
  hearing: zeroToHundredRange,
  smell: zeroToHundredRange,
  special: z.array(SpecialSenseKeySchema).optional(),
});

const TemplateCapabilitiesSchema = z.object({
  flight: zeroToHundredRange,
  swim: zeroToHundredRange,
  burrow: zeroToHundredRange,
  climb: zeroToHundredRange,
  sprint: zeroToHundredRange,
  leap: zeroToHundredRange,
  manipulation: zeroToHundredRange,
});

const TemplatePhysiologySchema = z.object({
  corporeality: CorporealityKeySchema,
  composition: z.object({
    primary: CompositionKeySchema,
    secondary: CompositionKeySchema.optional(),
  }),
  bodyPlan: BodyPlanKeySchema,
  anatomy: z.array(AnatomyKeySchema).min(1),
  covering: CoveringKeySchema,
  size: SizeSchema,
  lifespan: LifespanKeySchema,
  // Template-level chirality states the roll MODE for the species ("rolled" = the
  // instance is drawn levo/dextro 50/50, "achiral" = every individual is achiral); see
  // record.ts for why the individual-record domain differs.
  genome: z.object({ chirality: z.enum(['rolled', 'achiral']) }),
  diet: DietKeySchema,
  communication: z.array(CommunicationKeySchema),
  breathes: z.array(MediumPhaseKeySchema),
  environmentalTolerance: z.object({
    ambientMedia: z.array(MediumPhaseKeySchema).min(1),
    temperatureC: z.object({ min: z.number(), max: z.number() }),
  }),
  capabilities: TemplateCapabilitiesSchema,
  senses: TemplateSensesSchema,
});

const LoreSchema = z.object({
  description: z.string().min(1),
  appearance: z.array(z.string().min(1)).min(1),
  origin: z.string().min(1),
  habitat: z.string().min(1),
  feeding: z.string().min(1),
  behavior: z.string().min(1),
  company: z.string().min(1),
});

const SignatureAbilityTemplateSchema = z.object({
  name: z.string().min(1),
  instrument: InstrumentKeySchema,
  action: ActionKeySchema,
  medium: ElementKeySchema,
  intensity: range(z.number().min(1).max(100)),
  description: z.string().min(1),
});

export const SpeciesTemplateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  element: ElementKeySchema,
  homePlanet: z.string().min(1),
  generatorPlanets: z.array(z.string().min(1)).min(1),
  lore: LoreSchema,
  physiology: TemplatePhysiologySchema,
  // Weighted odds by which an individual's archetype is drawn; weights are relative, not
  // percentages, so no sum-to-100 constraint.
  archetypeWeights: z.partialRecord(ArchetypeKeySchema, z.number().positive()),
  attributes: z.object({
    strength: zeroToHundredRange,
    vitality: zeroToHundredRange,
    endurance: zeroToHundredRange,
    agility: zeroToHundredRange,
    reflex: zeroToHundredRange,
    intelligence: zeroToHundredRange,
    willpower: zeroToHundredRange,
    instinct: zeroToHundredRange,
    charisma: zeroToHundredRange,
    resilience: zeroToHundredRange,
  }),
  // Each rolled independently at its own percent (1-100); an unlisted trait key is an
  // implicit 0, never rolled.
  traits: z.object({
    pool: z.partialRecord(TraitKeySchema, z.number().min(1).max(100)),
  }),
  instruments: z.array(InstrumentKeySchema).min(1),
  signatureAbility: SignatureAbilityTemplateSchema,
  // A species may declare an instrument as a conduit for an element, unlocking that
  // element's medium row of actions through it (ratified 2026-09-02; see
  // xalian-creature-system-redesign.md:321). Optional: most species declare none.
  conduits: z.partialRecord(InstrumentKeySchema, ElementKeySchema).optional(),
});

export const SpeciesRecordsBundleSchema = z.object({
  version: z.string().min(1),
  note: z.string(),
  records: z.array(SpeciesTemplateSchema),
});

export type SpeciesTemplate = z.infer<typeof SpeciesTemplateSchema>;
export type SpeciesRecordsBundle = z.infer<typeof SpeciesRecordsBundleSchema>;
