import React from 'react';
import ReclamationFigure from './reclamationFigure';
import { formatHold } from './reclamationNarration';

/*
	ReclamationWorld — the current world's three sites, side by side.

	Each site is a matte panel headed by the site's name and its environment line. The
	handler's creatures stand below the midline facing up; the rival's stand above it
	facing down. The live hold total per side sits at the site's shoulders, and the
	leading side is marked.

	Every hold shown is passed in already computed by the engine's prepare(): this
	component derives nothing.
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
	onSiteClick,
	onFigureClick,
	clickable,
	holdingIds,
}) {
	const opponent = you === 'A' ? 'B' : 'A';

	return (
		<div className={`rec-world g-el-${world.element}`}>
			{world.sites.map((site) => {
				const theirs = (board[site.id][opponent] || []).filter((e) => e.record);
				const mine = (board[site.id][you] || []).filter((e) => e.record);
				const totalMine = totals[site.id] ? totals[site.id][you] : 0;
				const totalTheirs = totals[site.id] ? totals[site.id][opponent] : 0;
				const leader = totalMine > totalTheirs ? 'mine' : totalTheirs > totalMine ? 'theirs' : 'level';
				const ghost = ghosts && ghosts[site.id];
				const verdict = verdicts && verdicts[site.id];

				const classes = ['g-panel', 'rec-site'];
				if (clickable) {
					classes.push('rec-site--clickable');
				}
				if (ghost) {
					classes.push('rec-site--targeted');
				}
				if (verdict) {
					classes.push(`rec-site--verdict-${verdict.who}`);
				}

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

						<div className="rec-site-tally">
							<span className={`rec-tally rec-tally--theirs${leader === 'theirs' ? ' rec-tally--leading' : ''}`}>
								<span className="rec-tally-label">Rival</span>
								<span className="rec-tally-value" data-total-seat={opponent} data-site-total={site.id}>{formatHold(totalTheirs)}</span>
							</span>
							<span className={`rec-tally rec-tally--mine${leader === 'mine' ? ' rec-tally--leading' : ''}`}>
								<span className="rec-tally-label">You</span>
								<span className="rec-tally-value" data-total-seat={you} data-site-total={site.id}>{formatHold(totalMine)}</span>
							</span>
						</div>

						<div className="rec-site-field">
							<div className="rec-rank rec-rank--theirs">
								{theirs.map((entry) => (
									<ReclamationFigure
										key={entry.recordId}
										record={entry.record}
										element={entry.record.element.primary}
										seat={opponent}
										you={you}
										facing="down"
										hold={holds[entry.recordId] ? holds[entry.recordId].hold : undefined}
										printedHold={holds[entry.recordId] ? holds[entry.recordId].printed : undefined}
										staggered={!!(staggered && staggered[entry.recordId])}
										strainLevel={holds[entry.recordId] ? holds[entry.recordId].strainLevel : undefined}
										isHome={holds[entry.recordId] ? holds[entry.recordId].isHome : false}
										dimmed={holdingIds && holdingIds.includes(entry.recordId)}
										onClick={(e) => {
											e.stopPropagation();
											onFigureClick(entry, opponent, site);
										}}
										title="Inspect this creature"
									/>
								))}
								{theirs.length === 0 && <span className="rec-rank-empty">no rival creatures</span>}
							</div>

							<div className="rec-site-midline">
								{ghost && (
									<span className="rec-ghost">
										<span className="rec-ghost-value">{formatHold(ghost.hold)}</span>
										{ghost.isHome && <span className="rec-tag rec-tag--home">home</span>}
										{ghost.strainLevel === 'strained' && <span className="rec-tag rec-tag--strain">strained</span>}
										{ghost.strainLevel === 'severe' && <span className="rec-tag rec-tag--severe">severe</span>}
									</span>
								)}
								{!ghost && relocating && <span className="rec-ghost rec-ghost--relocate">fall back here</span>}
								{!ghost && !relocating && verdict && (
									<span className={`rec-stamp rec-stamp--${verdict.who}`}>{verdict.text}</span>
								)}
							</div>

							<div className="rec-rank rec-rank--mine">
								{mine.map((entry) => (
									<ReclamationFigure
										key={entry.recordId}
										record={entry.record}
										element={entry.record.element.primary}
										seat={you}
										you={you}
										facing="up"
										hidden={entry.hidden}
										hold={holds[entry.recordId] ? holds[entry.recordId].hold : undefined}
										printedHold={holds[entry.recordId] ? holds[entry.recordId].printed : undefined}
										staggered={!!(staggered && staggered[entry.recordId])}
										strainLevel={holds[entry.recordId] ? holds[entry.recordId].strainLevel : undefined}
										isHome={holds[entry.recordId] ? holds[entry.recordId].isHome : false}
										selected={armedRecordId === entry.recordId}
										dimmed={holdingIds && holdingIds.includes(entry.recordId)}
										onClick={(e) => {
											e.stopPropagation();
											onFigureClick(entry, you, site);
										}}
										title="Inspect this creature"
									/>
								))}
								{mine.length === 0 && <span className="rec-rank-empty">no creatures sent here</span>}
							</div>
						</div>
					</section>
				);
			})}
		</div>
	);
}

export default ReclamationWorld;
