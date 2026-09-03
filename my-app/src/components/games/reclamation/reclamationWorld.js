import React from 'react';
import ReclamationFigure, { ReclamationSilhouette } from './reclamationFigure';
import { formatHold } from './reclamationNarration';

/*
	ReclamationWorld — the current world's three sites, side by side.

	Each site is a matte panel headed by the site's name and its environment line. The
	handler's creatures stand below the midline facing up; the rival's stand above it
	facing down. The thing a handler most needs from a site is who is winning it and by
	how much, so that is the site's biggest readout: a margin band under the heading that
	says "you lead by 4.2", "the rival leads by 3.1" or "level, to the Court", with the
	two raw totals beside it.

	When a creature is armed, every site says what sending it there would do ("you would
	lead by 2.1", "still behind by 1.3") so the choice of site is legible before the click.

	Every hold shown is passed in already computed by the engine's prepare(): this
	component derives nothing except differences between numbers it was given.
*/

function environmentLine(site) {
	const env = (site && site.environment) || {};
	const medium = env.medium ? String(env.medium) : 'unknown medium';
	const t = env.temperatureC || {};
	const band = typeof t.min === 'number' && typeof t.max === 'number'
		? `${t.min} to ${t.max} C`
		: 'unrecorded band';
	return `${medium} · ${band}`;
}

function marginText(mine, theirs) {
	const diff = mine - theirs;
	if (Math.abs(diff) < 0.05) {
		return { who: 'level', text: mine === 0 && theirs === 0 ? 'nothing here yet' : 'level, to the Court' };
	}
	if (diff > 0) {
		return { who: 'mine', text: `you lead by ${formatHold(diff)}` };
	}
	return { who: 'theirs', text: `rival leads by ${formatHold(-diff)}` };
}

function ghostText(ghost, mine, theirs) {
	const after = mine + ghost.hold - theirs;
	if (Math.abs(after) < 0.05) {
		return 'would be level';
	}
	if (after > 0) {
		return mine > theirs ? `lead grows to ${formatHold(after)}` : `you would lead by ${formatHold(after)}`;
	}
	return `still behind by ${formatHold(-after)}`;
}

function ReclamationWorld({
	world,
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
	holdingIds,
	hiddenEnemyCount,
	badges,
	highlights,
}) {
	const opponent = you === 'A' ? 'B' : 'A';
	const hl = highlights || {};

	return (
		<div className={`rec-world g-el-${world.element}`}>
			{hiddenEnemyCount > 0 && (
				<div className="rec-hidden-banner" data-hidden-banner>
					<ReclamationSilhouette count={hiddenEnemyCount} />
					<span className="rec-hidden-banner-text">
						The rival has {hiddenEnemyCount === 1 ? 'a creature' : `${hiddenEnemyCount} creatures`} hidden somewhere on this world. It is revealed when orders are.
					</span>
				</div>
			)}
			<div className="rec-sites">
				{world.sites.map((site) => {
					const theirs = (board[site.id][opponent] || []).filter((e) => e.record);
					const mine = (board[site.id][you] || []).filter((e) => e.record);
					const totalMine = totals[site.id] ? totals[site.id][you] : 0;
					const totalTheirs = totals[site.id] ? totals[site.id][opponent] : 0;
					const margin = marginText(totalMine, totalTheirs);
					const ghost = ghosts && ghosts[site.id];
					const verdict = verdicts && verdicts[site.id];

					const classes = ['g-panel', 'rec-site', `rec-site--${margin.who}`];
					if (clickable) {
						classes.push('rec-site--clickable');
					}
					if (ghost || relocating) {
						classes.push('rec-site--targeted');
					}
					if (verdict) {
						classes.push(`rec-site--verdict-${verdict.who}`);
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
						selected: armedRecordId === entry.recordId || (relocating && vanguardRecordId === entry.recordId),
						dimmed: holdingIds && holdingIds.includes(entry.recordId),
						acting: hl.acting === entry.recordId,
						hit: hl.hit === entry.recordId,
						hover: hl.hover === entry.recordId,
						flash: hl.hit === entry.recordId ? hl.flash : undefined,
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
								<h3 className="rec-site-name">{site.name}</h3>
								<p className="rec-site-env g-mono">{environmentLine(site)}</p>
							</header>

							<div className={`rec-site-margin rec-site-margin--${margin.who}`} data-site-margin={site.id}>
								<span className="rec-site-margin-text">{margin.text}</span>
								<span className="rec-site-margin-totals g-mono">
									<span data-total-seat={opponent} data-site-total={site.id}>{formatHold(totalTheirs)}</span>
									<span className="rec-site-margin-vs">rival · you</span>
									<span data-total-seat={you} data-site-total={site.id}>{formatHold(totalMine)}</span>
								</span>
							</div>

							<div className="rec-site-field">
								<div className="rec-rank rec-rank--theirs">
									{theirs.map((entry) => <ReclamationFigure {...figureProps(entry, opponent, 'down')} />)}
									{theirs.length === 0 && <span className="rec-rank-empty">no rival creatures</span>}
								</div>

								<div className="rec-site-midline">
									{ghost && (
										<span className="rec-ghost">
											<span className="rec-ghost-cta">send here</span>
											<span className="rec-ghost-value">{formatHold(ghost.hold)}</span>
											{ghost.isHome && <span className="rec-tag rec-tag--home">home</span>}
											{ghost.strainLevel === 'strained' && <span className="rec-tag rec-tag--strain">strained</span>}
											{ghost.strainLevel === 'severe' && <span className="rec-tag rec-tag--severe">severe</span>}
											<span className="rec-ghost-outcome">{ghostText(ghost, totalMine, totalTheirs)}</span>
										</span>
									)}
									{!ghost && relocating && <span className="rec-ghost rec-ghost--relocate">fall back here</span>}
									{!ghost && !relocating && verdict && (
										<span className={`rec-stamp rec-stamp--${verdict.who}`}>{verdict.text}</span>
									)}
								</div>

								<div className="rec-rank rec-rank--mine">
									{mine.map((entry) => <ReclamationFigure {...figureProps(entry, you, 'up')} />)}
									{mine.length === 0 && <span className="rec-rank-empty">no creatures sent here</span>}
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
