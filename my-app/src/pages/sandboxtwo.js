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
import { ReactComponent as SpaceshipComputerScreenXSVG } from '../svg/animations/spaceship_computer_screen_x.svg';

import ComputerScreenContent from '../components/animations/computerScreenContent';

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
				{/* <Container fluid className="home-background trigger-container">
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
				</Container> */}

				{/* <section id="content-section-1" class="splash-computer-section">
					<Container className="splash-computer-container" style={{ position: 'relative' }}>
						<Row className="splash-computer-container-row">
							<Col sm={12} md={6} className="splash-computer-container-row-title-and-image-col screen-panel-wrapper" >
								<Row className="splash-computer-container-row-title-and-image-col-title-row screen-panel-wrapper">
									<Col xs={12} className="debug-box vertically-center-contents">
										<SpaceshipComputerScreenTitlePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
										<h3 className="screen-panel-title">Title</h3>
									</Col>
								</Row>

								<Row className="splash-computer-container-row-title-and-image-col-image-row screen-panel-wrapper">
									<Col xs={12} className="debug-box vertically-center-contents" style={{ position: 'relative'}}>
										<SpaceshipComputerScreenImagePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
										<div className="splash-computer-container-row-title-and-image-col-image-row-image-wrapper">
											<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
											</div>
									</Col>
								</Row>
							</Col>

							<Col sm={12} md={6} className="splash-computer-container-row-text-col debug-box screen-panel-wrapper vertically-center-contents" >
								<SpaceshipComputerScreenInfoPanelSVG preserveAspectRatio="none" className="computer-screen-element" />
								<div className="splash-computer-container-row-text-wrapper purple">
									<h3>TEXT HERE</h3>
								</div>
							</Col>
						</Row>
						<Row className="splash-computer-container-buttons-row screen-panel-wrapper blue">
							<Col xs={4} className="screen-panel-wrapper button-row-col">
								<div className="computer-screen-arrow-wrapper">
									<SpaceshipComputerScreenNextArrowSVG className="computer-screen-next-arrow" />
								</div>
							</Col>
							<Col xs={4} className="screen-panel-wrapper button-row-col"></Col>
							<Col xs={4} className="screen-panel-wrapper button-row-col">
								<div className="computer-screen-arrow-wrapper" >
									<SpaceshipComputerScreenNextArrowSVG className="flipped computer-screen-next-arrow" />
								</div>
							</Col>
						</Row>
					</Container>
				</section> */}

				{/* <section id="content-section-1" class="splash-computer-section">
					<Container className="splash-computer-container">
						<Row className="splash-computer-container-row ">
							<Col xs={12} md={6} className="debug-box vertically-center-contents screen-panel-wrapper title-screen-col">
								<SpaceshipComputerScreenTitlePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
								<div className="screen-title-wrapper vertically-center-contents">
									<h3 className="screen-panel-title">Title</h3>
								</div>
							</Col>

							<Col xs={12} md={6} className="debug-box vertically-center-contents screen-panel-wrapper">
								<SpaceshipComputerScreenImagePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
								<div className="splash-computer-container-row-title-and-image-col-image-row-image-wrapper">
									<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
								</div>
							</Col>

							<Col xs={12} md={6} className="splash-computer-container-row-text-col debug-box screen-panel-wrapper vertically-center-contents">
								<SpaceshipComputerScreenInfoPanelSVG preserveAspectRatio="none" className="computer-screen-element" />
								<div className="splash-computer-container-row-text-wrapper purple">
									<h3>TEXT HERE</h3>
								</div>
							</Col>
						</Row>
						<Row className="splash-computer-container-buttons-row blue">
							<Col xs={4} className="screen-panel-wrapper button-row-col">
								<div className="computer-screen-arrow-wrapper">
									<SpaceshipComputerScreenNextArrowSVG className="computer-screen-next-arrow" />
								</div>
							</Col>
							<Col xs={4} className="screen-panel-wrapper button-row-col"></Col>
							<Col xs={4} className="screen-panel-wrapper button-row-col">
								<div className="computer-screen-arrow-wrapper">
									<SpaceshipComputerScreenNextArrowSVG className="flipped computer-screen-next-arrow" />
								</div>
							</Col>
						</Row>
					</Container>
				</section> */}

				<ComputerScreenContent sectionId="content-section-1" title="This Title" text="all the text that goes on the inside" nextArrowTappedCallback={() => console.log('NEXT')} backArrowTappedCallback={() => console.log('BACK')} />
{/* 
				<section id="content-section-1" class="splash-computer-section">
					<Container className="splash-computer-container">
						<Row className="splash-computer-container-row" style={{ height: '15%' }} >
							<Col className="debug-box vertically-center-contents splash-computer-col">
								<SpaceshipComputerScreenTitlePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
								<div className="screen-title-wrapper vertically-center-contents">
									<h3 className="screen-panel-title">Title</h3>
								</div>
							</Col>
						</Row>
						<Row className="splash-computer-container-row" style={{ height: '30%' }} >
							<Col className="debug-box vertically-center-contents splash-computer-col">
								<SpaceshipComputerScreenImagePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
									<img src="assets/img/background/castle.jpg" className="splash-computer-image" alt=""></img>
							</Col>
						</Row>
						<Row className="splash-computer-container-row" style={{ height: '40%'  }} >
							<Col className="debug-box vertically-center-contents splash-computer-col">
								<SpaceshipComputerScreenInfoPanelSVG preserveAspectRatio="none" className="computer-screen-element" />
								<div className="">
									<h3>TEXT HERE</h3>
								</div>
							</Col>
						</Row>
						<Row className="splash-computer-container-row" style={{ height: '15%' }} >
							<Col xs={4}  lg={4} className="debug-box vertically-center-contents splash-computer-button-col">
								<div className="computer-screen-arrow-wrapper">
									<SpaceshipComputerScreenNextArrowSVG className="computer-screen-next-arrow" />
								</div>
							</Col>
							<Col xs={true} lg={4} className="debug-box vertically-center-contents splash-computer-button-col">
							
									<div className="computer-screen-arrow-wrapper">
									<SpaceshipComputerScreenXSVG className="computer-screen-next-arrow" />
								</div>
							</Col>
							<Col xs={4}  lg={4} className="debug-box vertically-center-contents splash-computer-button-col">
								<div className="computer-screen-arrow-wrapper">
									<SpaceshipComputerScreenNextArrowSVG className="flipped computer-screen-next-arrow" />
								</div>
							</Col>
						</Row>
					</Container>
				</section> */}
			</React.Fragment>
		);
	}
}

export default Sandboxtwo;
