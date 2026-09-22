/*
	Expedition - the status layer.

	Schema v5 retired `restrain`, `transfer` and `suppress` as effect types and moved that
	expressiveness into `status`. This file is where Reclamation decides what a status DOES
	at a sealed world, and it is the only place that decides it.

	THE SHAPE IS CONCEPTS, NOT STATUSES. Nick's ruling (2026-09-21): "We should decide on
	which concept should be supported and then decide which statuses fit within those
	concepts... maybe all those just get lumped into one category of being less effective on
	your turn." So there is no mechanic per status. There are four things a status can do to
	a creature in the Clash, every catalog status is sorted into one of them, and the ones
	that fit none are carried as presentation and honestly do nothing.

	Design and the full ruling record: docs/design/reclamation-status-layer.md.

	WHY THE MEMBERSHIP IS NOT TASTE. ATTRITION is exactly the three statuses that
	STATUS_CATALOG gives a `harm` field (catalog.ts, burning/corroding/poisoned) - the
	schema decided that bucket, not the game. The rest are sorted on the catalog's own
	definition language: DIMINISHED is every status whose definition is "impairs
	functioning" / "disrupts responses" / "interferes with behavior" with no harm, HELD is
	the four that describe a force physically preventing movement.

	`slowed` is the one that looks like it belongs in HELD and does not. Its definition
	deliberately contrasts against the immobilizing four: "Movement remains possible but is
	impaired." That is a reduction, so it reduces.
*/

import { STATUS_CATALOG, type StatusKey } from '@xalians/content/creature';

/** What a status does to a creature at a sealed world. */
export const CONCEPT = {
	/** reduces hold at the top of each round it survives */
	ATTRITION: 'attrition',
	/** lands its blows at reduced power */
	DIMINISHED: 'diminished',
	/** does not land its blow at all this Clash */
	HELD: 'held',
	/** helps: restores hold, feeds protection, or clears a diminishment */
	BOON: 'boon',
	/** carried and shown; the Proving has no board feature for it to touch */
	COSMETIC: 'cosmetic',
} as const;
export type Concept = typeof CONCEPT[keyof typeof CONCEPT];

/*
	Every key in STATUS_CATALOG appears exactly once. The `satisfies` clause below is what
	keeps that true: add a status to the catalog without sorting it here and this file stops
	compiling, which is the point. A status the game silently ignored would be a capability
	a creature has and cannot use, and the standing ruling is that those are named out loud
	rather than misread.
*/
export const STATUS_CONCEPT = {
	// ATTRITION: exactly the catalog's `harm`-bearing statuses
	burning: CONCEPT.ATTRITION,
	corroding: CONCEPT.ATTRITION,
	poisoned: CONCEPT.ATTRITION,

	// DIMINISHED: impairs functioning, no harm of its own
	overheated: CONCEPT.DIMINISHED,
	chilled: CONCEPT.DIMINISHED,
	slowed: CONCEPT.DIMINISHED,
	blinded: CONCEPT.DIMINISHED,
	deafened: CONCEPT.DIMINISHED,
	disoriented: CONCEPT.DIMINISHED,
	frightened: CONCEPT.DIMINISHED,
	sedated: CONCEPT.DIMINISHED,
	stunned: CONCEPT.DIMINISHED,
	paralyzed: CONCEPT.DIMINISHED,
	entranced: CONCEPT.DIMINISHED,

	// HELD: a force physically prevents movement
	restrained: CONCEPT.HELD,
	pinned: CONCEPT.HELD,
	frozen: CONCEPT.HELD,
	buried: CONCEPT.HELD,

	// BOON
	mending: CONCEPT.BOON,
	shielded: CONCEPT.BOON,
	reinforced: CONCEPT.BOON,
	protected: CONCEPT.BOON,
	stimulated: CONCEPT.BOON,
	focused: CONCEPT.BOON,

	// COSMETIC: detection and traversal, neither of which the Proving models
	concealed: CONCEPT.COSMETIC,
	revealed: CONCEPT.COSMETIC,
	marked: CONCEPT.COSMETIC,
	phased: CONCEPT.COSMETIC,
	dispersed: CONCEPT.COSMETIC,
} as const satisfies Record<StatusKey, Concept>;

export function conceptOf(status: string): Concept | null {
	return (STATUS_CONCEPT as Record<string, Concept>)[status] ?? null;
}

/*
	DIMINISHED_FACTOR. Nick ratified half (2026-09-21): "We can do a default of half for now
	with the caveat that we know we have the ability to go in and implement the intensity
	later."

	Half is not a taste number. STATUS_CATALOG's default `intensity` is 50 on a 0-100 scale
	(benchmarks.ts, DEFAULT_STATUS_INTENSITY), so the reduction is the data model's own
	midpoint. Scaling by each application's own intensity is the deferred lever: it is
	invisible in playback (nobody can tell a 40 percent reduction from a 55 percent one) and
	the flat version has to prove too blunt first.
*/
export const DIMINISHED_FACTOR = 0.5;

/*
	The attrition tick. A creature carrying burning or corroding or poisoned loses hold at
	the top of each round the status survives.

	ONE TICK, NOT ONE PER APPLICATION. Three separate burnings are still one creature on
	fire. This is the same reasoning that keeps DIMINISHED from stacking: an accumulation of
	small conditions must not become a removal mechanic by arithmetic, because removal at
	this table is supposed to cost somebody an act.
*/
export const ATTRITION_TICK = 2;
/** `mending` restores this much hold at the top of each round. */
export const MENDING_TICK = 2;

/** One status riding on a creature. Persisted on BoardEntry, so it must stay plain data. */
export interface StatusApplication {
	status: string;
	concept: Concept;
	/** the recordId that applied it, for the log and for `bound: source` holds */
	sourceId: string | null;
	/*
		Rounds this application still has to live, counted at the top of a round. `null`
		means it lasts as long as its source does, which is what `persistence: 'sustained'`
		with `bound: 'source'` means in the schema: not a duration, a maintained state.
	*/
	rounds: number | null;
	/** true when persistence is sustained and bound to its source */
	maintained: boolean;
	/** what clears it, from the effect's `removable` */
	removable: readonly string[];
}

/*
	ROUNDS FROM THE RECORD, not from a table of our own.

	The schema states persistence and duration and this reads them:
	- `sustained` + `bound: 'source'` -> maintained, lives while its source does
	- `lingering` + `duration` -> brief is this round only, prolonged is this round and the
	  next. A frame is three rounds, so `prolonged` is a real commitment without being
	  permanent.
	- `resolved` -> nothing persists; the effect happened and is over.

	Measured over the seed-7 pool: 261 lingering, 62 sustained, 0 resolved statuses. The
	sustained ones are overwhelmingly `restrained`, which is exactly the Newtapede-style
	source-maintained hold the content tests name (relationships.test.ts).
*/
export function roundsFor(effect: { persistence?: string; duration?: string; bound?: string }): number | null {
	if (effect.persistence === 'sustained') {
		// bound to an area has no performer to follow, so it gets the longer fixed life
		return effect.bound === 'source' ? null : 2;
	}
	if (effect.persistence === 'lingering') {
		return effect.duration === 'prolonged' ? 2 : 1;
	}
	return 0;
}

export function applicationFrom(
	effect: { status?: string; persistence?: string; duration?: string; bound?: string; removable?: readonly string[] },
	sourceId: string | null,
): StatusApplication | null {
	const status = effect.status ? String(effect.status) : null;
	if (!status) {
		return null;
	}
	const concept = conceptOf(status);
	if (!concept) {
		return null;
	}
	const rounds = roundsFor(effect);
	if (rounds === 0) {
		return null;
	}
	return {
		status,
		concept,
		sourceId,
		rounds,
		maintained: effect.persistence === 'sustained' && effect.bound === 'source',
		removable: Array.isArray(effect.removable) ? effect.removable.map(String) : [],
	};
}

/** True when any application holds this creature out of the exchange entirely. */
export function isHeld(applications: readonly StatusApplication[]): boolean {
	return applications.some((a) => a.concept === CONCEPT.HELD);
}

/*
	The power factor a creature's blows land at.

	`stimulated` and `focused` are the mirror of DIMINISHED and CANCEL a diminishment rather
	than exceeding full strength: the return value is capped at 1. A boon that could push a
	creature above its own full power would be a damage buff, which is a different mechanic
	from the one Nick ruled, and nothing in the pool asks for it.
*/
export function powerFactor(applications: readonly StatusApplication[]): number {
	const diminished = applications.some((a) => a.concept === CONCEPT.DIMINISHED);
	if (!diminished) {
		return 1;
	}
	const restoring = applications.some((a) => a.status === 'stimulated' || a.status === 'focused');
	return restoring ? 1 : DIMINISHED_FACTOR;
}

/** Hold change at the top of a round: negative for attrition, positive for mending. */
export function tickAmount(applications: readonly StatusApplication[]): number {
	let change = 0;
	if (applications.some((a) => a.concept === CONCEPT.ATTRITION)) {
		change -= ATTRITION_TICK;
	}
	if (applications.some((a) => a.status === 'mending')) {
		change += MENDING_TICK;
	}
	return change;
}

/*
	Age every application by one round and drop the expired ones.

	`isSourceLive` decides maintained holds: a creature that goes down stops holding
	whatever it was holding, which is the whole point of `bound: 'source'` and the reason a
	held creature is worth rescuing by removing its holder.
*/
export function advanceStatuses(
	applications: readonly StatusApplication[],
	isSourceLive: (sourceId: string) => boolean,
): StatusApplication[] {
	const survivors: StatusApplication[] = [];
	for (const application of applications) {
		if (application.maintained) {
			if (application.sourceId && isSourceLive(application.sourceId)) {
				survivors.push(application);
			}
			continue;
		}
		const rounds = (application.rounds ?? 1) - 1;
		if (rounds > 0) {
			survivors.push({ ...application, rounds });
		}
	}
	return survivors;
}

/** The presentation hints the UI may use: the cosmetic statuses, per Nick's ruling 5. */
export function cosmeticStatuses(applications: readonly StatusApplication[]): string[] {
	return applications.filter((a) => a.concept === CONCEPT.COSMETIC).map((a) => a.status);
}

/** The words the table shows for a status, from the catalog's own definition. */
export function statusDefinition(status: string): string | null {
	const entry = (STATUS_CATALOG as Record<string, { definition?: string }>)[status];
	return entry?.definition ?? null;
}
