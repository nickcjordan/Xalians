import { z } from 'zod';
export const STATUS_KEYS = ['burning','overheated','chilled','corroding','poisoned','slowed','restrained','pinned','frozen','buried','blinded','deafened','disoriented','frightened','entranced','sedated','stunned','mending','shielded','reinforced','resistant','stimulated','focused','concealed','revealed','marked'] as const;
export const StatusKeySchema = z.enum(STATUS_KEYS);
export const RemovalMethodSchema = z.enum(['cooling','smothering','warming','cleansing','detoxifying','freeing','stabilizing','disrupting']);
export const FunctionSchema = z.enum(['reactions','mobility','force','perception','composure','recovery']);
export const ExposureSchema = z.enum(['impact','cutting','piercing','compression','fire','water','dark','light','plant','electric','ghost','rock','chemical','air','psychic','ice','metal','sand']);
// Catalog definitions describe conditions, not game penalties or universal cures.
export const STATUS_CATALOG = {
  burning: {families:['thermal'], definition:'An ongoing burning process affects susceptible material.'},
  overheated: {families:['thermal'], definition:'Excess internal heat impairs functioning without requiring combustion.'},
  chilled: {families:['thermal'], definition:'Cold impairs functioning without implying immobilization.'},
  corroding: {families:['degradation'], definition:'An ongoing corrosive process degrades susceptible material.'},
  poisoned: {families:['chemical'], definition:'An introduced toxic substance disrupts susceptible bodily functioning.'},
  slowed: {families:['movement'], definition:'Movement remains possible but is impaired.'},
  restrained: {families:['movement'], definition:'A binding or holding force restricts movement, including vines and webs.'},
  pinned: {families:['movement'], definition:'Pressure or an obstructing mass holds the recipient in place.'},
  frozen: {families:['movement','thermal'], definition:'Freezing substantially restricts movement, with frost or ice present.'},
  buried: {families:['movement'], definition:'Surrounding material covers or confines the recipient.'},
  blinded: {families:['sensory'], definition:'Vision is substantially impaired or unavailable; requires visual functioning.'},
  deafened: {families:['sensory'], definition:'Hearing is substantially impaired or unavailable; requires auditory functioning.'},
  disoriented: {families:['mental'], definition:'Orientation, perception, or coordination is disrupted.'},
  frightened: {families:['mental'], definition:'An induced fear response interferes with normal behavior; requires susceptibility to fear.'},
  entranced: {families:['mental'], definition:'Attention is captured, interfering with awareness or responses; never possession.'},
  sedated: {families:['mental'], definition:'Alertness and responsiveness are reduced.'},
  stunned: {families:['mental'], definition:'An acute shock briefly disrupts normal responses.'},
  mending: {families:['restoration'], definition:'An applied process continues repairing compatible existing structure.'},
  shielded: {families:['protection'], definition:'An added barrier intercepts incoming harm.'},
  reinforced: {families:['protection'], definition:'An applied change strengthens existing structure.'},
  resistant: {families:['protection'], definition:'Applied protection reduces susceptibility to the specified exposure.'},
  stimulated: {families:['enhancement'], definition:'An applied process enhances the specified physical function.'},
  focused: {families:['enhancement'], definition:'An applied influence improves attention or mental steadiness.'},
  concealed: {families:['information'], definition:'An applied effect reduces detectability; never true invisibility.'},
  revealed: {families:['information'], definition:'An applied effect continues exposing presence or location.'},
  marked: {families:['information'], definition:'An applied identifying signal supports recognition or tracking.'},
} satisfies Record<typeof STATUS_KEYS[number], {families:string[]; definition:string}>;
export type RemovalMethod = z.infer<typeof RemovalMethodSchema>;
// Match only explicit per-application methods. Allegiance, status names and elements
// never imply removal. A consumer resolves success first; all matching is the default.
export function matchingStatuses<T extends { removable: readonly RemovalMethod[] }>(applications: readonly T[], methods: readonly RemovalMethod[]): T[] {
  return applications.filter(a => a.removable.some(method => methods.includes(method)));
}
