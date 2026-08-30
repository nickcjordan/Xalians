import React from 'react';
import XalianImage from '../xalianImage';
import XalianSpeciesBadge from '../xalianSpeciesBadge';
import SpeciesRatingMeters from '../speciesRatingMeters';

/**
 * One catalogued species as a record strip.
 *
 * Was three bootstrap columns of unequal height — a name block, a portrait and
 * a recharts bar chart — floating side by side on the starfield with no
 * housing. It is the same document as the survey record and the specimen
 * record, only narrower, so it is built from the same parts.
 */
class XalianSpeciesRowView extends React.Component {
	render() {
		let species = this.props.species;
		let type = species.type.toLowerCase();

		return (
			<article className={`g-panel record-strip g-el-${type}`}>
				<div className="record-strip-plate">
					<XalianImage colored speciesName={species.name} primaryType={species.type} moreClasses="record-strip-img" />
				</div>

				<div className="record-strip-ident">
					<h3 className="record-strip-name">{species.name}</h3>
					<span className="specimen-id">#{species.id}</span>
					<XalianSpeciesBadge type={type} />
				</div>

				<div className="record-strip-readout">
					<SpeciesRatingMeters stats={species.statRatings} />
				</div>
			</article>
		);
	}
}

export default XalianSpeciesRowView;
