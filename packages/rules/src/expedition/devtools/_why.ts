// scratch probe (untracked): what makes a creature's column differ from world to world
import { createMatch } from '../expeditionRules.ts';
import { buildRosters } from '../roster.ts';
import { getWorlds } from '../sites.ts';
import { holdAtSite, baseHold, strainLevel, worldMatchupMultiplier, isWillful } from '../creatureOnTable.ts';
import type { MatchState } from '../types.ts';

const matches = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=1').slice(4));
const verbose = process.argv.includes('--v');

const tally = { cells: 0, home: 0, matchUp: 0, matchDown: 0, strained: 0, severe: 0, willfulLift: 0, sameElement: 0, sameElementDown: 0, sameElementHome: 0 };
const spreadBy: Record<string, number> = { matchup: 0, home: 0, strain: 0 };
const mhist: Record<string, number> = {};
for (let m = 0; m < matches; m++) {
	const seed = `why${m}`;
	const { rosterA, rosterB } = buildRosters(seed);
	const state: MatchState = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
	state.frames.forEach((frame, fi) => {
		if (verbose && m === 0) console.log(`frame ${fi + 1}: ${frame.sites.map((s) => `${s.world.planet} (${s.world.element}, ${JSON.stringify((s as any).environment?.temperatureC)} ${(s as any).environment?.medium})`).join(' | ')}`);
		rosterA.forEach((r) => {
			const cells = frame.sites.map((site) => {
				const h = holdAtSite(r, site, site.world, { rules: state.rules });
				const level = strainLevel(r, site, site.world);
				const mu = worldMatchupMultiplier(r, site.world.element);
				tally.cells++;
				if (h.isHome) tally.home++;
				if (mu > 1.001) tally.matchUp++;
				if (mu < 0.999) tally.matchDown++;
				mhist[mu.toFixed(2)] = (mhist[mu.toFixed(2)] || 0) + 1;
				if (h.effectiveLevel === 'strained') tally.strained++;
				if (h.effectiveLevel === 'severe') tally.severe++;
				if (h.willful && level !== h.heldLevel) tally.willfulLift++;
				if (r.element.primary.toLowerCase() === String(site.world.element).toLowerCase()) {
					tally.sameElement++;
					if (mu < 0.999) tally.sameElementDown++;
					if (h.isHome) tally.sameElementHome++;
				}
				return { site, h, mu, level };
			});
			if (verbose && m === 0 && fi === 0) {
				const base = baseHold(r, state.rules);
				console.log(`${r.species.padEnd(12)} ${r.element.primary.padEnd(9)} home=${r.provenance.origin} base=${base.toFixed(1)} tol=${JSON.stringify(r.physiology.environmentalTolerance.temperatureC)} | ` + cells.map((c) => `${c.site.world.planet}: ${c.h.value.toFixed(1)} (x${c.mu.toFixed(2)}${c.h.isHome ? ' home' : ''}${c.h.effectiveLevel !== 'none' ? ' ' + c.h.effectiveLevel : ''}${c.h.willful ? ' willful' : ''})`).join('  '));
			}
		});
	});
}
console.log(JSON.stringify(tally));
console.log('matchup histogram', mhist);
