/*
	Comprehension by prediction: the harness.

	docs/design/game-validation-principles.md section 2. "Does this make sense" is testable
	without asking anyone whether they enjoyed anything: take positions from real matches,
	show each one as the player would see it, and ask a reader who has never seen the engine
	to predict the ruling. Every miss is a place where either the rules or the instruments
	on the table fail to explain what actually happens.

	The brief makes the accuracy of that prediction a GAUGE OF AFFORDANCE, logged per pass,
	and says that if the protocol cannot be run by a fresh agent that has only the screen,
	the affordance is not there yet. This file is the missing half: it plays real Provings,
	freezes each world at the end of Deploy, and writes out what a player can see beside
	what actually happened, so a reader can be asked to predict and be scored.

	WHAT A POSITION CONTAINS. Only what the table shows a handler at that moment: the world
	and its site, the creatures standing there with the numbers printed on their plinths,
	and which side they belong to. The answer (who held the world, what the Clash did) is
	kept separately so a reader is never handed it.

	Run:
		node apps/web/scripts/runNode.cjs \
		  packages/rules/src/expedition/devtools/predictionPositions.ts --count=20 --seed=7

	--json writes the positions and the answer key to a file. --answers prints the key,
	which is for scoring, never for the reader.
*/

import fs from 'node:fs';
import { createMatch, send, pass, getPublicState, currentFrame, stakeWorld } from '../expeditionRules.ts';
import { chooseSend, chooseStake, rivalById, DEFAULT_RIVAL_ID } from '../expeditionBot.ts';
import { prepare } from '../creatureOnTable.ts';
import { buildExpeditionPool } from '../roster.ts';
import { getWorlds } from '../sites.ts';
import { ROSTER_SIZE } from '../expeditionInterpretation.ts';
import type { MatchState, Seat } from '../types.ts';

export interface PositionCreature {
	name: string;
	species: string;
	side: 'yours' | 'the rival\'s';
	role: string;
	hold: number;
	speed: number;
	attackPower: number;
	element: string;
	strain: string;
	home: boolean;
	traits: string[];
	hidden: boolean;
}

export interface Position {
	id: string;
	siteId: string;
	world: string;
	site: string;
	environment: string;
	creatures: PositionCreature[];
	/** the totals the table prints on the balance bar */
	holdYours: number;
	holdRival: number;
	/** the question the reader is asked */
	question: string;
}

export interface Answer {
	id: string;
	winner: 'yours' | 'the rival\'s' | 'the Court (a tie)';
	holdYours: number;
	holdRival: number;
	downed: string[];
	/** true when the Clash changed who was ahead */
	resolutionFlipped: boolean;
}

function roundTo(value: number): number {
	return Math.round(value * 10) / 10;
}

/*
	One Proving, played by the bot on both seats. Seat A is "yours" throughout, which is the
	seat a reader is asked to reason from.

	A position is photographed at the END OF DEPLOY (what the handler can see before the
	Clash) and its answer is read off the SAME round's judge event, so the two always
	describe the same world and the reader is never handed the answer with the question.
*/
function collectFromMatch(seed: string, pool: any[], worlds: any[], out: { positions: Position[]; answers: Answer[] }): void {
	const deal = (offset: number) => pool.slice(offset, offset + ROSTER_SIZE);
	let state: MatchState = createMatch({
		rosterA: deal(0), rosterB: deal(ROSTER_SIZE), worlds, seed,
	});
	const rival = rivalById(DEFAULT_RIVAL_ID);
	let guard = 0;
	let pending: ReturnType<typeof photograph> = null;
	let logRead = 0;

	const drainLog = () => {
		for (; logRead < state.resolutionLog.length; logRead++) {
			const ev: any = state.resolutionLog[logRead];
			if (ev.type !== 'judge' || !ev.siteResults || !pending) continue;
			const shot = pending;
			shot.shots.forEach((position) => {
				const result = ev.siteResults[position.siteId];
				if (!result) return;
				const before = shot.deployTotals.get(position.siteId);
				const leaderBefore = before
					? (before.yours > before.rival ? 'yours' : (before.rival > before.yours ? "the rival's" : null))
					: null;
				const winner = result.winner === 'A' ? 'yours'
					: (result.winner === 'B' ? "the rival's" : 'the Court (a tie)');
				out.positions.push(position);
				out.answers.push({
					id: position.id,
					winner: winner as Answer['winner'],
					holdYours: roundTo(result.holdA),
					holdRival: roundTo(result.holdB),
					downed: [],
					resolutionFlipped: !!leaderBefore && winner !== 'the Court (a tie)' && winner !== leaderBefore,
				});
			});
			pending = null;
		}
	};

	while (state.phase === 'deploy' && guard < 400) {
		guard++;
		const handler = state.turn as Seat;
		if (!handler) break;
		let publicState = getPublicState(state, handler);

		if ((publicState.players[handler].stakeableSiteIds || []).length > 0) {
			const wanted = chooseStake(publicState, state.players[handler].roster, handler, rival);
			if (wanted) {
				const staked = stakeWorld(state, handler, wanted.siteId);
				if (staked) { state = staked; publicState = getPublicState(state, handler); }
			}
		}

		const action = chooseSend(publicState, state.players[handler].roster, handler, null, rival);
		const opponentPassed = state.players[handler === 'A' ? 'B' : 'A'].passed;
		const next = (!action || action.type === 'pass')
			? null
			: send(state, handler, action.recordId, action.siteId);

		if (!next) {
			// this pass ends Deploy if the opponent has already passed: photograph first
			if (opponentPassed) pending = photograph(state);
			const passed = pass(state, handler);
			if (!passed) break;
			state = passed;
			drainLog();
			continue;
		}
		state = next;
		drainLog();
	}
}

// what a handler can see at each contested world at the end of Deploy
function photograph(state: MatchState) {
	const frame = currentFrame(state);
	if (!frame) return null;
	const shots: Position[] = [];
	const deployTotals = new Map<string, { yours: number; rival: number }>();
	frame.sites.forEach((site, siteIndex) => {
		const entriesA = state.board[site.id].A;
		const entriesB = state.board[site.id].B;
		if (entriesA.length === 0 || entriesB.length === 0) return; // only contested worlds

		const describe = (entry: any, side: 'yours' | "the rival's"): PositionCreature => {
			const view = prepare(entry.record, site, (site as any).world, entry.sentIndex, { rules: state.rules });
			return {
				name: entry.record.name || entry.record.species,
				species: entry.record.species,
				side,
				role: String(view.role),
				hold: roundTo(view.hold),
				speed: roundTo(view.speed),
				attackPower: roundTo(view.blowMagnitude || 0),
				element: String((entry.record.element as any)?.primary || ''),
				strain: String(view.strainLevel),
				home: !!view.isHome,
				traits: view.traitKeywords || [],
				hidden: !!entry.hidden,
			};
		};

		const creatures = [
			...entriesA.map((e: any) => describe(e, 'yours')),
			...entriesB.map((e: any) => describe(e, "the rival's")),
		];
		const holdYours = roundTo(creatures.filter((c) => c.side === 'yours').reduce((s, c) => s + c.hold, 0));
		const holdRival = roundTo(creatures.filter((c) => c.side !== 'yours').reduce((s, c) => s + c.hold, 0));
		deployTotals.set(site.id, { yours: holdYours, rival: holdRival });

		shots.push({
			id: `${state.seed}-f${frame.index}-s${siteIndex}`,
			siteId: site.id,
			world: String((site as any).world?.planet || ''),
			site: String((site as any).name || ''),
			environment: `${(site as any).medium || 'gas'}, ${(site as any).temperatureC ? `${(site as any).temperatureC.low} to ${(site as any).temperatureC.high} C` : 'unstated'}`,
			creatures,
			holdYours,
			holdRival,
			question: 'After the Clash, who holds this world?',
		});
	});
	return shots.length ? { frameIndex: frame.index, shots, deployTotals } : null;
}

// ---------------------------------------------------------------------------

export function buildPositions(seed: string | number, count: number): { positions: Position[]; answers: Answer[] } {
	const out = { positions: [] as Position[], answers: [] as Answer[] };
	const pool = buildExpeditionPool(seed, 120);
	const worlds = getWorlds();
	let i = 0;
	while (out.positions.length < count && i < count * 4) {
		collectFromMatch(`${seed}-pred-${i}`, pool, worlds, out);
		i++;
	}
	/*
		Positions and answers are built in lockstep and MUST be cut in lockstep: slicing only
		the positions leaves the key describing worlds nobody was asked about, which silently
		scores every prediction against the wrong world. Found by the first real run of the
		gauge (12 asked, 15 in the key, three phantom misses).
	*/
	out.positions = out.positions.slice(0, count);
	out.answers = out.answers.slice(0, count);
	return out;
}

const isMain = typeof process !== 'undefined' && !process.env.VITEST_WORKER_ID;
if (isMain) {
	const args = process.argv.slice(2);
	const flag = (name: string, fallback: string) => {
		const hit = args.find((a) => a.startsWith(`--${name}=`));
		return hit ? hit.split('=')[1] : fallback;
	};
	const count = parseInt(flag('count', '20'), 10);
	const seed = flag('seed', '7');
	const built = buildPositions(seed, count);
	const jsonPath = args.find((a) => a.startsWith('--json='));

	console.log(`=== Comprehension by prediction: ${built.positions.length} positions, seed ${seed} ===\n`);
	built.positions.forEach((p, i) => {
		console.log(`--- Position ${i + 1} (${p.id}) ---`);
		console.log(`${p.world}, ${p.site} (${p.environment})`);
		p.creatures.forEach((c) => {
			const marks = [c.home ? 'home ground' : null, c.strain !== 'none' ? c.strain : null, c.hidden ? 'arrived hidden' : null]
				.filter(Boolean).join(', ');
			console.log(`  ${c.side === 'yours' ? 'YOURS ' : 'RIVAL '} ${c.name} (${c.species}, ${c.element}) ${c.role}, hold ${c.hold}, speed ${c.speed}, attack ${c.attackPower}${marks ? ` [${marks}]` : ''}${c.traits.length ? ` traits: ${c.traits.join(', ')}` : ''}`);
		});
		console.log(`  totals at the end of Deploy: yours ${p.holdYours}, the rival's ${p.holdRival}`);
		console.log(`  Q: ${p.question}\n`);
	});

	if (jsonPath) {
		fs.writeFileSync(jsonPath.split('=')[1], JSON.stringify(built, null, 2));
		console.log(`wrote ${jsonPath.split('=')[1]}`);
	}

	/*
		--answers prints the key. It is for SCORING a reader who has already answered, never
		for the reader: the whole gauge is worthless if the answers travel with the
		questions. --score=a,b,c,... scores a comma-separated list of predictions
		("yours" / "rival" / "tie", in position order) and prints the accuracy, which is the
		affordance gauge the brief asks to be logged per pass.
	*/
	if (args.includes('--answers')) {
		console.log('\n=== ANSWER KEY (for scoring only) ===');
		built.answers.forEach((a, i) => {
			console.log(`${i + 1}. ${a.winner}${a.resolutionFlipped ? '  <- the Clash changed the leader' : ''}`);
		});
	}

	const scoreArg = args.find((a) => a.startsWith('--score='));
	if (scoreArg) {
		const given = scoreArg.split('=')[1].split(',').map((v) => v.trim().toLowerCase());
		const normalize = (v: string) => (v.startsWith('y') ? 'yours' : v.startsWith('r') ? "the rival's" : 'the Court (a tie)');
		let right = 0;
		let flippedRight = 0;
		let flippedTotal = 0;
		built.answers.forEach((a, i) => {
			const guess = given[i] ? normalize(given[i]) : '(none)';
			const hit = guess === a.winner;
			if (hit) right++;
			if (a.resolutionFlipped) {
				flippedTotal++;
				if (hit) flippedRight++;
			}
			console.log(`${i + 1}. predicted ${guess}, actual ${a.winner} ${hit ? 'HIT' : 'MISS'}${a.resolutionFlipped ? ' (the Clash changed the leader)' : ''}`);
		});
		const n = built.answers.length;
		console.log(`\nAFFORDANCE GAUGE: ${right} of ${n} correct (${((right / n) * 100).toFixed(0)}%)`);
		if (flippedTotal) {
			console.log(`on the ${flippedTotal} worlds where the Clash changed the leader: ${flippedRight} of ${flippedTotal} correct`);
		}
		console.log('A reader who can only read the deploy totals scores about the share of worlds the Clash does not flip; beating that is the evidence the table explains the Clash.');
	}
}
