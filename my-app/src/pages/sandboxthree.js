import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';
import { ReactComponent as XaliansDNALogoSVG } from '../svg/logo/xalians_dna_logo.svg';
import { ReactComponent as XaliansLogoSVG } from '../svg/logo/xalians_logo.svg';
import { ReactComponent as VoteSubmissionSVG } from '../svg/animations/vote_submission.svg';
import { ReactComponent as VoteSubmission2SVG } from '../svg/animations/vote_submission2.svg';

import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import SmokeEmitter from '../components/animations/smokeEmitter';
import { ReactComponent as SpaceshipComputerScreenTitlePanelSVG } from '../svg/animations/spaceship_computer_screen_title_panel.svg';

import SpeciesBlueprintSubmissionAnimation from '../components/animations/sections/speciesBlueprintSubmissionAnimation';

import SmokeEffectBackground from '../components/views/smokeEffectBackground';
import XalianSpeciesSizeComparisonView from '../components/views/xalianSpeciesSizeComparisonView';

import * as timerUtil from '../utils/timerUtil';

import Timer from '../components/games/elements/timer';

import * as animationUtil from '../utils/animationUtil';

import GeneratorAnimation from '../components/animations/generatorAnimation';
import { ReactDOM } from 'react';
import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { Flip } from 'gsap/Flip'
import GameContainer from '../components/games/elements/gameContainer';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

import species from '../json/species.json';
import XalianInfoBox from '../components/xalianInfoBox';
import XalianImage from '../components/xalianImage';
import XalianDuelStatBadge from '../components/games/duel/board/xalianDuelStatBadge';
import XalianTypeEffectivenessSummary from '../components/games/duel/board/xalianTypeEffectivenessSummary';

import AttackActionModal from './../components/games/duel/attackActionModal';

import { Counter } from '../store/Counter';

gsap.registerPlugin(MotionPathPlugin);
gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin, DrawSVGPlugin);

class Sandboxthree extends React.Component {


	state = {show : true}

	componentDidMount() {
		// document.addEventListener('DOMContentLoaded', function () {
			// morph();
		// });
	}
	
	
	render() {
		let speciesName = "akinza";
		
		let selectedSpecies = species.filter( s => (s.name.toLowerCase() === speciesName))[0];

		let xalian = {
			species: selectedSpecies,
			stats: {
				attack: 5,
				defense: 5,
				distance: 5,
				range: 5,
				evasion: 5
			}
		}

		let attackData = {
			attackerIndex: 24,
			attackerId: '1234',
			attackerType: 'Water',
			defenderIndex: 25,
			defenderId: '4321',
			defenderType: 'Electric'
		  };





		return (
			<React.Fragment>
				<GameContainer>
					
				{/* <AttackActionModal 
						show={this.state.show}
						onHide={() => {this.setState({show: false})}}
						attackData={attackData}
					/> */}

					<Counter/>

				</GameContainer>
			</React.Fragment>
		);
	}
}



export default Sandboxthree;
