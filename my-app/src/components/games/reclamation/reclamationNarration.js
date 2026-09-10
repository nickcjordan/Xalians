import { speciesDisplayName, getSpeciesTemplate } from '@xalians/rules/generator';

/*
	Reclamation - plain-sentence narration of the engine's resolution log.

	Pure functions only (no React, no engine imports beyond the species vocabulary), so
	the sentences can be unit-tested directly. See __tests__/reclamationNarration.test.js.

	THE BASE (docs/design/reclamation-base-redesign.md, 2026-09-09), with Pass 2's
	vocabulary (assumption 17): the table says attack and power, sweep, hurt and downed.
	Every creature is a hold and one role, and the log the table narrates carries these
	resolution events, each with a `type`:

		attack  { recordId, role: 'strike' | 'sweep', site, target, power, remaining,
		          outcome: 'hurt' | 'downed' | 'cancelled' | 'lapsed' | 'no-target',
		          hidden, cancelled }
		sweep   { recordId, role: 'sweep', site, power, hitCount, hidden, cancelled,
		          cancelledAgainst }   - followed by one `attack` per victim
		shield  { recordId, site, cancelled, amount }
		recover { recordId, site, bolster, amount, remaining }  - the Ruling's first step

	plus the structural 'judge' and 'swift-move' events.

	An attack whose outcome is 'cancelled' is narrated by the SHIELD event that cancelled
	it ("Yetimoth shields: Voltish's attack of 4 is cancelled"), so narrateEvent returns
	null for it rather than saying the same thing twice. Every other event gives exactly
	one sentence.
*/

// Display name for a record: the provisional roller gives records no `name`, only a
// `species` and an id, so the table calls a creature by its species. Where two creatures
// of the same species are on the table at once the caller supplies a disambiguator.
export function speciesLabel(record) {
	// the ratified species name from the template (speciesRecords.json); a record that
	// carries no known species falls back to a capitalized form of what it has
	if (!record) {
		return 'a creature';
	}
	if (record.species && getSpeciesTemplate(record.species)) {
		return speciesDisplayName(record.species);
	}
	const raw = record.name || record.species || record.id || 'creature';
	return String(raw)
		.split(/[\s_-]+/)
		.map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(' ');
}

export function classifyEvent(event) {
	if (!event) {
		return 'unknown';
	}
	if (event.type) {
		return event.type;
	}
	return 'unknown';
}

// hold values are fractional; the table prints them to one decimal, dropping a trailing .0
export function formatHold(value) {
	if (typeof value !== 'number' || !isFinite(value)) {
		return '?';
	}
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/*
	The role, as the one sentence the plinth, the bench, the dossier and the ghost preview
	all print (the base redesign's "Interface consequences": one sentence per rule). N is
	the creature's own attack power, before the element matchup against any one target.
*/
export function roleSentence(role, attackPower) {
	const n = typeof attackPower === 'number' ? formatHold(attackPower) : '?';
	switch (role) {
		case 'strike': return `Attacks one enemy here for ${n}`;
		case 'sweep': return `Sweeps everyone here for ${n}`;
		case 'bolster': return 'Bolsters allies here against the world, and recovers what they lose';
		case 'shield': return 'Shields allies here from the largest attack';
		default: return 'Stands here and throws nothing';
	}
}

// the word for the role, where a sentence is too much (a chip, a title attribute)
export function roleWord(role) {
	switch (role) {
		case 'strike': return 'strike';
		case 'sweep': return 'sweep';
		case 'bolster': return 'bolster';
		case 'shield': return 'shield';
		default: return 'none';
	}
}

// the verb a landing attack reads with: a strike is aimed, a sweep catches whatever
// happens to be standing at the world
function attackVerb(role) {
	return role === 'sweep' ? 'catches' : 'strikes';
}

/*
	narrateEvent(event, ctx) -> one plain sentence, or null for an event the table says
	elsewhere.

	ctx: { actorName, targetName, siteName, worldName }
	Every field is optional; the sentence degrades rather than printing "undefined".
*/
export function narrateEvent(event, ctx = {}) {
	if (!event) {
		return null;
	}
	const actor = ctx.actorName || 'A creature';
	const target = ctx.targetName || 'its target';
	// a hurt creature attacks for less (assumption 18); the sentence names the condition,
	// since the number it carries has already been scaled by it
	const condition = ctx.actorHurt && event.hidden ? ', from hiding and hurt,'
		: ctx.actorHurt ? ', hurt,'
			: event.hidden ? ', from hiding,' : '';
	if (event.type === 'shield') {
		if (!event.cancelled) {
			return `${actor} shields, and nothing is thrown at its side.`;
		}
		const blocked = ctx.targetName || 'the attack';
		return `${actor} shields: ${blocked}'s attack of ${formatHold(event.amount)} is cancelled.`;
	}
	if (event.type === 'recover') {
		const under = ctx.bolsterName ? `under ${ctx.bolsterName}'s bolster` : 'under a bolster';
		return `${actor} recovers ${formatHold(event.amount)} ${under}; stands at ${formatHold(event.remaining)}.`;
	}
	if (event.type === 'sweep') {
		const where = ctx.worldName || ctx.siteName || 'the world';
		const n = typeof event.hitCount === 'number' ? event.hitCount : 0;
		// a sweep standing alone at a world still declares, and "catching 0 creatures" reads
		// as a non-event; say what actually happened instead
		if (n === 0) {
			return `${actor}${condition} sweeps over ${where}, and catches nothing.`;
		}
		return `${actor}${condition} sweeps over ${where} for ${formatHold(event.power)} each, catching ${n} creature${n === 1 ? '' : 's'}.`;
	}
	if (event.type !== 'attack') {
		return null;
	}
	switch (event.outcome) {
		case 'downed':
			return `${actor}${condition} ${attackVerb(event.role)} ${target} for ${formatHold(event.power)} and downs ${target}.`;
		case 'hurt':
			return `${actor}${condition} ${attackVerb(event.role)} ${target} for ${formatHold(event.power)}; ${target} stands at ${formatHold(event.remaining)}.`;
		case 'cancelled':
			// said by the shield event that cancelled it
			return null;
		case 'lapsed':
			return `${actor}'s attack lapses, downed first.`;
		case 'no-target':
			return `${actor}${condition} finds no target.`;
		default:
			return `${actor} ${attackVerb(event.role)} ${target}.`;
	}
}

/*
	cueForEvent(event) -> the console cue an event plays, or null. Kept beside the
	sentences because it reads the same outcomes they do.
*/
export function cueForEvent(event) {
	if (!event || event.type !== 'attack') {
		return null;
	}
	// the cue ids are the console's own and do not change with the table's vocabulary
	if (event.outcome === 'downed') {
		return { name: 'rout' };
	}
	if (event.outcome === 'hurt') {
		return { name: 'strike', opts: { magnitude: 0.8 } };
	}
	return null;
}

/*
	A swift creature moving during Deploy (assumption 20, which replaced the vanguard
	fall-back): "Kosanos moves from Zolton to Stonera."
*/
export function narrateSwiftMove(event, ctx = {}) {
	const actor = ctx.actorName || 'A swift creature';
	const from = ctx.fromSiteName || 'its world';
	const to = ctx.toSiteName || 'another world';
	return `${actor} moves from ${from} to ${to}.`;
}

export function narrateSend(ctx = {}) {
	const who = ctx.you ? 'You send' : 'The rival sends';
	if (ctx.hidden && !ctx.you) {
		return 'The rival sends something, hidden.';
	}
	const name = ctx.actorName || 'a creature';
	const site = ctx.siteName || 'a site';
	const hiddenTag = ctx.hidden ? ', hidden' : '';
	return `${who} ${name} to ${site}${hiddenTag}.`;
}

export function narratePass(ctx = {}) {
	return ctx.you ? 'You pass. You are out of this round’s deploy.' : 'The rival passes for this round.';
}

/*
	THE STAKE (docs/design/reclamation-base-redesign.md assumption 22, Pass 3). A staked
	world counts two toward the Charter for whoever holds it, three when both handlers
	staked the same one. The table says the count in words, never as a multiplier, so the
	sentence reads the same in the log, the callout and the Ruling.
*/
export function countWord(countedValue) {
	return countedValue >= 3 ? 'three' : 'two';
}

/*
	narrateStake(ctx) -> "You stake Zolton: it counts two." / "The rival stakes Zolton:
	it counts two." ctx: { you, worldName, countedValue }
*/
export function narrateStake(ctx = {}) {
	const who = ctx.you ? 'You stake' : 'The rival stakes';
	const where = ctx.worldName || 'a world';
	return `${who} ${where}: it counts ${countWord(ctx.countedValue)}.`;
}

/*
	narrateJudge(event, ctx) -> [sentence, ...] one per site plus a summary line.
	ctx: { siteNames: {siteId: name}, counted: {siteId: countedValue}, you: 'A'|'B' }

	A staked world names its count in the ruling sentence itself ("Zolton (counting two)
	is yours"), since that is the moment the extra count is actually taken.
*/
export function narrateJudge(event, ctx = {}) {
	const you = ctx.you || 'A';
	const names = ctx.siteNames || {};
	const counted = ctx.counted || {};
	const lines = [];
	Object.keys(event.siteResults || {}).forEach((siteId) => {
		const r = event.siteResults[siteId];
		// the engine's own arithmetic travels on the judge event; ctx.counted is the
		// fallback for a caller holding it separately
		const value = typeof r.countedValue === 'number' ? r.countedValue : (counted[siteId] || 1);
		const base = names[siteId] || siteId;
		const name = value > 1 ? `${base} (counting ${countWord(value)})` : base;
		const a = formatHold(r.holdA);
		const b = formatHold(r.holdB);
		const mine = you === 'A' ? a : b;
		const theirs = you === 'A' ? b : a;
		if (!r.winner) {
			lines.push(`${name} reverts to the Court, ${mine} against ${theirs}.`);
		} else if (r.winner === you) {
			lines.push(`${name} is yours, ${mine} against ${theirs}.`);
		} else {
			lines.push(`${name} goes to the rival, ${theirs} against ${mine}.`);
		}
	});
	return lines;
}

export function narrateMatchEnd(ctx = {}) {
	const { winner, you, sitesYou, sitesThem, reason } = ctx;
	const why = reason === 'clinched'
		? 'clinched at five worlds'
		: reason === 'tiebreak'
			? 'settled on the tiebreak'
			: 'after the third frame';
	const sites = (n) => `${n} world${n === 1 ? '' : 's'}`;
	if (winner === you) {
		return `You take the Charter, ${sites(sitesYou)} to ${sitesThem}, ${why}.`;
	}
	if (winner) {
		return `The rival takes the Charter, ${sites(sitesThem)} to ${sitesYou}, ${why}.`;
	}
	return `The Proving ends level, ${sitesYou} to ${sitesThem}.`;
}
