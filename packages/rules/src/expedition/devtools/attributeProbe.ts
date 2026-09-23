/*
	attributeProbe (pass 48): what one attribute is worth, causally.

	The validation report's per-attribute lanes compare creatures the bot CHOSE to send where
	it chose to send them, so they carry the bot's selection (pass 46 read vitality at -16.9
	points there while it is worth +4.7). This asks the question directly: side A's creatures
	get +BOOST in one attribute and nothing else changes, proctor against proctor.

		node apps/web/scripts/runNode.cjs packages/rules/src/expedition/devtools/attributeProbe.ts 			--matches=1000 --seeds=7,13,21 --boost=15 --indep=1 --only=none,vitality,agility 			--rules="magnitudeScale=1.8"

	Set VITEST_WORKER_ID=probe in the environment, or importing the validation module runs its CLI.
	--indep: B is a different squad from the same pool (real play); without it B is A's own
	squad under ids of its own, which makes speed ties common and inflates what speed buys.
	Read each attribute against the 'none' row of the same run.
*/
import { buildExpeditionPool } from '../roster.ts';
import { playMatch, PROCTOR_POLICY, parseRules } from './expeditionValidation.ts';

const ATTRS = ['none', 'vitality', 'resilience', 'endurance', 'strength', 'intelligence', 'agility', 'reflex', 'willpower', 'charisma', 'instinct'];
const args: Record<string, string> = Object.fromEntries(process.argv.slice(2).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.replace(/^--/, ''), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const MATCHES = Number(args.matches || 400);
const BOOST = Number(args.boost || 15);
const only = args.only ? String(args.only).split(',') : ATTRS;
const seeds = String(args.seeds || '7').split(',');
const rules = args.rules ? parseRules(String(args.rules)) : undefined;
console.log('rules', JSON.stringify(rules || {}));

function shuffle<T>(arr: T[], seed: number): T[] {
	const a = arr.slice();
	let s = seed >>> 0;
	for (let i = a.length - 1; i > 0; i--) {
		s = (s * 1664525 + 1013904223) >>> 0;
		const j = s % (i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

for (const attr of only) {
	let wins = 0; let n = 0; let errors = 0; let downs = 0;
	for (const seed of seeds) {
		const pool = buildExpeditionPool(seed, 87);
		for (let i = 0; i < MATCHES; i++) {
			const dealt = shuffle(pool, i * 7919 + 17);
			const base = dealt.slice(0, 12);
			const rosterA = base.map((r: any) => (attr === 'none' ? r : { ...r, attributes: { ...r.attributes, [attr]: Math.min(100, r.attributes[attr] + BOOST) } }));
			// --indep: B is a different squad from the same pool, as in real play
			const rosterB = args.indep ? dealt.slice(12, 24) : base.map((r: any) => ({ ...r, id: `${r.id}~B` }));
			const res = playMatch({ matchSeed: `${seed}-probe-${i}`, rosterA, rosterB, policyA: PROCTOR_POLICY.send, policyB: PROCTOR_POLICY.send, rules });
			if (res.error) { errors++; continue; }
			n++;
			if (res.winner === 'A') wins++;
			downs += res.downs || 0;
		}
	}
	const p = wins / n;
	console.log(`${attr.padEnd(13)} A wins ${(100 * p).toFixed(1)}% +/- ${(196 * Math.sqrt(p * (1 - p) / n)).toFixed(1)} (n=${n}) downs/match ${(downs / n).toFixed(2)}${errors ? ` errors ${errors}` : ''}`);
}
