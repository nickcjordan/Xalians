// scratch probe (untracked): the shape of a world's fight under rules.clashExchanges
import { createMatch, send, pass, moveSwift, stakeWorld, getPublicState, createRngState, nextRandom } from '../expeditionRules.ts';
import { chooseSend, chooseStake } from '../expeditionBot.ts';
import { buildRosters } from '../roster.ts';
import { getWorlds } from '../sites.ts';
import type { MatchState, Seat } from '../types.ts';

const exchanges = Number((process.argv.find((a) => a.startsWith('--x=')) || '--x=12').slice(4));
const matches = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=200').slice(4));

function botRng(seed: string) {
	let state = createRngState(seed);
	return { float: () => { const { value, nextState } = nextRandom(state); state = nextState; return value; } };
}

const lengths: Record<number, number> = {};
let worlds = 0; let wiped = 0; let bothStanding = 0; let bothWiped = 0; let capped = 0; let contested = 0;
let totalDowns = 0;
for (let m = 0; m < matches; m++) {
	const seed = `fs${m}`;
	const { rosterA, rosterB } = buildRosters(seed);
	let state: MatchState = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed, rules: { clashExchanges: exchanges } as any });
	const rng = botRng(`${seed}-bot`);
	let guard = 0;
	while (state.phase === 'deploy' && guard < 2000) {
		guard++;
		const handler = state.turn as Seat;
		let view = getPublicState(state, handler);
		if ((view.players[handler].stakeableSiteIds || []).length > 0) {
			const wanted = chooseStake(view, state.players[handler].roster, handler, null);
			const staked = wanted ? stakeWorld(state, handler, wanted.siteId) : null;
			if (staked) { state = staked; view = getPublicState(state, handler); }
		}
		let action: any = chooseSend(view, state.players[handler].roster, handler, rng, null);
		if (action.type === 'move') {
			const moved = moveSwift(state, handler, action.recordId, action.siteId);
			if (moved) state = moved;
			action = chooseSend(getPublicState(state, handler), state.players[handler].roster, handler, rng, null);
		}
		if (action.type === 'send') {
			const next = send(state, handler, action.recordId, action.siteId, false, action.chosenRole || null);
			if (next) { state = next; continue; }
		}
		state = pass(state, handler) as MatchState;
	}
	// read each resolved world from the log
	const log = state.resolutionLog as any[];
	let current: Record<string, number> = {};
	log.forEach((e) => {
		if (e.type === 'exchange') current[e.site] = Math.max(current[e.site] || 1, e.exchange);
		if (e.type === 'attack' && e.outcome === 'downed') totalDowns++;
		if (e.type === 'judge') {
			Object.entries(e.siteResults).forEach(([siteId, r]: [string, any]) => {
				const a = r.entries.A.length; const b = r.entries.B.length;
				const n = current[siteId] || 1;
				worlds++;
				const was = (r.sentA ?? null);
				lengths[n] = (lengths[n] || 0) + 1;
				if (n >= exchanges) capped++;
				if (a > 0 && b > 0) bothStanding++;
				else if (a === 0 && b === 0) bothWiped++;
				else wiped++;
			});
			current = {};
		}
	});
}
console.log(`clashExchanges=${exchanges}, ${matches} matches, ${worlds} worlds`);
console.log('exchanges used per world:', JSON.stringify(lengths));
console.log(`one side standing: ${(100 * wiped / worlds).toFixed(1)}%  both standing: ${(100 * bothStanding / worlds).toFixed(1)}%  nobody standing: ${(100 * bothWiped / worlds).toFixed(1)}%  hit the cap: ${(100 * capped / worlds).toFixed(1)}%`);
console.log(`downs per match: ${(totalDowns / matches).toFixed(2)}`);
