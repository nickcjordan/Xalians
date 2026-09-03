import React from 'react';
import XalianImage from '../xalianImage';
import XalianSpeciesBadge from '../xalianSpeciesBadge';
import XalianMoveSet from '../xalianMoveSet';
import XalianStatChart from '../xalianStatChart';
import EncyclopediaLink from '../encyclopediaLink';

/**
 * One owned Xalian as a record strip: the account page's row.
 *
 * Was four bootstrap columns floating on the starfield, with the delete button
 * nested two Cols deep inside the name column. Same document as the species
 * strip, with the generated stat allocation and move set as its readouts.
 */
class XalianStatRowView extends React.Component {

	callAccountPageCallback = () => {
		this.props.accountPageCallback(this.props.xalian);
	};

	render() {
		let x = this.props.xalian.attributes;
		let type = x.elements.primaryType.toLowerCase();

		return (
			<article className={`g-panel record-strip record-strip--wide g-el-${type}`}>
				<div className="record-strip-plate">
					<XalianImage
						colored
						speciesName={x.species.name}
						primaryType={x.elements.primaryType}
						secondaryType={x.elements.secondaryType}
						moreClasses="record-strip-img" />
				</div>

				<div className="record-strip-ident">
					<h3 className="record-strip-name">
						<EncyclopediaLink kind="species" name={x.species.name} variant="inline" />
					</h3>
					<XalianSpeciesBadge type={type} />
					<XalianSpeciesBadge type={x.elements.secondaryType.toLowerCase()} />

					{this.props.accountPage &&
						<button
							type="button"
							className="g-btn g-btn--danger g-btn--icon record-strip-delete"
							title="Remove from your faction"
							aria-label={`Remove ${x.species.name} from your faction`}
							onClick={this.callAccountPageCallback}>
							<i className="bi bi-trash" />
						</button>
					}
				</div>

				<div className="record-strip-readout">
					<XalianStatChart
						includeLabel
						labelFontSize={'8pt'}
						barSize={16}
						stats={x.stats}
						abbreviatedNames
						moreClasses="record-strip-chart" />
				</div>

				<div className="record-strip-readout">
					<XalianMoveSet moves={x.moves} />
				</div>
			</article>
		);
	}
}

export default XalianStatRowView;
