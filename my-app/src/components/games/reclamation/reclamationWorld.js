import React from 'react';
import ReclamationFigure, { ReclamationSilhouette, HoldMeter } from './reclamationFigure';
import { RoleGlyph } from './reclamationGlyphs';
import { formatHold, countWord } from './reclamationNarration';

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
				{own && (
					<span className="rec-env-band rec-env-band--creature" style={{ left: `${pctOnScale(own.min)}%`, width: `${Math.max(0.8, pctOnScale(own.max) - pctOnScale(own.min))}%` }} />
				)}
			</span>
			<span className="rec-env-readout g-mono">{hasBand ? `${t.min} to ${t.max} C` : 'no band'}</span>
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
	threats,
	highlights,
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

					const classes = ['g-panel', 'rec-site', 'rec-site--enter', `rec-site--${margin.who}`, `g-el-${site.world.element}`];
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

					// the key is passed on the element itself, never inside the spread: React
					// warns loudly about a key arriving through a props object
					const figureProps = (entry, seat, facing) => ({
						record: entry.record,
						element: entry.record.element.primary,
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
						blowMagnitude: holds[entry.recordId] ? holds[entry.recordId].blowMagnitude : undefined,
						selected: armedRecordId === entry.recordId || movingRecordId === entry.recordId,
						dimmed: holdingIds && holdingIds.includes(entry.recordId),
						acting: hl.acting === entry.recordId,
						hit: hl.hit === entry.recordId,
						hover: hl.hover === entry.recordId,
						flash: hl.hit === entry.recordId ? hl.flash : undefined,
						arrive: arrivedIds.includes(entry.recordId),
						threat: threats && threats[entry.recordId] ? threats[entry.recordId] : undefined,
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
								<span className="rec-site-index" aria-hidden="true">{siteIndex + 1}</span>
								<h3 className="rec-site-name">{site.world.planet}</h3>
								<span className="rec-site-place" title={site.description || undefined}>{site.name}</span>
								{/* simple mode shows the scale only while a creature is previewed; its room is kept so the card never jumps */}
								<span className={`rec-env-slot${advanced || ghost ? '' : ' rec-env-slot--quiet'}`}><EnvironmentScale site={site} ghost={ghost} /></span>
								{/* the stake: what this world counts, or the control that puts it up */}
								<StakeMark stake={stake} you={you} />
								{canStake && (
									<button
										type="button"
										className={`rec-stake-btn${pendingStakeSiteId === site.id ? ' rec-stake-btn--asking' : ''}`}
										data-stake={site.id}
										aria-pressed={pendingStakeSiteId === site.id}
										title={`Stake ${site.world.planet}: it would count ${stakedHere ? 'three' : 'two'} toward the Charter for whoever holds it. Once a Proving, and only before your first send of the round.`}
										onClick={(e) => {
											e.stopPropagation();
											onStake(site.id);
										}}
									>
										Stake
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
											<span className="rec-tally-value rec-tick" data-total-seat={opponent} data-site-total={site.id} key={`t-${formatHold(totalTheirs)}`}>{formatHold(totalTheirs)}</span>
										</span>
										{(() => {
											// the balance: the rival's hold pushes in from the left, yours from the
											// right, a previewed send as a hatched extension of yours; the words are
											// kept only for the states a bar cannot say (unclaimed, level)
											const total = totalMine + totalTheirs + ghostHold;
											const pctTheirs = total > 0 ? (totalTheirs / total) * 100 : 0;
											const pctMine = total > 0 ? (totalMine / total) * 100 : 0;
											const pctGhost = total > 0 ? (ghostHold / total) * 100 : 0;
											const word = total === 0 ? 'unclaimed' : Math.abs(totalMine + ghostHold - totalTheirs) < 0.05 ? 'level' : null;
											return (
												<span className={`rec-balance${ghost ? ' rec-balance--preview' : ''}`} title={afterText || margin.text || 'unclaimed'} data-balance={site.id} data-balance-text={afterText || margin.text || 'unclaimed'}>
													<span className="rec-balance-fill rec-balance-fill--theirs" style={{ width: `${pctTheirs}%` }} />
													<span className="rec-balance-fill rec-balance-fill--ghost" style={{ width: `${pctGhost}%`, right: `${pctMine}%` }} />
													<span className="rec-balance-fill rec-balance-fill--mine" style={{ width: `${pctMine}%` }} />
													{word && <span className="rec-balance-word">{word}</span>}
												</span>
											);
										})()}
										<span className="rec-tally-side rec-tally-side--mine">
											<span className="rec-tally-value rec-tick" data-total-seat={you} data-site-total={site.id} key={`m-${formatHold(totalMine)}`}>{formatHold(totalMine)}</span>
											{ghost && <span className="rec-tally-plus">+{formatHold(ghostHold)}</span>}
											<span className="rec-tally-label">you</span>
										</span>
									</div>
								);
							})()}

							{/* the ground: the rival's rank on the far edge, yours on the near one, each
							    edge painted in its side's colour and labelled, so whose creature stands
							    where is read from the floor before the figures are */}
							<div className={`rec-site-field rec-site-floor${empty ? ' rec-site-field--empty' : ''}`}>
								<div className={`rec-rank rec-rank--theirs${theirs.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="theirs">
									<span className="rec-rank-edge rec-rank-edge--theirs" aria-hidden="true">rival</span>
									{theirs.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, opponent, 'down')} />)}
									{theirs.length === 0 && <span className="rec-rank-open">no one</span>}
								</div>

								<div className={`rec-site-midline${empty ? ' rec-site-midline--empty' : ''}`}>
									{ghost && (
										<span className="rec-ghost" data-ghost={site.id}>
											<span className="rec-ghost-cta">{ghost.preview ? 'would hold' : 'send here'}</span>
											<HoldMeter hold={ghost.hold} unstrained={ghost.unstrained} isHome={ghost.isHome} strainLevel={ghost.strainLevel} size="large" scale />
											<span className="rec-ghost-value">{formatHold(ghost.hold)}</span>
											{/* the arithmetic of the send, from the engine's own numbers: the role
											    in a sentence, then what it would do to the board as it stands */}
											{ghost.roleLine && (
												<span className="rec-ghost-plan" data-ghost-plan={site.id}>
													<span className="rec-ghost-role">
														{ghost.role && ghost.role !== 'none' && <RoleGlyph role={ghost.role} />}
														{ghost.roleLine}
													</span>
													{advanced && (ghost.lines || []).map((line, i) => (
														<span className="rec-ghost-line" key={`${site.id}-${i}`}>{line}</span>
													))}
												</span>
											)}
										</span>
									)}
									{!ghost && movingRecordId && <span className="rec-ghost rec-ghost--relocate">move here</span>}
									{!ghost && !movingRecordId && verdict && (
										<span className={`rec-stamp rec-stamp--${verdict.who} rec-stamp--down`}>{verdict.text}</span>
									)}
									{!ghost && !movingRecordId && !verdict && empty && (
										<span className="rec-site-unclaimed">unclaimed</span>
									)}
								</div>

								<div className={`rec-rank rec-rank--mine${mine.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="mine">
									{mine.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, you, 'up')} />)}
									{mine.length === 0 && <span className="rec-rank-open">no one</span>}
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

export default ReclamationWorld;
