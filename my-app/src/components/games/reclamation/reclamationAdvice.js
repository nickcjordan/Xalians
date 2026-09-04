import { chooseSend } from '../../../gameplay/expedition/expeditionBot';
import { prepare } from '../../../gameplay/expedition/creatureOnTable';
import { speciesLabel, formatHold } from './reclamationNarration';
import { siteHoldTotal } from './reclamationPreview';

/*
	Advice for simple mode: one recommended move per deploy turn, with the reason in a
	sentence.

	The recommendation is the bot's own choice for the handler's seat (expeditionBot
	chooseSend, run without its randomizer so the same board always gives the same
	advice). The reason is derived from the engine's numbers for that send, never from
	the bot's internal score, so what the sentence says is what the table will show.
*/

const PASS_REASONS = {
	'holding-majority': 'You lead on two worlds and the rival has passed. Save the rest of your roster for the frames to come.',
	'saving-the-roster': 'You have spent your share of creatures this round. Keep the rest for what comes next.',
	'nothing-to-gain': 'Nothing you could send would change who holds a world in this frame.',
	'no-sendable-creatures': 'You have nothing left to send.',
	'already-passed': 'You have passed for this round.',
	'no-candidates': 'There is nothing to send.',
};

function siteOf(view, siteId) {
	return view.frame.sites.find((s) => s.id === siteId);
}

function sendReason(view, record, site, you) {
	const opponent = you === 'A' ? 'B' : 'A';
	const prepared = prepare(record, site, site.world, view.players[you].sentCount);
	const mine = siteHoldTotal(view, site.id, you);
	const theirs = siteHoldTotal(view, site.id, opponent);
	const margin = mine - theirs;
	const name = speciesLabel(record);
	const hold = formatHold(prepared.hold);
	let text;
	if (mine === 0 && theirs === 0) {
		text = `${name} holds ${hold} at ${site.name}, which nobody has claimed yet.`;
	} else if (margin < 0 && prepared.hold > -margin) {
		text = `${name} takes the lead at ${site.name}: the rival leads by ${formatHold(-margin)} and it holds ${hold}.`;
	} else if (margin < 0) {
		text = `${name} narrows the gap at ${site.name}, where the rival leads by ${formatHold(-margin)}; it holds ${hold} there.`;
	} else if (theirs === 0) {
		text = `${name} adds ${hold} to ${site.name}, which you already hold unopposed.`;
	} else {
		text = `${name} secures ${site.name}, where you lead by ${formatHold(margin)}, adding ${hold}.`;
	}
	if (prepared.isHome) {
		text += ' It is on home ground there.';
	} else if (prepared.strainLevel === 'severe') {
		text += ' It is severely strained there, but nothing better is on offer.';
	} else if (prepared.strainLevel === 'strained') {
		text += ' It is strained there.';
	}
	return text;
}

/*
	recommendSend(view, roster, you) -> {
		type: 'send' | 'pass' | 'relocate' | 'wait',
		recordId?, siteId?, hidden?, label, reason,
	}
*/
export function recommendSend(view, roster, you) {
	if (!view || view.phase !== 'deploy') {
		return null;
	}
	if (view.turn !== you) {
		return { type: 'wait', label: 'The rival is deciding', reason: '' };
	}
	const choice = chooseSend(view, roster, you, null);
	if (!choice) {
		return null;
	}
	if (choice.type === 'send') {
		const record = roster.find((r) => r.id === choice.recordId);
		const site = siteOf(view, choice.siteId);
		if (!record || !site) {
			return null;
		}
		return {
			type: 'send',
			recordId: record.id,
			siteId: site.id,
			hidden: !!choice.hidden,
			label: `Send ${speciesLabel(record)} to ${site.name}${choice.hidden ? ', hidden' : ''}`,
			reason: sendReason(view, record, site, you),
		};
	}
	if (choice.type === 'relocate') {
		const site = siteOf(view, choice.siteId);
		return {
			type: 'relocate',
			siteId: choice.siteId,
			label: `Fall back to ${site ? site.name : 'another site'}`,
			reason: 'Your first creature would do more at that site, and falling back costs no turn.',
		};
	}
	return {
		type: 'pass',
		label: 'Pass this round',
		reason: PASS_REASONS[choice.reason] || 'Passing is the better move here.',
	};
}
