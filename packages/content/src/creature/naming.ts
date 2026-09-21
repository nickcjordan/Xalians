import { z } from 'zod';
import * as c from './catalog.ts';
import { type Ability, type AbilityTemplate } from './ability.ts';

const word = z.string().trim().min(1).max(60).regex(/^[A-Za-z][A-Za-z '-]*$/, 'use a readable word or short phrase');
/** Authored prose, not permission keys. Every word must fit its entire permitted domain. */
export const NamingSchema = z.strictObject({
  qualifiers: c.choices(word).optional(),
  delivery: z.partialRecord(c.Delivery, c.choices(word)).optional(),
});
export type Naming = z.infer<typeof NamingSchema>;
export const NAMING_CATALOG = {
  delivery: { contact: ['Touch'], projectile: ['Shot'], stream: ['Stream'], pulse: ['Pulse'], field: ['Field'], signal: ['Signal'], self: ['Response'] },
  status: {
    burning: 'Burning', overheated: 'Heating', chilled: 'Chilling', corroding: 'Corrosive', poisoned: 'Toxic',
    slowed: 'Slowing', restrained: 'Binding', pinned: 'Pinning', frozen: 'Freezing', buried: 'Burying',
    blinded: 'Blinding', deafened: 'Deafening', disoriented: 'Disorienting', frightened: 'Frightening',
    entranced: 'Entrancing', sedated: 'Sedating', stunned: 'Stunning', mending: 'Mending', shielded: 'Shielding',
    reinforced: 'Reinforcing', protected: 'Protective', stimulated: 'Stimulating', focused: 'Focusing',
    concealed: 'Concealing', revealed: 'Revealing', marked: 'Marking', phased: 'Phasing', dispersed: 'Dispersing',
  },
  removal: { cooling: 'Cooling', smothering: 'Smothering', warming: 'Warming', cleansing: 'Cleansing', detoxifying: 'Detoxifying', freeing: 'Freeing', stabilizing: 'Stabilizing', disrupting: 'Disrupting' },
} as const satisfies {
  delivery: Record<z.infer<typeof c.Delivery>, readonly string[]>;
  status: Record<c.StatusKey, string>;
  removal: Record<z.infer<typeof c.Removal>, string>;
};
const title = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function qualifiers(ability: Ability): string[] {
  const words = ability.effects.flatMap(effect => {
    switch (effect.type) {
      case 'status': return [NAMING_CATALOG.status[effect.status]];
      case 'restore': return ['Restorative'];
      case 'protect': return ['Protective'];
      case 'remove': return effect.methods.map(method => NAMING_CATALOG.removal[method]);
      case 'displace': return [effect.direction === 'toward' ? 'Pulling' : 'Repelling'];
      case 'harm': return [effect.mechanism === 'elemental' ? title(ability.element!) : title(effect.mechanism)];
    }
  });
  return [...new Set(words)].sort();
}
function noun(ability: Ability): readonly string[] {
  const area = ability.spatial.area;
  if (area?.persistence === 'lingering') return ['Field'];
  if (area?.shape === 'cone') return ['Cone'];
  if (area?.shape === 'sweep') return ['Sweep'];
  if (area?.shape === 'line') return ['Line'];
  if (area?.shape === 'radial' && ability.delivery.mode === 'projectile') return ['Splash'];
  if (area?.shape === 'radial') return ['Field'];
  return NAMING_CATALOG.delivery[ability.delivery.mode];
}

/** Meaningful descriptions provide a total fallback without hashes, counters or new powers. */
function effectDescription(effect: Ability['effects'][number], all: Ability['effects'], dependency = true): string {
  const parts: string[] = [title(effect.type), `on ${title(effect.recipient)}`, title(effect.onset), title(effect.persistence), title(effect.likelihood)];
  if (effect.duration) parts.push(`${title(effect.duration)} Duration`);
  if (effect.type === 'harm') parts.push(title(effect.mechanism));
  if (effect.type === 'displace') parts.push(title(effect.direction));
  if (effect.type === 'remove') parts.push([...effect.methods].sort().map(title).join('/'));
  if (effect.type === 'status') {
    parts.push(title(effect.status), `Removable by ${[...effect.removable].sort().map(title).join('/')}`);
    if (effect.bound) parts.push(`${title(effect.bound)} Bound`);
    if (effect.function) parts.push(title(effect.function));
    if (effect.protection) {
      const p = effect.protection;
      parts.push(title(p.degree), p.type === 'status' ? title(p.status) : p.type === 'harm' ? `${title(p.mechanism)}${p.element ? ` ${title(p.element)}` : ''} Harm` : 'Displacement');
    }
  }
  if (dependency && effect.requires) parts.push(`After ${effectDescription(all.find(e => e.key === effect.requires)!, all, false)}`);
  return parts.join(' ');
}
function distinctions(ability: Ability): string[] {
  const area = ability.spatial.area;
  return [
    ...(ability.spatial.range ? [`${title(ability.spatial.range)} Range`] : []),
    ...(area ? [`${title(area.extent)} ${title(area.shape)}`, `${title(area.anchor)} Centered`, `${title(area.persistence)} Area${area.duration ? `, ${title(area.duration)} Duration` : ''}`] : ['Targeted']),
    ...(ability.timing ? [`${title(ability.timing.preparation)} Preparation`, `${title(ability.timing.recovery)} Recovery`] : []),
    title(ability.activation.continuity), ...(ability.activation.trigger ? [title(ability.activation.trigger)] : []),
    title(ability.delivery.mode), title(ability.delivery.approach),
    ...(ability.delivery.reception ? [`${title(ability.delivery.reception)} Reception`] : []),
    title(ability.instrument), ability.element ? title(ability.element) : 'Unclassified',
    `Targets ${[...ability.targeting].sort().map(title).join('/')}`,
    ...ability.effects.flatMap(effect => {
      const outcome = title(effect.type === 'status' ? effect.status : effect.type);
      return [`${title(effect.likelihood)} ${outcome}`, `${outcome} on ${title(effect.recipient)}`,
        `${title(effect.onset)} ${outcome}`, `${title(effect.persistence)} ${outcome}`];
    }).sort(),
    ...ability.effects.map(effect => effectDescription(effect, ability.effects)).sort(),
  ];
}

export function nameOrdinaryActions(
  ordinary: readonly Ability[], guaranteed: readonly Pick<AbilityTemplate, 'name'>[], vocabulary: readonly (Naming | undefined)[],
  draw: (exclusive: bigint, label: string) => bigint,
): Ability[] {
  const choose = (values: readonly string[], label: string) => values[Number(draw(BigInt(values.length), label))];
  const bases = ordinary.map((ability, index) => {
    const words = vocabulary[index];
    return `${choose(words?.qualifiers ?? qualifiers(ability), `name/${ability.key}/qualifier`)} ${choose(words?.delivery?.[ability.delivery.mode] ?? noun(ability), `name/${ability.key}/delivery`)}`;
  });
  const used = new Set(guaranteed.map(ability => ability.name.toLowerCase()));
  return ordinary.map((ability, index) => {
    const base = bases[index];
    const peers = ordinary.filter((_, peer) => peer !== index && bases[peer].toLowerCase() === base.toLowerCase());
    const facts = distinctions(ability);
    let name = base;
    if (used.has(name.toLowerCase()) || peers.length) {
      const unique = facts.find(fact => peers.every(peer => !distinctions(peer).includes(fact)) && !used.has(`${base} (${fact})`.toLowerCase()));
      name = `${base} (${unique ?? facts.join('; ')})`;
    }
    // Authored names could deliberately equal an entire descriptive fallback. Keep
    // adding a true structural fact; never reroll a capability or change its effects.
    while (used.has(name.toLowerCase())) name = `${name} (${facts[0]})`;
    used.add(name.toLowerCase());
    return { ...ability, name };
  });
}
