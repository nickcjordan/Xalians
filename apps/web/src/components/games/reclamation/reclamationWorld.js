import React from 'react';
import ReclamationFigure, { ReclamationSilhouette, HoldMeter } from './reclamationFigure';
import { RoleGlyph } from './reclamationGlyphs';
import { formatHold, formatHoldShown, countWord } from './reclamationNarration';
import { ghostSummary } from './reclamationPreview';
import { elementOf } from './reclamationVocabulary';

/*
	ReclamationWorld — the frame: three worlds side by side, each at one of its sites.

	Each site is a matte panel headed by the site's name and its environment line. The
	handler's creatures stand below the midline facing up; the rival's stand above it
	facing down. The thing a handler most needs from a site is who is winning it and by
	how much, so that is the site's biggest readout: a margin band under the heading that
	says "you lead by 4.2", "the rival leads by 3.1" or "level, to the Court", with the
	two raw totals beside it.

	When a creature is armed, every site says what sending it there would do ("you would
	lead by 2.1", "still behind by 1.3") so the choice of site is legible before the click.

	An empty site is quiet: name and weather, open ground, one faint word. It speaks only
	when there is something to say: the send invitation while a creature is armed, the
	move target while a swift creature is being moved, or the Court's stamp. A one-sided site says who holds it and skips
	the totals, since the one number is already in the sentence.

	Every hold shown is passed in already computed by the engine's prepare(): this
	component derives nothing except differences between numbers it was given.

	PASS 3, THE STAKE (assumption 22). A tray head carries a "Stake" control while its
	world is one this handler may still stake, and a mark saying what a staked world now
	counts. Neither is a decision this component makes: `stakeableSiteIds` is the engine's
	own list of legal stakes and `stakes` is its own per-site arithmetic, and pressing the
	control only asks the table to put the question. The question itself is answered on the
	status strip, so the worlds stay on screen while it is answered.
*/

/*
	The environment as a picture: one temperature scale shared by every site (the coldest
	and hottest bands any site in the table has), with the site's band drawn on it, and
	the medium as a glyph. While a creature is previewed its own tolerance band is drawn
	over the site's, so strain is seen as the two bands missing each other rather than
	read as a word.
*/
export const SCALE_MIN_C = -110;
export const SCALE_MAX_C = 130;

function pctOnScale(c) {
	const clamped = Math.max(SCALE_MIN_C, Math.min(SCALE_MAX_C, c));
	return ((clamped - SCALE_MIN_C) / (SCALE_MAX_C - SCALE_MIN_C)) * 100;
}

function MediumGlyph({ medium }) {
	const m = String(medium || '').toLowerCase();
	if (m === 'liquid') {
		return (
			<svg className="rec-medium-glyph" viewBox="0 0 12 12" aria-hidden="true">
				<path d="M6 1.2 C6 1.2 2.4 5.6 2.4 7.8 A3.6 3.6 0 0 0 9.6 7.8 C9.6 5.6 6 1.2 6 1.2 Z" />
			</svg>
		);
	}
	if (m === 'vacuum') {
		return (
			<svg className="rec-medium-glyph" viewBox="0 0 12 12" aria-hidden="true">
				<circle cx="6" cy="6" r="3.6" fill="none" strokeWidth="1.4" />
				<circle cx="6" cy="6" r="0.9" />
			</svg>
		);
	}
	if (m === 'solid') {
		return (
			<svg className="rec-medium-glyph" viewBox="0 0 12 12" aria-hidden="true">
				<path d="M1.5 10.5 L4.5 3.5 L7 7.5 L8.5 5 L10.5 10.5 Z" />
			</svg>
		);
	}
	// gas: three drifting strokes
	return (
		<svg className="rec-medium-glyph" viewBox="0 0 12 12" aria-hidden="true">
			<path d="M1.5 3.2 C3 2 4.5 4.4 6 3.2 S9 2 10.5 3.2 M1.5 6.2 C3 5 4.5 7.4 6 6.2 S9 5 10.5 6.2 M1.5 9.2 C3 8 4.5 10.4 6 9.2 S9 8 10.5 9.2" fill="none" strokeWidth="1.2" strokeLinecap="round" />
		</svg>
	);
}

export function EnvironmentScale({ site, ghost }) {
	const env = (site && site.environment) || {};
	const t = env.temperatureC || {};
	const hasBand = typeof t.min === 'number' && typeof t.max === 'number';
	const tol = ghost && ghost.tolerance;
	const own = tol && tol.temperatureC && typeof tol.temperatureC.min === 'number' ? tol.temperatureC : null;
	const mediumOk = !tol ? null
		: (tol.breathes.length > 0 && env.medium && !tol.breathes.includes(env.medium)) ? 'cannot'
			: (env.medium && !tol.ambientMedia.includes(env.medium)) ? 'strained' : 'ok';
	const medium = env.medium ? String(env.medium) : 'unknown';
	const bandText = hasBand ? `${t.min} to ${t.max} C` : 'unrecorded band';
	const ownText = own ? `; the creature tolerates ${own.min} to ${own.max} C` : '';
	return (
		<div className={`rec-env${ghost ? ` rec-env--${ghost.strainLevel}` : ''}`} title={`${medium}, ${bandText}${ownText}`}>
			<span className={`rec-env-medium rec-env-medium--${medium}${mediumOk ? ` rec-env-medium--${mediumOk}` : ''}`} aria-label={`${medium} medium`}>
				<MediumGlyph medium={medium} />
			</span>
			<span className="rec-env-scale" aria-hidden="true">
				<span className="rec-env-zero" style={{ left: `${pctOnScale(0)}%` }} />
				{hasBand && (
					<span className="rec-env-band rec-env-band--site" style={{ left: `${pctOnScale(t.min)}%`, width: `${pctOnScale(t.max) - pctOnScale(t.min)}%` }} />
				)}
				{/* pass 37: placed by transform, so previewing one creature after another moves paint, not layout */}
				{own && (
					<span className="rec-env-band rec-env-band--creature" style={{ transform: `translateX(${pctOnScale(own.min)}cqw)`, width: `${Math.max(0.8, pctOnScale(own.max) - pctOnScale(own.min))}%` }} />
				)}
			</span>
			<span className="rec-env-readout g-mono">{hasBand ? `${t.min} to ${t.max} C` : 'no band'}</span>
		</div>
	);
}

/*
	PASS 29. THE FOOTING: what this world asks of YOUR squad.

	Named "footing", not "stake": Stake is already the game's own mechanic, the control
	on the panel head that makes a world count two. This is a different thing, and
	sharing the word would make the panel say "stake" twice about two unrelated rules.

	An empty world used to print the single word "unclaimed" in the middle of a 264px
	body, three times across the frame, which a blind critic called "the least motivating
	opening board possible" and scored 4 of 10 for reason to keep playing. "Unclaimed"
	describes the interface; it is true of every empty world and so distinguishes none of
	them.

	What distinguishes them is who of yours can stand here, and it is sharply different
	per world: measured over five seeds and every site, the number of a twelve-creature
	squad comfortable at a site ranges from 0 to 11 (mean 5.4), and at 87 of 210 sites
	fewer than half are. A native creature holds 1.5x here, and 61% of worlds offer one.

	So the empty panel now says what the world costs and what it offers, in the handler's
	own terms. It is still quiet: three short lines, no colour beyond the element already
	on the panel, and it disappears the moment a creature stands here, because from then
	on the figures and the balance bar are the better answer.
*/
export function WorldFooting({ footing, world, compact, detail }) {
	if (!footing || !footing.of) {
		// no bench to measure against (a resumed match mid-resolution, say): say the one
		// true thing rather than an arithmetic of nothing
		return <span className="rec-site-unclaimed">unclaimed</span>;
	}
	const { comfortable, severe, native, of } = footing;
	const hostile = of - comfortable;
	/*
		PASS 38. In simple mode the footing keeps its purpose (which world suits this squad)
		in the fewest words: how many are at ease, and how many are at home. The strain
		breakdown and the "half again" arithmetic are advanced mode and the help panel.
	*/
	if (compact) {
		return (
			<div className="rec-world-footing rec-world-footing--compact" data-world-footing>
				<span className="rec-world-footing-line" data-footing-ease>
					<b className="g-mono rec-world-footing-big">{comfortable}</b> of your {of} hold well here
				</span>
				{detail && native > 0 && (
					<span className="rec-world-footing-line rec-world-footing-line--home" data-footing-home>
						<b className="g-mono">{native}</b> {native === 1 ? 'calls' : 'call'} it home
					</span>
				)}
				{detail && hostile > 0 && (
					<span className="rec-world-footing-line rec-world-footing-line--cost" data-footing-cost>
						<b className="g-mono">{hostile}</b> strained{severe > 0 ? `, ${severe} severely` : ''}
					</span>
				)}
			</div>
		);
	}
	return (
		<div className="rec-world-footing" data-world-footing>
			<span className="rec-world-footing-head">unclaimed</span>
			<span className="rec-world-footing-line" data-footing-ease>
				<b className="g-mono">{comfortable}</b> of your <b className="g-mono">{of}</b> {comfortable === 1 ? 'is' : 'are'} at ease here
			</span>
			{hostile > 0 && (
				<span className="rec-world-footing-line rec-world-footing-line--cost" data-footing-cost>
					{/*
						"the other 12 are strained, 12 severely" is the arithmetic talking. When
						every strained creature is severely strained, which is the case a world
						like Magmuth produces and the sharpest warning the panel can give, it
						says so once.
					*/}
					{severe === hostile
						? <>{comfortable === 0 ? 'every one of them is' : hostile === 1 ? 'the other is' : `the other ${hostile} are`} <b className="g-mono">severely</b> strained</>
						: severe > 0
							? <>{hostile === 1 ? 'the other is strained' : `the other ${hostile} are strained`}, <b className="g-mono">{severe}</b> severely</>
							: <>{hostile === 1 ? 'the other is strained' : `the other ${hostile} are strained`}</>}
				</span>
			)}
			{native > 0 && (
				<span className="rec-world-footing-line rec-world-footing-line--home" data-footing-home>
					<b className="g-mono">{native}</b> of yours {native === 1 ? 'calls' : 'call'} {world && world.planet ? world.planet : 'this world'} home, and {native === 1 ? 'holds' : 'hold'} half again as much on it
				</span>
			)}
		</div>
	);
}

function marginText(mine, theirs) {
	const diff = mine - theirs;
	if (Math.abs(diff) < 0.05) {
		return { who: 'level', text: 'level, to the Court' };
	}
	if (diff > 0) {
		return { who: 'mine', text: theirs === 0 ? `you hold it, ${formatHold(mine)}, unopposed` : `you lead by ${formatHold(diff)}` };
	}
	return { who: 'theirs', text: mine === 0 ? `rival holds it, ${formatHold(theirs)}, unopposed` : `rival leads by ${formatHold(-diff)}` };
}

function ghostText(ghost, mine, theirs) {
	const after = mine + ghost.hold - theirs;
	if (theirs === 0) {
		return mine === 0 ? 'claims it, unopposed' : `holds it unopposed, ${formatHold(mine + ghost.hold)}`;
	}
	if (Math.abs(after) < 0.05) {
		return 'would be level';
	}
	if (after > 0) {
		return mine > theirs ? `lead grows to ${formatHold(after)}` : `you would lead by ${formatHold(after)}`;
	}
	return `still behind by ${formatHold(-after)}`;
}

/*
	THE STAKE, on the tray head (Pass 3, assumption 22). A world this handler may still
	stake carries a small "Stake" control; a world already staked carries a mark saying
	what it now counts, in the colour of whoever staked it, and in both colours when both
	handlers staked the same one. Everything here is the engine's own arithmetic: the
	`stakes` block of the public state carries `by` and `countedValue` per site, so the
	head never counts anything itself.
*/
export function StakeMark({ stake, you }) {
	if (!stake || !stake.by || stake.by.length === 0) {
		return null;
	}
	const mine = stake.by.includes(you);
	const theirs = stake.by.some((seat) => seat !== you);
	const who = mine && theirs ? 'both' : mine ? 'mine' : 'theirs';
	const byText = who === 'both' ? 'staked by both handlers' : who === 'mine' ? 'staked by you' : 'staked by the rival';
	return (
		<span
			className={`rec-staked rec-staked--${who}`}
			data-staked={who}
			data-staked-value={stake.countedValue}
			title={`${byText}: it counts ${countWord(stake.countedValue)} toward the Charter for whoever holds it at the Ruling.`}
		>
			counts {countWord(stake.countedValue)}
		</span>
	);
}

function ReclamationWorld({
	frame,
	board,
	you,
	holds,
	totals,
	hurt,
	ghosts,
	verdicts,
	armedRecordId,
	movingRecordId,
	onSiteClick,
	onSiteHover,
	onFigureClick,
	clickable,
	recommendedSiteId,
	holdingIds,
	hiddenEnemyCount,
	forecast,
	ownSweeps,
	highlights,
	clashSiteId,
	siteFootings,
	arrival,
	hoverSiteId,
	previewRecordId,
	advanced,
	stakes,
	stakeableSiteIds,
	pendingStakeSiteId,
	onStake,
}) {
	const opponent = you === 'A' ? 'B' : 'A';
	const hl = highlights || {};
	// pass 28: while a world is clashing the other two recede, so the eye has somewhere
	// to go. Only ever set during playback, and released at the Court's ruling.
	const clashing = clashSiteId || null;

	/*
		PASS 30. The entrance is worn for its own duration and then taken off.

		It used to be a permanent class, which was harmless only because nothing else
		animated the panel: the animation ran once on mount and sat filled forever. Pass 28
		added the camera, a second animation on the same element, and when the camera
		released at the Court's ruling the browser restarted `rec-site-enter` from opacity
		zero - so the verdict, the payoff of the whole round, was delivered over a board
		fading in from nothing. A blind critic called that frame "an empty page" and rated
		it a shipping blocker.

		Dropping the class once the entrance has played makes it a one-shot, which is what
		it always meant to be, and lets the camera come and go without the panel
		re-entering behind it. Keyed off the component's own mount rather than off any
		phase, so it cannot be re-armed by a state change mid-round.
	*/
	const [entered, setEntered] = React.useState(true);
	React.useEffect(() => {
		// 460ms animation plus the longest per-panel stagger (2 x 110ms), with room
		const timer = setTimeout(() => setEntered(false), 900);
		return () => clearTimeout(timer);
	}, []);
	const arrivedIds = arrival ? arrival.ids : [];
	const stakeable = new Set(stakeableSiteIds || []);

	return (
		<div className="rec-world">
			{hiddenEnemyCount > 0 && (
				<div className="rec-hidden-banner rec-rise" data-hidden-banner>
					<ReclamationSilhouette count={hiddenEnemyCount} />
					<span className="rec-hidden-banner-text">
						The rival has {hiddenEnemyCount === 1 ? 'a creature' : `${hiddenEnemyCount} creatures`} hidden somewhere in the frame. It is revealed when the worlds clash.
					</span>
				</div>
			)}
			<div className="rec-sites">
				{frame.sites.map((site, siteIndex) => {
					const theirs = (board[site.id][opponent] || []).filter((e) => e.record);
					const mine = (board[site.id][you] || []).filter((e) => e.record);
					const totalMine = totals[site.id] ? totals[site.id][you] : 0;
					const totalTheirs = totals[site.id] ? totals[site.id][opponent] : 0;
					const empty = theirs.length === 0 && mine.length === 0;
					const margin = empty ? { who: 'empty', text: '' } : marginText(totalMine, totalTheirs);
					const ghost = ghosts && ghosts[site.id];
					const verdict = verdicts && verdicts[site.id];
					const stake = stakes && stakes[site.id];
					const stakedHere = !!(stake && stake.by && stake.by.length > 0);
					const canStake = !!onStake && stakeable.has(site.id);

					/*
						PASS 30, A BUG PASS 28 INTRODUCED.

						`rec-site--enter` used to be harmless as a permanent class: its animation
						runs once when the element is created and then sits filled. Pass 28 added
						the camera, which puts a DIFFERENT animation on the same element while a
						world is clashing. When the camera releases at the Court's ruling, the
						element's animation list changes back and the browser starts
						`rec-site-enter` AGAIN, from opacity 0.

						The result was that the Court's verdict, the payoff of the whole round,
						was delivered over a board fading in from nothing. A blind critic called
						the ruling frame "an empty page" and rated it a shipping blocker; the
						probe confirmed all three panels running `rec-site-enter` at the judge
						event, at opacities 0.67, 0.89 and 0.98.

						So the entrance is worn only while it is actually entering. Once a round
						has been played at this frame it is dropped, and the camera can come and
						go without the panel re-entering behind it.
					*/
					const classes = ['g-panel', 'rec-site', `rec-site--${margin.who}`, `g-el-${site.world.element}`];
					if (entered) {
						classes.push('rec-site--enter');
					}
					// the site something just landed on pulses in the colour of who sent it
					if (arrival && arrival.siteId === site.id) {
						classes.push(arrival.seat === you ? 'rec-site--landed-mine' : 'rec-site--landed-theirs');
					}
					if (empty) {
						classes.push('rec-site--empty');
					}
					if (clickable) {
						classes.push('rec-site--clickable');
					}
					if (ghost || movingRecordId) {
						classes.push('rec-site--targeted');
					}
					if (verdict) {
						classes.push(`rec-site--verdict-${verdict.who}`);
					}
					const recommended = recommendedSiteId === site.id;
					if (recommended) {
						classes.push('rec-site--recommended');
					}
					if (hoverSiteId === site.id) {
						classes.push('rec-site--hover');
					}
					if (stakedHere) {
						classes.push('rec-site--staked');
					}
					if (pendingStakeSiteId === site.id) {
						classes.push('rec-site--stake-pending');
					}
					/*
						PASS 28. The clashing world, and the two that are waiting.

						Measured: over 61 frames of a live Clash, nothing on the table said which
						of the three worlds the current event belonged to. The panel now says it,
						and the other two dim, so the round reads as three fights in sequence
						rather than one undifferentiated wall of text.
					*/
					if (clashing) {
						classes.push(clashing === site.id ? 'rec-site--clashing' : 'rec-site--waiting');
					}

					// pass 38: the hold a creature would stand at after the Clash, from what stands now
					const forecastOf = (entry) => {
						const f = forecast && forecast[entry.recordId];
						const h = holds[entry.recordId];
						if (!f || !h || typeof h.hold !== 'number') {
							return null;
						}
						if (f.downed) {
							return 0;
						}
						return Math.abs(f.hold - h.hold) < 0.05 ? null : f.hold;
					};
					const forecastTotal = (entries, live) => {
						let changed = false;
						const sum = entries.filter((e) => e.record).reduce((acc, e) => {
							const f = forecastOf(e);
							const h = holds[e.recordId];
							if (f === null || !h) {
								return acc + (h && typeof h.hold === 'number' ? h.hold : 0);
							}
							changed = true;
							return acc + f;
						}, 0);
						return changed && Math.abs(sum - live) > 0.05 ? sum : null;
					};
					const afterMine = forecastTotal(mine, totalMine);
					const afterTheirs = forecastTotal(theirs, totalTheirs);

					// the key is passed on the element itself, never inside the spread: React
					// warns loudly about a key arriving through a props object
					const figureProps = (entry, seat, facing) => ({
						record: entry.record,
						element: elementOf(entry.record),
						seat,
						you,
						facing,
						hidden: entry.hidden,
						hold: holds[entry.recordId] ? holds[entry.recordId].hold : undefined,
						printedHold: holds[entry.recordId] ? holds[entry.recordId].printed : undefined,
						hurt: !!(hurt && hurt[entry.recordId]),
						strainLevel: holds[entry.recordId] ? holds[entry.recordId].strainLevel : undefined,
						isHome: holds[entry.recordId] ? holds[entry.recordId].isHome : false,
						unstrainedHold: holds[entry.recordId] ? holds[entry.recordId].unstrained : undefined,
						baseHold: holds[entry.recordId] ? holds[entry.recordId].baseHold : undefined,
						// the base redesign's one glyph per creature: what it does at the Clash
						role: holds[entry.recordId] ? holds[entry.recordId].role : entry.role,
						// pass 38: one reading per hold in simple mode, the number; the meter is advanced
						showMeter: !!advanced,
						fallen: !!entry.fallen,
						ownSweep: seat === you && !!(ownSweeps && ownSweeps[entry.recordId] > 0),
						forecast: forecastOf(entry),
						blowMagnitude: holds[entry.recordId] ? holds[entry.recordId].blowMagnitude : undefined,
						selected: armedRecordId === entry.recordId || movingRecordId === entry.recordId,
						// pass 38: not at the Ruling, where the winners of the round were dimmed along with the fallen
						dimmed: !verdict && holdingIds && holdingIds.includes(entry.recordId),
						acting: hl.acting === entry.recordId,
						hit: hl.hit === entry.recordId,
						// pass 32: the engine step, so an animation replays on a repeat actor
						beat: hl.beat,
						hover: hl.hover === entry.recordId,
						flash: hl.hit === entry.recordId ? hl.flash : undefined,
						arrive: arrivedIds.includes(entry.recordId),
						threat: forecastOf(entry) === 0 ? { level: 'downed', text: 'Falls in the Clash, as the board stands now' } : undefined,
						lossText: forecastOf(entry) !== null ? `After the Clash, as the board stands now: ${formatHoldShown(forecastOf(entry))}` : undefined,
						onClick: (e) => {
							e.stopPropagation();
							onFigureClick(entry, seat, site);
						},
						title: 'Inspect this creature',
					});

					return (
						<section
							className={classes.join(' ')}
							key={site.id}
							data-site-id={site.id}
							style={{ '--rec-i': siteIndex }}
							onClick={clickable ? () => onSiteClick(site.id) : undefined}
							onMouseEnter={clickable && onSiteHover ? () => onSiteHover(site.id) : undefined}
							onMouseLeave={clickable && onSiteHover ? () => onSiteHover(null) : undefined}
							role={clickable ? 'button' : undefined}
							tabIndex={clickable ? 0 : undefined}
							onKeyDown={clickable ? (e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onSiteClick(site.id);
								}
							} : undefined}
						>
							<header className="rec-site-head">
								{/* pass 38: no index box (nothing refers to "world 2"); the place and the temperature scale are advanced mode, the place's description stays on the name as deeper reading */}
								<span className="rec-site-dot" aria-hidden="true" />
								<h3 className="rec-site-name" title={`${site.name}${site.description ? `. ${site.description}` : ''}`}>{site.world.planet}</h3>
								{advanced && <span className="rec-site-place" title={site.description || undefined}>{site.name}</span>}
								{advanced && <span className="rec-env-slot"><EnvironmentScale site={site} ghost={ghost} /></span>}
								{/* the stake: what this world counts, or the control that puts it up */}
								<StakeMark stake={stake} you={you} />
								{canStake && (
									<button
										type="button"
										className={`rec-stake-btn${pendingStakeSiteId === site.id ? ' rec-stake-btn--asking' : ''}`}
										data-stake={site.id}
										aria-pressed={pendingStakeSiteId === site.id}
										title={`Stake ${site.world.planet}: counts ${stakedHere ? 'three' : 'two'} worlds for whoever holds it. Once a game, before your first send of a round.`}
										onClick={(e) => {
											e.stopPropagation();
											onStake(site.id);
										}}
									>
										<span className="rec-stake-word">Stake </span>&times;2
									</button>
								)}
								{recommended && <span className="rec-site-recommend" data-recommended-site>recommended</span>}
							</header>

							{/* the tally: the two sides' totals as printed readouts, the leading side's in
							    its colour, and one sentence between them. A previewed send prints its
							    own figure after yours. An empty world keeps the room and shows nothing. */}
							{(() => {
								const ghostHold = ghost ? ghost.hold : 0;
								const afterText = ghost ? ghostText(ghost, totalMine, totalTheirs) : null;
								const quiet = empty && !ghost;
								const hiddenBar = quiet && !verdict;
								return (
									<div className={`rec-tally rec-tally--${margin.who}${hiddenBar ? ' rec-tally--hidden' : ''}${ghost ? ' rec-tally--preview' : ''}`} data-site-margin={site.id}>
										<span className="rec-tally-side rec-tally-side--theirs">
											<span className="rec-tally-label">rival</span>
											{/*
												pass 30: the two big totals either side of the balance bar round.
												The MARGIN SENTENCE below keeps its tenth deliberately: "you lead
												by 0.4" is a real and actionable state, and rounding it would print
												"you lead by 0" over a world that is genuinely, narrowly yours.
											*/}
											<span className="rec-tally-value rec-tick" title={formatHold(totalTheirs)} data-total-seat={opponent} data-site-total={site.id} key={`t-${formatHold(totalTheirs)}`}>{formatHoldShown(totalTheirs)}</span>
											{afterTheirs !== null && <span className="rec-tally-after" title="After the Clash, from what stands now" data-tally-after={opponent}><span className="rec-after-arrow" aria-hidden="true">&rarr;</span>{formatHoldShown(afterTheirs)}</span>}
										</span>
										{(() => {
											// the balance: the rival's hold pushes in from the left, yours from the
											// right, a previewed send as a hatched extension of yours; the words are
											// kept only for the states a bar cannot say (unclaimed, level)
											const total = totalMine + totalTheirs + ghostHold;
											const pctTheirs = total > 0 ? (totalTheirs / total) * 100 : 0;
											const pctMine = total > 0 ? (totalMine / total) * 100 : 0;
											// pass 38: an empty world's bar would be all preview, which read as a loading bar; it stays empty until someone stands there
											const pctGhost = total > 0 && (totalMine + totalTheirs) > 0 ? (ghostHold / total) * 100 : 0;
											const word = total === 0 ? 'unclaimed' : Math.abs(totalMine + ghostHold - totalTheirs) < 0.05 ? 'level' : null;
											return (
												<span className={`rec-balance${ghost ? ' rec-balance--preview' : ''}`} title={afterText || margin.text || 'unclaimed'} data-balance={site.id} data-balance-text={afterText || margin.text || 'unclaimed'}>
													{/* pass 37: each fill spans the bar and is clipped to its share, so a
													    preview changes paint only and never counts as the table moving */}
													<span className="rec-balance-fill rec-balance-fill--theirs" style={{ clipPath: `inset(0 ${100 - pctTheirs}% 0 0)` }} />
													<span className="rec-balance-fill rec-balance-fill--ghost" style={{ clipPath: `inset(0 ${pctMine}% 0 ${Math.max(0, 100 - pctMine - pctGhost)}%)` }} />
													<span className="rec-balance-fill rec-balance-fill--mine" style={{ clipPath: `inset(0 0 0 ${100 - pctMine}%)` }} />
													{word && <span className="rec-balance-word">{word}</span>}
												</span>
											);
										})()}
										<span className="rec-tally-side rec-tally-side--mine">
											<span className="rec-tally-value rec-tick" title={formatHold(totalMine)} data-total-seat={you} data-site-total={site.id} key={`m-${formatHold(totalMine)}`}>{formatHoldShown(totalMine)}</span>
											{afterMine !== null && <span className="rec-tally-after" title="After the Clash, from what stands now" data-tally-after={you}><span className="rec-after-arrow" aria-hidden="true">&rarr;</span>{formatHoldShown(afterMine)}</span>}
											{ghost && advanced && <span className="rec-tally-plus">+{formatHoldShown(ghostHold)}</span>}
											<span className="rec-tally-label">you</span>
										</span>
									</div>
								);
							})()}

							{/* the ground: the rival's rank on the far edge, yours on the near one, each
							    edge painted in its side's colour and labelled, so whose creature stands
							    where is read from the floor before the figures are */}
							<div className={`rec-site-field rec-site-floor${empty ? ' rec-site-field--empty' : ''}`}>
								<div className={`rec-rank rec-rank--theirs${theirs.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="theirs" data-rank-rows={rankGrid(theirs.length)['--rank-rows-n']} data-rank-list={theirs.length >= 2 && theirs.length <= 4 ? '' : undefined} data-rank-rows-wide={rankGrid(theirs.length)['--rank-rows-w']} style={rankGrid(theirs.length)}>
									<span className="rec-rank-edge rec-rank-edge--theirs" aria-hidden="true">rival</span>
									{theirs.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, opponent, 'down')} />)}
								</div>

								<div className={`rec-site-midline${empty ? ' rec-site-midline--empty' : ''}`}>
									{ghost && (
										<span className="rec-ghost" data-ghost={site.id}>
											{/* pass 38: three identical "send here" calls cut; the outlined world and its number are the call */}
											{/* simple mode prints the same whole number the figure will carry once sent */}
											<span className="rec-ghost-value">{formatHoldShown(ghost.hold)}<span className="rec-ghost-unit">hold</span></span>
											<HoldMeter hold={ghost.hold} unstrained={ghost.unstrained} isHome={ghost.isHome} strainLevel={ghost.strainLevel} size="large" />
											{/* the arithmetic of the send, from the engine's own numbers: the role
											    in a sentence, then what it would do to the board as it stands */}
											{(() => {
												/*
													pass 38: one sentence for what this send does HERE, from the
													engine's numbers, in place of the role's generic sentence that
													printed the same words on every world
												*/
												const summary = ghostSummary(ghost, formatHoldShown);
												const caughtByOwn = ghost.role !== 'sweep' && mine.some((e) => holds[e.recordId] && holds[e.recordId].role === 'sweep');
												if (!summary && !caughtByOwn) {
													return null;
												}
												const warn = (summary && summary.warn) || caughtByOwn;
												return (
													<span className="rec-ghost-plan" data-ghost-plan={site.id}>
														<span className={`rec-ghost-role${warn ? ' rec-ghost-role--warn' : ''}`} title={ghost.roleLine} data-ghost-warn={warn ? site.id : undefined}>
															{ghost.role && ghost.role !== 'none' && <RoleGlyph role={ghost.role} />}
															{summary ? summary.text : ''}
															{caughtByOwn && <span className="rec-ghost-own" data-ghost-own={site.id}>{summary ? '. ' : ''}Your sweep here will hit it too</span>}
														</span>
														{advanced && ghost.role === 'sweep' && (ghost.lines || []).length > 1 && (ghost.lines || []).map((line, i) => (
															<span className="rec-ghost-line" key={`${site.id}-${i}`}>{line}</span>
														))}
													</span>
												);
											})()}
										</span>
									)}
									{!ghost && movingRecordId && <span className="rec-ghost rec-ghost--relocate">move here</span>}
									{!ghost && !movingRecordId && verdict && (
										<span className={`rec-stamp rec-stamp--${verdict.who} rec-stamp--down`}>{verdict.text}</span>
									)}
									{!ghost && !movingRecordId && !verdict && empty && (
										<WorldFooting footing={siteFootings ? siteFootings[site.id] : null} world={site.world} compact detail={advanced} />
									)}
								</div>

								<div className={`rec-rank rec-rank--mine${mine.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="mine" data-rank-rows={rankGrid(mine.length)['--rank-rows-n']} data-rank-list={mine.length >= 2 && mine.length <= 4 ? '' : undefined} data-rank-rows-wide={rankGrid(mine.length)['--rank-rows-w']} style={rankGrid(mine.length)}>
									{mine.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, you, 'up')} />)}
									<span className="rec-rank-edge rec-rank-edge--mine" aria-hidden="true">you</span>
								</div>
							</div>
						</section>
					);
				})}
			</div>
		</div>
	);
}

/*
	PASS 37. A rank is a fixed box, so the figures in it size to the box rather than the box to
	the figures. The rows and columns a rank of n needs are handed to the CSS, which divides
	the rank's own measured size by them (container query units), so a world with eleven
	creatures on one side shows eleven smaller figures in the same space as one large one.
	Two grids are handed over, narrow and wide, and a container query on the rank's own
	width picks between them.
*/
export function rankGrid(n) {
	const count = Math.max(1, n);
	// a narrow rank (a phone's world, about 120px) takes four abreast, a wide one seven
	const narrow = count <= 4 ? 1 : count <= 10 ? 2 : 3;
	// pass 38: two to four in a phone's world stand one per row, each with its name, instead of shrinking abreast
	const list = count >= 2 && count <= 4;
	const wide = count <= 7 ? 1 : count <= 14 ? 2 : 3;
	return {
		'--rank-rows-n': list ? count : narrow,
		'--rank-cols-n': list ? 1 : Math.ceil(count / narrow),
		'--rank-rows-w': wide,
		'--rank-cols-w': Math.ceil(count / wide),
	};
}

export default ReclamationWorld;
