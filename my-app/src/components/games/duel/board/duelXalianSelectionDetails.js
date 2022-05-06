import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import XalianDuelStatBadge from './xalianDuelStatBadge';
import XalianTypeEffectivenessSummary from './xalianTypeEffectivenessSummary';
import XalianImage from '../../../xalianImage';
import XalianInfoBox from '../../../xalianInfoBox';

class DuelXalianSuggestionDetails extends React.Component {

	componentDidMount() {
		// document.addEventListener('DOMContentLoaded', function () {
			// morph();
		// });
	}
	
	
	render() {
		// let speciesName = this.props.name;
		
		// let selectedSpecies = species.filter( s => (s.name.toLowerCase() === speciesName))[0];

		// let xalian = {
		// 	species: selectedSpecies,
		// 	stats: {
		// 		attack: 5,
		// 		defense: 5,
		// 		distance: 5,
		// 		range: 5,
		// 		evasion: 5
		// 	}
		// }

        let xalian = this.props.xalian;



        if (xalian) {

        
		return (
						<div className="duel-selection-details-box">
							<div className="splash-xalian-stat-row-view centered-view">
								<Row style={{ width: '100%' }}>
									<Col className="vertically-center-contents" xs={6}>
										<XalianInfoBox hideId species={xalian.species} type={xalian.elements.primaryType} />
									</Col>
									<Col className="vertically-center-contents xalian-image-wrapper" xs={6}>
										<XalianImage bordered colored shadowed speciesName={xalian.species.name} primaryType={xalian.elements.primaryType} moreClasses="xalian-image-in-row xalian-image splash-xalian-image" />
									</Col>
									<Col className="vertically-center-contents" xs={12}>
											<Col>
												<XalianDuelStatBadge type='attack' val={xalian.stats.attack} />
											</Col>
											<Col>
												<XalianDuelStatBadge type='defense' val={xalian.stats.defense} />
											</Col>
											<Col>
												<XalianDuelStatBadge type='move' val={xalian.stats.distance} />
											</Col>
											<Col>
												<XalianDuelStatBadge type='range' val={xalian.stats.range} />
											</Col>
											<Col>
												<XalianDuelStatBadge type='evasion' val={xalian.stats.evasion} />
											</Col>
									</Col>
									<Col className="" xs={12} style={{ display: 'flex', marginTop: '50px', borderRadius: '5px', border: 'solid 1px darkgray', padding: '10px' }}>
										<XalianTypeEffectivenessSummary type={xalian.elements.primaryType} />
									</Col>
								</Row>
							</div>

						</div>




		);
        }
	}
}



export default DuelXalianSuggestionDetails;
