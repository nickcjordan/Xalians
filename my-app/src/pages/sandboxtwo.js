import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';
import { ReactComponent as SpeciesBlueprintSVG } from '../svg/animations/species_blueprint.svg';
import { ReactComponent as VoteSubmissionSVG } from '../svg/animations/vote_submission.svg';
import { ReactComponent as VoteSubmission2SVG } from '../svg/animations/vote_submission2.svg';

import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import SmokeEmitter from '../components/animations/smokeEmitter';

import SpeciesBlueprintSubmissionAnimation from '../components/animations/sections/speciesBlueprintSubmissionAnimation';

import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);
gsap.registerPlugin(ScrollTrigger);

class Sandboxtwo extends React.Component {

    state = {
		isLoading: true,
		backgroundAnimationStarDirection: 'bottom-left',
		backgroundAnimationStarSpeed: 0.2,
	};
    
	componentDidMount() {
		let sections = gsap.utils.toArray('.splash-panel');

		// gsap.to(sections, {
		// 	yPercent: -100 * (sections.length - 1),
		// 	ease: 'none',
		// 	scrollTrigger: {
		// 		trigger: '.trigger-container',
		// 		pin: true,
		// 		scrub: true,
		// 		snap: 1 / (sections.length - 1),
		// 		end: () => '+=' + document.querySelector('.trigger-container').offsetWidth,
		// 	},
		// });
	}

	render() {
		let sectionCount = 3;
		return (
			<React.Fragment>
				<Container fluid className="home-background trigger-container">
					<SplashGalaxyBackground className="inset-container" direction={this.state.backgroundAnimationStarDirection} speed={this.state.backgroundAnimationStarSpeed}>
						<XalianNavbar></XalianNavbar>

						<div className="main-splash-panel">
							<div>MAIN SECTION</div>
						</div>
						<div className="splash-panel" id="sec2">
							<SpeciesBlueprintSubmissionAnimation parentId="sec2" animationWidth={Math.min(window.innerWidth / 5, window.innerHeight / 5)} />
						</div>
						<section className="splash-panel" id="sec3">
							SECTION 3
						</section>
					</SplashGalaxyBackground>
				</Container>
			</React.Fragment>
		);
	}
}

export default Sandboxtwo;
