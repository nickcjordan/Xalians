import React from 'react';
import { prepare } from '../../../gameplay/expedition/creatureOnTable';
import {
	HOME_GROUND_MULTIPLIER, STAGGER_FRACTION, ROUT_FRACTION,
	ARMORED_STAGGER_FRACTION, ARMORED_ROUT_FRACTION, STRAIN_MULTIPLIER, SEVERE_STRAIN_MULTIPLIER,
} from '../../../gameplay/expedition/expeditionInterpretation';
import { conductSentence } from './reclamationPreview';
import { speciesLabel, formatHold } from './reclamationNarration';
import XalianImage from '../../xalianImage';
import {
	speciesFacts, archetypeLabel, traitName, traitNature, actionName, instrumentName,
	elementName, sizeLine, toleranceLine, breathesLine, coveringName, bodyPlanName,
} from './reclamationVocabulary';
import { TRAIT } from '../../../gameplay/expedition/expeditionInterpretation';

// the traits this game reads (design doc, "Conduct"); every other trait is shown but marked
// as not yet read by the table
const READ_TRAITS = new Set(Object.values(TRAIT));

/*
	ReclamationInspect — the dossier panel. Opens for any figure, yours or the rival's,
	on the table or in the roster.

	Every number here comes from the engine's own prepare() for the site in question (or
	the world's first site, when the creature is still in the roster and has no site
	yet), so what the panel says is what the rules will use.
*/
function multiplierLines(record, prepared, site, world) {
	const lines = [];
	lines.push({ key: 'Base hold', val: formatHold(prepared.baseHold) });
	lines.push({ key: 'World matchup', val: `x${(Math.round(prepared.holdMultiplier * 100) / 100)}` });
	lines.push({ key: 'Home ground', val: prepared.isHome ? `x${HOME_GROUND_MULTIPLIER}` : 'x1 (not its origin world)' });
	const strainMult = prepared.strainLevel === 'severe' ? SEVERE_STRAIN_MULTIPLIER
		: prepared.strainLevel === 'strained' ? STRAIN_MULTIPLIER : 1;
	lines.push({
		key: 'Strain',
		val: prepared.strainLevel === 'none' ? 'x1 (at home in this environment)' : `x${strainMult} (${prepared.strainLevel})`,
	});
	lines.push({ key: 'Hold here', val: formatHold(prepared.hold) });
	return lines;
}

function temperamentWords(temperament) {
	const words = [];
	const say = (key, high, low) => {
		const v = temperament[key];
		if (typeof v !== 'number') {
			return;
		}
		if (v >= 65) {
			words.push(high);
		} else if (v <= 35) {
			words.push(low);
		}
	};
	say('boldness', 'bold', 'cautious');
	say('curiosity', 'curious', 'incurious');
	say('energy', 'restless', 'placid');
	say('aggression', 'aggressive', 'forbearing');
	say('sociability', 'sociable', 'aloof');
	return words.length > 0 ? words.join(', ') : 'even-tempered throughout';
}

function ReclamationInspect({ record, site, world, onClose }) {
	if (!record) {
		return null;
	}
	const target = site || world.sites[0];
	const prepared = prepare(record, target, world, 0);
	const el = record.element.primary;
	const armored = prepared.armored;
	const facts = speciesFacts(record);
	const traits = prepared.traitKeywords;
	const secondary = Object.keys(record.element.affinities || {}).find((k) => k !== el);
	const signature = (record.abilities || []).find((a) => a.signature);
	const finish = record.appearance && record.appearance.finish && record.appearance.finish !== 'standard' ? record.appearance.finish : null;

	return (
		<aside className={`g-panel rec-inspect g-el-${el}`} aria-label="Creature dossier">
			<header className="rec-inspect-head">
				{facts && (
					<div className="rec-inspect-portrait">
						<XalianImage colored speciesName={record.species} primaryType={el} unPadded moreClasses="rec-inspect-portrait-image" />
					</div>
				)}
				<div className="rec-inspect-title">
					<h3 className="rec-inspect-name">{speciesLabel(record)}</h3>
					<p className="rec-inspect-sub">
						{archetypeLabel(record.archetype)}
					</p>
					<p className="rec-inspect-sub g-mono">
						{elementName(el).toLowerCase()}
						{secondary ? ` (${elementName(secondary).toLowerCase()} ${record.element.affinities[secondary]})` : ''}
						{facts && facts.homePlanetName ? ` · of ${facts.homePlanetName}` : (record.provenance && record.provenance.origin ? ` · of ${record.provenance.origin}` : '')}
						{finish ? ` · ${finish} finish` : ''}
					</p>
				</div>
				<button type="button" className="g-btn g-btn--icon rec-inspect-close" onClick={onClose} aria-label="Close dossier">x</button>
			</header>

			{facts && facts.biomeNiche && (
				<p className="g-body rec-inspect-niche">{facts.biomeNiche.charAt(0).toUpperCase() + facts.biomeNiche.slice(1)}.</p>
			)}

			<p className="g-label rec-inspect-context">
				Read at {target.name}{site ? '' : ' (not yet sent; shown at the first site)'}
			</p>

			<div className="g-spec rec-inspect-spec">
				{multiplierLines(record, prepared, target, world).map((l) => (
					<React.Fragment key={l.key}>
						<span className="g-spec-key">{l.key}</span>
						<span className="g-spec-val">{l.val}</span>
					</React.Fragment>
				))}
				<span className="g-spec-key">Initiative</span>
				<span className="g-spec-val">{formatHold(prepared.initiative)}</span>
				<span className="g-spec-key">Stagger at</span>
				<span className="g-spec-val">{armored ? `${ARMORED_STAGGER_FRACTION * 100}% of hold (armored)` : `${STAGGER_FRACTION * 100}% of hold`}</span>
				<span className="g-spec-key">Rout at</span>
				<span className="g-spec-val">{armored ? `${ARMORED_ROUT_FRACTION * 100}% of hold (armored)` : `${ROUT_FRACTION * 100}% of hold`}</span>
			</div>

			<div className="rec-inspect-section">
				<span className="g-label">Acts</span>
				<table className="g-data rec-inspect-acts">
					<thead>
						<tr><th>Name</th><th>Act</th><th>By</th><th>Medium</th><th>Magnitude</th></tr>
					</thead>
					<tbody>
						{prepared.acts.map((a) => (
							<tr key={a.name} className={a.action === prepared.favoredAct.action ? 'rec-act-favored' : ''} title={a.class ? `${a.class} act` : undefined}>
								<td>{a.name}{a.signature ? ' *' : ''}</td>
								<td>{actionName(a.action).toLowerCase()}</td>
								<td>{instrumentName(a.instrument).toLowerCase()}</td>
								<td>{a.medium ? elementName(a.medium).toLowerCase() : ''}</td>
								<td>{a.magnitude}</td>
							</tr>
						))}
					</tbody>
				</table>
				<p className="g-body rec-inspect-note">
					By nature it performs {prepared.favoredAct.name || 'Hold'} when given no order. A starred act is its signature.
				</p>
				{signature && signature.description && (
					<p className="g-body rec-inspect-signature">
						<span className="rec-inspect-signature-name">{signature.name}.</span> {signature.description}
					</p>
				)}
			</div>

			<div className="rec-inspect-section">
				<span className="g-label">Conduct</span>
				<p className="g-body">{conductSentence(prepared)}</p>
			</div>

			<div className="rec-inspect-section">
				<span className="g-label">Traits</span>
				{traits.length > 0 ? (
					<ul className="rec-inspect-traits">
						{traits.map((key) => (
							<li key={key} className={READ_TRAITS.has(key) ? 'rec-inspect-trait rec-inspect-trait--read' : 'rec-inspect-trait'} title={READ_TRAITS.has(key) ? 'The table reads this trait' : 'Recorded; the table does not read it yet'}>
								<span className="rec-inspect-trait-name">{traitName(key)}</span>
								<span className="rec-inspect-trait-nature">{traitNature(key)}</span>
							</li>
						))}
					</ul>
				) : <p className="g-body">no traits landed</p>}
			</div>

			<div className="rec-inspect-section">
				<span className="g-label">Body</span>
				<p className="g-body">
					{[
						bodyPlanName(record.physiology && record.physiology.bodyPlan).toLowerCase(),
						record.physiology && record.physiology.covering ? `in ${coveringName(record.physiology.covering).toLowerCase()}` : '',
						sizeLine(record.physiology),
					].filter(Boolean).join(', ')}.
					{' '}{breathesLine(record.physiology).charAt(0).toUpperCase() + breathesLine(record.physiology).slice(1)}; at ease {toleranceLine(record.physiology)}.
					{' '}Here: {target.environment.medium}, {target.environment.temperatureC.min} to {target.environment.temperatureC.max} C.
				</p>
			</div>

			<div className="rec-inspect-section">
				<span className="g-label">Temperament</span>
				<p className="g-body">{temperamentWords(record.temperament || {})}.</p>
			</div>

			{facts && facts.description && (
				<details className="rec-inspect-section rec-inspect-record">
					<summary className="g-label">From the Encyclopedia</summary>
					<p className="g-body">{facts.description}</p>
				</details>
			)}
		</aside>
	);
}

export default ReclamationInspect;
