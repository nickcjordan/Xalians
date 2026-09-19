/*
	Expedition - how Reclamation reads a creature record.

	THIS IS THE SEAM. Every question the game asks of a record's capabilities is answered
	here and nowhere else, so that when the platform-side redesign finishes and a field
	changes name or shape, one file moves (docs/design/reclamation-ownership-brief.md, "The
	redesign is not finished": build the game's reading against a single adapter and expect
	to adjust it once).

	WHAT CHANGED IN PASS 7. The game used to ask `historicalCategory(ability)` at three
	points in creatureOnTable.ts. That function projects a schema 4 action back onto one of
	sixteen legacy action keys from its first effect and its delivery mode, and it is a
	lossy projection: measured over the seed-7 pool of 400 records (1384 actions), it
	collapses seven effect kinds onto keys the game then reads as damage or as nothing.
	431 of those actions (31 percent of the pool's repertoire) carry restrain, displace,
	transfer or suppress and were read as plain strikes. `spatial.range` was not read at
	all, though 251 actions have reach beyond contact.

	This module reads the record's own fields instead:

	- the PRIMARY EFFECT says what an action does (harm, protect, restore, restrain,
	  displace, transfer, suppress, ...),
	- `spatial.area` says whether it lands on one recipient or several,
	- `spatial.range` says how far it reaches,
	- `delivery` says how it gets there,
	- `targeting.relation` says whom it may touch.

	WHAT IT DELIBERATELY DOES NOT DO. It does not invent new table rules for the effect
	kinds the game has no mechanic for. Nick's ruling is that a creature carrying a
	capability a game does not support is explicitly UNAVAILABLE in that game rather than
	silently misread as something else, so an effect kind this game cannot express makes the
	action unusable (and, if that is the creature's only action, makes the creature
	unfieldable) rather than becoming a plain strike. `unsupportedReasons` carries the words
	the table shows.

	Pass 7 maps every kind the current content actually produces. The remaining kinds
	(enhance, reveal, status, remove) exist in the shared vocabulary but not yet on any
	generated record; they are listed as unsupported so that the day content produces one,
	the table says so out loud instead of guessing.
*/

import { recordActions, recordPassives, isSignatureAbility } from '@xalians/content/ability-compatibility';
import type { XalianRecord } from '@xalians/content/schema';

// ---------------------------------------------------------------------------
// what the game can express
// ---------------------------------------------------------------------------

/*
	The four things an action can BE at this table, read from its primary effect. These are
	the game's own vocabulary, not the registry's: the registry says "harm with an area
	footprint", the table says "a sweep".
*/
export const EFFECT_ROLE = {
	ATTACK: 'attack',
	SHIELD: 'shield',
	MEND: 'mend',
	UNSUPPORTED: 'unsupported',
} as const;
export type EffectRole = typeof EFFECT_ROLE[keyof typeof EFFECT_ROLE];

/*
	Effect kinds this game has a table rule for, and what that rule is.

	- harm     -> an attack. Area footprint decides strike against sweep.
	- protect  -> a shield. The role cancels an attack against its side.
	- restore  -> a mend. The role recovers what attacks took.
	- transfer -> an attack that feeds its user. The game has no separate drain rule, but a
	              transfer FROM the target IS harm to the target in every way the table can
	              see, so reading it as an attack is a true reading rather than a guess.
	              (The half that feeds the user is the lever pool's "drain"; until that
	              exists the reading is honest about taking the target's resource.)
	- restrain -> an attack. Restraining a creature at a sealed world, where nothing moves
	              between worlds and there is one Clash, has no separate expression, so the
	              game reads the harm it does in the exchange. This is the weakest of the
	              four and is the first candidate for a real rule (see the open items).
	- suppress -> an attack, on the same reasoning as restrain.
	- displace -> an attack. Shove was cut with cross-world reach (base redesign assumption
	              10); a push at a sealed world is force applied and nothing more.

	SUPPORTED_EFFECT_KINDS is therefore the set the table can speak. Everything outside it
	is unsupported BY NAME, which is the point: the words below are shown to the player.
*/
const ATTACK_KINDS = new Set(['harm', 'transfer', 'restrain', 'suppress', 'displace']);

export const UNSUPPORTED_EFFECT_WORDS: Record<string, string> = {
	enhance: 'strengthens another creature in a way this Proving does not model',
	reveal: 'uncovers what the frame already shows both handlers',
	status: 'applies a lasting condition the frame does not carry between worlds',
	remove: 'clears a condition the frame does not carry between worlds',
};

// ---------------------------------------------------------------------------
// reading one action
// ---------------------------------------------------------------------------

export interface ActionReading {
	key: string;
	name: string;
	instrument?: string;
	medium?: string;
	signature: boolean;
	/** what this action is at the table */
	role: EffectRole;
	/** the primary effect's kind, as the record spells it */
	effectKind: string;
	/** true when the action lands on more than its one recipient */
	area: boolean;
	/** contact | short | medium | long, or null for self-centered and body-centered acts */
	range: string | null;
	/** how far this action can reach, as a number so it can be compared and sorted */
	reach: number;
	/** delivery mode, straight off the record */
	delivery: string | null;
	/** whether the action may touch another creature at all */
	touchesOthers: boolean;
	/** set when role is UNSUPPORTED: the sentence the table shows */
	unsupportedReason?: string;
	/** the record's own intensity, 1 to 100 */
	intensity: number;
	/** which attribute powers this action (pass 2's attribute jobs, read from delivery) */
	governingAttribute: string | null;
}

/*
	WHICH ATTRIBUTE POWERS AN ACTION (pass 2, "every attribute a job": strength for contact
	attacks, intelligence for projected and mind attacks). That split used to be a table of
	sixteen legacy action keys; it is really a reading of `delivery.mode`, which the record
	states outright, so pass 7 reads it there instead of inferring it from a projection.

	contact delivery is the body reaching the target, so strength; everything thrown, beamed,
	streamed, pulsed, fielded or signalled crosses distance under control, so intelligence.
	A presence is powered by charisma wherever it appears (presenceScaleOf), so its own
	governing attribute is not read here.
*/
export const CONTACT_ATTRIBUTE = 'strength';
export const PROJECTED_ATTRIBUTE = 'intelligence';

export function governingAttributeFor(role: EffectRole, delivery: string | null): string | null {
	if (role !== EFFECT_ROLE.ATTACK) {
		return null;
	}
	return delivery === 'contact' ? CONTACT_ATTRIBUTE : PROJECTED_ATTRIBUTE;
}

/*
	REACH. `spatial.range` is one of contact/short/medium/long, and until pass 7 the game
	did not read it. It is graded here rather than thresholded so a later rule can use the
	distance itself; today the table only asks "can this reach past contact", because worlds
	are sealed and every creature at a world is in the same fight.

	A self-centered or body-centered capability has no remote range by schema rule (an area
	anchored on the creature, or targeting relation 'self'), which reads as reach 0 with a
	null range rather than as a missing field.
*/
export const REACH_BY_RANGE: Record<string, number> = {
	contact: 1,
	short: 2,
	medium: 3,
	long: 4,
};

function primaryEffectOf(ability: any): any {
	const effects = Array.isArray(ability?.effects) ? ability.effects : [];
	return effects.find((e: any) => e && e.emphasis === 'primary') || effects[0] || null;
}

/*
	readAction(ability) -> ActionReading

	Reads ONE capability off a record as the table sees it. Never throws: an action the
	game cannot express comes back with role 'unsupported' and the words to say so, which
	is the whole point of the ruling it implements.

	Schema 1 records (no `effects`, a bare `action` key) are still readable: the legacy key
	is mapped onto the same vocabulary so an archived record opens rather than erroring.
*/
export function readAction(ability: any): ActionReading {
	const name = String(ability?.name || ability?.key || 'Act');
	const key = String(ability?.key || name);
	const intensity = typeof ability?.intensity === 'number' ? ability.intensity : 50;
	const signature = isSignatureAbility(ability);
	const base = {
		key, name, signature, intensity,
		instrument: ability?.instrument,
		medium: ability?.medium,
	};

	// schema 1: a bare action key, no effects. Read through the legacy vocabulary so an
	// archived record still opens; the game's own reading below is what new records get.
	if (!ability?.effects && ability?.action) {
		const legacy = String(ability.action);
		const legacySweeps = ['burst', 'spray', 'cloud'];
		const legacyRole: EffectRole = legacy === 'ward' ? EFFECT_ROLE.SHIELD
			: legacy === 'mend' ? EFFECT_ROLE.MEND
				: EFFECT_ROLE.ATTACK;
		const legacyProjected = ['hurl', 'beam', 'spray', 'burst', 'cloud'].includes(legacy);
		return {
			...base,
			role: legacyRole,
			effectKind: legacy,
			area: legacySweeps.includes(legacy),
			range: 'contact',
			reach: 1,
			delivery: legacyProjected ? 'projectile' : 'contact',
			touchesOthers: true,
			governingAttribute: governingAttributeFor(legacyRole, legacyProjected ? 'projectile' : 'contact'),
		};
	}

	const effect = primaryEffectOf(ability);
	const spatial = ability?.spatial || {};
	const delivery = ability?.delivery?.mode ? String(ability.delivery.mode) : null;
	const relation = ability?.targeting?.relation ? String(ability.targeting.relation) : 'other';
	const range = spatial.range ? String(spatial.range) : null;
	const reading = {
		...base,
		effectKind: effect ? String(effect.kind) : 'none',
		area: !!spatial.area,
		range,
		reach: range ? (REACH_BY_RANGE[range] || 1) : 0,
		delivery,
		touchesOthers: relation !== 'self',
		governingAttribute: null as string | null,
	};

	if (!effect) {
		return { ...reading, role: EFFECT_ROLE.UNSUPPORTED, unsupportedReason: 'has no stated effect' };
	}
	const kind = String(effect.kind);

	if (kind === 'protect') {
		return { ...reading, role: EFFECT_ROLE.SHIELD };
	}
	if (kind === 'restore') {
		return { ...reading, role: EFFECT_ROLE.MEND };
	}
	if (ATTACK_KINDS.has(kind)) {
		// an attack that cannot touch another creature is not an attack at this table
		if (!reading.touchesOthers) {
			return {
				...reading,
				role: EFFECT_ROLE.UNSUPPORTED,
				unsupportedReason: 'only acts upon itself, which decides no world',
			};
		}
		return {
			...reading,
			role: EFFECT_ROLE.ATTACK,
			governingAttribute: governingAttributeFor(EFFECT_ROLE.ATTACK, delivery),
		};
	}
	return {
		...reading,
		role: EFFECT_ROLE.UNSUPPORTED,
		unsupportedReason: UNSUPPORTED_EFFECT_WORDS[kind] || `does something this Proving does not model (${kind})`,
	};
}

// ---------------------------------------------------------------------------
// reading a whole record
// ---------------------------------------------------------------------------

export interface RecordReading {
	actions: ActionReading[];
	passives: ActionReading[];
	/** actions this table can actually use */
	usable: ActionReading[];
	/** true when the creature has at least one action this table can express */
	fieldable: boolean;
	/** the words the table shows when it is not fieldable, or when parts of it are unread */
	unsupportedReasons: string[];
	/** the furthest any usable action reaches, 0 when nothing reaches past itself */
	reach: number;
	/** true when any usable action lands on more than one recipient */
	hasArea: boolean;
	/** true when any usable action shields, mends */
	hasShield: boolean;
	hasMend: boolean;
	hasAttack: boolean;
}

/*
	readRecord(record) -> RecordReading

	The game's whole view of what a creature can do. `fieldable` is the ruling: a creature
	with no action this table can express is shown as unavailable, with its reasons, rather
	than being given a silent minimum strike.

	PASSIVES are read and reported but carry no table rule yet. There are 13 on 400 records
	in the current content, all `protect`, so the cost of that is near zero today; reading
	them here means the day content leans on them, the number is already in front of us.
*/
export function readRecord(record: XalianRecord | null | undefined): RecordReading {
	const actions = (record ? recordActions(record as any) : []).map(readAction);
	const passives = (record ? recordPassives(record as any) : []).map(readAction);
	const usable = actions.filter((a) => a.role !== EFFECT_ROLE.UNSUPPORTED);
	const reasons: string[] = [];
	actions.forEach((a) => {
		if (a.role === EFFECT_ROLE.UNSUPPORTED && a.unsupportedReason) {
			reasons.push(`${a.name} ${a.unsupportedReason}`);
		}
	});
	return {
		actions,
		passives,
		usable,
		fieldable: usable.length > 0,
		unsupportedReasons: reasons,
		reach: usable.reduce((max, a) => (a.reach > max ? a.reach : max), 0),
		hasArea: usable.some((a) => a.area && a.role === EFFECT_ROLE.ATTACK),
		hasShield: usable.some((a) => a.role === EFFECT_ROLE.SHIELD),
		hasMend: usable.some((a) => a.role === EFFECT_ROLE.MEND),
		hasAttack: usable.some((a) => a.role === EFFECT_ROLE.ATTACK),
	};
}
