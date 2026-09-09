import React from 'react';
import { prepare } from '../../../gameplay/expedition/creatureOnTable';
import {
	HOME_GROUND_MULTIPLIER, ARMORED_REDUCTION, STRAIN_MULTIPLIER, SEVERE_STRAIN_MULTIPLIER,
} from '../../../gameplay/expedition/expeditionInterpretation';
import { conductSentence } from './reclamationPreview';
import { speciesLabel, formatHold, roleSentence } from './reclamationNarration';
import { RoleGlyph } from './reclamationGlyphs';
import XalianImage from '../../xalianImage';
import {
	speciesFacts, archetypeLabel, traitName, traitNature,
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
	the frame's first site, when the creature is still in the roster and has no site
	yet), so what the panel says is what the rules will use.

	THE BASE (docs/design/reclamation-base-redesign.md). The sixteen acts are gone, and so
	are the act table and the stagger/rout threshold pair that used to head the spec: a
	creature is a hold and ONE role, and blows subtract. The panel prints the role in the
	same sentence the plinth and the bench print, the blow magnitude, and the armored
	reduction where the trait applies.
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

function ReclamationInspect({ record, site, frame, rules, onClose }) {
	if (!record) {
		return null;
	}
	const target = site || frame.sites[0];
	const world = target.world;
	const prepared = prepare(record, target, world, 0, { rules });
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
				Read on {world.planet}, at {target.name}{site ? '' : ' (not yet sent; shown for the first world in the frame)'}
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
				{prepared.blow && (
					<>
						<span className="g-spec-key">Blow</span>
						<span className="g-spec-val">{formatHold(prepared.blowMagnitude)}{prepared.blowIsFallback ? ' (no attacking ability; the minimum)' : ` (${prepared.blow.name})`}</span>
					</>
				)}
				{armored && (
					<>
						<span className="g-spec-key">Armored</span>
						<span className="g-spec-val">blows against it are cut by {ARMORED_REDUCTION * 100}%</span>
					</>
				)}
			</div>

			<div className="rec-inspect-section">
				<span className="g-label">Role</span>
				<p className="g-body rec-inspect-role" data-inspect-role={prepared.role}>
					{prepared.role && prepared.role !== 'none' && <RoleGlyph role={prepared.role} className="rec-inspect-role-glyph" />}
					{roleSentence(prepared.role, prepared.blowMagnitude)}.
				</p>
				<p className="g-body rec-inspect-note">
					Its role is fixed the moment it is sent; there is nothing to order. {prepared.blow
						? `It throws ${prepared.blow.name} for ${formatHold(prepared.blowMagnitude)}, before the element matchup against whatever it meets.`
						: 'It throws no blow at all; standing at the world is what it does.'}
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
