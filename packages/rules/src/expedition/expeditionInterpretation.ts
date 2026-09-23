/*
	Expedition - interpretation tables.

	Owned by this game, not the creature registry, per docs/design/reclamation-design.md
	("The game bends to the creatures, never the reverse... What the game needs to know
	is registry fact, usable by any game"). These tables are read-only lenses over the
	creature record; nothing here is ever written back to a record.

	Rewritten 2026-09-09 for the base redesign (docs/design/reclamation-base-redesign.md).
	The Orders phase, the sixteen acts as player choices, the stagger/rout thresholds and
	the cross-world projection reach are gone (assumptions 1, 3, 5, 10, 15). What is left
	is the four roles, the blow arithmetic, and the levers the simulator sweeps. Every
	tunable below is ALSO an entry in expeditionRules.DEFAULT_RULES, so a batch can move
	it without editing this file (assumption 15).
*/

import rawTypeEffectivenessMatrix from '@xalians/content/typeEffectivenessMatrix.json';
import type { XalianRecord } from '@xalians/content/schema';
import type { ActClass, Role, Rules } from './types.ts';

// ---------------------------------------------------------------------------
// tunable constants - the "first settings" from the base redesign's interpretation
// layer table. Each has a matching key in DEFAULT_RULES.
// ---------------------------------------------------------------------------

/*
	Hold compression (assumption 11). The record schema publishes the attribute range, 0 to
	100 (`zeroToHundred` in @xalians/content's record schema, which is frozen with the
	generation release, so it is not re-exported from there). The scale below restates it,
	and recordAttributeRange.test.ts fails if the two ever disagree. The raw mean of
	vitality/resilience/endurance is read against that range and mapped onto
	[HOLD_FLOOR, HOLD_CEILING]:

		hold = HOLD_FLOOR + (raw - RAW_ATTRIBUTE_MIN) * (HOLD_CEILING - HOLD_FLOOR)
		                    / (RAW_ATTRIBUTE_MAX - RAW_ATTRIBUTE_MIN)

	A higher floor compresses the spread; a floor of 0 leaves the species spread exactly
	as the records make it. Measured 2026-09-09 over 1200 generated creatures, the species
	mean raw runs 29.6 (tizzie) to 78.0 (yetimoth), so an uncompressed floor gives a
	2.63:1 species mean hold spread, not the 4:1 the design doc estimated. The first
	setting below targets the doc's 2:1 and measures 1.95:1 over the pool.

	Set 2026-09-09 by the sweep in Measurement step 2 (200 matches, seed 7, at the
	ratified magnitude scale). Floor/ceiling pairs giving 4:1, 3:1, 2:1 and 1.5:1 species
	spread moved the match shape (comeback 26.9, 24.2, 28.3, 27.5 percent; decided after
	round 1 44.0, 49.5, 40.5, 40.5 percent) and 2:1 was the best of the four on both.
	FRICTION: the sweep did NOT move the gauge the design doc names for this lever. The
	species keep rate stayed at 21 of 29 species outside the 30 to 90 percent band at every
	setting, because botDraft ranks creatures by mean hold and the compression is a
	monotone affine map of hold, which cannot change a ranking. Compression alone can never
	move the draft keep rate; moving it needs a change in what the draft values.
*/
export const RAW_ATTRIBUTE_MIN = 0;
export const RAW_ATTRIBUTE_MAX = 100;
export const HOLD_FLOOR = 2.8;
export const HOLD_CEILING = 17.6;

// Hold is multiplied by this on the creature's origin world ("home ground").
export const HOME_GROUND_MULTIPLIER = 1.5;

// Strain halves hold and blow magnitudes; severe strain (cannot breathe the site's
// medium at all) quarters them instead. Bolster lifts a creature one grade up this
// ladder (assumption 8).
export const STRAIN_MULTIPLIER = 0.5;
export const SEVERE_STRAIN_MULTIPLIER = 0.25;

/*
	Magnitude scale (assumption 12): every blow's printed magnitude is multiplied by this
	before it is subtracted from a hold, so "a typical strike takes about a third of a
	typical hold" is one number rather than a rewrite of the magnitude formula.

	Set 2026-09-09 by the sweep in docs/design/reclamation-base-redesign.md's Measurement
	step 3 (200 matches, seed 7): 0.55 gave 2.0 routs per match, 0.8 gave 3.1, 1.1 gave
	4.1, 1.5 gave 5.0, 2.0 gave 5.8. The gauge is 3 to 5 routs per match, so 1.1 sat in
	the middle of the band. That pass also recorded that the companion gauge (resolution
	changes the leader at 25 to 40 percent of worlds) was unreachable at any setting,
	reaching only 23.5 percent at 2.5 where routs ran half again over the band.

	RAISED TO 3.0 IN PASS 5 (2026-09-18), and the "unreachable" reading above is retired as
	a measurement of a bot that no longer exists. It was taken before pass 4 gave the
	proctor anticipation. The reading bot spreads its sends instead of stacking, which
	lowered downs from 2.8 to 1.44 and the flip rate to 13 percent, and the old sweep was
	never re-run against it. Re-swept in pass 5 at 200 and 600 matches on seeds 7, 13 and
	21, both gauges are met together at 3.0 and neither is met at 1.1:

		scale 1.1: downs 1.44 to 1.54, flips 12.1 to 13.0 percent (both bands unmet)
		scale 2.5: downs 3.71 to 3.82, flips 24.8 to 24.9 percent (flips just under)
		scale 3.0: downs 4.16 to 4.44, flips 25.4 to 27.6 percent (BOTH BANDS MET)
		scale 3.5: downs 4.57 to 4.89, flips 26.9 to 29.3 percent (downs near the ceiling)

	3.0 was the setting where both gauges cleared with the most room on either side.

	LOWERED TO 2.7 IN PASS 9, paired with SENDABLE 11 (see below). Raising the send budget
	puts more creatures at each world, so more attacks land per Proving and the scale has to
	come down to keep downs per match inside 3 to 5. The pair is the setting, not either
	number alone: at sendable 11 the scale 3.0 reads downs 4.98 to 5.19 (over the band on
	one seed) and 2.7 reads 4.64 to 4.85 with flips still 24.5 to 26.9 percent.
*/
/*
	PASS 25: 2.7 -> 2.0, because ACT_FLIP changed what the scale is paying for.

	Act flip lets a handler choose which of a creature's behaviours it uses, and a handler who
	can choose picks an attacking one more often, so downs rose to 5.4 to 6.0 against a band of
	3 to 5. Swept with the axis on, three seeds at 500 matches: scale 2.7 gives downs 5.4-6.0
	(over band), 2.3 gives 4.8-5.3 (marginal), 2.0 gives 4.2-4.8 (in band, flips 28-32 percent),
	1.8 gives 3.95 with flips sliding to 29.3. 2.0 is where downs return to band without flips
	falling out of it.

	The pass 5 lesson still governs this number: its value is only meaningful against a given
	bot, and the bot changed in this pass (its candidate space became creature x world x role).
	Re-sweep it if the bot changes again.
*/
export const MAGNITUDE_SCALE = 2.0;

/*
	Pass 5 (2026-09-18): the lever that tested WHY the flip gauge was stuck, kept as an
	ablation row because the answer it gave is worth keeping in the tool.

	The pass-5 diagnosis was that the Clash is directionless: over 200 matches on seed 7 it
	extended the deploy leader at 624 worlds and eroded it at 614, mean signed swing +0.09,
	because both sides subtract from the one number that also decides the world. The median
	Clash swing was 2.6 hold against a median deploy gap of 4.6, so the swing could not even
	reach the gap at two worlds in three.

	'standing' was built to separate those two jobs: a creature contributes the whole claim
	it arrived with while it stands, and nothing once downed, so the Clash moves a world by
	whole creatures. MEASURED WORSE and not shipped: flips fell to 4.7 to 5.9 percent on
	three seeds, because at 1.4 downs a match the quantum almost never fires. Raising the
	scale under 'standing' recovers it only to 23.9 percent at scale 4.0, against 29.9 for
	'current' at the same scale. So the counting rule was never the fault; the size of the
	Clash was, and hold doing double duty turns out to HELP the flip rate rather than hurt
	it, since every point of damage moves the world a little. The lever stays so the next
	pass does not re-derive this.
*/
export const CLAIM_COUNTING: 'current' | 'standing' = 'current';

// A sweep removes this share of a strike's power, from every OTHER creature at the
// world, both sides (assumption 5). The role was called "area" until Pass 2's vocabulary
// ruling renamed it (assumption 17's table, "the area role becomes sweep").
export const SWEEP_DISCOUNT = 0.6;

// Bolster's floor (assumption 8): an ally already comfortable gains this much hold,
// since there is no strain grade left to lift it out of.
export const BOLSTER_FLOOR = 1;

/*
	Pass 2, "every attribute a job" (docs/design/reclamation-base-redesign.md assumption
	17). Five of the record's ten attributes were read by the engine and five were not, so
	a creature built on the unread half was weak by construction. Each constant below is
	the threshold or scale of one attribute's job, and each has a matching key in
	DEFAULT_RULES so the simulator can ablate it.
*/

// willpower: at or above this the creature suffers one grade less strain, applied before
// bolster and never pushing past comfortable.
export const WILLFUL_THRESHOLD = 65;

/*
	charisma: presences scale by 0.5 + charisma/100, so a creature of charisma 50 plays a
	presence exactly as it did before this pass, 100 plays it half again as strong and 0
	plays it at half. It multiplies a bolster's grade lift, its floor and its recovery, and
	a shield's cancelled fraction (which is clamped at 1: a shield can never cancel more
	than the whole attack).
*/
export const PRESENCE_SCALE_FLOOR = 0.5;
export const PRESENCE_SCALE_PER_POINT = 0.01;

export function presenceScaleOf(record: XalianRecord | null | undefined, rules?: Partial<Rules> | null): number {
	if (rules && rules.presenceScale === false) {
		return 1;
	}
	const attrs = (record && record.attributes) || ({} as Partial<XalianRecord['attributes']>);
	const charisma = typeof attrs.charisma === 'number' ? attrs.charisma : 50;
	return PRESENCE_SCALE_FLOOR + charisma * PRESENCE_SCALE_PER_POINT;
}

/*
	instinct: targeting. At or above KEEN_INSTINCT a creature picks the enemy it can down
	with this attack, and failing that the enemy it takes the most off (after matchup); at
	or below DULL_INSTINCT it simply hits whatever was sent earliest; in between it follows
	its archetype's conduct line as it always has.
*/
export const KEEN_INSTINCT = 65;
/*
	PASS 19: DULL_INSTINCT 35 -> 50, because at 35 THE LANE WAS EMPTY.

	The log carried "the instinct lanes move nothing under ablation" as an open item, and
	switching `instinctLanes` off does indeed move no match gauge (flips -0.14 +/- 0.97,
	comeback +0.49 +/- 2.97, 1v1 +0.08 +/- 1.03, pooled over five seeds at 500 matches). That
	looked like a rule to delete. It was half a rule that could not fire.

	The generator's instinct floor sits between 31 and 37 depending on the pool, and the dull
	threshold was 35, so across seven pools of 87 creatures there were FIVE dull creatures in
	609 - 0.8 percent. Nobody was in the lane. Measured by seed, the lowest instinct in a pool
	was 37, 31, 37, 36, 35, 37, 31: a threshold of 35 is not a low setting, it is below the
	floor.

	Moved to where the creatures actually are, the rule works. Share of LANDED attacks that
	downed, pooled over three seeds at 500 matches:

		dull <= 35:  keen 39.2%, conduct 35.3%, dull 8.3% +/- 5.5  (n=96, the lane is empty)
		dull <= 45:  keen 39.2%, conduct 35.3%, dull 31.5% +/- 3.2 (n=791, 8.5% of the pool)
		dull <= 50:  keen 39.2%, conduct 38.8%, dull 25.2% +/- 1.6 (n=2782, 21.6% of the pool)

	At 50 a dull creature downs 25.2 percent of what it lands against a conduct creature's
	38.8: a thirteen-point penalty, far beyond noise, on a fifth of the pool. At 45 the gap is
	inside its own interval. So 50 is the setting where the lane has both population and
	effect.

	The match gauges do not move at any threshold (every difference within noise at 2500
	matches a side), which is correct rather than disappointing: a down is a down whoever it
	lands on, so this rule should change WHO you draft and not how a match feels.

	FRICTION REPORTED (CLAUDE.md, "levers not stone"): a threshold no creature can reach is a
	setting that reads as tuned and is not. This one survived nine passes and an "inert"
	verdict because ablating the whole rule and finding nothing looks the same as ablating an
	empty half of it. Worth checking the POPULATION of any band before concluding a rule about
	it does nothing. KEEN_INSTINCT 65 holds 35.6 percent of the pool and is fine.
*/
export const DULL_INSTINCT = 50;

export type InstinctLane = 'keen' | 'conduct' | 'dull';

// 'keen' | 'conduct' | 'dull' - which targeting lane a creature reads its target from.
// One definition, read by the engine's own pick and by the bot's preview of it, so the
// two can never disagree about who a creature would hit.
export function instinctLaneOf(record: XalianRecord | null | undefined, rules?: Partial<Rules> | null): InstinctLane {
	if (rules && rules.instinctLanes === false) {
		return 'conduct';
	}
	const attrs = (record && record.attributes) || ({} as Partial<XalianRecord['attributes']>);
	const instinct = typeof attrs.instinct === 'number' ? attrs.instinct : 50;
	const keen = rules && typeof rules.keenInstinct === 'number' ? rules.keenInstinct : KEEN_INSTINCT;
	const dull = rules && typeof rules.dullInstinct === 'number' ? rules.dullInstinct : DULL_INSTINCT;
	if (instinct >= keen) {
		return 'keen';
	}
	if (instinct <= dull) {
		return 'dull';
	}
	return 'conduct';
}

/*
	agility + reflex: speed. At or above this a creature is `swift` and may move once per
	round during Deploy (assumption 20, which replaced the vanguard fall-back).

	Set 2026-09-09 by a sweep over 65, 75 and 85 (200 matches, simulator seed 11,
	validation seed 7). Swift moves per match 4.67, 2.54, 0.80; share flipping a losing
	world 16.5, 17.1, 10.1 percent; round-one starter win rate 45.0, 42.5, 44.5; side A
	47.0, 45.5, 45.5; proctor mirror 52.5, 45.5, 51.0. 65 is the setting whose starter win
	rate sits closest to even while the move still fires several times a match; 85 drops it
	under once a match, which is a rule the table would rarely see. FRICTION: all three
	starter readings sit inside one another's intervals (+/- 6.9), so this pick is made on
	the point estimate and the move's frequency, not on a resolved difference.
*/
export const SWIFT_SPEED = 65;

// assumption 18: an attack lands scaled by the attacker's remaining share of its hold, so
// hitting first shapes every exchange.
export const HURT_ATTACKS_LESS = true;

/*
	assumption 19: at the Ruling, each ally at a bolster's world recovers this share of the
	damage it took this round, times the bolsterer's presence scale.

	Set 2026-09-09 by a sweep over 0.5, 0.75 and 1.0 (200 matches, simulator seed 11,
	validation seed 7, at swiftSpeed 65). Hold recovered per bolster send 0.61, 0.92, 1.19;
	bolster keeper win rate 46.6 / 47.2 / 47.2 in the draft and 48.9 / 53.6 / 57.0 in the
	simulator; always-presence-first against the proctor mirror 41.0 against 51.0, 43.5
	against 50.5, and 42.0 against 46.5. Every setting keeps bolster inside the 40 to 60
	band, so the binding gauge is the naive policy: leading with the presences is 10.0
	points behind the mirror at 0.5, 7.0 at 0.75 and 4.5 at 1.0, where the tool flags the
	deploy decisions as possibly decorative. 0.5 is the largest setting that clears the
	eight-point bar.
*/
/*
	PASS 19: this is NOT inert, contrary to what the log recorded for several passes.

	Ablated properly, with an interval on the difference and pooled over five seeds at 500
	matches: removing it (bolsterRecovery 0) moves the flip gauge +2.25 +/- 0.98 and doubling
	it (1.0) moves it -1.24 +/- 0.96. Both beyond noise, monotone, and in the direction the
	rule intends - a creature that gets damage back is harder to flip a world away from. It
	fires 1.28 times a match for a mean 3.17 hold.

	The earlier "inert" reading compared point estimates without intervals, which is the exact
	error pass 6 spent a whole pass on. 0.5 stays: it is the setting that puts the flip gauge
	at 31.3 percent, mid-band.
*/
export const BOLSTER_RECOVERY = 0.5;

/*
	PASS 4: CONCEALMENT ONLY (docs/design/reclamation-base-redesign.md assumption 24).

	Hiding used to bundle two things: information (the rival sees that a creature was
	sent, not which or where, until the Clash) and a combat bonus (assumption 9, the hidden
	creature's attack landed before everyone else's at its world). The bonus is what made
	the always-hidden policy sit within five points of the proctor's mirror in pass 2, and
	pass 3 priced it with two patches (a send cost and a power cut) that made "hidden"
	read as a tuning problem rather than as hiding. Nick, 2026-09-10: strip hiding to the
	information half. A hidden send now costs one send like any other, lands in speed
	order like any other, at full power. What it is worth is whether it makes the rival
	guess wrong, which the bot now does (expeditionBot's hidden read, weights.readSharpness).

	The three keys below stay as levers so an ablation row can put the old bonus or the
	old prices back and measure them; none of them is on in the shipped game.
*/
// the pass 2 combat bonus: a hidden creature's attack lands before all others at its
// world. Off since pass 4; an ablation lever only.
export const HIDDEN_FIRST = false;

/*
	PASS 3: THE PRICE OF HIDING (docs/design/reclamation-base-redesign.md assumption 21).
	SUPERSEDED by pass 4 (assumption 24): both prices are off. The sweep below is kept as
	the record of what pricing the combat bonus cost, for the ablation rows that put it back.

	Pass 2 measured always-hidden at 46.5 percent against a 51.0 proctor mirror, four and
	a half points under it, against an eight-point bar. Hidden-first plus
	hurt-attacks-for-less is a strong pair: the hidden creature lands first and unhurt, and
	every reply is already scaled down. Three variants price it, each a rules key so the
	sweep can read them alone and in combination:

	- HIDDEN_SEND_COST: what a hidden send costs against the round's sendable cap (see
	  expeditionRules.sendCostFor). 1 is free, the pass 2 setting; 2 makes hiding cost a
	  send.
	- (variant b, hidden-first only with company, was removed with pass 4: it priced a
	  bonus that no longer exists.)
	- HIDDEN_POWER: the multiplier on an attack thrown from hiding.

	Set 2026-09-10 by a sweep over all eight combinations, 200 matches on each of seeds 7,
	13 and 21. Always-hidden's gap under the proctor mirror, by seed:

		baseline (free, always first, full power)  7.5 / 4.5 / 1.5   hidden rate 6.0 / 3.4 / 3.3
		a  cost 2                                 19.5 / 22.5 / 10.5 hidden rate 7.0 / 5.1 / 4.7
		b  needs company                           8.0 / 0.0 / 2.5   hidden rate 9.3 / 6.7 / 6.7
		c  power 0.75                             11.0 / 4.0 / 3.5   hidden rate 9.1 / 6.0 / 6.0
		a+b                                       31.5 / 23.0 / 16.5 hidden rate 3.2 / 2.1 / 2.6
		a+c                                       20.0 / 22.0 / 17.0 hidden rate 7.8 / 6.2 / 5.9
		b+c                                        9.5 / 4.5 / 6.0   hidden rate 8.7 / 6.5 / 6.1
		a+b+c                                     33.0 / 23.5 / 23.0 hidden rate 2.7 / 2.0 / 2.0

	The gauge is an eight-point gap on all three seeds, a hidden send rate still between 5
	and 15 percent, and the broker's hidden rate still above the proctor's. Neither b nor c
	alone reaches the gap on any seed but the first; a alone reaches it everywhere but
	leaves the hidden rate at 4.7 percent on seed 21, three tenths under the band; anything
	carrying b prices hiding out of the game altogether (2 to 3 percent). a+c is the
	smallest combination that meets all three gauges on all three seeds, and is the setting
	below. The broker stays above the proctor on every one of them (+5.4 / +4.1 / +4.3).

	OVERRIDABLE (levers, not stone): a alone misses the rate band by 0.3 points on one seed,
	which is inside the noise of 200 matches. If Nick wants one lever rather than two, set
	hiddenPower back to 1 and the game keeps a 19.5 / 22.5 / 10.5 gap.
*/
export const HIDDEN_SEND_COST = 1;
export const HIDDEN_POWER = 1;

/*
	PASS 3: THE STAKE (assumption 22). A comeback avenue as a chosen risk, never a gift.
	Before Deploy in any round each handler may stake one of the round's worlds, once per
	Proving: it counts STAKE_SITE_VALUE toward the Charter for whoever holds it at the
	Ruling, and STAKE_BOTH_VALUE when both handlers staked the same world. A tie counts
	nothing, as a tied world always has.
*/
export const STAKE_ENABLED = true;
export const STAKE_SITE_VALUE = 2;
export const STAKE_BOTH_VALUE = 3;

/*
	PASS 6: WHEN the stake may be declared.

	Pass 5 raised the magnitude scale so the Clash decides worlds, and that broke the
	stake's premise rather than its price. Measured at 600 matches on seed 7: at the old
	scale the staker held its staked world 61.7 percent of the time against 48.7 percent on
	the worlds it did not stake, so the forecast was worth making; at the new scale it holds
	47.4 against 50.0, so the forecast is worth nothing and the validation tool's own trap
	flag fires. Re-sweeping the bot's edge threshold (4.4, 5.5, 6.5, 8.0 over 600 matches on
	three seeds) was non-monotonic and did not resolve, which is the signature of an effect
	near zero rather than a mistuned number.

	'any-turn' was built on that reading and MEASURED WORSE: it traps on all three seeds
	instead of two, because letting the stake be declared after sends turns the visible
	margin into most of the edge, so the bot stakes worlds it is already winning. Stakes per
	batch rose from 123 to 676 with 481 of them taken while ahead, held at 43.9 percent.
	Raising STAKE_THRESHOLD_AHEAD to 12, 18 and effectively infinity lifted both the staked
	and the unstaked rate together and never closed the gap.

	The reason none of that worked: THERE WAS NOTHING TO FIX. Pooled over five seeds at 1000
	matches (n=1619 staked worlds) the staker holds its staked world 50.0 +/- 2.4 percent
	against 50.7 +/- 1.8 on its unstaked worlds, a difference of -0.6 +/- 3.0 points, which
	is no difference at all. The stake is variance-neutral, exactly as pass 3 measured it and
	exactly as a chosen risk should be. What was broken was the GAUGE: it compared two point
	estimates with no interval, so it called "TRAP" on whichever way the noise fell, about
	half the time. That is fixed in expeditionValidation.ts.

	'any-turn' stays as a lever with its measurement recorded, so the next pass does not
	rebuild it. The shipped setting is unchanged.
*/
export const STAKE_TIMING: 'before-first-send' | 'any-turn' = 'before-first-send';

/*
	PASS 8: the Clash gets a second dimension, from fields pass 7 started reading.

	PINNING. An attack whose primary effect is `restrain` stops its target from landing its
	own attack this Clash. Before pass 8 the 171 restrain actions in the pool were plain
	damage, because the projection turned them into `snare` and the game had no snare rule.
	At a sealed world with one Clash, "restrained" can only mean one thing the table can
	show: you do not get to swing. It makes speed matter (a pin only works if it lands
	first) and gives 11 percent of attacking creatures a reason to exist beyond their
	number.

	REACH FIRST. A creature whose attack reaches past contact (spatial.range short, medium
	or long) lands before the contact-only creatures at its world, whatever their speed.
	`spatial.range` has been read since pass 7 and used by nothing; 18 percent of attacking
	creatures reach. This is the "second dimension" the brief asked about, and it is one
	sentence: what strikes from a distance strikes first.

	Both are rules flags so the ablation can price them.

	PASS 18: PINNING IS SHIPPED ON, REACH FIRST STAYS OFF.

	Pass 8 measured both inert and shipped both off, with the reason recorded precisely:
	pinning fired 280 times per 600 matches but took only 67 swings, because 76 percent of
	pins landed on a creature that had ALREADY swung, and only 12.4 percent of Provings
	contained a pin that took a swing. That is an ordering problem, and the conditions have
	moved twice since: pass 9 raised the send budget and pass 17's flip pricing crowds worlds
	further, so 1v1 has gone 62.7 to 55.3 percent. More creatures sharing a world means more
	unspent swings when a pin lands. (Pass 5's lesson: a sweep's conclusion expires when the
	bot changes, and the bot has changed twice.)

	Re-measured, 600 matches on three seeds:

		pins per 600 matches      280 (pass 8)  ->  356 to 490
		of those, took a swing    24%           ->  23.9 to 31.6%
		Provings with a bite      12.4%         ->  13.2 to 24.2%

	THE NUMBER THAT DECIDED IT. Pooled over five seeds at 600 matches, a creature whose attack
	restrains wins its world 57.5 percent with the rule off and 58.7 percent with it on:
	**+1.20 +/- 0.91 points, beyond noise**, on 22,500 sends a side. Per seed the difference is
	+1.24, +2.19, +0.99, +0.63, +0.92 - positive five times out of five, though no single seed
	resolves it alone, which is exactly the case pooling is for.

	AND IT COSTS NOTHING IN SHAPE. At 3000 matches a side, every match gauge is within noise:
	flips +0.0 +/- 0.9, comeback -0.3 +/- 2.7, 1v1 +0.0 +/- 0.9, downs 4.51 either way.

	So this is a rule that makes a word on the card mean something for the creature carrying
	it, without changing the game's shape. 171 of the pool's 1384 actions restrain; until now
	that word was decoration, and reading it as a plain strike is the mildest form of the fault
	the brief names (a creature must never be misread). It also makes landing first worth
	something, which is a rule the game already asks the player to understand.

	It is visible rather than constant: 0.56 pins land per Proving, 0.17 of them take a swing,
	and 15.9 percent of Provings contain one. That is the honest size of it.

	REACH FIRST stays off. Re-measured with pinning on, ordering reachers first moved the bite
	rate from 29.9 to 30.3 percent and 23.9 to 24.9 on another seed - inside the noise, and it
	buys nothing on its own. It remains an ablation row.
*/
export const PINNING = true;
export const REACH_FIRST = false;

// Armored (the base, "Traits that remain"): blows against an armored creature are
// reduced by this fraction.
export const ARMORED_REDUCTION = 0.25;

/*
	Shield pricing. A cancel of any size, free, measured as the strongest thing a creature
	can be (shield keeper win rate 67.7 percent against the 40 to 60 fairness band, and
	the always-presence-first policy within five points of the proctor, validation
	2026-09-09). SHIELD_CAP is the lever that prices it; see expeditionRules.resolveWorld's
	shield step for what each setting does.
*/
export const SHIELD_CAPS = ['none', 'ownHold', 'half'] as const;
/*
	Set 2026-09-09 (200 matches, simulator seed 11, validation seed 7). Shield keeper win
	rate: 'none' 67.7 percent, 'ownHold' 63.7, 'half' 59.0 - only 'half' is inside the 40
	to 60 fairness band. Always-presence-first against the proctor: 45.5, 48.5, 43.0, so
	'half' is also the setting where leading with the presences is worth least.
*/
export const SHIELD_CAP = 'half';

// A blow-role creature with no attacking ability at all still strikes, at the pool's
// minimum printed magnitude (magnitudeOf floors at 1). The simulator counts how often
// this fallback fires.
export const MIN_BLOW_MAGNITUDE = 1;

// Roster economy and match structure. A match is FRAMES_PER_MATCH rounds; each round
// the Court's frame loads WORLDS_PER_FRAME worlds side by side, every world at one of its
// sites, drawn so no world repeats within a match (docs/design/reclamation-design.md,
// "The Proving", 2026-09-04). SITES_TO_CLINCH counts worlds held: five of the nine.
export const SITES_TO_CLINCH = 5;
/*
	PASS 15 (2026-09-19): the clinch is a majority of the worlds on offer, not the literal 5.

	Every earlier pass read SITES_TO_CLINCH as a constant, which is right for the shipped
	frame (5 of 9) but makes `worldsPerFrame` unmeasurable: a narrower frame offers fewer
	worlds, and "first to five of six" is a different game from "first to five of nine".
	clinchFor() derives the bar from the worlds a match actually offers, so the frame width
	can be swept without hand-editing a second number, and the shipped 3 x 3 still yields 5.
*/
export function clinchFor(worldsPerFrame: number, framesPerMatch: number): number {
	return Math.floor((worldsPerFrame * framesPerMatch) / 2) + 1;
}
export const ROSTER_SIZE = 12;
/*
	PASS 9 (2026-09-18): SENDABLE 10 -> 11, and why this number is the Clash's real ceiling.

	Three passes tried to make the Clash matter by changing what happens inside it, and all
	three hit the same wall: 62 percent of contested worlds were one creature against one,
	so there was usually nothing for a Clash rule to be about. Pass 9 measured the cause and
	it is arithmetic, not scoring.

	A Proving offers WORLDS_PER_FRAME x FRAMES_PER_MATCH = 9 worlds. At SENDABLE 10 the bot
	spent a mean of 9.31 sends, which is 1.04 sends per world. Stacking two creatures
	anywhere therefore meant abandoning another world outright, so the bot almost never did
	it, and no rule inside the Clash could have changed that.

	It is not that stacking is bad. Measured at 600 matches, seed 7: a world held by one
	creature against one is won 49.0 percent of the time; sending a SECOND creature takes it
	to 74.7 percent. The payoff was always there and the budget could not pay for it.

	Swept against the sends-per-world ratio (600 matches, three seeds), with the magnitude
	scale moved with it because more meetings means more attacks landing:

		sendable 10, scale 3.0 (pass 5): 1v1 62.7%, downs 4.53, flips 26.5%
		sendable 11, scale 2.7 (SHIPPED): 1v1 56.2%, downs 4.64 to 4.85, flips 24.5 to 26.9%
		sendable 12, scale 2.8:           1v1 44.5%, downs 5.42 to 5.62 (over the band)
		sendable 12, scale 2.4:           1v1 44.5%, downs 4.88 to 5.05, flips 23.1 to 25.1%

	12 crowds worlds far harder (1v1 down to 44.5 percent) but cannot hold the downs band
	and the flip band at the same time at any scale tried: crowding a world makes any one
	exchange matter less to its total, so the flip rate falls as the crowd rises. 11 is the
	setting where both bands hold on three seeds and the crowd still improves.

	THE COST, recorded rather than hidden: a bigger budget narrows the naive-policy margin.
	The pass-early policy sat 21.5 / 19.4 / 17.8 points under the proctor's mirror at
	SENDABLE 10 and sits 13.1 / 13.1 / 14.5 under it at 11. The bar is eight points and it
	still clears on every seed with room, but the direction is the one to watch: a budget
	generous enough that spending it all is nearly automatic would make deploy decisions
	decorative. Do not raise this further without re-reading section 1 of the validation.

	THE GAIN: comeback from a contested round 1 rose from 30.8 / 32.0 / 35.1 to
	32.7 / 34.0 / 35.4 percent, comfortably inside its band on all three seeds.
*/
export const SENDABLE = 11;
/*
	PASS 24. THE PER-ROUND SEND CAP, and why the game needed one.

	`sendable` is a whole-Proving budget, and nothing makes a handler save any of it. Measured
	over three seeds at 400 matches, the game gets LESS interesting as it goes: the mean count
	of near-best options at a decision runs 3.9 in round one, 2.8 in round two, and 2.05 in
	round three, where HALF of all decisions have one dominant answer (51.6 / 49.4 / 49.6
	percent). The round that decides the Charter is the game's least interesting moment.

	The cause is arithmetic rather than scoring. Round three opens with 4.8 creatures still in
	hand but only 3.8 sends still affordable: the budget runs dry before the roster does, so
	the last round spends dregs. Raising `sendable` makes it worse, not better - at 12 and 13
	the round-three dominant share rises to 58 percent, because a bigger budget is simply spent
	earlier and the last round arrives emptier still.

	The obvious fix - budget that cannot all be spent at once - WAS BUILT AND MEASURED AND DOES
	NOT WORK. ROUND_SEND_CAP is the most a handler may send in any one round, 0 being no cap,
	and it is shipped OFF with its sweep recorded so this is not rebuilt.

	Decision depth by round (mean near-best options / share with one dominant option), three
	seeds at 400 matches:

		no cap (SHIPPED):  r1 3.9/28%   r2 2.8/38%   r3 2.05/50%
		cap 5:             r1 4.8/21%   r2 3.7/28%   r3 2.42/45%
		cap 4:             r1 4.8/21%   r2 3.7/28%   r3 2.62/40%
		cap 3:             r1 4.8/21%   r2 4.2/22%   r3 3.28/30%

	Read alone that looks like a triumph: cap 3 nearly flattens the decay. But the same cells
	measured against the match gauges show where the depth came from:

		            downs   1v1     flips   sends/match
		no cap      4.5     55%     31%     19.4
		cap 5       3.5     64%     35%     16.7
		cap 4       3.0     71%     35%     15.9
		cap 3       1.9     87%     38%     13.1

	THE CAP BUYS DECISIONS BY STARVING THE CLASH. At cap 3 downs fall to 1.9 against a band of
	3 to 5 and 87 percent of contested worlds are one creature against one - the exact fault
	passes 5 through 17 spent themselves fixing. The decisions are not better, there are simply
	fewer sends, so more worlds go uncontested and a lone send at an empty world is "open"
	only because nothing is there to answer it.

	And the balance-safe cells give nothing back. Cap 6 with sendable 14 holds downs at 4.5,
	flips at 34 and comeback in band, and round three gets WORSE: dominant 50 percent to 57.
	Cap 7 with sendable 15 is the same. So there is no setting where this trade pays.

	WHAT THE MEASUREMENT ACTUALLY POINTS AT. Round three opens with 4.8 creatures and 3.8
	affordable sends and half its decisions have one answer, and neither more budget nor less
	spending fixes that. The gap is that the game has one kind of decision - which creature at
	which world - and by the last round there are few creatures and few live worlds, so the
	product runs out. A second axis would not run out with the roster: 46.8 percent of
	creatures have reach past contact and NOTHING IN THE RULES USES THE DISTANCE, and three
	effect kinds (displace, transfer, suppress) still read as plain attacks. Those are open
	items 3 and the reach note, and they are where the depth has to come from.
*/
export const ROUND_SEND_CAP = 0;

/*
	PASS 25. CROSS-WORLD PROJECTION, and why it is not a new invention.

	The base redesign's own lever pool names this and names the condition that brings it back
	(docs/design/reclamation-base-redesign.md, "The lever pool"):

		"Cross-world projection: if sealed worlds measure as three disconnected games (option
		 spread and decided-after-round-1 worsen), one area act that reaches one other world."

	BOTH HALVES OF THAT CONDITION NOW MEASURE AS FAILING.

	- Option spread (pass 24): near-best options per decision run 3.9 / 2.8 / 2.05 across the
	  three rounds, and by round three HALF of all decisions have one dominant answer. Pass 2
	  measured 5.7 near-best and 14 percent dominant, so the game has got shallower as it got
	  balanced.
	- Decided after round 1, canonical definition (the earliest round after which the winner
	  led strictly and never fell behind or tied again): **47.5 / 50.7 / 48.5 percent against a
	  band of under 35.** Half of all matches are effectively over after the first round.

	So this is the ruling the design pre-authorized, applied on the evidence it asked for,
	rather than a new mechanic on taste. Assumption 3 ("worlds are sealed: only creatures
	standing at a world touch it") was held at 85 percent confidence and tentative; this is the
	measured case that reopens it, and it reopens it as narrowly as the lever pool words it -
	ONE act, reaching ONE other world, and only for the creatures whose record already says
	they reach that far.

	PROJECTION_REACH is the reach at which an AREA act also catches the next world in the
	frame. The pool's reach grades are contact 1, short 2, medium 3, long 4 (REACH_BY_RANGE),
	and across five seeds of 87 creatures the act histogram is 251 at reach 0, 1003 at 1, 163
	at 2 and 102 at 3. 0 disables the rule entirely.

	PROJECTION_FALLOFF is the share of the sweep's power that lands at the far world, so
	distance costs something and a projected sweep is not simply a bigger sweep.

	SHIPPED OFF. THE NEGATIVE RESULT, and it is the useful part of this pass.

	First, a content fact the design could not have known: **an area act never reaches past 2,
	and a reach-3 act is never an area.** The joint distribution over 1519 usable acts on five
	seeds is reach 0 x area 226, reach 1 x area 132, reach 2 x area 89, reach 3 x single 102,
	and nothing above. The generator treats spread and distance as a tradeoff, so the lever
	pool's literal wording - "one AREA act that reaches one other world" - describes a creature
	this content cannot produce. Projection therefore had to key on reach 2 (89 acts, 5.9
	percent) or lower to fire at all.

	Second, it fires and it changes nothing. At reach 1, where EVERY area act projects, sweep
	victims per match rise 10.2 to 14.4 - 41 percent more creatures caught - and the gauges do
	not move:

		                      decided-r1        r3 depth       downs  1v1    flips
		no projection         47.4/50.4/47.8    2.05/50%       4.5    55%    31%
		reach 2, falloff 0.5  47.0/50.2/47.0    2.06/50%       4.5    55%    31%
		reach 2, falloff 1.0  48.2/49.6/46.8    2.07/50%       4.6    55%    31%
		reach 1, falloff 0.5  47.2/49.4/50.2    2.06/50%       4.7    55%    31%

	WHY, and this is what the next pass should act on. Projection adds DAMAGE across worlds,
	and the decision problem is not about damage - it is about which world to commit a creature
	to. A cloud that spills into the next world changes what a send is worth by a little and
	changes the shape of the choice not at all: the handler still picks one creature and one
	world, and by round three there are few of each. Cross-world REACH is not a second axis. A
	second axis has to change what a decision is ABOUT, not add a number to the one that exists.

	Kept, off, with the sweep reproducible, so the lever pool's entry is closed by measurement
	rather than left as an untried alternative (the fault pass 15 found in `worldsPerFrame`).
*/
/*
	PASS 25. ACT FLIP: the handler chooses which of a creature's acts it uses, at send.

	The lever pool's other unused entry (reclamation-base-redesign.md): "Advanced-mode act flip
	(choosing among a creature's acts at send): if one blow per creature measures as too little
	expression."

	THE CONDITION, MEASURED. Every creature in the pool has three or four usable acts (48.0
	percent have three, 50.6 percent four, 1.4 percent two), and **72.3 percent could offer two
	or more genuinely different table behaviours** if the act were chosen rather than derived -
	a creature that can strike or shield, sweep or mend. Distinct behaviours available per
	creature: one for 27.6 percent, two for 51.0, three for 20.2, four for 1.1. The table reads
	1519 usable acts across five seeds and uses 435 of them, one per creature. That is "too
	little expression" as a number.

	WHY THIS AND NOT REACH. Pass 25's first half built cross-world projection, the lever pool's
	other authorised answer, on the condition it names. It fires hard (sweep victims per match
	10.2 to 14.4) and moves no gauge, because reach adds DAMAGE and the decision is about WHICH
	WORLD TO COMMIT TO. Act flip changes what a decision is about instead of adding a number to
	it, and - the reason it addresses pass 24's finding specifically - **it does not deplete
	with the roster.** A creature with three behaviours still poses a question in round three
	when only three creatures are left, which is exactly where the game currently runs out of
	decisions (2.05 near-best options, 50 percent with one dominant answer).

	SHIPPED ON, with MAGNITUDE_SCALE retuned 2.7 -> 2.0 alongside it (see that constant).

	Decision depth by round, mean near-best options / share with one dominant answer, three
	seeds at 400 matches:

		                    round 1      round 2      round 3
		one locked act      3.9 / 28%    2.8 / 38%    2.05 / 50%
		act flip            7.5 / 16%    5.0 / 24%    3.53 / 30%

	**Round three now offers more choice than round one used to**, and the dominant share there
	falls from 50 percent to 30. That is the decay pass 24 diagnosed, reversed, and it works
	because the axis does not deplete: the third creature of a spent roster still asks which of
	its behaviours the world needs.

	Every other gauge holds on FIVE seeds at 500 matches:

		                    downs(3-5)  flips(25-40)  comeback(30-40)  1v1    naive(>=8)
		shipped today       4.2-4.9     29.5-32.6%    32.6-36.5%       55%    5.1-16.0
		act flip, scale 2.0 4.2-4.8     28.2-31.7%    31.1-39.1%       55%    9.2-18.6

	Two things in that table beyond the headline. Act flip alone pushed downs to 5.4-6.0, over
	the band, because a handler who can choose a behaviour chooses an attacking one more often;
	the scale retune is what pays for the axis, and 2.0 is the value where downs return to band
	without flips falling out of it. And the naive-policy margin **was already failing on seed
	55 at 5.1 points against a bar of eight** - act flip lifts it to 13.0, so this fixes a
	latent failure the three standard seeds were hiding.

	WHY THIS AND NOT REACH. Pass 25's first half built cross-world projection, the lever pool's
	other authorised answer. It fires hard (sweep victims per match 10.2 to 14.4) and moves no
	gauge, because reach adds DAMAGE and the decision is about WHICH WORLD TO COMMIT TO. A
	second axis has to change what a decision is about, not add a number to the one that exists.
*/
export const ACT_FLIP = true;

export const PROJECTION_REACH = 0;
export const PROJECTION_FALLOFF = 0.5;
export const FRAMES_PER_MATCH = 3;
/*
	PASS 15 (2026-09-19): the frame width, swept and left where it was. THE NEGATIVE RESULT.

	This was the untried half of pass 9's sends-per-world ratio. Pass 9 raised the budget as
	far as it could (SENDABLE 11) and still left 56 percent of contested worlds one creature
	against one; a narrower frame raises the same ratio from the other side, without
	spending a larger budget. The wiring for it landed in this pass (drawFrames reads the
	rules, clinchFor derives the bar), so the sweep below is now reproducible.

	Swept at 600 matches on seeds 7/13/21, with the clinch derived as a majority of the
	worlds on offer and the magnitude scale moved where the crowd changed:

		3 x 3, sendable 11 (SHIPPED):  1v1 55.1 to 56.1%, downs 4.64 to 4.85, flips 28.1 to 30.5%
		2 x 3, sendable 11:            1v1 18.3 to 19.3%, downs 5.21 to 5.64 (over the band)
		2 x 3, sendable 9:             1v1 30.1 to 31.1%, downs 4.27 to 4.52, flips 29.0 to 30.5%
		2 x 3, sendable 8:             1v1 42.4 to 44.2%, downs 3.63 to 3.77 (under the band)
		4 x 3, sendable 14:            1v1 68.7 to 69.4%, downs 5.60 to 5.63 (over), comeback 20.8 to 29.3% (under)

	The crowd gauge loves it: 2 x 3 at sendable 9 nearly halves the 1v1 share, 56 percent to
	30, while downs and flips both stay in band on all three seeds. It is by far the best
	crowding result any pass has measured. A WIDER frame is unambiguously worse on every
	axis, which is worth knowing: it spreads the same roster over more worlds.

	It is not shipped, for two measured reasons.

	1. IT FAILS THE NAIVE-POLICY BAR, which is the one gauge that says the game asks a
	   question. At 400 matches a side, "pass early" (deploy an even share, then stop
	   thinking) sits 12.3 to 18.0 points under the proctor's mirror at the shipped width
	   and only 7.5 to 9.5 points under it at 2 x 3 / sendable 9 - through the bar of eight
	   on seed 13. With two worlds a round there is no allocation question left: spreading
	   evenly IS the right answer, so the deploy decisions stop carrying their weight. Pass
	   9 wrote down that a generous budget makes deploy decorative; a narrow frame does the
	   same thing from the other direction, and harder.

	2. A TWO-WORLD ROUND CAN ONLY BE LEVEL OR SWEPT. Measured: 51 percent of rounds end
	   1-1 and 48 percent end 2-0, with nothing in between, against 10 percent level at the
	   shipped width. Half of all rounds would say nothing about the score. The stake does
	   not rescue it - the bot stakes 0.10 times a match at width 2 against 0.33 at width 3,
	   because a stake among two worlds is transparent and easily answered - and level rounds
	   stay at 51 percent with the stake off (51.8) or on (50.6).

	Kept for the record: the narrow frame does make the last round matter more (91.8 to
	92.7 percent of matches still live entering round 3, against 82.5 to 84.7 shipped). If
	a later pass finds a way to keep an allocation question alive at two worlds - a deeper
	per-world decision than "how many do I send" - this is the sweep to re-run, and the
	lever is wired for it now. Re-read the note on SENDABLE first: both numbers move the
	same ratio, and neither conclusion survives a change to the bot.
*/
export const WORLDS_PER_FRAME = 3;
// distinct worlds a match draws from the fourteen
export const WORLDS_PER_MATCH = FRAMES_PER_MATCH * WORLDS_PER_FRAME;
// every authored world carries this many sites; the frame loads one of them
export const SITES_PER_WORLD = 3;

/*
	PASS 3: THE DRAFT'S SHAPE (assumption 23). Seventeen of twenty-nine species sat outside
	the 30 to 90 percent keep band because a keep of twelve from eighteen by total order
	always cuts the same bottom third. Two levers, both rules keys so the sweep can read
	them alone and together:

	- DRAFT_POOL_SIZE: how many creatures each side is dealt before keeping ROSTER_SIZE.
	  A smaller pool cuts less, so more of what is dealt survives.
	- DRAFT_DISTINCT_SPECIES: deal a species-distinct pool, so no species is dealt twice
	  to the same handler and the keep cannot be a run of the same best species.

	Set 2026-09-10 by the variant sweep (200 matches, seed 7). Species outside the 30 to 90
	keep band: eighteen-and-deal-as-dealt 17 (five under 30, twelve over 90), fifteen 17
	(one under 30, sixteen over 90), the distinct deal 17 (five under, twelve over), both
	together 20. FRICTION: none of the three reaches the "10 or under" gauge, and the
	arithmetic says none can. The mean keep rate is ROSTER_SIZE / poolSize by construction -
	66.7 percent at eighteen, 80 percent at fifteen - so a smaller pool moves the whole
	distribution toward the top of the band as fast as it lifts its floor. The band needs
	the SPREAD of the ratings narrowed, which is a change to what the draft values, not to
	how many creatures it is dealt.

	Fifteen is chosen as the best of the three on the readings that are not arithmetic:
	dead species fall from five to one, the one dominant species (luceras, kept above 80
	with its keeper winning above 60) disappears, and every role's keeper win rate stays
	inside the 40 to 60 fairness band (bolster 48.6, shield 49.8, strike 51.1, sweep 49.2).
	The distinct deal removes the dominant species too but leaves all five dead ones, and
	both levers together are worse than either alone.
*/
export const DRAFT_POOL_SIZE = 15;
export const DRAFT_DISTINCT_SPECIES = false;

// Trailing-seat compensation, Pass 2's roster-economy lever (docs/design/
// reclamation-play-enhancements.md "Pass 2 levers"): the side holding fewer worlds after a
// round gets this many extra sends (SENDABLE + ROSTER_TRAILING_BONUS) for the very next
// round only.
// Cut by assumption 20 ("no gifts to the losing side"): the default is 0 sends, and the
// constant survives only so an ablation row can put the catch-up send back and measure
// what removing it cost.
export const ROSTER_TRAILING_BONUS = 0;

// ---------------------------------------------------------------------------
// the four roles (assumption 4)
// ---------------------------------------------------------------------------

export const ROLE: { STRIKE: Role; SWEEP: Role; BOLSTER: Role; SHIELD: Role; NONE: Role } = {
	STRIKE: 'strike',
	// Pass 2 vocabulary (assumption 17): the area role is a sweep, on the table and in
	// every field the interface reads.
	SWEEP: 'sweep',
	BOLSTER: 'bolster',
	SHIELD: 'shield',
	// what a creature degrades to when its role is switched off by rules.roles: a plain
	// holder, present at the world and counted in its hold, doing nothing else.
	NONE: 'none',
};

/*
	Presence archetypes and their default presence, per assumption 4: "survivor, bulwark,
	stalwart, sage are presences (bolster or shield by their abilities and element)".
	Between bolster and shield the ruling is shield for bulwark and stalwart (both are
	framed as the creatures that stand in front of something) and bolster for survivor and
	sage (both are framed as the creatures that keep others going). See roleOf() in
	creatureOnTable.js for the one case that overrides this table.
*/
export const PRESENCE_BY_ARCHETYPE: Record<string, Role> = {
	bulwark: ROLE.SHIELD,
	stalwart: ROLE.SHIELD,
	survivor: ROLE.BOLSTER,
	sage: ROLE.BOLSTER,
};

// ---------------------------------------------------------------------------
// the ability vocabulary the registry writes, grouped by what it touches. Nothing in
// the game lets a player choose among these any more (assumption 1): the tables survive
// only because magnitude derivation and role assignment read them - the class decides
// which of a creature's abilities can be its blow, the action decides the governing
// attribute, and AREA_ABILITY_ACTIONS decides whether a blow creature is an area.
// ---------------------------------------------------------------------------

export const ACT_CLASS: { CONTACT: ActClass; REACH: ActClass; PROJECTION: ActClass; SUPPORT: ActClass } = {
	CONTACT: 'contact',
	REACH: 'reach',
	PROJECTION: 'projection',
	SUPPORT: 'support',
};

export const ACT_CLASS_BY_ACTION: Record<string, ActClass> = {
	// contact - touches the site the creature stands at
	strike: ACT_CLASS.CONTACT,
	crush: ACT_CLASS.CONTACT,
	rake: ACT_CLASS.CONTACT,
	lash: ACT_CLASS.CONTACT,
	shove: ACT_CLASS.CONTACT,

	// reach - touches the site with a condition
	snare: ACT_CLASS.REACH,
	drain: ACT_CLASS.REACH,
	ambush: ACT_CLASS.REACH,

	// projection - since assumption 3 (sealed worlds) these reach no further than
	// contact does; the class is kept only because favoredAct's archetype table names it
	beam: ACT_CLASS.PROJECTION,
	hurl: ACT_CLASS.PROJECTION,
	burst: ACT_CLASS.PROJECTION,
	spray: ACT_CLASS.PROJECTION,
	cloud: ACT_CLASS.PROJECTION,

	// support - never a blow
	ward: ACT_CLASS.SUPPORT,
	mend: ACT_CLASS.SUPPORT,
	terrorize: ACT_CLASS.SUPPORT,
};

// carrying one of these makes an attacking creature a SWEEP rather than a STRIKE
// (assumption 4)
export const SWEEP_ABILITY_ACTIONS = ['burst', 'spray', 'cloud'];

// the two support abilities that override the archetype's default presence (see roleOf)
export const WARD_ABILITY_ACTION = 'ward';
export const MEND_ABILITY_ACTION = 'mend';

export function getActClass(action: string | null | undefined): ActClass | null {
	if (!action) {
		return null;
	}
	const key = String(action).toLowerCase();
	return Object.prototype.hasOwnProperty.call(ACT_CLASS_BY_ACTION, key) ? ACT_CLASS_BY_ACTION[key] : null;
}

// ---------------------------------------------------------------------------
// governing attribute per action - the magnitude formula's second term
// ---------------------------------------------------------------------------

/*
	Pass 2 (assumption 17): attack power is strength for every contact attack and
	intelligence for every projected or area attack. Before this pass the table spread the
	governing attribute across agility, reflex, endurance and instinct, which gave those
	attributes a second job while strength and intelligence had almost none, and left the
	reading of a creature's plate unable to say what makes it hit hard. The lever-pool acts
	(shove, snare, ambush, drain) keep the entries they had, since nothing in the base
	reaches them.

	`hurl` is governed by intelligence, with the other projections. The Pass 2 brief listed
	it among the contact attacks, which contradicted ACT_CLASS_BY_ACTION's own reading of it
	as a projection and would have left one action classed one way and powered the other;
	corrected 2026-09-09 so the class table and this table agree on every row.
*/
export const GOVERNING_ATTRIBUTE_BY_ACTION: Record<string, string> = {
	// contact: strength
	strike: 'strength',
	crush: 'strength',
	lash: 'strength',
	rake: 'strength',
	shove: 'strength',

	// projected and area: intelligence
	hurl: 'intelligence',
	beam: 'intelligence',
	spray: 'intelligence',
	burst: 'intelligence',
	cloud: 'intelligence',

	// lever pool, unchanged
	snare: 'reflex',

	ambush: 'instinct',

	drain: 'vitality',

	ward: 'willpower',

	mend: 'intelligence',

	terrorize: 'charisma',
};

export function getGoverningAttributeForAction(action: string | null | undefined): string | null {
	if (!action) {
		return null;
	}
	const key = String(action).toLowerCase();
	return Object.prototype.hasOwnProperty.call(GOVERNING_ATTRIBUTE_BY_ACTION, key)
		? GOVERNING_ATTRIBUTE_BY_ACTION[key]
		: null;
}

// ---------------------------------------------------------------------------
// favored act per archetype - since assumption 1 nobody gives orders, so this table no
// longer decides what a creature does; it decides WHICH of a blow creature's abilities
// is the one blow it throws (creatureOnTable.blowActOf). Support-favoring rows still
// exist because a blow creature can have an archetype that prefers a support act it does
// not own, and the fallback path has to be written down somewhere.
// ---------------------------------------------------------------------------

export interface FavoredActSpec {
	prefer: 'strongestOfClass' | 'specificAction' | 'hold' | 'strongestOverall';
	classes?: ActClass[];
	action?: string;
	actionPriority?: string[];
}

export const FAVORED_ACT_BY_ARCHETYPE: Record<string, FavoredActSpec> = {
	predator: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	prowler: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	juggernaut: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT] },
	berserker: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT] },
	vanguard: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	balanced: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT, ACT_CLASS.PROJECTION] },
	bulwark: { prefer: 'specificAction', action: 'ward' },
	stalwart: { prefer: 'specificAction', action: 'ward' },
	survivor: { prefer: 'hold' },
	skirmisher: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT], actionPriority: ['lash', 'rake'] },
	runner: { prefer: 'strongestOfClass', classes: [ACT_CLASS.CONTACT], actionPriority: ['lash', 'rake'] },
	seeker: { prefer: 'specificAction', action: 'mend' },
	sage: { prefer: 'specificAction', action: 'mend' },
	virtuoso: { prefer: 'strongestOverall' },
	sovereign: { prefer: 'strongestOverall' },
	rogue: { prefer: 'strongestOverall' },
};

export function getFavoredActSpec(archetypeKey: string | null | undefined): FavoredActSpec | null {
	if (!archetypeKey) {
		return null;
	}
	const key = String(archetypeKey).toLowerCase();
	return Object.prototype.hasOwnProperty.call(FAVORED_ACT_BY_ARCHETYPE, key)
		? FAVORED_ACT_BY_ARCHETYPE[key]
		: null;
}

// ---------------------------------------------------------------------------
// conduct: whom a creature chooses ("Conduct: whom a creature chooses"). Unchanged by
// the base redesign except that every line now reads only the creature's OWN world
// (assumption 2 keeps conduct derived and assumption 3 seals the worlds).
// ---------------------------------------------------------------------------

export interface ConductSpec {
	attacking: string;
	supporting: string;
}

export const CONDUCT_BY_ARCHETYPE: Record<string, ConductSpec> = {
	predator: { attacking: 'weakestEnemyInReach', supporting: 'allyWithLeastHold' },
	prowler: { attacking: 'weakestEnemyInReach', supporting: 'allyWithLeastHold' },
	juggernaut: { attacking: 'strongestEnemyInReach', supporting: 'allyWithMostHold' },
	berserker: { attacking: 'strongestEnemyInReach', supporting: 'allyWithMostHold' },
	vanguard: { attacking: 'enemySentEarliest', supporting: 'allySentEarliest' },
	balanced: { attacking: 'enemySentEarliest', supporting: 'allySentEarliest' },
	bulwark: { attacking: 'enemyThreateningWeakestAlly', supporting: 'allyWithLeastHold' },
	stalwart: { attacking: 'enemyThreateningWeakestAlly', supporting: 'allyWithLeastHold' },
	survivor: { attacking: 'enemyWithLowestMagnitude', supporting: 'self' },
	skirmisher: { attacking: 'slowerEnemyWeakestFirst', supporting: 'fastestAlly' },
	runner: { attacking: 'slowerEnemyWeakestFirst', supporting: 'fastestAlly' },
	seeker: { attacking: 'enemyMostVulnerableToElement', supporting: 'allyMostVulnerablePresent' },
	sage: { attacking: 'enemyMostVulnerableToElement', supporting: 'allyMostVulnerablePresent' },
	virtuoso: { attacking: 'enemyWithHighestMagnitude', supporting: 'allyWithHighestMagnitude' },
	sovereign: { attacking: 'enemyWithHighestMagnitude', supporting: 'allyWithHighestMagnitude' },
	rogue: { attacking: 'enemyRoutableElseWeakest', supporting: 'allyWithHighestMagnitude' },
};

/*
	SCHEMA 5: CONDUCT FROM TEMPERAMENT, BECAUSE ARCHETYPE IS RETIRED.

	Whom a creature chooses used to be read off its archetype through the table above. On a
	schema 5 record there is no archetype, so every creature fell through to the single
	default and the measured result was all 96 creatures in a pool sharing one line,
	`enemySentEarliest`. Eight distinct targeting behaviours collapsed into one, which is a
	real loss of variety in the Clash and not a cosmetic one.

	Schema 5 keeps temperament, bounded 0 to 100 on five independently authored axes, and
	the frozen roster uses the range (49 distinct aggression values over 96 creatures,
	spanning 15 to 80). So conduct is derived from temperament instead, which is arguably
	what the archetype table was approximating all along: "predator" was a label for high
	aggression, "survivor" for low boldness.

	The mapping below is a LEVER, recorded with its reasoning. Each line says which
	temperament makes a creature choose that way, and every attacking line in
	CONDUCT_BY_ARCHETYPE is reachable so no behaviour is orphaned:

	  high aggression, high boldness   the strongest enemy standing: a fight picked on purpose
	  high aggression, lower boldness  the weakest enemy: finish what is already hurt
	  high curiosity                   the enemy most vulnerable to its element: a considered pick
	  high energy                      the slower enemy first: speed used as an advantage
	  low boldness                     the enemy with the lowest blow: the safest target
	  high sociability                 the enemy threatening its allies
	  otherwise                        the enemy sent earliest, the old default

	Supporting follows the same axis so a creature's two lines are coherent.
*/
export function conductFromTemperament(temperament: Partial<Record<string, number>> | null | undefined): ConductSpec {
	const at = (key: string) => {
		const value = temperament ? temperament[key] : undefined;
		return typeof value === 'number' ? value : 50;
	};
	const aggression = at('aggression');
	const boldness = at('boldness');
	const curiosity = at('curiosity');
	const energy = at('energy');
	const sociability = at('sociability');

	if (aggression >= TEMPERAMENT_HIGH_THRESHOLD) {
		return boldness >= TEMPERAMENT_HIGH_THRESHOLD
			? { attacking: 'strongestEnemyInReach', supporting: 'allyWithMostHold' }
			: { attacking: 'weakestEnemyInReach', supporting: 'allyWithLeastHold' };
	}
	if (curiosity >= TEMPERAMENT_HIGH_THRESHOLD) {
		return { attacking: 'enemyMostVulnerableToElement', supporting: 'allyMostVulnerablePresent' };
	}
	if (energy >= TEMPERAMENT_HIGH_THRESHOLD) {
		return { attacking: 'slowerEnemyWeakestFirst', supporting: 'fastestAlly' };
	}
	if (boldness <= TEMPERAMENT_LOW_THRESHOLD) {
		return { attacking: 'enemyWithLowestMagnitude', supporting: 'self' };
	}
	if (sociability >= TEMPERAMENT_HIGH_THRESHOLD) {
		return { attacking: 'enemyThreateningWeakestAlly', supporting: 'allyWithLeastHold' };
	}
	return { attacking: 'enemySentEarliest', supporting: 'allySentEarliest' };
}

export function getConductSpec(archetypeKey: string | null | undefined): ConductSpec | null {
	if (!archetypeKey) {
		return null;
	}
	const key = String(archetypeKey).toLowerCase();
	return Object.prototype.hasOwnProperty.call(CONDUCT_BY_ARCHETYPE, key)
		? CONDUCT_BY_ARCHETYPE[key]
		: null;
}

// ---------------------------------------------------------------------------
// temperament refinement thresholds - "high"/"low" per the design doc's conduct
// refinement paragraph.
// ---------------------------------------------------------------------------

export const TEMPERAMENT_HIGH_THRESHOLD = 65;
export const TEMPERAMENT_LOW_THRESHOLD = 35;

// ---------------------------------------------------------------------------
// traits with fixed meanings. `anchored` is cut from the base (assumption 10) and is no
// longer read by the engine; it stays out of this table so nothing can quietly revive it.
// ---------------------------------------------------------------------------

export const TRAIT = {
	PACK_BONDED: 'pack-bonded',
	SOLITARY: 'solitary',
	MENACING: 'menacing',
	ARMORED: 'armored',
	RESILIENT: 'resilient',
	STEALTHY: 'stealthy',
	NOCTURNAL: 'nocturnal',
	LUMINOUS: 'luminous',
};

export const PACK_BOND_HOLD_BONUS_PER_KIN = 1;
export const SOLITARY_HOLD_PENALTY_PER_ALLY = 1;

// ---------------------------------------------------------------------------
// type effectiveness matrix - lowercase both axes since creature records use lowercase
// element strings while the source JSON is capitalized.
// ---------------------------------------------------------------------------

export const TYPE_EFFECTIVENESS_MATRIX: Record<string, Record<string, number>> = (() => {
	const normalized: Record<string, Record<string, number>> = {};
	const raw = rawTypeEffectivenessMatrix as Record<string, Record<string, number>>;
	Object.keys(raw).forEach((attackerKey) => {
		const attackerLower = attackerKey.toLowerCase();
		const row = raw[attackerKey];
		normalized[attackerLower] = {};
		Object.keys(row).forEach((defenderKey) => {
			normalized[attackerLower][defenderKey.toLowerCase()] = row[defenderKey];
		});
	});
	return normalized;
})();

export function typeEffectivenessMultiplier(attackerElement: string | null | undefined, defenderElement: string | null | undefined): number {
	try {
		const row = TYPE_EFFECTIVENESS_MATRIX[String(attackerElement).toLowerCase()];
		if (!row) {
			return 1;
		}
		const value = row[String(defenderElement).toLowerCase()];
		return typeof value === 'number' ? value : 1;
	} catch (e) {
		return 1;
	}
}
