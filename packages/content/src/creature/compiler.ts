import { ActionTemplateSchema, abilityIdentity, stable, type Ability, type AbilityTemplate } from './ability.ts';
import { SpeciesSchema, type Species, type Mechanism } from './species.ts';
import { nameOrdinaryActions } from './naming.ts';

type Path = (string | number)[];
interface Dimension { path: Path; values: string[] }
interface RecipientVariant { value: string; children: { index: number; values: string[] }[]; size: bigint }
interface RecipientGroup { root: number; variants: RecipientVariant[]; size: bigint }
interface Branch { base: AbilityTemplate; dimensions: Dimension[]; recipients: string[][]; groups: RecipientGroup[]; size: bigint }
export type Draw = (exclusive: bigint, label: string) => bigint;
export interface CompiledSpecies {
  readonly species: Species;
  /** Samples structures without replacement, then rolls output bands. No record evaluation. */
  abilities(draw: Draw): { actions: Ability[]; passives: Ability[]; signature: Species['signature'] };
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function get(object: unknown, path: Path): unknown {
  return path.reduce<unknown>((value, key) => (value as Record<string | number, unknown> | undefined)?.[key], object);
}
function set(object: unknown, path: Path, value: unknown): void {
  (get(object, path.slice(0, -1)) as Record<string | number, unknown>)[path[path.length - 1]] = value;
}
function construct(branch: Branch, rank: bigint): AbilityTemplate {
  const result = clone(branch.base);
  for (let i = branch.groups.length - 1; i >= 0; i--) {
    const group = branch.groups[i];
    applyGroup(result, group, rank % group.size);
    rank /= group.size;
  }
  for (let i = branch.dimensions.length - 1; i >= 0; i--) {
    const { path, values } = branch.dimensions[i];
    set(result, path, values[Number(rank % BigInt(values.length))]);
    rank /= BigInt(values.length);
  }
  return result;
}
function rankOf(branch: Branch, candidate: AbilityTemplate): bigint | undefined {
  let rank = 0n;
  for (const { path, values } of branch.dimensions) {
    const index = values.indexOf(get(candidate, path) as string);
    if (index === -1) return;
    rank = rank * BigInt(values.length) + BigInt(index);
  }
  for (const group of branch.groups) {
    let offset = 0n;
    const variant = group.variants.find(value => {
      if (value.value === candidate.effects[group.root].recipient) return true;
      offset += value.size; return false;
    });
    if (!variant) return;
    let local = 0n;
    for (const child of variant.children) {
      const index = child.values.indexOf(candidate.effects[child.index].recipient);
      if (index === -1) return;
      local = local * BigInt(child.values.length) + BigInt(index);
    }
    rank = rank * group.size + offset + local;
  }
  return rank;
}

function applyGroup(ability: AbilityTemplate, group: RecipientGroup, rank: bigint): void {
  let index = 0;
  while (rank >= group.variants[index].size) rank -= group.variants[index++].size;
  const variant = group.variants[index];
  ability.effects[group.root].recipient = variant.value as AbilityTemplate['effects'][number]['recipient'];
  for (let i = variant.children.length - 1; i >= 0; i--) {
    const child = variant.children[i];
    ability.effects[child.index].recipient = child.values[Number(rank % BigInt(child.values.length))] as AbilityTemplate['effects'][number]['recipient'];
    rank /= BigInt(child.values.length);
  }
}

function recipientGroups(mechanism: Mechanism, domains: string[][]): RecipientGroup[] {
  return mechanism.effects.flatMap((effect, root) => {
    if (effect.requires) return [];
    const children = mechanism.effects.flatMap((child, index) => child.requires === effect.key ? [index] : []);
    const variants = domains[root].flatMap(value => {
      const choices = children.map(index => ({ index, values: domains[index].filter(recipient => recipient === 'self' || recipient === value) }));
      if (choices.some(child => !child.values.length)) return [];
      return [{ value, children: choices, size: choices.reduce((size, child) => size * BigInt(child.values.length), 1n) }];
    });
    return [{ root, variants, size: variants.reduce((sum, variant) => sum + variant.size, 0n) }];
  });
}

function branchesFor(mechanism: Mechanism): Branch[] {
  const branches: Branch[] = [];
  if (new Set(mechanism.effects.map(effect => effect.key)).size !== mechanism.effects.length) throw new Error(`${mechanism.key}: effect keys must be unique`);
  for (const effect of mechanism.effects) if (effect.requires) {
    const parent = mechanism.effects.find(candidate => candidate.key === effect.requires);
    if (!parent || parent === effect || parent.requires) throw new Error(`${mechanism.key}: requires must refer to a different independent effect`);
  }
  for (const [mode, delivery] of Object.entries(mechanism.delivery)) {
    if (!delivery) continue;
    const start = branches.length;
    const selfOnly = mechanism.targeting.length === 1 && mechanism.targeting[0] === 'self';
    const recipients = mechanism.effects.map(effect => {
      const values = typeof effect.recipient === 'string' ? [effect.recipient] : effect.recipient[mode as keyof typeof mechanism.delivery]!;
      return [...new Set(values.map(value => selfOnly && value === 'target' ? 'self' : value))];
    });
    if (delivery.area && !recipients.some(values => values.includes('area'))) throw new Error(`${mechanism.key}/${mode}: area permissions are unreachable without an area recipient`);
    // Partition by the first area recipient. This is O(effect count), not 3^effect count.
    // -1 is the branch with no area. Every combination belongs to exactly one partition.
    for (const pivot of [-1, ...recipients.flatMap((values, index) => values.includes('area') ? [index] : [])]) {
      const domains = recipients.map((values, index) => pivot === -1 || index < pivot ? values.filter(v => v !== 'area') : index === pivot ? ['area'] : values);
      if (domains.some(values => !values.length)) continue;
      const groups = recipientGroups(mechanism, domains);
      if (groups.some(group => group.size === 0n)) continue;
      if (pivot !== -1 && !delivery.area) throw new Error(`${mechanism.key}/${mode}: area recipients require area permissions`);
      const dimensions: Dimension[] = [];
      const choose = (path: Path, values: readonly string[]) => {
        if (values.length > 1) dimensions.push({ path, values: [...values] });
        return values[0];
      };
      const area = pivot === -1 ? undefined : delivery.area!;
      const base = {
        key: mechanism.key, name: mechanism.name, description: mechanism.description,
        instrument: mechanism.instrument, ...(mechanism.element ? { element: mechanism.element } : {}),
        targeting: mechanism.targeting,
        activation: { continuity: choose(['activation', 'continuity'], mechanism.activation.continuity) },
        timing: { preparation: choose(['timing', 'preparation'], mechanism.timing.preparation), recovery: choose(['timing', 'recovery'], mechanism.timing.recovery) },
        delivery: { mode, approach: choose(['delivery', 'approach'], delivery.approach), ...(delivery.reception ? { reception: delivery.reception } : {}) },
        spatial: {
          ...(delivery.range ? { range: choose(['spatial', 'range'], delivery.range) } : {}),
          ...(area ? { area: {
            shape: choose(['spatial', 'area', 'shape'], area.shape), extent: choose(['spatial', 'area', 'extent'], area.extent),
            anchor: choose(['spatial', 'area', 'anchor'], area.anchor), persistence: area.persistence, ...(area.duration ? { duration: area.duration } : {}),
          } } : {}),
        },
        effects: mechanism.effects.map((effect, index) => ({ ...effect,
          recipient: domains[index][0],
          likelihood: choose(['effects', index, 'likelihood'], effect.likelihood),
        })),
      } as AbilityTemplate;
      groups.forEach(group => applyGroup(base, group, 0n));
      const branch: Branch = { base, dimensions, recipients: domains, groups,
        size: dimensions.reduce((size, d) => size * BigInt(d.values.length), 1n) * groups.reduce((size, group) => size * group.size, 1n) };
      validateBranch(branch, `${mechanism.key}/${mode}`);
      branches.push(branch);
    }
    if (branches.length === start) throw new Error(`${mechanism.key}/${mode}: no compatible recipient combination satisfies the dependencies`);
    if (delivery.area && !branches.slice(start).some(branch => branch.base.spatial.area)) throw new Error(`${mechanism.key}/${mode}: area permissions are unreachable under the effect dependencies`);
  }
  return branches;
}

/**
 * Inside a recipient partition, every current schema constraint touches at most two
 * variable dimensions. Types, references, effect presence, lifetimes, element and
 * targeting are fixed. Check the baseline and all pairs, never the Cartesian product.
 * If a future invariant spans three variable dimensions this proof must be extended.
 */
function validateBranch(branch: Branch, label: string): void {
  const check = (candidate: AbilityTemplate) => {
    const result = ActionTemplateSchema.safeParse(candidate);
    if (!result.success) throw new Error(`${label}: invalid permission combination: ${result.error.message}`);
  };
  check(branch.base);
  // A dependency group constructively enforces same-recipient-or-self. Exercise
  // every remaining recipient value against the other variable dimensions without
  // materializing combinations among unrelated groups or among dependent children.
  for (const group of branch.groups) {
    let offset = 0n;
    for (const variant of group.variants) {
      const samples = [offset];
      let stride = 1n;
      for (let i = variant.children.length - 1; i >= 0; i--) {
        for (let choice = 1; choice < variant.children[i].values.length; choice++) samples.push(offset + BigInt(choice) * stride);
        stride *= BigInt(variant.children[i].values.length);
      }
      for (const rank of samples) {
        const candidate = clone(branch.base);
        applyGroup(candidate, group, rank);
        check(candidate);
        for (const dimension of branch.dimensions) {
          for (const value of dimension.values) { set(candidate, dimension.path, value); check(candidate); }
          set(candidate, dimension.path, dimension.values[0]);
        }
      }
      offset += variant.size;
    }
  }
  for (let i = 0; i < branch.dimensions.length; i++) {
    const left = branch.dimensions[i];
    for (const a of left.values) {
      const candidate = clone(branch.base);
      set(candidate, left.path, a);
      check(candidate);
      for (let j = i + 1; j < branch.dimensions.length; j++) {
        const right = branch.dimensions[j];
        for (const b of right.values) {
          set(candidate, right.path, b);
          check(candidate);
        }
        set(candidate, right.path, right.values[0]);
      }
    }
  }
}

function staticEffect(effect: AbilityTemplate['effects'][number]): string {
  const { key: _key, recipient: _recipient, likelihood: _likelihood, requires: _requires, ...facts } = effect;
  if ('intensity' in facts) delete facts.intensity;
  return stable(facts);
}

/** Locate every representation of a selected structure, including overlapping
 * mechanisms and reordered effects. Numeric ranges and display names do not matter.
 * Work depends on authored effects and mechanisms, not the size of the move space. */
function matchingRanks(branch: Branch, selected: AbilityTemplate): bigint[] {
  if (branch.base.effects.length !== selected.effects.length) return [];
  const matches = branch.base.effects.map(effect => selected.effects.flatMap((candidate, i) => staticEffect(effect) === staticEffect(candidate) ? [i] : []));
  if (matches.some(indices => !indices.length)) return [];
  const identity = abilityIdentity(selected);
  const found = new Set<bigint>();
  const visit = (assignment: number[], used: Set<number>) => {
    if (assignment.length < matches.length) {
      const seen = new Set<string>();
      for (const index of matches[assignment.length]) if (!used.has(index)) {
        const effect = selected.effects[index];
        const token = `${effect.recipient}/${effect.likelihood}`;
        if (seen.has(token)) continue;
        seen.add(token);
        used.add(index); visit([...assignment, index], used); used.delete(index);
      }
      return;
    }
    const candidate = clone(selected);
    candidate.effects = assignment.map(index => clone(selected.effects[index]));
    const dimensions = [...branch.dimensions, ...branch.recipients.map((values, index) => ({ path: ['effects', index, 'recipient'] as Path, values }))];
    // Self-only target and self recipients are semantically identical. Explore only
    // these aliases (not whole move combinations) when inverting structural indices.
    const aliases = (dimension: number) => {
      if (dimension === dimensions.length) {
        const rank = rankOf(branch, candidate);
        if (rank !== undefined && abilityIdentity(construct(branch, rank)) === identity) found.add(rank);
        return;
      }
      const { path, values } = dimensions[dimension];
      const value = get(candidate, path);
      if (value === undefined) return;
      const selfOnly = selected.targeting.length === 1 && selected.targeting[0] === 'self' && !selected.activation.trigger;
      const equivalent = selfOnly && ((path.at(-1) === 'recipient' && (value === 'target' || value === 'self')) ||
        (path.at(-1) === 'anchor' && (value === 'target' || value === 'self')));
      for (const choice of equivalent ? values.filter(v => v === 'self' || v === 'target') : [value]) {
        set(candidate, path, choice); aliases(dimension + 1);
      }
      set(candidate, path, value);
    };
    aliases(0);
  };
  visit([], new Set());
  return [...found];
}

function select(branches: Branch[], guaranteed: AbilityTemplate[], count: number, draw: Draw): AbilityTemplate[] {
  const excluded = branches.map(() => new Set<bigint>());
  const exclude = (ability: AbilityTemplate) => branches.forEach((branch, index) => matchingRanks(branch, ability).forEach(rank => excluded[index].add(rank)));
  guaranteed.forEach(exclude);
  const selected: AbilityTemplate[] = [];
  for (let slot = 0; slot < count; slot++) {
    const remaining = branches.map((branch, i) => branch.size - BigInt(excluded[i].size));
    const total = remaining.reduce((sum, value) => sum + value, 0n);
    if (total === 0n) throw new Error('species permissions cannot supply four structurally distinct actions');
    let choice = draw(total, `structure/${slot}`);
    if (choice < 0n || choice >= total) throw new Error('draw outside requested interval');
    let index = 0;
    while (choice >= remaining[index]) { choice -= remaining[index]; index++; }
    // Lift an index in the remaining space into the full mixed-radix space.
    for (const blocked of [...excluded[index]].sort((a, b) => a < b ? -1 : a > b ? 1 : 0)) if (blocked <= choice) choice++;
    const ability = construct(branches[index], choice);
    selected.push(ability);
    exclude(ability);
  }
  return selected;
}
function resolveOutput(ability: AbilityTemplate, draw: Draw, label: string): Ability {
  const result = clone(ability);
  for (const effect of result.effects) if ('intensity' in effect && Array.isArray(effect.intensity)) {
    const [min, max] = effect.intensity;
    effect.intensity = min + Number(draw(BigInt(max) - BigInt(min) + 1n, `${label}/${effect.key}/intensity`));
  }
  return result as Ability;
}

export function compileSpecies(input: unknown): CompiledSpecies {
  const species = freeze(SpeciesSchema.parse(input));
  const branches = species.mechanisms.flatMap(branchesFor);
  const slots = 4 - species.actions.length;
  // At most four direct selections prove capacity, including all cross-mechanism aliases.
  select(branches, species.actions, slots, () => 0n);
  return Object.freeze({
    species,
    abilities(draw: Draw) {
      const checkedDraw: Draw = (exclusive, label) => {
        const value = draw(exclusive, label);
        if (value < 0n || value >= exclusive) throw new Error('draw outside requested interval');
        return value;
      };
      const selected = select(branches, species.actions, slots, checkedDraw);
      const ordinary = selected.map((ability, index) => ({
        ...ability, key: `ordinary-${index + 1}`,
      }));
      // Local generated keys cannot collide with authored guaranteed keys.
      for (const ability of ordinary) while ([...species.actions, ...species.passives].some(a => a.key === ability.key)) ability.key = `generated-${ability.key}`;
      const guaranteed = species.actions.map(ability => resolveOutput(ability, checkedDraw, `action/${ability.key}`));
      const named = nameOrdinaryActions(
        ordinary.map(ability => resolveOutput(ability, checkedDraw, `action/${ability.key}`)),
        [...guaranteed, ...species.passives],
        selected.map(ability => species.mechanisms.find(mechanism => mechanism.key === ability.key)?.naming),
        checkedDraw,
      );
      return {
        signature: clone(species.signature),
        actions: [...guaranteed, ...named],
        passives: species.passives.map(ability => resolveOutput(ability, checkedDraw, `passive/${ability.key}`)),
      };
    },
  });
}
