import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Container from 'react-bootstrap/Col';
import XalianDuelStatBadge from './xalianDuelStatBadge';
import XalianTypeEffectivenessSummary from './xalianTypeEffectivenessSummary';
import XalianImage from '../../../xalianImage';
import XalianInfoBox from '../../../xalianInfoBox';
import XalianSpeciesBadge from '../../../xalianSpeciesBadge';
import XalianPieceStateChart from './xalianPieceStateChart';

class DuelXalianSuggestionDetails extends React.Component {

	componentDidMount() {
		// let scrollContainer = document.getElementById("species-compare-box");
        // scrollContainer.addEventListener("wheel", (event) => {
        //     event.preventDefault();
        //     scrollContainer.scrollLeft += event.deltaY;
        //  });
	}


	render() {
		let xalian = this.props.xalian;
		if (xalian) {


			return (
				<Container className="duel-selection-details-box">
					<Row className="duel-xalian-details-box centered-view">
						{/* <Row style={{ width: '100%' }}> */}
						<Col className="vertically-center-contents" xs={6}>
							{/* <XalianInfoBox hideId species={xalian.species} type={xalian.elementType} /> */}
							<Col className="vertically-center-contents xalian-info-box">
								<Stack>
									<h1 className="species-detail-name ">{xalian.species.name}</h1>
											{xalian.elementType && <XalianSpeciesBadge type={xalian.elementType.toLowerCase()} />}
								</Stack>
							</Col>
						</Col>
						<Col className="vertically-center-contents" xs={6}>
							<XalianImage bordered colored shadowed speciesName={xalian.species.name} primaryType={xalian.elementType} moreClasses="xalian-image duel-xalian-details-image" />
						</Col>
						<Col className="" xs={4} style={{ paddingTop: '10px'}}>
							<Row><h6 style={{margin: '0px', textAlign: 'right', color: '#ffffff85'}}>Health: </h6></Row>
							<Row><h6 style={{margin: '0px', textAlign: 'right', color: '#ffffff85'}}>Stamina: </h6></Row>
						</Col>
						<Col className="vertically-center-contents" xs={8} style={{ paddingTop: '10px'}}>
							<XalianPieceStateChart classes="none" wrapperClasses="none" xalianState={xalian.state} spacing="8px" barHeight="4px" />
						</Col>
						<Col className="vertically-center-contents" xs={12} style={{ paddingTop: '10px'}}>
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
							<XalianTypeEffectivenessSummary type={xalian.elementType} />
						</Col>
						{/* </Row> */}
					</Row>

				</Container>




			);
		}
	}
}



export default DuelXalianSuggestionDetails;
