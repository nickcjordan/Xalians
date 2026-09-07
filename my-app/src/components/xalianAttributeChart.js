import React from 'react';

/**
 * The specimen's attributes, printed as a spec grid.
 *
 * This was a stack of bootstrap Rows with a right-aligned label column, which
 * put a wide unexplained gutter between every label and its value. It is a
 * description list — the design system draws one as `.g-spec`, the same
 * treatment the planetary survey records use.
 */
class XalianAttributeChart extends React.Component {

	pair(key, label, value) {
		return (
			<React.Fragment key={key}>
				<dt className="g-spec-key">{label}</dt>
				<dd className="g-spec-val">{value}</dd>
			</React.Fragment>
		);
	}

	buildPairs() {
		let pairs = [];
		let xalian = this.props.xalian;
		let species = this.props.species;

		if (this.props.id) {
			pairs.push(this.pair('index', 'Index', `#${this.props.id}`));
		}

		if (xalian && xalian.elements) {
			pairs.push(this.pair('primary', 'Primary Element', `${xalian.elements.primaryType} [${xalian.elements.primaryElement}]`));
			pairs.push(this.pair('secondary', 'Secondary Element', `${xalian.elements.secondaryType} [${xalian.elements.secondaryElement}]`));
		}

		// a generated Xalian carries its species inline; a canon species page
		// passes the species record directly
		let source = (xalian && xalian.species) || species;
		if (source) {
			pairs.push(this.pair('generation', 'Generation', source.generation || '0'));
			pairs.push(this.pair('planet', 'Origin Planet', source.planet));
			pairs.push(this.pair('height', 'Avg Height', source.height));
			pairs.push(this.pair('weight', 'Avg Weight', source.weight));
		}

		if (xalian && xalian.meta) {
			pairs.push(this.pair('statScore', 'Stat Score', xalian.meta.statScore));
			pairs.push(this.pair('potentialScore', 'Potential Score', xalian.meta.potentialStatScore));
		}

		return pairs;
	}

	render() {
		// `specimen-spec` (style.css) laid two pairs per row for the old
		// full-bleed panel; on the Field Terminal's narrower CRT that packs
		// two fixed-width label columns tight enough that the value columns
		// have no room left (minmax(6rem,10.5rem) x2 plus three column gaps
		// can exceed the CRT's ~400px content width, so the two minmax(0,1fr)
		// value tracks compute to 0 and the values overlap the next label).
		// Plain `.g-spec` — a single label/value column, the same shape the
		// mockup's CRT specs use — reads correctly at any container width.
		return (
			<dl className={`g-spec ${this.props.moreClasses || ''}`}>
				{this.buildPairs()}
			</dl>
		);
	}
}

export default XalianAttributeChart;
