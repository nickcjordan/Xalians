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
    entranced: 'Entrancing', sedated: 'Sedating', stunned: 'Stunning', paralyzed: 'Paralyzing', mending: 'Mending', shielded: 'Shielding',
    reinforced: 'Reinforcing', protected: 'Protective', stimulated: 'Stimulating', focused: 'Focusing',
    concealed: 'Concealing', revealed: 'Revealing', marked: 'Marking', phased: 'Phasing', dispersed: 'Dispersing',
  },
  removal: { cooling: 'Cooling', smothering: 'Smothering', warming: 'Warming', cleansing: 'Cleansing', detoxifying: 'Detoxifying', freeing: 'Freeing', stabilizing: 'Stabilizing', disrupting: 'Disrupting' },
  /** The contact noun a body part supplies. Only used for contact delivery without an
   * area, where "Touch" says nothing: jaws bite, hooves kick, claws swipe. An instrument
   * with no single shared contact verb (a crest, a lure, or any of the channels, which do
   * not strike at all) keeps Touch. Authored `naming` still wins over every entry here. */
  instrument: {
    jaws: 'Bite', fangs: 'Bite', beak: 'Peck', tusks: 'Gore', horns: 'Gore', antlers: 'Butt',
    trunk: 'Slam', tongue: 'Whip', claws: 'Swipe', talons: 'Rake', fists: 'Punch', hooves: 'Kick',
    pincers: 'Pinch', blades: 'Slash', spurs: 'Kick', wings: 'Buffet', tail: 'Lash', stinger: 'Sting',
    coils: 'Squeeze', hide: 'Ram', shell: 'Bash', spines: 'Prick', tendrils: 'Lash', roots: 'Grip',
    pseudopods: 'Slam', body: 'Ram',
    crest: 'Touch', lure: 'Touch', rattle: 'Touch', 'light-organs': 'Touch', vents: 'Touch',
    core: 'Touch', antennae: 'Touch', spinnerets: 'Touch',
    mind: 'Touch', gaze: 'Touch', voice: 'Touch', breath: 'Touch', secretion: 'Touch', swarm: 'Touch', aura: 'Touch',
  },
  /** What the harm does, rather than the registry word for how it is classified. */
  mechanism: { impact: 'Heavy', cutting: 'Slashing', piercing: 'Piercing', compression: 'Crushing' },
  /**
   * Tier two. The act identity deliberately ignores how hard, how far, how likely and
   * how long a capability runs, so two of a creature's actions can be the same act at
   * different settings. These are the words for those settings, tried in this order
   * before the structural parenthetical. A setting with no entry is the plain reading
   * and contributes no word: a target or area recipient, brief preparation, brief
   * recovery, stationary approach, contact and short range, likely likelihood, brief
   * effect duration, small and medium area extent. Nothing here is drawn; every word
   * is a fact read straight off the structure.
   */
  facts: {
    recipient: { self: 'Self' },
    preparation: { immediate: 'Quick', prolonged: 'Charged' },
    recovery: { repeatable: 'Rapid', prolonged: 'Mighty' },
    approach: { closing: 'Lunging' },
    range: { medium: 'Far', long: 'Distant' },
    likelihood: { consistent: 'Sure', occasional: 'Glancing' },
    duration: { prolonged: 'Lasting' },
    extent: { large: 'Wide' },
  },
} as const satisfies {
  delivery: Record<z.infer<typeof c.Delivery>, readonly string[]>;
  status: Record<c.StatusKey, string>;
  removal: Record<z.infer<typeof c.Removal>, string>;
  instrument: Record<z.infer<typeof c.InstrumentKeySchema>, string>;
  mechanism: Record<Exclude<z.infer<typeof c.Harm>, 'elemental'>, string>;
  facts: {
    recipient: Partial<Record<z.infer<typeof c.Recipient>, string>>;
    preparation: Partial<Record<z.infer<typeof c.Preparation>, string>>;
    recovery: Partial<Record<z.infer<typeof c.Recovery>, string>>;
    approach: Partial<Record<z.infer<typeof c.Approach>, string>>;
    range: Partial<Record<z.infer<typeof c.Range>, string>>;
    likelihood: Partial<Record<z.infer<typeof c.Likelihood>, string>>;
    duration: Partial<Record<z.infer<typeof c.Duration>, string>>;
    extent: Partial<Record<z.infer<typeof c.Extent>, string>>;
  };
};

/**
 * The fact words this ability carries, in the catalog's order. Recipient, likelihood
 * and duration are read across every effect, so a compound outcome that is occasional
 * anywhere reads Glancing and one that touches self anywhere reads Self. Order is
 * fixed so two creatures of a species describe the same difference with the same word.
 */
function factWords(ability: Ability): string[] {
  const table = NAMING_CATALOG.facts as {
    recipient: Partial<Record<z.infer<typeof c.Recipient>, string>>;
    preparation: Partial<Record<z.infer<typeof c.Preparation>, string>>;
    recovery: Partial<Record<z.infer<typeof c.Recovery>, string>>;
    approach: Partial<Record<z.infer<typeof c.Approach>, string>>;
    range: Partial<Record<z.infer<typeof c.Range>, string>>;
    likelihood: Partial<Record<z.infer<typeof c.Likelihood>, string>>;
    duration: Partial<Record<z.infer<typeof c.Duration>, string>>;
    extent: Partial<Record<z.infer<typeof c.Extent>, string>>;
  };
  const words = [
    // Who it lands on comes first: a self-aimed protect is Self Protective Touch, which
    // reads as the plain fact it is rather than being out-ranked by a timing word.
    ...ability.effects.map(effect => table.recipient[effect.recipient]),
    ability.timing && table.preparation[ability.timing.preparation],
    ability.timing && table.recovery[ability.timing.recovery],
    table.approach[ability.delivery.approach],
    ability.spatial.range && table.range[ability.spatial.range],
    ...ability.effects.map(effect => table.likelihood[effect.likelihood]),
    ...ability.effects.map(effect => effect.duration && table.duration[effect.duration]),
    ability.spatial.area && table.extent[ability.spatial.area.extent],
  ];
  return [...new Set(words.filter((word): word is string => Boolean(word)))];
}
const title = (value: string) => value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function qualifiers(ability: Ability): string[] {
  const words = ability.effects.flatMap(effect => {
    switch (effect.type) {
      case 'status': return [NAMING_CATALOG.status[effect.status]];
      case 'restore': return ['Restorative'];
      case 'protect': return ['Protective'];
      case 'remove': return effect.methods.map(method => NAMING_CATALOG.removal[method]);
      case 'displace': return [effect.direction === 'toward' ? 'Pulling' : 'Repelling'];
      case 'harm': return [effect.mechanism === 'elemental' ? title(ability.element!) : NAMING_CATALOG.mechanism[effect.mechanism]];
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
  // Contact with no geometry is the creature striking with a body part: name the part's act.
  if (ability.delivery.mode === 'contact') return [NAMING_CATALOG.instrument[ability.instrument]];
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
    ...ability.effects.filter(effect => !effect.requires).flatMap(parent => {
      const children = ability.effects.filter(effect => effect.requires === parent.key);
      if (!children.length) return [];
      const names = children.map(effect => title(effect.type === 'status' ? effect.status : effect.type)).sort().join(' + ');
      return [
        `${children.length > 1 ? 'Shared Success' : 'Dependent'}: ${names}`,
        `After ${effectDescription(parent, ability.effects, false)}: ${children.map(effect => effectDescription(effect, ability.effects, false)).sort().join(' + ')}`,
      ];
    }).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)),
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
  const reserved = new Set(guaranteed.map(ability => ability.name.toLowerCase()));
  const used = new Set(reserved);
  const names: string[] = new Array(ordinary.length);

  // Resolve a whole colliding group at once, so the words chosen actually tell its
  // members apart. A group is every ordinary action sharing a base, plus the base
  // itself when a guaranteed name already reserves it.
  const groups = new Map<string, number[]>();
  bases.forEach((base, index) => {
    const key = base.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  for (const [key, members] of groups) {
    if (members.length === 1 && !reserved.has(key)) {
      names[members[0]] = bases[members[0]];
      used.add(key);
      continue;
    }
    // The plainest reading keeps the bare name: fewest fact words first, then the
    // creature's own slot order, so the choice never depends on a draw.
    const order = [...members].sort((a, b) => factWords(ordinary[a]).length - factWords(ordinary[b]).length || a - b);
    const taken: string[] = [];
    let bareClaimed = false;
    for (const index of order) {
      const base = bases[index];
      const mine = factWords(ordinary[index]);
      let name: string | undefined;
      // The bare name goes to the plainest member, unless a guaranteed name holds it.
      if (!bareClaimed && !used.has(base.toLowerCase())) { name = base; bareClaimed = true; }
      if (!name) {
        const word = mine.find(candidate => !taken.includes(candidate) && !used.has(`${candidate} ${base}`.toLowerCase()));
        if (word) { name = `${word} ${base}`; taken.push(word); }
      }
      if (!name) {
        // Two members share every fact word, or none has one. Fall back to a true
        // structural fact, exactly as before.
        const peers = members.filter(peer => peer !== index);
        const facts = distinctions(ordinary[index]);
        const unique = facts.find(fact => peers.every(peer => !distinctions(ordinary[peer]).includes(fact)) && !used.has(`${base} (${fact})`.toLowerCase()));
        name = `${base} (${unique ?? facts.join('; ')})`;
      }
      // Authored names could deliberately equal an entire descriptive fallback. Keep
      // adding a true structural fact; never reroll a capability or change its effects.
      while (used.has(name.toLowerCase())) name = `${name} (${distinctions(ordinary[index])[0]})`;
      used.add(name.toLowerCase());
      names[index] = name;
    }
  }
  return ordinary.map((ability, index) => ({ ...ability, name: names[index] }));
}
