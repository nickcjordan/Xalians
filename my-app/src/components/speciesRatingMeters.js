import React from 'react';
import * as valueTranslator from '../utils/valueTranslator';

/**
 * A species' coarse stat ratings, drawn as the design system's segmented
 * meters.
 *
 * These ratings are five words — very low through very high — and most species
 * declare only two or three of them. Rendering them through the recharts bar
 * chart used for generated Xalians produced two full-width bars floating in
 * 300px of empty plot area, each labelled with the word it already said. A
 * bulb strip states the same thing in the machine's own vocabulary, shows the
 * unrated stats honestly as unlit, and takes the height it needs.
 */

// the ordering the rest of the site lists stats in
const STAT_ORDER = [
	'standardAttackRating',
	'specialAttackRating',
	'standardDefenseRating',
	'specialDefenseRating',
	'speedRating',
	'evasionRating',
	'staminaRating',
	'recoveryRating',
];

class SpeciesRatingMeters extends React.Component {

	buildRow(key) {
		let raw = this.props.stats ? this.props.stats[key] : null;
		let steps = raw ? valueTranslator.statRangeToInteger(raw) : 0;
		// five rating words, so each is a fifth of the strip
		let pct = steps ? (steps / 5) * 100 : 0;
		let label = valueTranslator.statFieldToDescription(key);
		let value = raw ? valueTranslator.statFieldToDescription(raw) : 'Unrated';

		return (
			<div className={`g-meter-row${raw ? '' : ' species-meter-row--unrated'}`} key={key}>
				<span className="g-meter-name">{label}</span>
				<div className="g-meter">
					<div className="g-meter-fill" style={{ width: `${pct}%` }} />
				</div>
				<span className="g-meter-value">{value}</span>
			</div>
		);
	}

	render() {
		return (
			<div className="species-rating-meters">
				{STAT_ORDER.map((key) => this.buildRow(key))}
			</div>
		);
	}
}

export default SpeciesRatingMeters;
