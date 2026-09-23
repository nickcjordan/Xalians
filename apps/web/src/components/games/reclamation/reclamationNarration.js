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
		pin     { recordId, target, site }   - PASS 18: a restraining attack landed, and its
		        target does not swing this Clash if it had not swung already

	plus the structural 'judge' and 'swift-move' events.

	PASS 18. An attack whose outcome is 'pinned' is one the pin took, and it gets its own
	sentence rather than silence: a swing that simply disappears is the kind of thing that
	makes a player distrust the table. The pin that caused it also speaks, so the cause is on
	screen before the effect.

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

/*
	PASS 38. The log prints the numbers the board prints: whole numbers. A blind critic read
	"stands at 6.2" in the log beside a 6 on the figure, and "12.3 against 0" beside a 12 on
	the world, three rounds running, and stopped trusting either. The tenth is kept only where
	rounding would make two different holds read the same (a close Ruling).
*/
export function wholeOrTenths(a, b) {
	const ra = Math.round(a);
	const rb = Math.round(b);
	return ra === rb && Math.abs(a - b) >= 0.05 ? [formatHold(a), formatHold(b)] : [String(ra), String(rb)];
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
	PASS 28. A blow, as a whole number.

	Hold is fractional and the inspector must say so, because a handler comparing two
	sends needs the tenth. The flash that pops over a creature as a blow lands is not
	that surface: it is punctuation, read in under half a second while the figure is
	still moving, and "-1.1" there costs a character of legibility for a tenth nobody
	reads at that speed. A blow measured live came back as "-6" and "-1.1" in the same
	round, which is the mixed-precision look a critic named as decimals everywhere.

	So the flash rounds, and never to nothing: a blow that lands took something, so
	anything above zero prints at least 1 rather than collapsing to "-0".
*/
/*
	PASS 30. A hold, as the Charter and the table print it.

	Hold is fractional and the inspector must say so, because a handler comparing two
	possible sends needs the tenth. Every OTHER surface is a readout, not a calculator: a
	blind critic called the tenths "a precision the player can never act on" and the
	Charter "a wall of fifteen decimals in one column", which is literally what it is -
	three worlds times two sides plus every creature's own hold, each carrying a ".7" that
	changes no decision.

	So a displayed hold rounds. It differs from formatBlow in one way that matters: a hold
	of zero is a real and important state (a creature is down, a side holds nothing), so
	this prints "0" rather than clamping up to 1.
*/
export function formatHoldShown(value) {
	if (typeof value !== 'number' || !isFinite(value)) {
		return '?';
	}
	return String(Math.round(value));
}

export function formatBlow(value) {
	if (typeof value !== 'number' || !isFinite(value)) {
		return '?';
	}
	const magnitude = Math.abs(value);
	if (magnitude === 0) {
		return '0';
	}
	return String(Math.max(1, Math.round(magnitude)));
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
		case 'sweep': return `Sweeps every other creature here, yours too, for ${n}`;
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
	return role === 'sweep' ? 'hits' : 'strikes';
}

/*
	narrateEvent(event, ctx) -> one plain sentence, or null for an event the table says
	elsewhere.

	ctx: { actorName, targetName, siteName, worldName }
	Every field is optional; the sentence degrades rather than printing "undefined".
*/
/*
	PASS 45. A creature left with under half a point of hold rounds to 0, and "stands at 0"
	beside a creature still standing read as a bug (seen in a Clash on seed 7). Past the
	decimal, the honest whole-number word is that it barely stands.
*/
function standsAt(name, remaining) {
	return formatHoldShown(remaining) === '0' ? `${name} barely stands` : `${name} stands at ${formatHoldShown(remaining)}`;
}

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
		return `${actor} blocks ${blocked}'s attack of ${formatHoldShown(event.amount)}.`;
	}
	if (event.type === 'recover') {
		const under = ctx.bolsterName ? `under ${ctx.bolsterName}'s bolster` : 'under a bolster';
		return `${actor} recovers ${formatHoldShown(event.amount)} ${under}; ${standsAt('', event.remaining).trim()}.`;
	}
	if (event.type === 'pin') {
		/*
			PASS 18 (assumption: pinning, expeditionInterpretation PINNING). A restraining
			attack takes its target's swing for this Clash. The sentence says what happened and
			what it costs, in that order, because the player is watching a creature they
			expected to attack do nothing.
		*/
		const held = ctx.targetName || 'its target';
		return `${actor} restrains ${held}: ${held} does not swing this Clash.`;
	}
	if (event.type === 'sweep') {
		const where = ctx.worldName || ctx.siteName || 'the world';
		const n = typeof event.hitCount === 'number' ? event.hitCount : 0;
		// a sweep standing alone at a world still declares, and "catching 0 creatures" reads
		// as a non-event; say what actually happened instead
		if (n === 0) {
			return `${actor}${condition} sweeps over ${where}, and hits nothing.`;
		}
		return `${actor}${condition} sweeps over ${where} for ${formatHoldShown(event.power)} each, catching ${n} creature${n === 1 ? '' : 's'}.`;
	}
	if (event.type !== 'attack') {
		return null;
	}
	switch (event.outcome) {
		case 'downed':
			return `${actor}${condition} ${attackVerb(event.role)} ${target} for ${formatHoldShown(event.power)} and downs ${target}.`;
		case 'hurt':
			return `${actor}${condition} ${attackVerb(event.role)} ${target} for ${formatHoldShown(event.power)}; ${standsAt(target, event.remaining)}.`;
		case 'cancelled':
			// said by the shield event that cancelled it
			return null;
		case 'lapsed':
			return `${actor} falls before it can attack.`;
		case 'pinned':
			// PASS 18: said by the victim, so the log reads in the order the table saw it -
			// the pin lands, then the swing it took does not happen
			return `${actor} is restrained, and does not swing.`;
		case 'no-target':
			return `${actor}${condition} finds no rival to strike.`;
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
	return ctx.you ? 'You pass. You are out of this round.' : 'The rival passes for this round.';
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
		const [a, b] = wholeOrTenths(r.holdA, r.holdB);
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
	return `The game ends level, ${sitesYou} to ${sitesThem}.`;
}

/*
	PASS 45. THE CLASH ON THE WORLD. captionEvent(event, ctx) -> an array of parts, each a
	string or { name, seat }, or null when the event has nothing to show.

	The Clash was told in a sentence in the top bar, a screen away from the creatures doing
	it; the ownership log's open item 2 since pass 28 ("paperwork by definition"). The caption
	sits on the clashing world itself, between the two ranks. It names creatures bare,
	because the ranks already say whose is whose and the caption colors each name by side;
	and it is short enough for a phone column under a hundred pixels wide. The full
	sentence stays in the log.

	ctx: actor, target, bolster as { name, seat } (target is the blocked attacker for a shield).
*/
export function captionEvent(event, ctx = {}) {
	if (!event) {
		return null;
	}
	const actor = ctx.actor || { name: 'A creature', seat: null };
	const target = ctx.target || { name: 'its target', seat: null };
	const left = (remaining) => (formatHoldShown(remaining) === '0' ? 'barely standing' : `${formatHoldShown(remaining)} left`);
	switch (event.type) {
		case 'sweep': {
			const n = typeof event.hitCount === 'number' ? event.hitCount : 0;
			return n === 0 ? [actor, ' sweeps and hits nothing'] : [actor, ` sweeps: −${formatHoldShown(event.power)} to each of ${n}`];
		}
		case 'shield':
			return event.cancelled ? [actor, ' blocks ', target, `'s ${formatHoldShown(event.amount)}`] : [actor, ' shields; nothing comes'];
		case 'recover':
			return ctx.bolster
				? [ctx.bolster, ' gives ', actor, ` ${formatHoldShown(event.amount)} back`]
				: [actor, ` recovers ${formatHoldShown(event.amount)}`];
		case 'pin':
			return [actor, ' restrains ', target];
		case 'attack': {
			// pass 47: a sweep catching its own side says so, or two names in one color read as a mistake
			const own = actor.seat && target.seat && actor.seat === target.seat ? 'its own ' : '';
			switch (event.outcome) {
				case 'downed':
					return [actor, ` downs ${own}`, target];
				case 'hurt':
					return [actor, ` ${attackVerb(event.role)} ${own}`, target, `: −${formatHoldShown(event.power)}, ${left(event.remaining)}`];
				case 'lapsed':
					return [actor, ' falls before it acts'];
				case 'pinned':
					return [actor, ' is restrained'];
				case 'no-target':
					return [actor, ' finds no rival to strike'];
				default:
					return null;
			}
		}
		default:
			return null;
	}
}

/*
	PASS 49. THE RULING SAYS WHY. verdictOf(result, you, planet) -> { who, text, planet,
	unopposed, margin } for one world of the judge event.

	A blind critic read three Rulings in a row as "1 world yours, 2 worlds the rival's" and
	called the rounds identical. What differed was the why: a world won by 46, two given
	away for nothing. The stamp now carries it ("rival's, unopposed", "yours by 12"), and
	rulingLine says the round in those terms.
*/
// `sentBy` (optional): how many creatures each seat had at the world when the Clash began.
// The judge's own entries leave out the downed, so a world whose defenders all fell would
// otherwise read as unopposed.
export function verdictOf(result, you, planet, sentBy) {
	const r = result || {};
	if (!r.winner) {
		return { who: 'court', text: 'tied', planet, unopposed: false, margin: 0 };
	}
	const mine = r.winner === you;
	const loser = r.winner === 'A' ? 'B' : 'A';
	const loserSent = sentBy && typeof sentBy[loser] === 'number' ? sentBy[loser] : ((r.entries && r.entries[loser]) || []).length;
	const unopposed = loserSent === 0;
	const margin = Math.abs((r.holdA || 0) - (r.holdB || 0));
	const whose = mine ? 'yours' : 'rival’s';
	/*
		pass 50: the margin is the difference of the numbers the board prints. A critic read
		"9 to 6" on the tally and "rival's by 2" on the stamp (holds that rounded apart); when
		the printed wholes tie, the tally shows tenths and so does the margin.
	*/
	const [shownA, shownB] = wholeOrTenths(r.holdA || 0, r.holdB || 0);
	const shownMargin = Math.round(Math.abs(Number(shownA) - Number(shownB)) * 10) / 10;
	return {
		who: mine ? 'yours' : 'theirs',
		text: unopposed ? `${whose}, unopposed` : `${whose} by ${formatHold(shownMargin)}`,
		planet,
		unopposed,
		margin,
	};
}

function joinNames(names) {
	return names.length <= 1 ? (names[0] || '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// "Round 2: Endessa yours by 46; Saiphus and Luminax the rival's, unopposed."
export function rulingLine(frameIndex, verdictList) {
	const list = (verdictList || []).filter(Boolean);
	if (!list.length) {
		return `Round ${frameIndex + 1} is ruled.`;
	}
	const groups = [];
	const add = (key, label, planet) => {
		let g = groups.find((x) => x.key === key);
		if (!g) {
			g = { key, label, names: [] };
			groups.push(g);
		}
		g.names.push(planet);
	};
	list.forEach((v) => {
		if (v.who === 'court') {
			add('tied', 'tied', v.planet);
		} else if (v.unopposed) {
			add(`${v.who}-free`, v.who === 'yours' ? 'yours, unopposed' : 'the rival’s, unopposed', v.planet);
		} else {
			// contested worlds keep their own margins, one clause each
			add(`${v.who}-${v.planet}`, v.who === 'yours' ? `yours by ${v.text.replace(/^.* by /, '')}` : `the rival’s by ${v.text.replace(/^.* by /, '')}`, v.planet);
		}
	});
	return `Round ${frameIndex + 1}: ${groups.map((g) => `${joinNames(g.names)} ${g.label}`).join('; ')}.`;
}

