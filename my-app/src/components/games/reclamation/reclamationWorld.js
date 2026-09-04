import React from 'react';
import ReclamationFigure, { ReclamationSilhouette, HoldMeter } from './reclamationFigure';
import { formatHold } from './reclamationNarration';

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
	fall-back target, or the Court's stamp. A one-sided site says who holds it and skips
	the totals, since the one number is already in the sentence.

	Every hold shown is passed in already computed by the engine's prepare(): this
	component derives nothing except differences between numbers it was given.
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

function ReclamationWorld({
	frame,
	board,
	you,
	holds,
	totals,
	staggered,
	ghosts,
	verdicts,
	armedRecordId,
	relocating,
	vanguardRecordId,
	onSiteClick,
	onFigureClick,
	clickable,
	recommendedSiteId,
	holdingIds,
	hiddenEnemyCount,
	badges,
	highlights,
	arrival,
	hoverSiteId,
	previewRecordId,
}) {
	const opponent = you === 'A' ? 'B' : 'A';
	const hl = highlights || {};
	const arrivedIds = arrival ? arrival.ids : [];

	return (
		<div className="rec-world">
			{hiddenEnemyCount > 0 && (
				<div className="rec-hidden-banner rec-rise" data-hidden-banner>
					<ReclamationSilhouette count={hiddenEnemyCount} />
					<span className="rec-hidden-banner-text">
						The rival has {hiddenEnemyCount === 1 ? 'a creature' : `${hiddenEnemyCount} creatures`} hidden somewhere in the frame. It is revealed when orders are.
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
					if (ghost || relocating) {
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

					const figureProps = (entry, seat, facing) => ({
						key: entry.recordId,
						record: entry.record,
						element: entry.record.element.primary,
						seat,
						you,
						facing,
						hidden: entry.hidden,
						hold: holds[entry.recordId] ? holds[entry.recordId].hold : undefined,
						printedHold: holds[entry.recordId] ? holds[entry.recordId].printed : undefined,
						staggered: !!(staggered && staggered[entry.recordId]),
						strainLevel: holds[entry.recordId] ? holds[entry.recordId].strainLevel : undefined,
						isHome: holds[entry.recordId] ? holds[entry.recordId].isHome : false,
						unstrainedHold: holds[entry.recordId] ? holds[entry.recordId].unstrained : undefined,
						baseHold: holds[entry.recordId] ? holds[entry.recordId].baseHold : undefined,
						selected: armedRecordId === entry.recordId || (relocating && vanguardRecordId === entry.recordId),
						dimmed: holdingIds && holdingIds.includes(entry.recordId),
						acting: hl.acting === entry.recordId,
						hit: hl.hit === entry.recordId,
						hover: hl.hover === entry.recordId,
						flash: hl.hit === entry.recordId ? hl.flash : undefined,
						arrive: arrivedIds.includes(entry.recordId),
						badge: badges ? badges[entry.recordId] : undefined,
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
								<EnvironmentScale site={site} ghost={ghost} />
								{recommended && <span className="rec-site-recommend" data-recommended-site>recommended</span>}
							</header>

							{/* the balance: one bar, the rival's hold pushing in from the left in brass,
							    yours from the right in cyan, meeting where the site stands. A previewed
							    send extends your end as a hatched ghost, so what the send would shift is
							    seen before it is made. */}
							{(() => {
								const ghostHold = ghost ? ghost.hold : 0;
								const span = Math.max(totalMine + totalTheirs + ghostHold, 0.0001);
								const pct = (v) => `${Math.round((v / span) * 1000) / 10}%`;
								const afterText = ghost ? ghostText(ghost, totalMine, totalTheirs) : null;
								const quiet = empty && !ghost;
								return (
									<div className={`rec-balance rec-balance--${margin.who}${quiet ? ' rec-balance--quiet' : ''}${ghost ? ' rec-balance--preview' : ''}`} data-site-margin={site.id}>
										<span className="rec-balance-end rec-balance-end--theirs">
											<span className="rec-balance-side">rival</span>
											<span className="rec-balance-total rec-tick" data-total-seat={opponent} data-site-total={site.id} key={`t-${formatHold(totalTheirs)}`}>{formatHold(totalTheirs)}</span>
										</span>
										<span className="rec-balance-track" aria-hidden="true">
											{totalTheirs > 0 && <span className="rec-balance-fill rec-balance-fill--theirs" style={{ width: pct(totalTheirs) }} />}
											{ghost && <span className="rec-balance-fill rec-balance-fill--ghost" style={{ width: pct(ghostHold) }} />}
											{totalMine > 0 && <span className="rec-balance-fill rec-balance-fill--mine" style={{ width: pct(totalMine) }} />}
										</span>
										<span className="rec-balance-end rec-balance-end--mine">
											<span className="rec-balance-total rec-tick" data-total-seat={you} data-site-total={site.id} key={`m-${formatHold(totalMine)}`}>{formatHold(totalMine)}</span>
											{ghost && <span className="rec-balance-plus">+{formatHold(ghostHold)}</span>}
											<span className="rec-balance-side">you</span>
										</span>
										<span className={`rec-site-margin-text rec-tick${ghost ? ' rec-site-margin-text--preview' : ''}`} key={afterText || margin.text || 'open'}>
											{afterText || margin.text || 'unclaimed'}
										</span>
									</div>
								);
							})()}

							{/* the ground: the rival's rank on the far edge, yours on the near one, each
							    edge painted in its side's colour and labelled, so whose creature stands
							    where is read from the floor before the figures are */}
							<div className={`rec-site-field rec-site-floor${empty ? ' rec-site-field--empty' : ''}`}>
								<div className="rec-rank rec-rank--theirs" data-rank="theirs">
									<span className="rec-rank-edge rec-rank-edge--theirs" aria-hidden="true">rival{totalTheirs > 0 ? ` · ${formatHold(totalTheirs)}` : ''}</span>
									{theirs.map((entry) => <ReclamationFigure {...figureProps(entry, opponent, 'down')} />)}
									{theirs.length === 0 && <span className="rec-rank-open">no one</span>}
								</div>

								<div className={`rec-site-midline${empty ? ' rec-site-midline--empty' : ''}`}>
									{ghost && (
										<span className="rec-ghost">
											<span className="rec-ghost-cta">{ghost.preview ? 'would hold' : 'send here'}</span>
											<HoldMeter hold={ghost.hold} unstrained={ghost.unstrained} isHome={ghost.isHome} strainLevel={ghost.strainLevel} mine />
											<span className="rec-ghost-value">{formatHold(ghost.hold)}</span>

										</span>
									)}
									{!ghost && relocating && <span className="rec-ghost rec-ghost--relocate">fall back here</span>}
									{!ghost && !relocating && verdict && (
										<span className={`rec-stamp rec-stamp--${verdict.who} rec-stamp--down`}>{verdict.text}</span>
									)}
									{!ghost && !relocating && !verdict && empty && (
										<span className="rec-site-unclaimed">unclaimed</span>
									)}
								</div>

								<div className="rec-rank rec-rank--mine" data-rank="mine">
									{mine.map((entry) => <ReclamationFigure {...figureProps(entry, you, 'up')} />)}
									{mine.length === 0 && <span className="rec-rank-open">no one</span>}
									<span className="rec-rank-edge rec-rank-edge--mine" aria-hidden="true">you{totalMine > 0 ? ` · ${formatHold(totalMine)}` : ''}</span>
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
