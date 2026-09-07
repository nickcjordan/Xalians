import React from 'react';
import XalianSpeciesBadge from './xalianSpeciesBadge';
import XalianImage from './xalianImage';
import XalianAttributeChart from './xalianAttributeChart';
import EncyclopediaLink from './encyclopediaLink';

/**
 * A specimen record: the creature equivalent of the planetary survey record.
 *
 * Version 3 of the design system draws the specimen record as content only
 * (Rule B, the medium rule, docs/DESIGN_SYSTEM.md): name, element chips,
 * portrait plate, specs and description, plus whatever readouts (stat
 * charts, move sets) are passed as children. It owns no hull, no housing,
 * no buttons and no modal — the page decides what medium carries it (a
 * color CRT on the Field Terminal, a paper card in the Archive, a docket in
 * the Registry) and, per Rule B, "no buttons inside paper" applies to every
 * medium a record might sit on, so the caller owns any button that opens a
 * raw-record view rather than this component rendering one into its own
 * content.
 */
class XalianRecord extends React.Component {

	/** the generated shape and the canon species shape name things differently */
	getSubject() {
		let xalian = this.props.xalian;
		if (xalian) {
			return {
				name: xalian.species.name,
				id: xalian.speciesId,
				description: xalian.species.description,
				primaryType: xalian.elements.primaryType,
				secondaryType: xalian.elements.secondaryType,
				planet: xalian.species.planet,
			};
		}
		let species = this.props.species;
		if (species) {
			return {
				name: species.name,
				id: species.id,
				description: species.description,
				primaryType: species.type,
				secondaryType: null,
				planet: species.planet,
			};
		}
		return null;
	}

	render() {
		let subject = this.getSubject();
		if (!subject) {
			return null;
		}

		let element = subject.primaryType.toLowerCase();

		return (
			<div className={`g-el-${element} g-record-content`}>

				<header className="g-record-content-head">
					<p className="g-legend">{this.props.kicker || 'Specimen Record'}</p>
					<h1 className="g-record-term g-record-content-name">
						{subject.name}
						<EncyclopediaLink kind="species" name={subject.name} variant="chip" />
						{subject.planet &&
							<EncyclopediaLink kind="world" name={subject.planet} variant="chip" />
						}
					</h1>
					<div className="g-record-content-chips">
						<XalianSpeciesBadge type={element} />
						{subject.secondaryType &&
							<XalianSpeciesBadge type={subject.secondaryType.toLowerCase()} />
						}
					</div>
				</header>

				<div className="g-record-content-body">
					<div className="g-record-content-plate">
						<XalianImage
							colored
							speciesName={subject.name}
							primaryType={subject.primaryType}
							secondaryType={subject.secondaryType}
							moreClasses="g-record-content-plate-img" />
					</div>

					<div className="g-record-content-data">
						<XalianAttributeChart
							xalian={this.props.xalian}
							species={this.props.species}
							id={!this.props.hideId ? subject.id : null} />
						{subject.description &&
							<p className="g-record-body g-record-content-description">{subject.description}</p>
						}
					</div>
				</div>

				{this.props.children &&
					<div className="g-record-content-readouts">{this.props.children}</div>
				}

			</div>
		);
	}
}

export default XalianRecord;
