import axios from 'axios';
import React from 'react';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import CharacterStats from '../components/characterStat';
import CharacterMoves from '../components/characterMove';
import XalianNavbar from '../components/navbar';
import species from '../json/species.json';
import Table from 'react-bootstrap/Table';
import CharacterStatRangeChart from '../components/characterStatRangeChart';
import Stack from 'react-bootstrap/Stack';
import XalianMoveSet from '../components/xalianMoveSet';
import XalianAttributeChart from '../components/xalianAttributeChart';
import XalianImage from '../components/xalianImage';
import XalianStatRatingChart from '../components/xalianStatRatingChart';


class SpeciesDetailPage extends React.Component {
	state = {};

	componentDidMount() {
		console.log(`INBOUND: ${JSON.stringify(this.props, null, 2)} :: ${this.props.id.toString()}`);
		var map = new Map();
		for (var ind in species) {
			let x = species[ind];
			map[x.id] = x;
		}
		let inboundId = this.props.id;
		let xal = map[inboundId];
		this.setState({
			id: inboundId,
			xalian: xal,
		});
	}

	

	render() {
		return (
			<React.Fragment>
				{this.state.xalian && (
					<Container fluid className="content-background-container">
						<XalianNavbar></XalianNavbar>
						<Container fluid className="whole-container ">
							<Row className="centered-view squeezed-view third-height stackable-padding">
								<Col lg={3} md={6} sm={6} className="xalian-species-title">
									<Stack>
										<h1 className="species-detail-name">{this.state.xalian.name}</h1>
										<h4 className="species-detail-id">#{this.state.xalian.id}</h4>
									</Stack>
								</Col>
								<Col lg={3} md={6} sm={6} className="">
									<Row className="xalian-image-row">
										<XalianImage colored bordered shadowed speciesName={this.state.xalian.name} primaryType={this.state.xalian.type} moreClasses="xalian-image-detail" />
									</Row>
								</Col>
								<Col lg={true} className="vertically-center-contents centered-view">
									<XalianAttributeChart species={this.state.xalian} />
								</Col>
							</Row>
							<Row className="centered-view squeezed-view third-height">
								<div className="species-detail-description-div">
									<h5 className="species-detail-description">{this.state.xalian.description}</h5>
								</div>
							</Row>
							<Row className="third-height ">
								<Col>
									<XalianStatRatingChart axisLabelColor={'white'} includeLabel labelFontSize={'10pt'} barSize={30} stats={this.state.xalian.statRatings} moreClasses="condensed-chart-div padded-row" />
								</Col>
							</Row>
						</Container>
					</Container>
				)}
			</React.Fragment>
		);
	}

	getTypeColorClassName() {
		return `${this.state.xalian.type.toLowerCase()}-color`;
	}

	getImageLocationFromSpecies(name) {
		return `/assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
	}
}
export default SpeciesDetailPage;
