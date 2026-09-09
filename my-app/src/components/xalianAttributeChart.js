import React from 'react';

/**
 * The specimen's attributes, printed as a spec grid.
 *
 * Version 4 on the new stack: the same key/value markup `SpecPlate` draws
 * (src/components/system/record.tsx), inlined here rather than imported so
 * this stays a plain description list independent of that component's
 * grid-column layout.
 */
class XalianAttributeChart extends React.Component {

	pair(key, label, value) {
		return (
			<React.Fragment key={key}>
				<dt className="type-legend">{label}</dt>
				<dd className="m-0 type-data text-small text-ink">{value}</dd>
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
		return (
			<dl className={`m-0 grid grid-cols-[minmax(7rem,max-content)_minmax(0,1fr)] items-baseline gap-x-6 gap-y-2 ${this.props.moreClasses || ''}`}>
				{this.buildPairs()}
			</dl>
		);
	}
}

export default XalianAttributeChart;
