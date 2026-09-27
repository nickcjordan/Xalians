import { describe, it, expect } from 'vitest';
import { buildDraftPools, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import { createMatch, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { prepare } from '@xalians/rules/expedition/creatureOnTable';
import { ROSTER_SIZE } from '@xalians/rules/expedition/expeditionInterpretation';
import { multiplierLines, standingReasons } from '../reclamationInspect';
import { sizeLine, toleranceLine } from '../reclamationVocabulary';

/*
	PASS 62, THE AUDIT. The dossier's lines are its arithmetic: base hold, home ground and strain
	multiply to the hold it prints. A willful Scalatto on airless Luminax read "Strain x0.25
	(severe)" above "Base hold 14" and "Hold here 7", because the strain line printed the world's
	grade and the hold used the grade after willpower. And the body line printed a record's
	measures to the full float ("height 102.36373238265514 cm").
*/

const factor = (val) => Number(String(val).replace(/^x/, '').split(' ')[0]);
const number = (val) => Number(String(val).split(' ')[0]);

describe('the dossier', () => {
	it('prints factors that multiply to the hold it prints, on every creature at every world', () => {
		let checked = 0;
		let willful = 0;
		[7, 13].forEach((seed) => {
			const { poolA, poolB } = buildDraftPools(seed, draftOptionsFromRules(DEFAULT_RULES));
			const match = createMatch({ rosterA: poolA.slice(0, ROSTER_SIZE), rosterB: poolB.slice(0, ROSTER_SIZE), worlds: getWorlds(), seed });
			match.frames.forEach((frame) => frame.sites.forEach((site) => {
				match.players.A.roster.forEach((record) => {
					const prepared = prepare(record, site, site.world, 0, { rules: DEFAULT_RULES });
					const lines = Object.fromEntries(multiplierLines(record, prepared, site, site.world).map((l) => [l.key, l.val]));
					const made = number(lines['Base hold']) * factor(lines['Home ground']) * factor(lines.Strain);
					expect(Math.abs(Math.round(made) - number(lines['Hold here']))).toBeLessThanOrEqual(1);
					if (prepared.heldStrainLevel !== prepared.strainLevel) {
						willful += 1;
						expect(lines.Strain).toContain('willful: one grade less');
					}
					checked += 1;
				});
			}));
		});
		expect(checked).toBeGreaterThan(100);
		expect(willful).toBeGreaterThan(0);
	});

	it('says why a creature standing on a world holds what it holds, in the table\'s own words', () => {
		let said = 0;
		[7, 11, 13, 21].forEach((seed) => {
			const { poolA, poolB } = buildDraftPools(seed, draftOptionsFromRules(DEFAULT_RULES));
			const match = createMatch({ rosterA: poolA.slice(0, ROSTER_SIZE), rosterB: poolB.slice(0, ROSTER_SIZE), worlds: getWorlds(), seed });
			const sites = match.frames.flatMap((frame) => frame.sites);
			poolA.forEach((record) => sites.forEach((site) => {
				const prepared = prepare(record, site, site.world, 0, { rules: DEFAULT_RULES });
				const lines = standingReasons(record, prepared, site);
				const keys = lines.map((l) => l.key);
				if (prepared.isHome) expect(keys).toContain('home');
				if (prepared.heldStrainLevel !== 'none' || prepared.heldStrainLevel !== prepared.strainLevel) expect(keys).toContain('climate');
				if (prepared.strainLevel === 'severe' && prepared.heldStrainLevel === 'strained') {
					expect(lines.find((l) => l.key === 'climate').effect).toMatch(/but it is willful: it holds half, not a quarter\.$/);
					said += 1;
				}
				lines.forEach((l) => expect(`${l.effect} ${l.cause}`).not.toMatch(/undefined|NaN/));
			}));
		});
		expect(said).toBeGreaterThan(0);
	});

	it('prints a record\'s measures rounded, and its band in degrees', () => {
		expect(sizeLine({ heightCm: 102.36373238265514, massKg: 64.38190139830112 })).toBe('height 102 cm, mass 64.4 kg');
		expect(sizeLine({ lengthCm: 215.6, widthCm: 65.2, massKg: 130.4 })).toBe('length 216 cm, width 65 cm, mass 130 kg');
		expect(toleranceLine({ environmentalTolerance: { temperatureC: { min: -10, max: 48 }, ambientMedia: [] } })).toBe('-10 to 48°C');
	});
});
