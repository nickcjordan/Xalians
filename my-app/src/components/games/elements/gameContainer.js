import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';


import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(MotionPathPlugin, TextPlugin, ScrollTrigger, DrawSVGPlugin);

class GameContainer extends React.Component {
	state = {};

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
		this.setSize(window.innerWidth, Math.min(window.innerHeight * 0.8, window.innerHeight - 100));
	};

	render() {
		return (
			<React.Fragment>
				<Container fluid className="game-container">
                    {this.state.size && 
                        <div className="game-container-content-wrapper" style={{ height: `${this.state.size.min}px`, width: `${this.state.size.min}px` }} >
                            {this.props.children}
                        </div>
                    }
				</Container>
			</React.Fragment>
		);
	}
}

export default GameContainer;
