import React from 'react';
import ReclamationFigure, { ReclamationSilhouette } from './reclamationFigure';
import { RoleGlyph, SwiftGlyph, HomeGlyph, StrainGlyph } from './reclamationGlyphs';
import { formatHold, formatHoldShown, countWord, speciesLabel } from './reclamationNarration';
import { strainNote, strainCause } from './reclamationPreview';
import { elementOf } from './reclamationVocabulary';
import { FrontLine, HoldBar, Crest, frontSentence } from './reclamationInstruments';
import { getSpeciesTypeSymbol } from '../../../utils/svgUtil';

/*
	ReclamationWorld — the frame: three worlds side by side, each at one of its sites.

	Each site is a matte panel headed by the planet's name. The handler's creatures stand
	below the midline facing up; the rival's stand above it facing down.

	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md). Who is
	winning a world is its front line: the field split into the rival's brass ground above
	and your cyan ground below where the two totals put the line, with the totals on it.
	No "rival" and "you" tags, no margin sentence, no footing count, no "best here" names:
	whose a creature is reads from which side of the line it stands on, and what each of
	yours would do here is on its own card (the fit strip). A creature pointed at or lifted
	moves the line to where its send would put it and marks what the send would cost every
	figure here.

	Every number shown is passed in already computed by the engine (prepare(),
	forecastClash(), forecastSend()): this component derives nothing.

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
	const bandText = hasBand ? `${t.min} to ${t.max}\u00b0C` : 'unrecorded band';
	const ownText = own ? `; the creature tolerates ${own.min} to ${own.max}\u00b0C` : '';
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
			<span className="rec-env-readout g-mono">{hasBand ? `${t.min} to ${t.max}\u00b0C` : 'no band'}</span>
		</div>
	);
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
	hurt,
	ghosts,
	verdicts,
	armedRecordId,
	movingRecordId,
	onSiteClick,
	onSiteHover,
	onFigureClick,
	clickable,
	holdingIds,
	hiddenEnemyCount,
	forecast,
	fronts,
	preview,
	highlights,
	clashSiteId,
	deploying,
	arrival,
	hoverSiteId,
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
		PASS 30. The entrance is worn for its own duration and then taken off, so the camera
		(pass 28) can come and go without the panel re-entering from opacity zero behind the
		Court's verdict. Keyed off the component's own mount rather than off any phase.
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
			{/* pass 52: a hidden rival send is a silhouette and a count; the sentence is its title */}
			{hiddenEnemyCount > 0 && (
				<div
					className="rec-hidden-banner rec-rise"
					data-hidden-banner
					title={`The rival has ${hiddenEnemyCount === 1 ? 'a creature' : `${hiddenEnemyCount} creatures`} hidden somewhere in this round. It is revealed when the worlds clash, and is not in the forecast.`}
				>
					<ReclamationSilhouette count={hiddenEnemyCount} />
				</div>
			)}
			<div className="rec-sites">
				{frame.sites.map((site, siteIndex) => {
					const theirs = (board[site.id][opponent] || []).filter((e) => e.record);
					const mine = (board[site.id][you] || []).filter((e) => e.record);
					const empty = theirs.length === 0 && mine.length === 0;
					const ghost = ghosts && ghosts[site.id];
					const verdict = verdicts && verdicts[site.id];
					const stake = stakes && stakes[site.id];
					const stakedHere = !!(stake && stake.by && stake.by.length > 0);
					const canStake = !!onStake && stakeable.has(site.id);
					const front = (fronts && fronts[site.id]) || { theirs: 0, mine: 0 };
					const previewHere = preview && preview[site.id];
					const lead = Math.abs(front.theirs - front.mine) < 0.05
						? (front.theirs + front.mine > 0.05 ? 'level' : 'empty')
						: front.theirs > front.mine ? 'theirs' : 'mine';

					const classes = ['g-panel', 'rec-site', `rec-site--${lead}`, `g-el-${site.world.element}`];
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
					if (armedRecordId || movingRecordId) {
						classes.push('rec-site--ready');
					}
					if (verdict) {
						classes.push(`rec-site--verdict-${verdict.who}`);
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
					if (clashing) {
						classes.push(clashing === site.id ? 'rec-site--clashing' : 'rec-site--waiting');
					}

					/*
						PASS 52. What the Clash would leave each creature at: with a creature pointed
						at or lifted, the forecast of that send (so a strike's victim shows its cut
						before the click); otherwise the board as it stands. Undefined when nothing
						would change, and during the Clash and the Ruling, which show live holds.
					*/
					const siteForecast = previewHere && previewHere.forecast ? previewHere.forecast : forecast;
					const forecastOf = (entry) => {
						const f = siteForecast && siteForecast[entry.recordId];
						const h = holds[entry.recordId];
						if (!f || !h || typeof h.hold !== 'number') {
							return undefined;
						}
						if (f.downed) {
							return 0;
						}
						return Math.abs(f.hold - h.hold) < 0.05 ? undefined : f.hold;
					};

					// the key is passed on the element itself, never inside the spread: React
					// warns loudly about a key arriving through a props object
					const figureProps = (entry, seat, facing) => {
						const h = holds[entry.recordId];
						const after = forecastOf(entry);
						return {
							record: entry.record,
							element: elementOf(entry.record),
							seat,
							you,
							facing,
							hidden: entry.hidden,
							hold: h ? h.hold : undefined,
							printedHold: h ? h.printed : undefined,
							hurt: !!(hurt && hurt[entry.recordId]),
							strainLevel: h ? h.strainLevel : undefined,
							isHome: h ? h.isHome : false,
							unstrainedHold: h ? h.unstrained : undefined,
							baseHold: h ? h.baseHold : undefined,
							// the base redesign's one glyph per creature: what it does at the Clash
							role: h ? h.role : entry.role,
							// the bulb meter is advanced mode's arithmetic; the bar is on every figure
							showMeter: !!advanced,
							fallen: !!entry.fallen,
							// pass 38: a strike of yours at a world with no rival in sight will find no target
							noTarget: seat === you && !!deploying && !!h && h.role === 'strike'
								&& theirs.length === 0 && !(hiddenEnemyCount > 0),
							forecast: after,
							blowMagnitude: h ? h.blowMagnitude : undefined,
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
							lossText: after !== undefined ? (after === 0 ? 'Falls in the Clash, as the board stands' : `After the Clash, as the board stands: ${formatHoldShown(after)}`) : undefined,
							onClick: (e) => {
								e.stopPropagation();
								onFigureClick(entry, seat, site);
							},
							title: 'Inspect this creature',
						};
					};

					return (
						<section
							className={classes.join(' ')}
							key={site.id}
							data-site-id={site.id}
							data-site-lead={lead}
							style={{ '--rec-i': siteIndex }}
							aria-label={frontSentence(site.world.planet, front.theirs, front.mine)}
							onClick={clickable ? () => onSiteClick(site.id) : undefined}
							onMouseEnter={onSiteHover ? () => onSiteHover(site.id) : undefined}
							onMouseLeave={onSiteHover ? () => onSiteHover(null) : undefined}
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
								{/* pass 38: the place and the temperature scale are advanced mode; the place's description stays on the name */}
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
							</header>

							{/*
								PASS 52. The ground: the rival's rank above, yours below, and between them
								the front line, drawn where the two totals put it. There are no "rival" and
								"you" tags: the ground's color and which side of the line a creature stands
								on say whose it is.
							*/}
							<div className={`rec-site-field rec-site-floor${empty ? ' rec-site-field--empty' : ''}`}>
								{/* pass 52: the world's element, large and faint, so its color on the bench's fit columns has somewhere to come from */}
								<span className="rec-site-emblem" aria-hidden="true">{getSpeciesTypeSymbol(site.world.element, true, 120, 'rec-site-emblem-svg')}</span>
								<FrontLine siteId={site.id} theirs={front.theirs} mine={front.mine} preview={previewHere ? previewHere.totals : null} />
								<div className={`rec-rank rec-rank--theirs${theirs.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="theirs" data-rank-rows={rankGrid(theirs.length)['--rank-rows-n']} data-rank-list={theirs.length >= 2 && theirs.length <= 4 ? '' : undefined} data-rank-rows-wide={rankGrid(theirs.length)['--rank-rows-w']} style={rankGrid(theirs.length)}>
									{theirs.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, opponent, 'down')} />)}
								</div>

								<div className={`rec-site-midline${empty ? ' rec-site-midline--empty' : ''}`}>
									{ghost && (
										/* pass 41: keyed by creature, so each creature's preview enters fresh */
										<GhostToken key={ghost.recordId || 'ghost'} ghost={ghost} site={site} after={previewHere && previewHere.forecast ? previewHere.forecast[ghost.recordId] : null} />
									)}
									{!ghost && movingRecordId && <span className="rec-ghost rec-ghost--relocate" aria-label="Move here" title="Move here"><SwiftGlyph /></span>}
									{/*
										pass 45: the Clash told where it happens, between the two ranks, each
										name in its side's color; keyed per step so each line enters fresh
									*/}
									{!ghost && !movingRecordId && clashing === site.id && hl.caption && (
										<span className="rec-clash-caption" key={`cap-${hl.caption.key}`} data-clash-caption={site.id}>
											{hl.caption.parts.map((part, i) => (typeof part === 'string'
												? <React.Fragment key={i}>{part}</React.Fragment>
												: <b key={i} className={`rec-clash-name rec-clash-name--${part.seat === you ? 'you' : part.seat ? 'rival' : 'none'}`}>{part.name}</b>))}
										</span>
									)}
									{!ghost && !movingRecordId && verdict && <Crest verdict={verdict} />}
								</div>

								<div className={`rec-rank rec-rank--mine${mine.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="mine" data-rank-rows={rankGrid(mine.length)['--rank-rows-n']} data-rank-list={mine.length >= 2 && mine.length <= 4 ? '' : undefined} data-rank-rows-wide={rankGrid(mine.length)['--rank-rows-w']} style={rankGrid(mine.length)}>
									{mine.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, you, 'up')} />)}
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
	PASS 52. The creature under the pointer, or lifted, as it would stand at this world: its
	role, its hold as a bar (the part the environment takes drawn dim, the part the Clash
	would take striped) and the number. Why it is strained is a mark with its reason as the
	title, in place of pass 44's "Too cold: -7 hold" line.
*/
function GhostToken({ ghost, site, after }) {
	const strain = strainNote(ghost, site, formatHoldShown);
	const cause = strain ? (strainCause(ghost.tolerance, site) || 'strained') : null;
	const falls = !!(after && after.downed);
	const afterHold = after ? (after.downed ? 0 : after.hold) : undefined;
	const shownAfter = afterHold === undefined || Math.abs(afterHold - ghost.hold) < 0.05 ? undefined : afterHold;
	return (
		<span
			className={`rec-ghost${falls ? ' rec-ghost--falls' : ''}`}
			data-ghost={site.id}
			data-ghost-hold={formatHold(ghost.hold)}
			title={[
				`${ghost.record ? speciesLabel(ghost.record) : 'It'} holds ${formatHold(ghost.hold)} here`,
				ghost.isHome ? 'home ground' : null,
				strain ? strain.title : null,
				falls ? 'it would fall in the Clash, as the board stands' : null,
			].filter(Boolean).join('. ')}
		>
			{ghost.role && ghost.role !== 'none' && <span className="rec-role-glyph rec-ghost-role" data-role={ghost.role}><RoleGlyph role={ghost.role} /></span>}
			<HoldBar hold={ghost.hold} after={shownAfter} unstrained={ghost.unstrained} side="mine" className="rec-ghost-bar" />
			<span className="rec-ghost-value g-mono">{formatHoldShown(ghost.hold)}</span>
			{ghost.isHome && <span className="rec-ghost-mark rec-ghost-mark--home" data-ghost-home><HomeGlyph /></span>}
			{cause && <span className={`rec-ghost-mark rec-ghost-mark--strain`} data-ghost-strain={cause}><StrainGlyph cause={cause} /></span>}
		</span>
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
