import React from 'react';
import XalianImage from './xalianImage';

/**
 * A specimen record: plate, chips, id, description and the spec grid.
 *
 * Version 4 (docs/DESIGN_SYSTEM.md): content only, no surface of its own —
 * the page decides the medium (glass, for a live record) and this component
 * just fills it. No case, no VFD, no asset plate, no buttons, no readouts;
 * a stat chart or move list is a sibling panel the page renders next to
 * this, not a child of it.
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
				generation: xalian.species.generation || 0,
				height: xalian.species.height,
				weight: xalian.species.weight,
				statScore: xalian.meta ? xalian.meta.statScore : null,
				potentialScore: xalian.meta ? xalian.meta.potentialStatScore : null,
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
				generation: species.generation || 0,
				height: species.height,
				weight: species.weight,
				statScore: null,
				potentialScore: null,
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
		let secondaryElement = subject.secondaryType ? subject.secondaryType.toLowerCase() : null;
		let plateStyle = secondaryElement ? { '--g-el-2': `var(--g-el-${secondaryElement})` } : undefined;

		return (
			<div className="gen-record">
				<div className={`gen-record-plate g-el-${element}`} style={plateStyle}>
					<XalianImage
						colored
						speciesName={subject.name}
						primaryType={subject.primaryType}
						secondaryType={subject.secondaryType}
						moreClasses="gen-record-plate-img" />
				</div>

				<div className="gen-record-identity">
					<div className="gen-record-chips">
						<span className={`g-chip g-el-${element}`}>{subject.primaryType}</span>
						{secondaryElement &&
							<span className={`g-chip g-el-${secondaryElement}`}>{subject.secondaryType}</span>
						}
						{subject.id != null && !this.props.hideId &&
							<span className="gen-record-id g-mono">#{subject.id}</span>
						}
					</div>

					{subject.description &&
						<p className="g-body gen-record-desc">{subject.description}</p>
					}

					<div className="gen-record-origin">
						<span className="g-spec-key">Origin</span>
						<span className="g-spec-val">{subject.planet}</span>
					</div>
				</div>

				<dl className="gen-record-specs">
					<dt className="g-spec-key">Generation</dt>
					<dd className="g-spec-val">{subject.generation}</dd>
					<dt className="g-spec-key">Height</dt>
					<dd className="g-spec-val">{subject.height}</dd>
					<dt className="g-spec-key">Weight</dt>
					<dd className="g-spec-val">{subject.weight}</dd>
					{subject.statScore != null &&
						<React.Fragment>
							<dt className="g-spec-key">Stat score</dt>
							<dd className="g-spec-val">{subject.statScore.toLocaleString()}</dd>
						</React.Fragment>
					}
					{subject.potentialScore != null &&
						<React.Fragment>
							<dt className="g-spec-key">Potential</dt>
							<dd className="g-spec-val">{subject.potentialScore.toLocaleString()}</dd>
						</React.Fragment>
					}
				</dl>
			</div>
		);
	}
}

export default XalianRecord;
