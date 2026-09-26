import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CreatureDataSchema, MIN_DISTINCT_ACTS, abilityIdentity, effectKind, signatureCaps } from '@xalians/content/creature';
import { compileSpecies, generateCreatureDraft } from './creature.ts';
import { getSpeciesTemplates } from './canonicalCreatureRelease.ts';

it('constructs every staged species with guaranteed identity and distinct ordinary actions', () => {
  const directory = fileURLToPath(new URL('../../../../docs/species-templates/v5/', import.meta.url));
  const files = readdirSync(directory).filter(file => file.endsWith('.json'));
  const legacyRatified = JSON.parse(readFileSync(fileURLToPath(new URL('../../../../docs/species-templates/RATIFIED.json', import.meta.url)), 'utf8')) as { species: string[] };
  expect(files.map(file => file.slice(0, -5)).sort()).toEqual(getSpeciesTemplates().map(species => species.key).sort());
  for (const file of files) {
    const source = JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../docs/species-templates/v5/${file}`, import.meta.url)), 'utf8')) as { key: string; lore: { description: string } };
    expect(readdirSync(directory)).toContain(`${source.key}.ability-audit.md`);
    if (legacyRatified.species.includes(source.key)) {
      const original = JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../docs/species-templates/${file}`, import.meta.url)), 'utf8')) as { lore: { description: string } };
      expect(source.lore.description).toBe(original.lore.description);
    }
    const compiled = compileSpecies(source);
    // Anatomy grants. A ratified body offers a real act space, and no instrument the
    // record lists sits idle unless its audit excluded it on purpose.
    expect(compiled.acts.distinct, source.key).toBeGreaterThanOrEqual(MIN_DISTINCT_ACTS);
    for (const instrument of compiled.species.physiology.anatomy) {
      const silenced = compiled.acts.exclusions.some(value => value.split('/')[0] === instrument || value.split('/')[0] === '*');
      if (!silenced) expect(compiled.acts.byInstrument[instrument], `${source.key}/${instrument}`).toBeGreaterThan(0);
    }
    // The signature guardrail: no ordinary band of the signature's kind outclasses the
    // signature's own band at either end, derived or authored. Bands, not rolls.
    const caps = signatureCaps(compiled.species);
    expect([...caps.keys()], source.key).toEqual([...compiled.acts.signatureKinds]);
    for (const mechanism of compiled.mechanisms) for (const effect of mechanism.effects) {
      const kind = effectKind(effect, mechanism.element);
      const cap = kind ? caps.get(kind) : undefined;
      if (!cap || effect.intensity === undefined) continue;
      const band = typeof effect.intensity === 'number' ? [effect.intensity, effect.intensity] : effect.intensity;
      expect(band[0], `${source.key}/${mechanism.key}/${effect.key} minimum vs ${cap.signature}`).toBeLessThanOrEqual(cap.band[0]);
      expect(band[1], `${source.key}/${mechanism.key}/${effect.key} maximum vs ${cap.signature}`).toBeLessThanOrEqual(cap.band[1]);
    }
    const variants = new Set<string>();
    for (let index = 0; index < 24; index++) {
      const seed = `${source.key}:${index}`;
      const creature = generateCreatureDraft(compiled, seed);
      expect(CreatureDataSchema.safeParse(creature).success).toBe(true);
      expect(creature.actions).toHaveLength(4);
      expect(new Set(creature.actions.map(abilityIdentity)).size).toBe(4);
      variants.add(creature.actions.map(abilityIdentity).sort().join('|'));
      expect(generateCreatureDraft(compiled, seed)).toEqual(creature);
      if (source.key === 'frackworm') {
        expect(creature.physiology.heightCm).toBeUndefined();
        expect(creature.physiology.lengthCm).toBeGreaterThanOrEqual(900);
        expect(creature.physiology.lengthCm).toBeLessThanOrEqual(1500);
      }
      // Every ordinary action this seed drew came from a band checked above, so its roll of
      // the signature's kind never lands above the signature's maximum.
      for (const action of creature.actions.filter(value => /(^|-)ordinary-\d+$/.test(value.key))) {
        for (const effect of action.effects) {
          const kind = effectKind(effect, action.element);
          const cap = kind ? caps.get(kind) : undefined;
          if (cap && 'intensity' in effect && typeof effect.intensity === 'number') {
            expect(effect.intensity, `${seed}/${action.name}`).toBeLessThanOrEqual(cap.band[1]);
          }
        }
      }
      if (source.key === 'bioflim') {
        expect(creature.signature.type).toBe('passive');
        expect(creature.passives.some(passive => passive.effects.some(effect => effect.type === 'restore'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'bioflim-acid')).toBe(true);
      }
      if (source.key === 'avilily') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'paralyzed'))).toBe(true);
      }
      if (source.key === 'yetimoth') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'shielded'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'yetimoth-encasement' && action.effects.some(effect => effect.type === 'status' && effect.status === 'frozen'))).toBe(true);
      }
      if (source.key === 'akinza') {
        expect(creature.physiology.senses.special).toContain('lowlight');
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'concealed'))).toBe(true);
      }
      if (source.key === 'drilltail') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'tail' && action.effects.some(effect => effect.type === 'harm' && effect.mechanism === 'piercing'))).toBe(true);
      }
      if (source.key === 'dromeus') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'jaws' && action.delivery.approach === 'closing')).toBe(true);
      }
      if (source.key === 'crystorn') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'horns' && action.element === 'light')).toBe(true);
      }
      if (source.key === 'luceras') {
        expect(creature.physiology.capabilities.flight).toBe(0);
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'horns' && action.delivery.approach === 'closing')).toBe(true);
      }
      if (source.key === 'chromocat') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'blades' && action.delivery.approach === 'closing')).toBe(true);
      }
      if (source.key === 'foromeer') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'spurs')).toBe(true);
      }
      if (source.key === 'kosanos') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'blades')).toBe(true);
      }
      if (source.key === 'scalatto') {
        expect(creature.physiology.protections.some(protection => protection.type === 'harm' && protection.mechanism === 'cutting')).toBe(true);
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'shielded'))).toBe(true);
      }
      if (source.key === 'hippochamp') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'remove' && effect.methods.includes('cooling')))).toBe(true);
      }
      if (source.key === 'hypnopet') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'remove' && effect.methods.includes('stabilizing')))).toBe(true);
        expect(creature.actions.some(action => action.key === 'hypnopet-trance' && action.delivery.reception === 'visual')).toBe(true);
      }
      if (source.key === 'sonalloy') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'restore' && effect.recipient === 'target'))).toBe(true);
        expect(creature.passives.some(passive => passive.key === 'sonalloy-self-renewal' && passive.effects.some(effect => effect.type === 'restore' && effect.recipient === 'self'))).toBe(true);
      }
      if (source.key === 'newtapede') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'restrained' && effect.persistence === 'sustained'))).toBe(true);
      }
      if (source.key === 'shuntara') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'protect'))).toBe(true);
      }
      if (source.key === 'figzy') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'protect'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'figzy-force' && action.effects.some(effect => effect.type === 'displace'))).toBe(true);
      }
      if (source.key === 'ectoghoul') {
        expect(creature.physiology.traversal).toContain('phase');
        expect(creature.actions.some(action => action.key === creature.signature.key && action.delivery.reception === 'auditory')).toBe(true);
        expect(creature.actions.some(action => action.key === 'ectoghoul-ectoplasm')).toBe(true);
      }
      if (source.key === 'graviclaw') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'harm' && effect.mechanism === 'compression'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'graviclaw-attract' && action.effects.some(effect => effect.type === 'displace' && effect.direction === 'toward'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'graviclaw-anchor' && action.effects.some(effect => effect.type === 'status' && effect.status === 'protected' && effect.protection?.type === 'displace'))).toBe(true);
      }
      if (source.key === 'neph') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'chilled'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'neph-suction' && action.effects.some(effect => effect.type === 'displace' && effect.direction === 'toward'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'neph-pressure' && action.effects.some(effect => effect.type === 'displace' && effect.direction === 'away'))).toBe(true);
      }
      if (source.key === 'xylum') {
        expect(creature.passives.some(passive => passive.key === creature.signature.key && passive.effects.some(effect => effect.type === 'restore'))).toBe(true);
        expect(creature.actions.some(action => action.key === 'xylum-root-hold' && action.effects.some(effect => effect.type === 'status' && effect.status === 'restrained'))).toBe(true);
      }
      if (source.key === 'smokat') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'dispersed'))).toBe(true);
      }
      if (source.key === 'venemist') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.effects.some(effect => effect.type === 'status' && effect.status === 'corroding'))).toBe(true);
      }
      if (source.key === 'voltish') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.element === 'electric')).toBe(true);
      }
      if (source.key === 'tizzie') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.delivery.reception === 'visual')).toBe(true);
        expect(creature.actions.some(action => action.key === 'tizzie-mind-strike' && action.delivery.reception === 'visual')).toBe(true);
      }
      if (source.key === 'thirstaserp') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.delivery.reception === 'auditory')).toBe(true);
        expect(creature.actions.some(action => action.key === 'thirstaserp-venom' && action.effects.some(effect => effect.type === 'status' && effect.status === 'poisoned'))).toBe(true);
      }
      if (source.key === 'codazzo') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.spatial.area?.shape === 'radial')).toBe(true);
      }
      if (source.key === 'frackworm') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'jaws')).toBe(true);
        expect(creature.actions.some(action => action.key === 'frackworm-slurry')).toBe(true);
      }
      if (source.key === 'imprit') {
        expect(creature.passives.some(passive => passive.key === creature.signature.key && passive.activation.trigger === 'contact')).toBe(true);
        expect(creature.physiology.protections.some(protection => protection.type === 'harm' && protection.mechanism === 'elemental' && protection.element === 'fire')).toBe(true);
      }
      if (source.key === 'terragoyle') {
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'tail')).toBe(true);
        expect(creature.actions.some(action => action.key === 'terragoyle-gravel' && action.spatial.area?.shape === 'radial')).toBe(true);
      }
      if (source.key === 'vespersyn') {
        expect(creature.physiology.bodyPlan).toBe('swarm');
        expect(creature.actions.some(action => action.key === creature.signature.key && action.instrument === 'swarm')).toBe(true);
        expect(creature.actions.some(action => action.key === 'vespersyn-guard')).toBe(true);
        expect(creature.passives.some(passive => passive.key === 'vespersyn-hidden-core')).toBe(true);
      }
    }
    expect(variants.size).toBeGreaterThan(1);
  }
}, 30_000);
