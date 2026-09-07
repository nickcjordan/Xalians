import React from 'react';
import XalianImage from '../xalianImage';
import XalianSpeciesBadge from '../xalianSpeciesBadge';
import XalianMoveSet from '../xalianMoveSet';
import XalianStatChart from '../xalianStatChart';
import EncyclopediaLink from '../encyclopediaLink';

/**
 * One owned Xalian as a record strip: the species catalogue's row on the
 * `panel` terminal, or a screen line on the relay's tube.
 *
 * On the relay (`accountPage`, or the read-only `screen` on userDetailsPage),
 * the strip carries no hull panel of its own: it is a line of live content
 * inside the shared `.g-crt` the page wraps its list in
 * (docs/DESIGN_SYSTEM.md's medium rule — a user's holdings are variable,
 * live data, not a painted panel). `accountPage` additionally gets a delete
 * control as a physical `.g-key` (it is the signed-in user's own faction);
 * `screen` gets the same screen medium with no delete key, for reading
 * someone else's holdings. Elsewhere (the species catalogue) it keeps its
 * `.g-panel` hull.
 */
class XalianStatRowView extends React.Component {

	callAccountPageCallback = () => {
		this.props.accountPageCallback(this.props.xalian);
	};

	render() {
		let x = this.props.xalian.attributes;
		let type = x.elements.primaryType.toLowerCase();
		let onScreen = this.props.accountPage || this.props.screen;

		return (
			<article className={`record-strip record-strip--wide g-el-${type} ${onScreen ? 'record-strip--screen' : 'g-panel'}`}>
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
							className="g-key record-strip-delete"
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
