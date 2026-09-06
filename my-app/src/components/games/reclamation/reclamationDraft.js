import React from 'react';
import XalianImage from '../../xalianImage';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { team } from '../../../constants/designTokens';
import { speciesLabel, formatHold } from './reclamationNarration';
import { rateForDraft, botDraft } from '../../../gameplay/expedition/draft.js';
import { ROSTER_SIZE } from '../../../gameplay/expedition/expeditionInterpretation.js';
import { HiddenGlyph } from './reclamationGlyphs';

/*
	ReclamationDraft — keep twelve of eighteen before the Proving.

	Per docs/design/reclamation-play-enhancements.md "Pass 3, the draft": the frame
	shows its first three worlds (and, in full, all nine the Proving will load) and
	eighteen generated creatures; the handler keeps twelve; the rival drafts by its own
	style. This component is the handler's half of that: it renders the pool as a grid
	of cards built like the bench's plinths (portrait, name, lamps), lets the handler
	toggle which twelve they keep, and reports state up through onToggle/onConfirm. It
	holds no state of its own and computes no engine numbers beyond calling
	rateForDraft(), same discipline as the bench and the figures.

	Lamp thresholds and layout follow reclamationBench.js's Plinth exactly, extended
	from three worlds to nine (three rows of three, one row per frame) since the draft
	shows the whole Proving, not just the world in front of you.
*/

// same thresholds as the bench (reclamationBench.js LAMP_BRIGHT_AT / LAMP_DIM_AT):
// two-thirds of the printed scale is bright, a third is dim, less is dark
const LAMP_BRIGHT_AT = 12;
const LAMP_DIM_AT = 6;

function lampLevel(hold) {
	if (hold >= LAMP_BRIGHT_AT) return 2;
	if (hold >= LAMP_DIM_AT) return 1;
	return 0;
}

function DraftCard({ record, frames, kept, onToggle }) {
	const rating = rateForDraft(record, frames);
	const el = record.element.primary;
	const bestRow = rating.byWorld.reduce((a, b) => (b.hold > a.hold ? b : a), rating.byWorld[0]);
	const rows = [rating.byWorld.slice(0, 3), rating.byWorld.slice(3, 6), rating.byWorld.slice(6, 9)];
	const isStealthy = isStealthyRecord(record);

	return (
		<button
			type="button"
			className={`rec-draft-card${kept ? ' rec-draft-card--kept' : ''}`}
			aria-pressed={kept}
			data-draft={record.id}
			onClick={() => onToggle(record.id)}
			title={kept ? 'Kept. Press to set aside.' : 'Press to keep.'}
		>
			<span className="rec-plinth-stage" aria-hidden="true">
				<span className="rec-plinth-base" />
				<XalianImage speciesName={record.species} primaryType={el} padding="0px" fill="black" filter={pieceShadowFilter(team.one, 44)} moreClasses="rec-plinth-art" />
			</span>
			<span className="rec-plinth-name">{speciesLabel(record)}</span>
			<span className="rec-draft-lamps" aria-label="Hold across the nine worlds of the Proving">
				{rows.map((row, r) => (
					<span className="rec-draft-lamp-row" key={r}>
						{row.map((w) => (
							<span
								key={`${w.planet}-${r}`}
								className={`rec-lamp g-el-${w.element} rec-lamp--${lampLevel(w.hold)}${w.isHome ? ' rec-lamp--home' : ''}`}
								title={`${w.planet}: ${formatHold(w.hold)}${w.isHome ? ', home ground' : ''}${w.strainLevel !== 'none' ? `, ${w.strainLevel}` : ''}`}
							/>
						))}
					</span>
				))}
			</span>
			<span className="rec-draft-best g-mono">{formatHold(bestRow.hold)} <span className="rec-draft-best-planet">{bestRow.planet}</span></span>
			{isStealthy && (
				<span className="rec-draft-stealthy" title="Stealthy: can be sent hidden">
					<HiddenGlyph />
				</span>
			)}
		</button>
	);
}

// mirrors draft.js's own isStealthy reading of the record's traits (kept local so this
// component never imports an unexported helper)
function isStealthyRecord(record) {
	const traits = record && record.traits;
	if (Array.isArray(traits)) {
		return traits.includes('stealthy');
	}
	if (traits && typeof traits === 'object') {
		const guaranteed = Array.isArray(traits.guaranteed) ? traits.guaranteed : [];
		const rolled = Array.isArray(traits.rolled) ? traits.rolled : [];
		return guaranteed.includes('stealthy') || rolled.includes('stealthy');
	}
	return false;
}

function ReclamationDraft({ pool, frames, keepIds, onToggle, onKeepAll, onConfirm, rivalName }) {
	const kept = new Set(keepIds || []);
	const remaining = Math.max(0, ROSTER_SIZE - kept.size);
	const canConfirm = kept.size === ROSTER_SIZE;

	const rounds = [frames[0], frames[1], frames[2]].filter(Boolean);

	const lead = remaining === 0
		? 'Twelve kept.'
		: `Keep ${remaining} more.`;

	return (
		<section className="rec-draft" aria-label="The draft">
			<header className="rec-draft-head">
				<span className="rec-draft-kicker">The draft</span>
				<h2 className="rec-draft-heading">Keep twelve of eighteen</h2>
				<span className="rec-draft-count g-mono">{kept.size}/{ROSTER_SIZE}</span>
			</header>
			<div className="rec-draft-worlds">
				{rounds.map((frame, i) => (
					<div className="rec-draft-round" key={frame.index}>
						<span className="rec-draft-round-label">{i === 0 ? 'Round 1' : `Round ${i + 1}`}</span>
						<div className="rec-draft-round-chips">
							{frame.sites.map((site) => (
								<span key={site.id} className={`g-chip g-chip--outline g-el-${site.world.element}`}>
									{site.world.planet}
								</span>
							))}
						</div>
					</div>
				))}
			</div>
			<div className="rec-draft-grid" role="list">
				{pool.map((record) => (
					<DraftCard
						key={record.id}
						record={record}
						frames={frames}
						kept={kept.has(record.id)}
						onToggle={onToggle}
					/>
				))}
			</div>
			<footer className="rec-draft-foot">
				<p className="rec-draft-lead g-body">{lead}</p>
				<div className="rec-draft-actions">
					<button
						type="button"
						className="g-btn"
						data-draft-auto
						onClick={() => onKeepAll && onKeepAll(botDraft(pool, frames, { id: 'proctor' }))}
						title={rivalName ? `Let the Court proctor pick for you, the way it would draft against ${rivalName}.` : 'Let the Court proctor pick for you.'}
					>
						Pick for me
					</button>
					<button
						type="button"
						className="g-btn g-btn--primary"
						data-draft-confirm
						disabled={!canConfirm}
						onClick={onConfirm}
					>
						Enter the frame
					</button>
				</div>
			</footer>
		</section>
	);
}

export default ReclamationDraft;
