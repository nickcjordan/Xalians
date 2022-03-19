import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../../components/navbar';

import XalianImage from '../../components/xalianImage';
import MatchGameFlippedCard from '../../components/games/elements/matchGameFlippedCard';
import species from '../../json/species.json';

import { ReactComponent as FigzySVG } from '../../svg/species/figzy.svg';
import Form from "react-bootstrap/Form";

import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import ThemedSceneDiv from '../../components/views/themedSceneDiv';
import BaseGamePage from './baseGamePage';
gsap.registerPlugin(MotionPathPlugin, TextPlugin, ScrollTrigger, DrawSVGPlugin, Draggable, InertiaPlugin, Physics2DPlugin, MorphSVGPlugin);

class PhysicsGamePage extends React.Component {

    state = {
        rotateValue: 0,
        powerValue: 50
    }


	componentDidMount() {
        window.addEventListener('resize', this.updateSize);
		this.updateSize();
        gsap.set('#figzy-body', { transformOrigin: '50%, bottom'});
        gsap.set('#figzy-inside-spinner, #figzy-outside-spinner', { transformOrigin: '50%, 50%' });
        gsap.to('#figzy-inside-spinner, #figzy-outside-spinner', {scale: ((this.state.powerValue + 50) / 100)});

        Draggable.create('#figzy-outside-spinner', {
			bounds: window,
			edgeResistance: 0.65,
			type: 'x,y',
			inertia: true,
			autoScroll: true,
			// liveSnap: liveSnap,
			snap: {
				x: function (endValue) {
					return true || true ? Math.round(endValue / 500) * 500 : endValue;
				},
				y: function (endValue) {
					return true || true ? Math.round(endValue / 500) * 500 : endValue;
				},
			},
		});
    }

    componentWillUnmount() {
		window.removeEventListener('resize', this.updateSize);
	}

    handleRotateChange = (val) => {
        this.setState({ rotateValue: val });
        gsap.to('#figzy', {rotate: -val});
    }

    handlePowerChange = (val) => {
        this.setState({ powerValue: val });
        gsap.set('#figzy-inside-spinner, #figzy-outside-spinner', {scale: ((parseInt(val) + 50) / 100), transformOrigin: '50%, 50%'});
    }

    action = () => {
        // gsap.to('#figzy-inside-spinner, #figzy-outside-spinner', {x: '+= 100px', y: '+= 100px', ease: "power2.inOut"});
        gsap.to('#figzy-inside-spinner, #figzy-outside-spinner', {onUpdate: this.checkHit, duration: 20, physics2D: {velocity: this.state.powerValue*10, angle: -this.state.rotateValue, gravity: 400}});

    }

    checkHit = () => {
        if (Draggable.hitTest("#figzy-outside-spinner", "#target")){
        //   gsap.killTweensOf(".box");
        console.log("HIT");
        }
      }

    undoIt = () => {
        MorphSVGPlugin.convertToPath("G");
        gsap.timeline().to('#figzy-body', {morphSVG: '#figzy-body-rotate-60', duration: 1}).then(() => {
            console.log('done');
        });
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


	render() {
		return (
			<React.Fragment>
				{/* <Container fluid className="content-background-container"> */}
					{/* <XalianNavbar></XalianNavbar> */}

					<Row style={{ margin: '5px' }}>
						<Col>
							{this.state.size && (
								<Container fluid className="game-container game-centered-over-object" style={{ backgroundColor: 'whitesmoke', height: this.state.size.min, width: this.state.size.min, overflow: 'visible' }}>
									<Row style={{ position: 'absolute', width: '100%', zIndex: '999'}}>
										<Button onClick={this.action}>FIRE</Button>
										<Form.Label>Rotate ({this.state.rotateValue})</Form.Label>
										<Form.Range max={60} value={this.state.rotateValue} onChange={(event) => this.handleRotateChange(event.target.value)} />

										<Form.Label style={{ paddingTop: '10px' }}>
											Power ({this.state.powerValue}) - scale {(parseInt(this.state.powerValue) + 50) / 100}
										</Form.Label>
										<Form.Range max={100} value={this.state.powerValue} onChange={(event) => this.handlePowerChange(event.target.value)} />
									</Row>
									<Row style={{ height: '100%'}}>
										<Col style={{ height: '100%'}}>
											<div id="arena" style={{ height: '100%', width: '100%', position: 'relative', backgroundColor: '#8fa2f85e' }}>
												<div style={{ maxHeight: this.state.size.min * 0.1, maxWidth: this.state.size.min * 0.1, margin: 'auto', position: 'absolute', bottom: '0%', left: '0' }}>
													<FigzySVG style={{ height: '100%', width: '100%', overflow: 'visible', pointerEvents: 'none' }} />
												</div>
                                                    <div id="target" style={{ backgroundColor: 'blue', width: '50px', height: '50px', position: 'absolute', bottom: '0%', right: '0' }}></div>
											</div>
										</Col>
									</Row>
								</Container>
							)}
							{/* <div className="game-bottom-over-object">
								<Button id="match-game-start-button" variant="xalianGreen" onClick={this.startGameTapped} style={{ fontSize: 'large', padding: '20px' }}>
									Start
								</Button>
								<h1 className="game-display-text white-outline-text">{this.state.text}</h1>
								<h1 className="game-display-text white-outline-text" id="match-game-display-text">
									Ready...
								</h1>
							</div> */}
						</Col>
						<Col>{/* <h1>{this.state.started.toString()}</h1> */}</Col>
					</Row>
				{/* </Container> */}
			</React.Fragment>
		);
	}
}

export default PhysicsGamePage;
