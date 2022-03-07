import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Image from 'react-bootstrap/Image';
import Stack from 'react-bootstrap/Stack';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ThemedSceneDiv from '../components/views/themedSceneDiv';
// import { Reveal, Tween, ScrollTrigger, Controls, Timeline, PlayState } from 'react-gsap';
import * as animations from '../components/animations/fadeAnimation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { EasePack } from 'gsap/EasePack';
import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
// import XaliansLogoAnimatedSVG from '../svg/logo/xaliansLogoAnimatedSVG';
import { ReactComponent as XaliansLogoSVG } from '../svg/logo/xalians_logo.svg';
import SplashBackgroundAnimatedSVG from '../svg/background/splashBackgroundAnimatedSVG';
import { useState, useEffect } from 'react';
import { ReactComponent as SpaceshipWindowSVG } from '../svg/animations/xalian_spaceship_window.svg'
import { ReactComponent as SpaceshipComputerScreenGridSVG } from '../svg/animations/spaceship_computer_screen_grid.svg'
import { ReactComponent as SpaceshipComputerScreenSVG } from '../svg/animations/spaceship_computer_screen.svg'
// import { ReactComponent as SpaceshipComputerScreenInfoPanelSVG } from '../svg/animations/spaceship_computer_screen_info_panel1.svg'
// import { ReactComponent as SpaceshipComputerScreenTitlePanelSVG } from '../svg/animations/spaceship_computer_screen_title_panel.svg'
import { ReactComponent as SpaceshipWallSVG } from '../svg/animations/spaceship_wall.svg'
import { IconMaximize } from '@aws-amplify/ui-react';
import Carousel from 'react-bootstrap/Carousel'
// import spaceshipComputerScreenTitlePanel from '../svg/animations/spaceship_computer_screen_title_panel.svg';

import ComputerScreenContent from '../components/animations/computerScreenContent';
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(TextPlugin);
gsap.registerPlugin(EasePack);
gsap.registerPlugin(ScrollToPlugin);

const reqSvgs = require.context ( '../svg/species', true, /\.svg$/ );
const svgs = reqSvgs.keys () .map ( path => ({ path, file: reqSvgs ( path ) }) );

class Home extends React.Component {
	state = {
		isLoading: true,
		backgroundAnimationStarDirection: 'bottom-left',
		backgroundAnimationStarSpeed: 0.2,
		width: null,
		height: null,
		computerScreenContentIndex: 0,
		computerScreenContent: [],
		computerScreenElement: null
	};

	// constructor(props) {
	// 	super(props);
		
	// }

	handleNextArrowClick = () => {
		console.log('NEXT');
		var ind = this.state.computerScreenContentIndex;
		ind = ((ind + 1) == this.state.computerScreenContent.length) ? 0 : (ind + 1);
		this.updateScreenContentState(ind);
	}

	handleBackArrowClick = () => {
		console.log('BACK');
		var ind = this.state.computerScreenContentIndex;
		ind = ((ind - 1) < 0) ? (this.state.computerScreenContent.length - 1) : (ind - 1);
		this.updateScreenContentState(ind);
	}

	updateScreenContentState = (ind = 0) => {
		let content = this.state.computerScreenContent[ind];
		this.setState({ 
			computerScreenCurrentContent: content,
			computerScreenContentIndex: ind
		});
		gsap.timeline()
		.fromTo('#computer-content-section', {xPercent: 0, autoAlpha: 1}, {xPercent:-100, autoAlpha: 0})
		.to('#computer-content-section-title-text', {text: " ", ease: 'none'})
        .to('#computer-content-section-text', { text: { value: " ", delimiter: " ", speed: 20}}, "<")
		.to('#computer-content-section-image', { attr: { src: content.image } }, "<")
		.fromTo('#computer-content-section', {xPercent:100, autoAlpha: 0}, {xPercent: 0, autoAlpha: 1})
		.to('#computer-content-section-title-text', {text: content.title, ease: 'none'})
        .to('#computer-content-section-text', { text: {
			value: content.text,
            // delimiter: " ",
            speed: 3
        }}, "<");
	}

	setInitialStateContent = (ind = 0) => {
		let contentArray = this.buildComputerScreenContent();
		// let element = this.buildComputerScreenElement(ind, contentArray[ind]);
		let content = contentArray[ind];
		this.setState({ 
			width: window.innerWidth, 
			height: window.innerHeight, 
			computerScreenContent: contentArray,
			computerScreenCurrentContent: content,
			computerScreenContentIndex: ind
		});
	}


	buildComputerScreenContent = () => {
		var content = [];
		content.push({
			title: 'The Creatures of Xalia',
			image: '',
			text: 'For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first species of Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments.',
		});
		content.push({
			title: 'Fall of the Vallerii',
			image: '',
			text: 'The high technology of the Vallerii would eventually prove to be their downfall when their own artificial intelligence took control of the Xalian Generators, turning the creatures against their creators.',
		});
		content.push({
			title: 'End War',
			image: '',
			text: 'The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.',
		});
		return content;
	};

	setSize = (w, h) => {
		let max = Math.max(w, h);
		let min = Math.min(w, h);

		this.setState({
			width: w,
			height: h,
			max: max,
			min: min,
			minXOffset: w / 2 - min / 2,
			minYOffset: h / 2 - min / 2,
			maxXOffset: w / 2 - max / 2,
			maxYOffset: h / 2 - max / 2,
		});
	};

	updateSize = () => {
		this.setSize(window.innerWidth, window.innerHeight);
	};

	componentWillUnmount() {
		window.removeEventListener('resize', this.updateSize);
	}

	handleDebugClick = (event) => {
		let xElement = document.getElementById('xalians-logo-x');
		let xRect = xElement.getBoundingClientRect();
		let offset = xRect.x - window.innerWidth / 2;
		let perc = xRect.width / window.innerWidth;
		let a1 = Math.floor(perc * 100);

		// let percInvert = window.innerWidth/xRect.width;
		console.log(`wehh`);
	};

	componentDidMount() {
		this.setState({ isLoading: false });
		this.setInitialStateContent();
		window.addEventListener('resize', this.updateSize);
		this.updateSize();

		gsap.from('#navvy', { opacity: 0, duration: 2, ease: 'sine.in', delay: 2.5 });
		// gsap.set('#spaceship-window-animation-svg', {transformOrigin: "center"});
		// gsap.set("#computer-screen-panel", {width: this.state.width, height: this.state.height});

		// gsap.set('#subline1, #subline2, #subline3, #splash-animated-changing-text, #splash-social-media-links, #xalian-generator-link, #xalians-logo-a1, #xalians-logo-l, #xalians-logo-i, #xalians-logo-a2, #xalians-logo-n, #xalians-logo-s',
		//  {opacity: 0 } );


		var splashTl = gsap.timeline({
			// repeat: 0,
			delay: 0.5,
			scrollTrigger: {
				trigger: '#splash-section',
				// start: 'top 20%',
				end: 'center center',
				toggleActions: 'play complete none none',
				// markers: true,
				
			},
		});
		splashTl
			// .addLabel("before-anything")
			// Xalian Logo
			.add(this.buildLogoAnimation())
			// Generator Button
			.fromTo('#xalian-generator-link', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.5 }, '<')
			// CREATE :: EARN :: TRADE :: PLAY
			.to('#subline1', { opacity: 1, duration: 0.5, delay: 0.5 }, '<')
			.to('#subline2', { opacity: 1, duration: 0.5, delay: 0.6 }, '<')
			.to('#subline3', { opacity: 1, duration: 0.5, delay: 0.7 }, '<')
			// discord and twitter links
			.fromTo('#splash-social-media-links', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.2 }, '<')

			// .to('#splash-animated-changing-text', { opacity: 1, duration: 0.5, delay: 0.4 }, '<')
			// .to('#splash-animated-changing-text', { text: { type: 'diff', value: 'EARN', speed: 3 }, delay: 0.08 })
			// .to('#splash-animated-changing-text', { text: { type: 'diff', value: 'TRADE', speed: 3 }, delay: 0.08 })
			// .to('#splash-animated-changing-text', { text: { type: 'diff', value: 'PLAY', speed: 3 }, delay: 0.08 })
			// .to('#splash-animated-changing-text', { text: { type: 'diff', value: 'Start Generating Now...', speed: 4, newClass: 'splash-subtitle-smaller' }, delay: 0.5 })
			// .to('#splash-animated-changing-text', { opacity: 0, duration: 0.5, delay: 0.5 });

		var spaceshipTl = gsap.timeline({
			scrollTrigger: {
				trigger: '#splash-section',
				// pin: true,
				scrub: true,
				// markers: true,
				start: 'center center',
				// end: 'bottom 20%',
				end: 'bottom top',
				// snap: "labelsDirectional",
				// snap: {
				// 	snapTo: "labels",
				// 	duration: 3,
				// 	inertia: false
				// },
				// preventOverlaps: "spaceship-animation-group",
				toggleActions: 'play complete reverse reset',
				anticipatePin: 1,
			},
		});

		let xElement = document.getElementById('xalians-logo-x');
		let xRect = xElement.getBoundingClientRect();
		// let offset = ((xRect.x) - (window.innerWidth/2));
		let offset = window.innerWidth / 2 - (xRect.width / 2 + xRect.x);
		let perc = xRect.width / window.innerWidth;
		let a1 = Math.floor(perc * 1000);

		// ScrollTrigger.create({
		//   trigger: '#splash-section',
		//   start: 'center center',
		// //   end: 'bottom 20%',
		//   onLeave: () => { gsap.to(window, { scrollTo: { duration: 3, y: "#splash-page-spacer", autoKill: false } }) },
		//   onEnterBack: () => { gsap.to(window, { scrollTo: { duration: 3, y: 0, autoKill: false } }) }
		// });

		spaceshipTl
		// .addLabel("before-spaceship-window-animation")
			// .to('#subline1, #subline2, #subline3, #splash-animated-changing-text, #splash-social-media-links, #xalian-generator-link, #xalians-logo-a1, #xalians-logo-l, #xalians-logo-i, #xalians-logo-a2, #xalians-logo-n, #xalians-logo-s', { opacity: 0 }, '<')
			.to('#subline1, #subline2, #subline3, #splash-social-media-links, #xalian-generator-link, #xalians-logo-a1, #xalians-logo-l, #xalians-logo-i, #xalians-logo-a2, #xalians-logo-n, #xalians-logo-s', { opacity: 0 }, '<')
			.from('#spaceship-window-animation-svg', { scale: 10, duration: 1, ease: 'none' })
			.to('#spaceship-window-animation-svg', { xPercent: -100, ease: 'none' })
			.from('#spaceship-animation-panel-wrapper', { xPercent: 100, ease: 'none' }, '<')
			.to('#spaceship-computer-outside-animation', { autoAlpha: 0, scale: 5 })
			.fromTo('#spaceship-computer-screen-animation-svg', { autoAlpha: 0 }, { width: this.state.max, height: this.state.max, autoAlpha: 1 }, '<')
			// .addLabel('after-spaceship-window-animation')
			;


		ScrollTrigger.create({
			trigger: '#splash-page-spacer',
				pin: true,
				scrub: 1,
				start: 'top top',
				end: '+=100%',
				// markers: true,
				// snap: "labelsDirectional",
				// onEnter: () => { gsap.to(window, { scrollTo: { duration: 3, y: "#splash-page-spacer", autoKill: false } }) },
		  		// onEnterBack: () => { gsap.to(window, { scrollTo: { duration: 3, y: 0, autoKill: false } }) },
				// onSnapComplete: ({ progress, direction, isActive }) => console.log(progress, direction, isActive),
				// onLeave: () => { gsap.to('#splash-page-spaceship-window-animation', {autoAlpha: 0}) },
				onLeaveBack: () => { gsap.to('#splash-page-spaceship-window-animation', {autoAlpha: 1}) },
				onToggle: self => { 
					if (self.isActive) {
						gsap.to('#splash-page-spaceship-window-animation, #splash-page-spacer', {autoAlpha: 1}) 
					} else {
						gsap.to('#splash-page-spaceship-window-animation, #splash-page-spacer', {autoAlpha: 0}) 
					}
				}
				// preventOverlaps: "spaceship-animation-group"
		});

		ScrollTrigger.create({
			trigger: '#xalian-svg-carousel',
				start: 'center center',
				pin: true,
				end: '+=100%',
				// markers: true,
				// onEnter: () => { gsap.to(window, { scrollTo: { duration: 1, y: "#splash-page-spacer", autoKill: false } }) },
		});

		// ScrollTrigger.create({
		// 	trigger: '#splash-page-spacer',
		// 		start: 'top bottom',
		// 		end: '+=100%',
		// 		markers: true,
		// 		onEnter: () => { gsap.to(window, { scrollTo: { duration: 1, y: "#splash-page-spacer", autoKill: false } }) },
		// });

		// contentParentTl.addLabel('horizontal-content-start');

		// buildPanelAnimation(contentParentTl, '#content-section-1');
		// buildPanelAnimation(contentParentTl, '#content-section-2');
		// buildPanelAnimation(contentParentTl, '#content-section-3');
		// contentParentTl.addLabel('horizontal-content-end');

		// spaceshipTl.add(contentParentTl);

		function buildPanelAnimation(tl, id, timescale = 4) {
			// let inTl = gsap.timeline();
			// inTl.fromTo(id, { autoAlpha: 0 }, { autoAlpha: 1, duration: timescale });

			// let outTl = gsap.timeline();
			// outTl.to(id, { autoAlpha: 0, duration: timescale }, '<');

			// tl.add(inTl);
			// tl.addLabel(id);
			// tl.add(outTl);
		}
	}

	getWindow = () => {
		let ww = window;
		let screen = ww.screen;
		let logo = document.getElementById('xaliansLogo');
		console.log('got window');
	};

	buildLogoAnimation = (delay = 0) => {
		let main = gsap.timeline({
			// scrollTrigger: {
			// trigger: '#splash-section',
			// start: 'top 20%',
			// endTrigger: '#splash-section',
			// end: 'bottom top',
			// end: 'bottom top',
			// toggleActions: 'play reset play reset',
			// toggleActions: 'play complete reverse reset',
			// markers: true,
			// }
		});
		main.add(this.buildLetterEntry('#xalians-logo-s', delay + 0), '<')
			.add(this.buildLetterEntry('#xalians-logo-n', delay + 0.05), '<')
			.add(this.buildLetterEntry('#xalians-logo-a2', delay + 0.1), '<')
			.add(this.buildLetterEntry('#xalians-logo-i', delay + 0.15), '<')
			.add(this.buildLetterEntry('#xalians-logo-l', delay + 0.2), '<')
			.add(this.buildLetterEntry('#xalians-logo-a1', delay + 0.25), '<')
			.add(this.buildLetterEntry('#xalians-logo-x', delay + 0.3), '<');
		return main;
	};

	buildLetterEntry = (id, d) => {
		let main = gsap.timeline({});
		var turnLightOn = gsap.timeline({ delay: d });
		for (var i = 1; i < 6; i += 2) {
			turnLightOn.to(id, { duration: Math.random() / 2, opacity: i / 10 });
			turnLightOn.to(id, { duration: Math.random() / 2, opacity: i / 20 });
		}
		turnLightOn.to(id, { duration: 1, opacity: 1 });

		var zoomIn = gsap.timeline();
		zoomIn
			// .set(id, {opacity: 0.2})
			.from(id, { duration: 0.6, x: '-=100vw', delay: d, skewX: 25 })
			.to(id, { duration: 0.3, yPercent: -100, ease: 'elastic.in(1, 0.3)' })
			.to(id, { duration: 0.3, yPercent: 0, ease: 'power4.in' });

		// var flicker = gsap.timeline({ delay: 2, repeat: -1 });
		// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 8.3))});
		// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 3.1))});
		// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 1.7))});

		main.add(zoomIn).add(turnLightOn);
		// .add(flicker, "<")
		return main;
	};

	render() {
		return (
			<React.Fragment>
				<Container fluid className="home-background">
					<SplashGalaxyBackground direction={this.state.backgroundAnimationStarDirection} speed={this.state.backgroundAnimationStarSpeed}>
						<XalianNavbar></XalianNavbar>

						<section id="splash-section" className="splash-section-debug">
							<Container id="splash-container" className="splash-container vertically-center-contents-grid splash-background">
								<Row className="row justify-content-center title-logo-row">
									<Col lg={8} md={9} sm={10} xs={11} className="title-logo-col vertically-center-contents-grid">
										<XaliansLogoSVG onClick={this.handleDebugClick} id="xaliansLogo" className="animated-xalian-svg xalian-logo" />
										<h5 id="subline1" className="splash-subline">
											Magical, Bioengineered, Digital Creatures
										</h5>
										<h5 id="subline2" className="splash-subline">
											100% Unique AI Generated Stats
										</h5>
										<h5 id="subline3" className="splash-subline">
											Designed, Voted On, & Owned by You
										</h5>
										{/* <h1 id="splash-animated-changing-text" className="splash-subtitle shadow-text">
											CREATE
										</h1> */}
										<Button variant="xalianGreen" className="xalian-font xalian-splash-generator-button clickable" id="xalian-generator-link" href="/generator">
											TRY THE GENERATOR
										</Button>
										<div id="splash-social-media-links" className="social-media-links clickable">
											<a href="https://discord.gg/sgGNhNJ2KN" className="social-media-links">
												<i className="bi bi-discord"></i>
											</a>
											<a href="https://twitter.com/xaliansgame" className="social-media-links">
												<i className="bi bi-twitter"></i>
											</a>
										</div>
										<ScrollingCarousel />
									</Col>
								</Row>
							</Container>
						</section>
						<div id="splash-page-spaceship-window-animation" className="splash-page-spaceship-window-animation debug-box">
							<div className="spaceship-animation-window-panel-wrapper" style={{ left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max }}>
								<SpaceshipWindowSVG className="debug-box" id="spaceship-window-animation-svg" style={{ left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max }} />
							</div>
							<div id="spaceship-animation-panel-wrapper" className="spaceship-animation-screen-panel-wrapper" style={{ left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max }}>
								<SpaceshipComputerScreenGridSVG className="debug-box spaceship-screen-grid-svg" id="spaceship-computer-screen-animation-svg" style={{ left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max }} />
								<div className="debug-box spaceship-screen" id="spaceship-computer-outside-animation" style={{ backgroundSize: this.state.min, width: this.state.min, height: this.state.min }} />
							</div>
						</div>

		=

						<div id="splash-page-spacer" className="splash-page-full-content-wrapper">
				

							{this.state.computerScreenCurrentContent && 
								<ComputerScreenContent id="computer-content-section-wrapper"
									sectionId={"computer-content-section"}
									title={this.state.computerScreenCurrentContent.title}
									text={this.state.computerScreenCurrentContent.text}
									imageLocation={this.state.computerScreenCurrentContent.image}
									nextArrowTappedCallback={this.handleNextArrowClick}
									backArrowTappedCallback={this.handleBackArrowClick}
								/>
							}
			

							<section id="" class="splash-page-content-end-section"></section>
						</div>
						<section id="team" className="team light gradient-background-section">
							<Container className="team-container">
								<h3>The Team</h3>
								<Row className="team-row">
									<Col sm={true} className="d-flex">
										<div className="member">
											<div className="member-img">
												<img src="assets/img/xalians/xalians_icon_xylum.png" className="img-fluid" alt=""></img>
												<div className="social">
													<a href="https://twitter.com/KingKozrak">
														<i className="bi bi-twitter"></i>
													</a>
												</div>
											</div>
											<div className="member-info">
												<h4>Doctor J</h4>
												<span className="underline">Xalian Geneticist</span>
												<span>Tech Engineer</span>
											</div>
										</div>
									</Col>

									<Col sm={true} className="d-flex">
										<div className="member">
											<div className="member-img">
												<img src="assets/img/xalians/xalians_icon_crystorn.png" className="img-fluid" alt=""></img>
												<div className="social">
													<a href="">
														<i className="bi bi-twitter"></i>
													</a>
												</div>
											</div>
											<div className="member-info">
												<h4>Captain M</h4>
												<span className="underline">Xalian Astrophysicist</span>
												<span>Execution Engineer</span>
											</div>
										</div>
									</Col>

									<Col sm={true} className="d-flex">
										<div className="member">
											<div className="member-img">
												<img src="assets/img/xalians/xalians_icon_smokat.png" className="img-fluid" alt=""></img>
											</div>
											<div className="member-info">
												<h4>Professor V</h4>
												<span className="underline">Cosmic Librarian</span>
												<span>Story Creator / Writer</span>
											</div>
										</div>
									</Col>

									<Col sm={true} className="d-flex">
										<div className="member">
											<div className="member-img">
												<img src="assets/img/xalians/xalians_icon_unknown.png" className="img-fluid" alt=""></img>
											</div>
											<div className="member-info">
												<h4>Unknown Human</h4>
												<span className="underline">Xalian Researcher</span>
												<span>Visual Creator / Artist</span>
											</div>
										</div>
									</Col>
								</Row>
							</Container>
						</section>

						<footer id="footer">
							<div className="footer-top">
								<div className="container">
									<div className="row">
										<div className="col-lg-3 col-md-6 social-links-footer">
											<div className="footer-info">
												<h3>
													join our team<span>:</span>
												</h3>

												<div className="social-links mt-3">
													<a href="https://discord.gg/sgGNhNJ2KN" className="discord">
														<i className="bi bi-discord"></i>
													</a>
													<a href="https://twitter.com/xaliansgame" className="twitter">
														<i className="bi bi-twitter"></i>
													</a>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</footer>
					</SplashGalaxyBackground>
					{this.state.isLoading && <div id="preloader"></div>}
				</Container>
			</React.Fragment>
		);
	}
}

function ScrollingCarousel() {

	var items = [];

	svgs.forEach( xalianSvg => {
		
		console.log(`xalian = ${JSON.stringify(xalianSvg, null, 2)}`);
		items.push(buildImage(xalianSvg));
	})

	function buildImage(svg) {
		return (<Carousel.Item className="xalian-svg-carousel-item">
		  <Image style={{ height: '25vh', fill: '#FFFFFF', color: '#FFFFFF'}}
			className="splash-xalian-species-carousel-image"
			src={svg.file.default}
			alt="First slide"
		  />
		  {/* <Carousel.Caption>
			<h3>First slide label</h3>
			<p>Nulla vitae elit libero, a pharetra augue mollis interdum.</p>
		  </Carousel.Caption> */}
		</Carousel.Item>);
	}

	const [index, setIndex] = useState(0);
  
	const handleSelect = (selectedIndex, e) => {
	  setIndex(selectedIndex);
	};

	return (
	  <Carousel indicators={false} interval={2000} controls={false} id="xalian-svg-carousel" className="xalian-svg-carousel" activeIndex={index} onSelect={handleSelect} variant='dark'>
		{items}
	  </Carousel>
	);
  }

export default Home;
