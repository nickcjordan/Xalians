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



gsap.registerPlugin(MotionPathPlugin);
gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin, DrawSVGPlugin);

class Sandboxthree extends React.Component {

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





		return (
			<React.Fragment>
				{/* <Button onClick={morph}>morph</Button> */}
				<GameContainer>
					<div style={{ backgroundColor: '#333333', height: '100%', width: '100%', display: 'flex' }}>
						
						
						
						
						<div className="duel-selection-details-box">
							<div className="splash-xalian-stat-row-view centered-view">
								<Row style={{ width: '100%' }}>
									<Col className="vertically-center-contents" xs={6}>
										<XalianInfoBox hideId species={xalian.species} />
									</Col>
									<Col className="vertically-center-contents xalian-image-wrapper" xs={6}>
										<XalianImage bordered colored shadowed speciesName={xalian.species.name} primaryType={xalian.species.type} moreClasses="xalian-image-in-row xalian-image splash-xalian-image" />
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
										<XalianTypeEffectivenessSummary type={xalian.species.type} />
									</Col>
								</Row>
							</div>

						</div>





					</div>
				</GameContainer>
			</React.Fragment>
		);
	}
}



export default Sandboxthree;
