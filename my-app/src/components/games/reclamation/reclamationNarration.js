import { speciesDisplayName, getSpeciesTemplate } from '../../../gameplay/generator/index.js';

/*
	Reclamation — plain-sentence narration of the engine's resolution log.

	Pure functions only (no React, no engine imports beyond constants), so the sentences
	can be unit-tested directly. See __tests__/reclamationNarration.test.js.

	ENGINE GAP (noted for the engine owner, worked around here): act events in
	expeditionRules.resolutionLog carry no `type` field — they are bare
	{recordId, action, target?, site?, outcome, hitCount?, toSite?} objects, while the
	structural events do carry one ('vanguard-relocate', 'judge'). classifyEvent() below
	therefore treats "has an `outcome` and no `type`" as an act event. Act events also
	carry no magnitude and no hold, so the narration cannot say "for 8" from the log
	alone; the numbers in the sentences come from a snapshot of the board taken before
	resolution (see buildActorIndex) and from the magnitude the UI recomputes with the
	engine's own creatureOnTable helpers.
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
	if (Object.prototype.hasOwnProperty.call(event, 'outcome')) {
		return 'act';
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

const ACT_VERB = {
	strike: 'strikes',
	crush: 'crushes',
	rake: 'rakes',
	lash: 'lashes',
	shove: 'shoves',
	snare: 'snares',
	drain: 'drains',
	ambush: 'ambushes',
	beam: 'beams',
	hurl: 'hurls at',
	burst: 'bursts over',
	spray: 'sprays',
	cloud: 'clouds',
	ward: 'wards',
	mend: 'mends',
	terrorize: 'terrorizes',
};

export function actVerb(action) {
	return ACT_VERB[action] || String(action || 'acts');
}

// The strike outcomes read best in the passive ("Vrix is struck by Rakh"), which needs a
// past participle rather than the third-person form ACT_VERB carries.
const ACT_PARTICIPLE = {
	strike: 'struck',
	crush: 'crushed',
	rake: 'raked',
	lash: 'lashed',
	drain: 'drained',
	ambush: 'ambushed',
	beam: 'beamed',
	hurl: 'hit',
	burst: 'caught in a burst',
	spray: 'sprayed',
	cloud: 'clouded',
};

export function actParticiple(action) {
	return ACT_PARTICIPLE[action] || 'hit';
}

/*
	narrateAct(event, ctx) -> one plain sentence.

	ctx: {
		actorName, actorHold, targetName, targetHold, siteName, magnitude,
	}
	Every field is optional; the sentence degrades rather than printing "undefined".
*/
export function narrateAct(event, ctx = {}) {
	const actor = ctx.actorName || 'A creature';
	const target = ctx.targetName || 'its target';
	const at = ctx.siteName ? ` at ${ctx.siteName}` : '';
	const forN = typeof ctx.magnitude === 'number' ? ` for ${ctx.magnitude}` : '';
	const targetHold = typeof ctx.targetHold === 'number' ? ` (hold ${formatHold(ctx.targetHold)})` : '';
	const verb = actVerb(event.action);

	switch (event.outcome) {
		case 'held':
			return `${actor} holds its ground${at}.`;
		case 'lost-act-snared':
			return `${actor} is snared and loses its act.`;
		case 'shrugged':
			return `${target}${targetHold} is ${actParticiple(event.action)} by ${actor}${forN} and shrugs it off.`;
		case 'staggered':
			return `${target}${targetHold} is ${actParticiple(event.action)} by ${actor}${forN} and is staggered.`;
		case 'routed':
			return `${target}${targetHold} is ${actParticiple(event.action)} by ${actor}${forN} and is routed.`;
		case 'shoved':
			return `${actor} shoves ${target}${targetHold} to another site.`;
		case 'snared':
			return `${actor} snares ${target}${targetHold}.`;
		case 'terrorized':
			return `${actor} terrorizes ${target}${targetHold}, which withdraws unsent.`;
		case 'warded-ally':
			return `${actor} wards ${target}.`;
		case 'warded-self':
			return `${actor} wards itself.`;
		case 'warded-absorbed':
			return `${actor} strikes ${target}, and the ward absorbs it entirely.`;
		case 'mended':
			return `${actor} mends ${target}, which recovers from its stagger.`;
		case 'no-effect':
			return `${actor} tries to mend, and finds nothing to mend.`;
		case 'anchored-immune':
			return `${target} is anchored and cannot be moved by ${actor}.`;
		case 'snared-immune':
			return `${target} is snared and ${actor} cannot move it.`;
		case 'area-struck': {
			const site = ctx.siteName ? ` ${ctx.siteName}` : '';
			const n = typeof event.hitCount === 'number' ? event.hitCount : 0;
			return `${actor} ${verb}${site}, catching ${n} creature${n === 1 ? '' : 's'} on both sides.`;
		}
		case 'no-target-held':
			return `${actor} finds nothing in reach and holds.`;
		case 'revealed':
			return `${actor} reveals itself.`;
		case 'target-already-gone':
			return `${actor} swings at a creature already driven off.`;
		default:
			return `${actor} ${verb} ${target}.`;
	}
}

export function narrateRelocate(event, ctx = {}) {
	const actor = ctx.actorName || 'The vanguard';
	const from = ctx.fromSiteName || 'its post';
	const to = ctx.toSiteName || 'another site';
	return `${actor} falls back from ${from} to ${to}.`;
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
	return ctx.you ? 'You pass. You are out of this world’s deploy.' : 'The rival passes for this world.';
}

/*
	narrateJudge(event, ctx) -> [sentence, ...] one per site plus a summary line.
	ctx: { siteNames: {siteId: name}, you: 'A'|'B' }
*/
export function narrateJudge(event, ctx = {}) {
	const you = ctx.you || 'A';
	const names = ctx.siteNames || {};
	const lines = [];
	Object.keys(event.siteResults || {}).forEach((siteId) => {
		const r = event.siteResults[siteId];
		const name = names[siteId] || siteId;
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
		? 'clinched at five sites'
		: reason === 'tiebreak'
			? 'settled on the tiebreak'
			: 'after the third world';
	const sites = (n) => `${n} site${n === 1 ? '' : 's'}`;
	if (winner === you) {
		return `You take the Charter, ${sites(sitesYou)} to ${sitesThem}, ${why}.`;
	}
	if (winner) {
		return `The rival takes the Charter, ${sites(sitesThem)} to ${sitesYou}, ${why}.`;
	}
	return `The expedition ends level, ${sitesYou} to ${sitesThem}.`;
}
