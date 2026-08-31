import React from 'react';
import XalianNavbar from '../components/navbar';
import species from '../json/species.json';
import XalianRecord from '../components/xalianRecord';
import SpeciesRatingMeters from '../components/speciesRatingMeters';

class SpeciesDetailPage extends React.Component {
	state = {};

	componentDidMount() {
		let inboundId = this.props.id ? this.props.id.toString() : '';
		// ids in species.json are zero-padded 5-digit strings; accept "/species/1" as well as "/species/00001"
		if (inboundId && inboundId.length < 5) {
			inboundId = inboundId.padStart(5, '0');
		}
		let xal = species.find((x) => x.id === inboundId);
		this.setState({
			id: inboundId,
			xalian: xal,
			notFound: !xal,
		});
	}

	render() {
		return (
			<div className="g-console">
				<XalianNavbar />

				<div className="g-shell page-shell">
					{this.state.notFound && (
						<React.Fragment>
							<header className="page-header">
								<p className="g-kicker">Xalian Registry</p>
								<h1 className="g-title">No such specimen</h1>
							</header>
							<p className="g-empty">
								No Xalian species matches this designation. <a href="/species">Browse the catalogue</a>
							</p>
						</React.Fragment>
					)}

					{this.state.xalian && (
						<XalianRecord species={this.state.xalian}>
							<section className="specimen-readout">
								<p className="g-kicker">Stat Ratings</p>
								<SpeciesRatingMeters stats={this.state.xalian.statRatings} />
							</section>
						</XalianRecord>
					)}
				</div>
			</div>
		);
	}
}

export default SpeciesDetailPage;
