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
		return (
			<dl className={`g-spec specimen-spec ${this.props.moreClasses || ''}`}>
				{this.buildPairs()}
			</dl>
		);
	}
}

export default XalianAttributeChart;
