// Schema for registries.json: the machine-readable controlled vocabularies published
// alongside the creature record schema (docs/design/xalian-creature-data-structure.md
// section 4). Every closed list documented there (attributes, archetypes, traits,
// elements, anatomy, channels, actions, and the physiology sub-vocabularies) is asserted
// here as a zod enum built FROM THE JSON ITSELF, not hand-copied, so the enum can never
// drift from the data it describes. If the registry grows a key, the enum grows with it
// on the next `npm test`; nothing here needs editing.
import { z } from 'zod';
import registriesJson from '../../json/registries.json' with { type: 'json' };

function keysOf(entries: ReadonlyArray<{ key: string }>): [string, ...string[]] {
  const keys = entries.map((entry) => entry.key);
  if (keys.length === 0) throw new Error('registries.json: expected at least one entry');
  return keys as [string, ...string[]];
}

// ---- registry entry shape -------------------------------------------------------------

const RegistryEntrySchema = z.object({
  key: z.string(),
  name: z.string(),
  nature: z.string(),
});

const ArchetypeEntrySchema = RegistryEntrySchema.extend({
  favors: z.array(z.string()),
});

// ---- closed-list enums, derived from the bundled JSON ----------------------------------

export const AttributeKeySchema = z.enum(keysOf(registriesJson.attributes));
export const ArchetypeKeySchema = z.enum(keysOf(registriesJson.archetypes));
export const TraitKeySchema = z.enum(keysOf(registriesJson.traits));
export const ElementKeySchema = z.enum(keysOf(registriesJson.elements));
export const CapabilityKeySchema = z.enum(keysOf(registriesJson.capabilities));
export const SenseKeySchema = z.enum(keysOf(registriesJson.senses));
export const AnatomyKeySchema = z.enum(keysOf(registriesJson.anatomy));
export const ChannelKeySchema = z.enum(keysOf(registriesJson.channels));
export const ActionKeySchema = z.enum(keysOf(registriesJson.actions));

// The instrument vocabulary an ability's `instrument` field draws from is anatomy keys
// plus the innate channel keys (docs/design/xalian-creature-data-structure.md section 4:
// "34 keys + 7 innate channels"); instrumentActions in the JSON is keyed by exactly this
// union.
export const InstrumentKeySchema = z.enum([
  ...keysOf(registriesJson.anatomy),
  ...keysOf(registriesJson.channels),
]);

export const CorporealityKeySchema = z.enum(keysOf(registriesJson.physiology.corporeality));
export const CompositionKeySchema = z.enum(keysOf(registriesJson.physiology.composition));
export const BodyPlanKeySchema = z.enum(keysOf(registriesJson.physiology.bodyPlan));
export const CoveringKeySchema = z.enum(keysOf(registriesJson.physiology.covering));
export const DietKeySchema = z.enum(keysOf(registriesJson.physiology.diet));
export const CommunicationKeySchema = z.enum(keysOf(registriesJson.physiology.communication));
export const MediumPhaseKeySchema = z.enum(keysOf(registriesJson.physiology.media));
export const LifespanKeySchema = z.enum(keysOf(registriesJson.physiology.lifespan));
export const ChiralityKeySchema = z.enum(keysOf(registriesJson.physiology.chirality));

// ---- the whole file ---------------------------------------------------------------------

const PhysiologyRegistrySchema = z.object({
  corporeality: z.array(RegistryEntrySchema),
  composition: z.array(RegistryEntrySchema),
  bodyPlan: z.array(RegistryEntrySchema),
  covering: z.array(RegistryEntrySchema),
  diet: z.array(RegistryEntrySchema),
  communication: z.array(RegistryEntrySchema),
  media: z.array(RegistryEntrySchema),
  lifespan: z.array(RegistryEntrySchema),
  chirality: z.array(RegistryEntrySchema),
});

export const RegistriesSchema = z.object({
  version: z.string(),
  note: z.string(),
  attributes: z.array(RegistryEntrySchema).length(10),
  archetypes: z.array(ArchetypeEntrySchema).length(16),
  traits: z.array(RegistryEntrySchema),
  elements: z.array(RegistryEntrySchema).length(14),
  physiology: PhysiologyRegistrySchema,
  capabilities: z.array(RegistryEntrySchema),
  senses: z.array(RegistryEntrySchema),
  anatomy: z.array(RegistryEntrySchema),
  channels: z.array(RegistryEntrySchema),
  actions: z.array(RegistryEntrySchema).length(16),
  // instrument key -> the action keys that instrument can perform (the allowed-actions
  // matrix). Values are validated against ActionKeySchema; keys are validated against the
  // instrument union by the test suite (z.record can't express "exactly these keys" here
  // without duplicating the union check, so the test cross-checks key coverage directly).
  instrumentActions: z.record(z.string(), z.array(ActionKeySchema)),
});

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;
export type ArchetypeEntry = z.infer<typeof ArchetypeEntrySchema>;
export type Registries = z.infer<typeof RegistriesSchema>;
