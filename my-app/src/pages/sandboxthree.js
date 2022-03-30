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
import { ReactComponent as SpaceshipComputerScreenTitlePanelSVG } from '../svg/animations/spaceship_computer_screen_title_panel.svg';

import SpeciesBlueprintSubmissionAnimation from '../components/animations/sections/speciesBlueprintSubmissionAnimation';
import { ReactComponent as SpaceshipComputerScreenInfoPanelSVG } from '../svg/animations/spaceship_computer_screen_info_panel1.svg';
import { ReactComponent as SpaceshipComputerScreenImagePanelSVG } from '../svg/animations/spaceship_computer_screen_image_panel.svg';
import { ReactComponent as SpaceshipComputerScreenNextArrowSVG } from '../svg/animations/spaceship_computer_screen_next_arrow.svg';
import { ReactComponent as GeneratorSVG } from '../svg/animations/generator_animation.svg';
import { ReactComponent as AkinzaSVG } from '../svg/animations/generator_animation.svg';

import SmokeEffectBackground from '../components/views/smokeEffectBackground';
import XalianSpeciesSizeComparisonView from '../components/views/xalianSpeciesSizeComparisonView';

import * as animationUtil from '../utils/animationUtil';

import GeneratorAnimation from '../components/animations/generatorAnimation';
import { ReactDOM } from 'react';
import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);
gsap.registerPlugin(ScrollTrigger);




class Sandboxthree extends React.Component {
	state = {
        showing: true
	};

	componentWillUnmount() {
	}

	componentDidMount() {
	
		
	}
	

	render() {
		return (
			<React.Fragment >
					
				<Container style={{ backgroundColor: '#cccccc' }}>
					<GeneratorAnimation/>
				</Container>
			</React.Fragment>
		);
	}
}

export default Sandboxthree;
