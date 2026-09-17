import { z } from 'zod';
export const STATUS_KEYS = ['burning','overheated','chilled','corroding','poisoned','slowed','restrained','pinned','frozen','buried','blinded','deafened','disoriented','frightened','entranced','sedated','stunned','mending','shielded','reinforced','resistant','stimulated','focused','concealed','revealed','marked'] as const;
export const StatusKeySchema = z.enum(STATUS_KEYS);
export const RemovalMethodSchema = z.enum(['cooling','smothering','warming','cleansing','detoxifying','freeing','stabilizing','disrupting']);
export const FunctionSchema = z.enum(['reactions','mobility','force','perception','composure','recovery']);
export const ExposureSchema = z.enum(['impact','cutting','piercing','compression','fire','water','dark','light','plant','electric','ghost','rock','chemical','air','psychic','ice','metal','sand']);
export const STATUS_FAMILIES = ['thermal','degradation','chemical','movement','sensory','mental','restoration','protection','enhancement','information'] as const;
export type StatusFamily = typeof STATUS_FAMILIES[number];
// Applicability and boundaries guide reusable definition authoring. They are not
// executable conditions and never require evaluating a generated creature.
// Catalog definitions describe conditions, not game penalties or universal cures.
export const STATUS_CATALOG = {
  burning: {name:"Burning", families:['thermal'], definition:'An ongoing burning process affects susceptible material.',
    applicability:"Material that can sustain a burning process; composition alone does not prove susceptibility.",
    boundary:"Requires ongoing burning; excess heat without combustion is overheated. Ending burning does not undo damage."},
  overheated: {name:"Overheated", families:['thermal'], definition:'Excess internal heat impairs functioning without requiring combustion.',
    applicability:"A recipient whose functioning can be impaired by excess internal heat.",
    boundary:"Does not require combustion and does not imply burning."},
  chilled: {name:"Chilled", families:['thermal'], definition:'Cold impairs functioning without implying immobilization.',
    applicability:"A recipient whose functioning can be impaired by cold.",
    boundary:"Does not imply immobilization or frozen."},
  corroding: {name:"Corroding", families:['degradation'], definition:'An ongoing corrosive process degrades susceptible material.',
    applicability:"Material susceptible to the applied corrosive process.",
    boundary:"The degrading process is still active; completed damage is not a separate corroded status."},
  poisoned: {name:"Poisoned", families:['chemical'], definition:'An introduced toxic substance disrupts susceptible bodily functioning.',
    applicability:"A recipient with functioning susceptible to the introduced toxin.",
    boundary:"An introduced toxin disrupts functioning; surface degradation alone is corroding."},
  slowed: {name:"Slowed", families:['movement'], definition:'Movement remains possible but is impaired.',
    applicability:"A recipient capable of the movement being impaired.",
    boundary:"Movement remains possible; no binding, freezing, or forced displacement is implied."},
  restrained: {name:"Restrained", families:['movement'], definition:'A binding or holding force restricts movement, including vines and webs.',
    applicability:"A recipient that the stated binding or holding mechanism can engage.",
    boundary:"A binding or holding force restricts movement; crushing pressure is pinned and surrounding material is buried."},
  pinned: {name:"Pinned", families:['movement'], definition:'Pressure or an obstructing mass holds the recipient in place.',
    applicability:"A recipient susceptible to the stated pressure or obstructing mass.",
    boundary:"Pressure or mass holds the recipient in place; does not automatically inflict harm."},
  frozen: {name:"Frozen", families:['movement','thermal'], definition:'Freezing substantially restricts movement, with frost or ice present.',
    applicability:"A recipient whose movement the stated freezing mechanism can substantially restrict.",
    boundary:"Frost or ice is present and movement is substantially restricted; mere cold impairment is chilled."},
  buried: {name:"Buried", families:['movement'], definition:'Surrounding material covers or confines the recipient.',
    applicability:"A recipient that the surrounding material can cover or confine.",
    boundary:"Surrounding material is the obstacle; suffocation and harm are not implied companion effects."},
  blinded: {name:"Blinded", families:['sensory'], definition:'Vision is substantially impaired or unavailable; requires visual functioning.',
    applicability:"A recipient with visual functioning that the stated mechanism can impair.",
    boundary:"Impaired vision does not imply deafened, disoriented, or damage."},
  deafened: {name:"Deafened", families:['sensory'], definition:'Hearing is substantially impaired or unavailable; requires auditory functioning.',
    applicability:"A recipient with auditory functioning that the stated mechanism can impair.",
    boundary:"Impaired hearing does not imply blinded, disoriented, or damage."},
  disoriented: {name:"Disoriented", families:['mental'], definition:'Orientation, perception, or coordination is disrupted.',
    applicability:"A recipient with orientation, perception, or coordination susceptible to disruption.",
    boundary:"Confused orientation or coordination is distinct from reduced alertness or captured attention."},
  frightened: {name:"Frightened", families:['mental'], definition:'An induced fear response interferes with normal behavior; requires susceptibility to fear.',
    applicability:"A recipient capable of a fear response and susceptible to the stated influence.",
    boundary:"Fear interferes with behavior; it does not grant control of the recipient."},
  entranced: {name:"Entranced", families:['mental'], definition:'Attention is captured, interfering with awareness or responses; never possession.',
    applicability:"A recipient whose attention can be captured through the stated channel.",
    boundary:"Captured attention is not possession, compulsory obedience, or sedation."},
  sedated: {name:"Sedated", families:['mental'], definition:'Alertness and responsiveness are reduced.',
    applicability:"A recipient whose alertness and responsiveness can be reduced by the stated process.",
    boundary:"Reduced alertness is distinct from acute stunning or captured attention; sleep is not automatic."},
  stunned: {name:"Stunned", families:['mental'], definition:'An acute shock briefly disrupts normal responses.',
    applicability:"A recipient whose responses can be disrupted by the stated acute shock.",
    boundary:"An acute disruption of responses; does not prescribe skipped turns or imply unconsciousness."},
  mending: {name:"Mending", families:['restoration'], definition:'An applied process continues repairing compatible existing structure.',
    applicability:"Compatible existing structure that the repair process can restore.",
    boundary:"Repair is ongoing; completed repair uses a resolved restore effect. No resurrection or plague cure is implied."},
  shielded: {name:"Shielded", families:['protection'], definition:'An added barrier intercepts incoming harm.',
    applicability:"A recipient that the stated barrier mechanism can surround or cover.",
    boundary:"An added barrier intercepts harm; strengthening existing structure is reinforced."},
  reinforced: {name:"Reinforced", families:['protection'], definition:'An applied change strengthens existing structure.',
    applicability:"Existing structure compatible with the stated strengthening process.",
    boundary:"Strengthens existing structure rather than adding a separate intercepting barrier."},
  resistant: {name:"Resistant", families:['protection'], definition:'Applied protection reduces susceptibility to the specified exposure.',
    applicability:"A recipient for which the mechanism reduces susceptibility to the specified exposure.",
    boundary:"Requires exposure; does not grant universal immunity or replace the innate resistant trait."},
  stimulated: {name:"Stimulated", families:['enhancement'], definition:'An applied process enhances the specified function.',
    applicability:"A recipient possessing the specified function and susceptible to its enhancement.",
    boundary:"Requires function; does not improve every attribute or create a missing function."},
  focused: {name:"Focused", families:['enhancement'], definition:'An applied influence improves attention or mental steadiness.',
    applicability:"A recipient capable of attention or mental steadiness and susceptible to the stated influence.",
    boundary:"Improves focus rather than universally enhancing bodily performance."},
  concealed: {name:"Concealed", families:['information'], definition:'An applied effect reduces detectability; never true invisibility.',
    applicability:"A recipient whose detectability the stated mechanism can reduce.",
    boundary:"Does not imply true invisibility, phasing, or concealment from every sense."},
  revealed: {name:"Revealed", families:['information'], definition:'An applied effect continues exposing presence or location.',
    applicability:"A recipient whose presence or location the stated process can expose.",
    boundary:"Continuing exposure differs from a momentary resolved discovery; it does not identify every property."},
  marked: {name:"Marked", families:['information'], definition:'An applied identifying signal supports recognition or tracking.',
    applicability:"A recipient that can carry the stated identifying signal.",
    boundary:"An identifying signal does not by itself guarantee location, visibility, or unavoidable attacks."},
} satisfies Record<typeof STATUS_KEYS[number], {name:string; families:StatusFamily[]; definition:string; applicability:string; boundary:string}>;
export type RemovalMethod = z.infer<typeof RemovalMethodSchema>;
export const REMOVAL_CATALOG = {
  cooling: {name:'Cooling', definition:'Reduces heat sustaining a compatible applied condition.'},
  smothering: {name:'Smothering', definition:'Suppresses the process sustaining compatible combustion.'},
  warming: {name:'Warming', definition:'Counters cold sustaining a compatible applied condition.'},
  cleansing: {name:'Cleansing', definition:'Removes an applied substance carrying a compatible condition.'},
  detoxifying: {name:'Detoxifying', definition:'Neutralizes a toxin responsible for a compatible condition.'},
  freeing: {name:'Freeing', definition:'Releases a compatible physical binding or confinement.'},
  stabilizing: {name:'Stabilizing', definition:'Restores functioning disrupted by a compatible applied condition.'},
  disrupting: {name:'Disrupting', definition:'Breaks an applied influence sustaining a compatible condition.'},
} satisfies Record<RemovalMethod, {name:string; definition:string}>;
// Match only explicit per-application methods. Allegiance, status names and elements
// never imply removal. A consumer resolves success first; all matching is the default.
export function matchingStatuses<T extends { removable: readonly RemovalMethod[] }>(applications: readonly T[], methods: readonly RemovalMethod[]): T[] {
  return applications.filter(a => a.removable.some(method => methods.includes(method)));
}
