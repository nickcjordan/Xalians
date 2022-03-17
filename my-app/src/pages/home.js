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
import fitty from 'fitty';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
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
import species from '../json/species.json';
import XalianSpeciesBadge from '../components/xalianSpeciesBadge';
import XalianImage from '../components/xalianImage';
import XalianSpeciesRowView from '../components/views/xalianSpeciesRowView';
import XalianStatRatingChart from '../components/xalianStatRatingChart';
import XalianInfoBox from '../components/xalianInfoBox';
// import spaceshipComputerScreenTitlePanel from '../svg/animations/spaceship_computer_screen_title_panel.svg';

import ComputerScreenContent from '../components/animations/computerScreenContent';
gsap.registerPlugin(ScrollTrigger, TextPlugin, EasePack, ScrollToPlugin, DrawSVGPlugin, ScrambleTextPlugin);

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
		let tl = gsap.timeline();
		tl.fromTo('#computer-content-section', {xPercent: 0}, {xPercent:-100, duration: 0.3})
		.fromTo('#computer-content-section', {autoAlpha: 1}, {autoAlpha: 0, duration: 0.2}, "<")
		.set('#computer-content-section-title-text', {text: content.title})
        .set('#computer-content-section-text', { text: content.text})
		.then(() => {
			let fit = fitty('#computer-content-section-text')[0];
			fit.fit();
			fit.unsubscribe();
		});
		tl
		.to('#computer-content-section-image', { attr: { src: content.image }, delay: 0.3})
		.fromTo('#computer-content-section', {autoAlpha: 0}, {autoAlpha: 1, duration: 0.2})
		.fromTo('#computer-content-section', {xPercent:100}, {xPercent: 0, duration: 0.3}, "<")
		;
	}

	setInitialStateContent = (ind = 0) => {
		let contentArray = this.buildComputerScreenContent();
		// let element = this.buildComputerScreenElement(ind, contentArray[ind]);
		let content = contentArray[ind];
		// let textFit = fitty('#computer-content-section-text')[0];
		this.setState({ 
			width: window.innerWidth, 
			height: window.innerHeight, 
			computerScreenContent: contentArray,
			computerScreenCurrentContent: content,
			computerScreenContentIndex: ind,
			// textFit: textFit
		}, () => {
			this.updateScreenContentState(0);
		});
	}


	buildComputerScreenContent = () => {
		var content = [];
		content.push({
			title: 'The Creatures of Xalia',
			image: '',
			svg: <SplashBackgroundAnimatedSVG/>,
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
		this.setState({ isLoading: false, fit: fitty('#computer-content-section-text') });
		this.setInitialStateContent();
		window.addEventListener('resize', this.updateSize);
		this.updateSize();

		

		gsap.from('#navvy', { opacity: 0, duration: 2, ease: 'sine.in', delay: 2.5 });


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
			.fromTo('#splash-social-media-links', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0 }, '<')
			.to('#subline1', { scrambleText:{ chars: '1234567890', text: "{original}", revealDelay: "0.5" }, opacity: 1, duration: 3, delay: 0.25 }, '<')
			.to('#subline2', { scrambleText:{ chars: '1234567890', text: "{original}", revealDelay: "0.5" }, opacity: 1, duration: 3, delay: 0.5 }, '<')
			.to('#subline3', { scrambleText:{ chars: '1234567890', text: "{original}", revealDelay: "0.5" }, opacity: 1, duration: 3, delay: 0.75 }, '<')
			// discord and twitter links

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
				scrub: 2,
				// markers: true,
				start: 'center center',
				// end: 'bottom 20%',
				end: 'bottom top',
				// end: '+=200%',
				// snap: "labelsDirectional",
				// snap: {
				// 	snapTo: "labels",
				// 	duration: 3,
				// 	inertia: false
				// },
				// preventOverlaps: "spaceship-animation-group",
				toggleActions: 'play complete reverse reset',
				anticipatePin: 1,
				// onEnter: () => {
				// 	gsap.to(window, { scrollTo: { duration: 10, y: "#splash-page-spaceship-window-animation", autoKill: false} });
				// },
				onLeave: () => {
					gsap.to(window, { scrollTo: { duration: 1, y: "#splash-page-spacer", autoKill: false} });
					// document.querySelector('#splash-page-spacer').scrollIntoView({ behavior: 'smooth' });
				}
			},
		});

		// let xElement = document.getElementById('xalians-logo-x');
		// let xRect = xElement.getBoundingClientRect();
		// let offset = ((xRect.x) - (window.innerWidth/2));
		// let offset = window.innerWidth / 2 - (xRect.width / 2 + xRect.x);
		// let perc = xRect.width / window.innerWidth;
		// let a1 = Math.floor(perc * 1000);

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
			// .to('#subline1, #subline2, #subline3, #splash-social-media-links, #xalian-generator-link, #xalians-logo-a1, #xalians-logo-l, #xalians-logo-i, #xalians-logo-a2, #xalians-logo-n, #xalians-logo-s', { opacity: 0 }, '<')
			.to('#subline1, #subline2, #subline3, #splash-social-media-links, #xalian-generator-link, #xaliansLogo', { opacity: 0 }, '<')
			.from('#spaceship-window-animation-svg', { scale: 10, duration: 1, ease: 'none' })
			.to('#spaceship-window-animation-svg', { xPercent: -100, ease: 'none' })
			.from('#spaceship-animation-panel-wrapper', { xPercent: 100, ease: 'none' }, '<')
			.to('#spaceship-computer-outside-animation', { autoAlpha: 0, scale: 5 })
			.fromTo('#spaceship-computer-screen-animation-svg', { autoAlpha: 0 }, { width: this.state.max, height: this.state.max, autoAlpha: 1 }, '<')
			
			// .addLabel('after-spaceship-window-animation')
			;

		// DIM COMPUTER SCREEN WHEN AT THE BOTTOM OF THE PAGE
		ScrollTrigger.create({
			trigger: '#splash-page-spacer',
				pin: true,
				scrub: 1,
				start: 'top top',
				end: '+=25%',
				onLeaveBack: () => { gsap.to('#splash-page-spaceship-window-animation, #splash-page-spacer', {autoAlpha: 1}) },
				onLeave: () => { 
					gsap.to('#splash-page-spaceship-window-animation, #splash-page-spacer', {autoAlpha: 0});

				},
				// onEnterBack: () => { gsap.to(window, { scrollTo: { duration: 1, y: "#splash-section", autoKill: false} })}
				// preventOverlaps: "spaceship-animation-group"
		});

		// PIN CAROUSEL TO MIDDLE OF SCREEN AS IT TRANSITIONS AWAY
		ScrollTrigger.create({
			trigger: '#xalian-svg-carousel',
				start: 'center center',
				pin: true,
				pinSpacing: false,
				// scrub: true,
				end: '+=100%',
				// markers: true,
		});

		// MAKE XALIAN GENERATOR LINK GLOW
		gsap.timeline({ repeat: -1 })
		.fromTo('#xalian-generator-link', { boxShadow: '0px 0px 4px 4px #80ffb100' }, { boxShadow: '0px 0px 10px 10px #80ffb0', duration: 1})
		.fromTo('#xalian-generator-link', { boxShadow: '0px 0px 10px 10px #80ffb0', duration: 1 }, { boxShadow: '0px 0px 4px 4px #80ffb100' });

		

	
	}

	buildLogoAnimation = (delay = 0) => {
		let main = gsap.timeline({
		});
		main
		.add(this.buildLetterEntry('#xalians-logo-x', delay + 0.3), '<')
		.add(this.buildLetterEntry('#xalians-logo-a1', delay + 0.25), '<')
		.add(this.buildLetterEntry('#xalians-logo-l', delay + 0.2), '<')
		.add(this.buildLetterEntry('#xalians-logo-i', delay + 0.15), '<')
		.add(this.buildLetterEntry('#xalians-logo-a2', delay + 0.1), '<')
		.add(this.buildLetterEntry('#xalians-logo-n', delay + 0.05), '<')
		.add(this.buildLetterEntry('#xalians-logo-s', delay + 0), '<')
		;
		return main;
	};

	buildLetterEntry = (id, d) => {
		let main = gsap.timeline();
		// var turnLightOn = gsap.timeline({ delay: d });
		// for (var i = 1; i < 6; i += 2) {
			// turnLightOn.to(id, { duration: Math.random() / 2, opacity: i / 10 });
			// turnLightOn.to(id, { duration: Math.random() / 2, opacity: i / 20 });
		// }
		// turnLightOn.to(id, { duration: 1, opacity: 1 });

		var zoomIn = gsap.timeline();
		zoomIn
			// .from(id, { duration: 0.6, x: '-=100vw', delay: d, skewX: 25 })
			.to(id, { duration: 0.3, y: '-=50px', ease: 'elastic.in(1, 0.3)', delay: d })
			.to(id, { duration: 0.3, y: '+=50px', ease: 'power4.in' });


			var path = gsap.timeline();
			path
				.fromTo(id, {drawSVG: "50% 50%" }, { duration: 3, drawSVG: "100%" })

		// var flicker = gsap.timeline({ delay: 2, repeat: -1 });
		// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 8.3))});
		// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 3.1))});
		// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 1.7))});

		// main.add(zoomIn).add(turnLightOn).add(path);
		main
		.add(path)
		.add(zoomIn)
		;
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
							<div id="splash-container" className="splash-container vertically-center-contents splash-background">
								<Row className="title-logo-row centered-div">
									<Col lg={8} md={9} sm={10} xs={11} className="title-logo-col vertically-center-contents">
										<Stack className="splash-stack">
											<XaliansLogoSVG onClick={this.handleDebugClick} id="xaliansLogo" className="animated-xalian-svg xalian-logo" />
											<h6 id="subline1" className="splash-subline">
												Magical, Bioengineered, Digital Creatures
											</h6>
											<h6 id="subline2" className="splash-subline">
												100% Unique AI Generated Stats
											</h6>
											<h6 id="subline3" className="splash-subline">
												Designed, Voted On, & Owned by You
											</h6>
											{/* <h1 id="splash-animated-changing-text" className="splash-subtitle shadow-text">
											CREATE
										</h1> */}
											<div id="splash-social-media-links" className="social-media-link-row clickable">
												<a href="https://discord.gg/sgGNhNJ2KN" className="social-media-links">
													<i className="bi bi-discord"></i>
												</a>
												<a href="https://twitter.com/xaliansgame" className="social-media-links">
													<i className="bi bi-twitter"></i>
												</a>
											</div>
											<Button id="xalian-generator-link" variant="xalianGray" className="xalian-font xalian-splash-generator-button clickable" href="/generator">
												TRY THE GENERATOR
											</Button>
											<ScrollingCarousel />
										</Stack>
									</Col>
								</Row>
							</div>
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

						<div id="splash-page-spacer" className="splash-page-full-content-wrapper">
							{this.state.computerScreenCurrentContent && <ComputerScreenContent id="computer-content-section-wrapper" sectionId={'computer-content-section'} title={this.state.computerScreenCurrentContent.title} text={this.state.computerScreenCurrentContent.text} imageLocation={this.state.computerScreenCurrentContent.image} svgElement={this.state.computerScreenCurrentContent.svg} nextArrowTappedCallback={this.handleNextArrowClick} backArrowTappedCallback={this.handleBackArrowClick} />}

							<section id="" class="splash-page-content-end-section"></section>
						</div>
						<section id="team" className="team light gradient-background-section">
							<Container className="team-container">
								<h3>The Team</h3>
								<Row className="team-row">
									<Col sm={true} className="d-flex">
										<div className="member">
											<div className="member-img">
												<img src="assets/img/background/vault.jpg" className="img-fluid" alt=""></img>
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
												<img src="assets/img/background/valleron.jpg" className="img-fluid" alt=""></img>
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
												<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
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
												<img src="assets/img/background/arena.png" className="img-fluid" alt=""></img>
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
	// var svgMap = new Map();
	var speciesMap = new Map();

	species.forEach( s => {
		speciesMap[s.name.toLowerCase()] = s;
	})

	svgs.forEach( xalianSvg => {
		
		console.log(`xalian = ${JSON.stringify(xalianSvg, null, 2)}`);
		let path = xalianSvg.path;
		let speciesName = path.substring(2, path.length - 4);
		let species = speciesMap[speciesName];
		// svgMap[speciesName] = {
			// svg: xalianSvg,
			// name: speciesName,
			// element: img
		// };
		if (species) {
			var img = buildImage(xalianSvg, species);
			items.push(img);
		}
	})

	function buildImage(svg, species) {
		return (
			<Carousel.Item className="xalian-svg-carousel-item">
				{/* <Image style={{ height: '25vh', background: `radial-gradient(circle, #dadada 60%, #dadada85 100%)` }}
			className="splash-xalian-species-carousel-image xalian-image-shadowed xalian-image-bordered"
			src={svg.file.default}
			alt="First slide"
		  /> */}
				{/* <XalianSpeciesRowView species={species} /> */}
				{/* <div className="vertically-center-contents stackable-margin"> */}
				<div className="splash-xalian-stat-row-view centered-view">
					<Row style={{ width: '100%' }}>
						<Col className="vertically-center-contents" xs={6} lg={true}>
							<XalianInfoBox hideId species={species} />
						</Col>
						<Col className="vertically-center-contents xalian-image-wrapper" xs={6} lg={true}>
							<XalianImage bordered colored shadowed speciesName={species.name} primaryType={species.type} moreClasses="xalian-image-in-row xalian-image splash-xalian-image" />
						</Col>
						<Col className="vertically-center-contents" xs={12}>
							<XalianStatRatingChart axisLabelColor={'white'} includeLabel labelFontSize={'8pt'} barSize={20} stats={species.statRatings} abbreviatedNames moreClasses="ultra-condensed-chart-div" />
						</Col>
					</Row>
				</div>

				{/* </div> */}
				{/* <Carousel.Caption>
			<XalianSpeciesBadge type={species.type} />
		  </Carousel.Caption> */}
				{/* <h1 className="shadow-text splash-xalian-carousel-image-text" >{species.name}</h1> */}
			</Carousel.Item>
		);
	}

	const [index, setIndex] = useState(0);
  
	const handleSelect = (selectedIndex, e) => {
	  setIndex(selectedIndex);
	};

	return (
	  <Carousel indicators={false} interval={2000} controls={false} id="xalian-svg-carousel" className="xalian-svg-carousel" activeIndex={index} onSelect={handleSelect}>
		{items}
	  </Carousel>
	);
  }

export default Home;
