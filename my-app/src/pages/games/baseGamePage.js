import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../../components/navbar';

import XalianImage from '../../components/xalianImage';
import MatchGameFlippedCard from '../../components/games/elements/matchGameFlippedCard';
import species from '../../json/species.json';

import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(MotionPathPlugin, TextPlugin, ScrollTrigger, DrawSVGPlugin);

class BaseGamePage extends React.Component {
	state = {
	};

	componentWillUnmount() {
		window.removeEventListener('resize', this.updateSize);
	}

	componentDidMount() {
		window.addEventListener('resize', this.updateSize);
		this.updateSize();
	}

	setSize = (w, h) => {
		let max = Math.max(w, h);
		let min = Math.min(w, h);

		let padding = 10;

		this.setState({
			size: {
				width: w - padding,
				height: h - padding,
				max: max - padding,
				min: min - padding,
			},
		});
	};

	updateSize = () => {
		this.setSize(window.innerWidth, Math.min(window.innerHeight*0.8, window.innerHeight - 100));
	};

	

	// render() {
	// 	return (
	// 		<React.Fragment>
	// 			<Container fluid className="content-background-container">
	// 				<XalianNavbar></XalianNavbar>

	// 				<Row style={{ margin: '5px' }}>
	// 					<Col>
	// 						{this.state.size && (
	// 							<Container fluid className="game-container game-centered-over-object" style={{ height: this.state.size.min, width: this.state.size.min, overflow: 'visible', maxHeight: this.state.cardRowSize * 350, maxWidth: this.state.cardRowSize * 350 }}>
	// 								<div id="match-card-game-wrapper" className="match-card-game-wrapper" style={{ margin: 'auto' }}>
	// 									{this.state.cards}
	// 								</div>
	// 							</Container>
	// 						)}
	// 								<div className="game-bottom-over-object">
	// 									<Button id="match-game-start-button" variant="xalianGreen" onClick={this.startGameTapped} style={{ fontSize: 'large', padding: '20px' }}>
	// 										Start
	// 									</Button>
	// 									<h1 className='game-display-text white-outline-text'>{this.state.text}</h1>
	// 									<h1 className='game-display-text white-outline-text' id="match-game-display-text">Ready...</h1>
	// 								</div>
	// 					</Col>
	// 					<Col>{/* <h1>{this.state.started.toString()}</h1> */}</Col>
	// 				</Row>
	// 			</Container>
	// 		</React.Fragment>
	// 	);
	// }
}

export default BaseGamePage;
