import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import GSDevTools from 'gsap/GSDevTools';
import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import { useState } from 'react';
import Carousel from 'react-bootstrap/Carousel'
import species from '../json/species.json';
import XalianImage from '../components/xalianImage';
import XalianStatRatingChart from '../components/xalianStatRatingChart';
import XalianInfoBox from '../components/xalianInfoBox';
// import spaceshipComputerScreenTitlePanel from '../svg/animations/spaceship_computer_screen_title_panel.svg';
import XaliansLogoDnaAnimated from '../components/animations/xaliansLogoDnaAnimated.js'
import { Link } from 'react-router-dom';
import './home.encyclopedia.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import { EasePack } from 'gsap/EasePack';
import { ExpoScaleEase } from 'gsap/EasePack';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(ScrollTrigger, TextPlugin, EasePack, ScrollToPlugin, DrawSVGPlugin, ScrambleTextPlugin, GSDevTools, ExpoScaleEase, MorphSVGPlugin);
// GSDevTools.create();
// const reqSvgs = require.context ( '../svg/species', true, /\.svg$/ );
// const svgs = reqSvgs.keys () .map ( path => ({ path, file: reqSvgs ( path ) }) );

class Home extends React.Component {
	state = {
		isLoading: true,
		backgroundAnimationStarDirection: 'bottom-left',
		backgroundAnimationStarSpeed: 0.4,
		width: null,
		height: null,
		computerScreenContentIndex: 0,
		computerScreenContentArray: [],
		computerScreenElement: null
	};

	// constructor(props) {
	// 	super(props);
		
	// }

	handleNextArrowClick = () => {
		let ind = this.state.computerScreenContentIndex;
		let nextInd = ind + 1;
		let resultInd = gsap.utils.wrap(0, this.state.computerScreenContentArray.length, nextInd);
		this.updateScreenContentState(resultInd, this.state.computerScreenContentArray);
	}

	handleBackArrowClick = () => {
		var ind = this.state.computerScreenContentIndex;
		ind = gsap.utils.wrap(0, this.state.computerScreenContentArray.length, ind - 1);
		this.updateScreenContentState(ind, this.state.computerScreenContentArray);
	}

	updateScreenContentState = (ind = 0, contentArray) => {
		let content = contentArray[ind];
		gsap.timeline().to('#computer-content-section', {opacity: 0, duration: 0.25})
		.then( () => {
			this.setState({ 
				computerScreenCurrentContent: content,
				computerScreenContentIndex: ind
			}, () => {
				// gsap.set('#computer-content-section-text', { })


				// TEXT FIT DOESNT WORK WHEN THE TEXT IS ITALISIZED AND STUFF
				// textFit(document.getElementById('computer-content-section-text'), { multiLine: true, alignVert: true, minFontSize:8, maxFontSize: 24});
				gsap.to('#computer-content-section', {opacity: 1, duration: 0.25})
			});
		});
	}

	setInitialStateContent = (ind = 0) => {
		// let contentArray = this.buildComputerScreenContent();
		// let content = contentArray[ind];
		this.setState({ 
			width: window.innerWidth, 
			height: window.innerHeight, 
			// computerScreenContentArray: contentArray,
		}, () => {
			// this.updateScreenContentState(0, contentArray);
		});
	}



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

	componentDidMount() {
		// let elem = document.getElementById('computer-content-section-text');
		// if (elem) {
		// 	textFit(elem, { multiLine: true, alignVert: true, minFontSize:8, maxFontSize: 24});
		// }
		
		this.setState({ isLoading: false });
		this.setInitialStateContent();
		window.addEventListener('resize', this.updateSize);
		this.updateSize();

		gsap.from('#navvy', { opacity: 0, duration: 2, ease: 'sine.in', delay: 1 });


		var splashTl = gsap.timeline({
			// repeat: 0,
			id: 'splash-timeline-animation',
			// delay: 0.5,
			scrollTrigger: {
				trigger: '#splash-section',
				// start: 'top 20%',
				end: 'center center',
				toggleActions: 'play complete none none',
				// markers: true,
				
			},
		});
		splashTl

			// Generator Button
			.fromTo('#xalian-generator-link', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.5 }, '<')
			// CREATE :: EARN :: TRADE :: PLAY
			.fromTo('#splash-social-media-links', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0 }, '<')
			.to('#subline1', { scrambleText:{ chars: 'abcdefghijklmnopqrstuvwxyz', text: "{original}", revealDelay: "0.25" }, opacity: 1, duration: 2, delay: 0.25 }, '<')
			.to('#subline2', { scrambleText:{ chars: 'abcdefghijklmnopqrstuvwxyz', text: "{original}", revealDelay: "0.25" }, opacity: 1, duration: 2, delay: 0.5 }, '<')
			.to('#subline3', { scrambleText:{ chars: 'abcdefghijklmnopqrstuvwxyz', text: "{original}", revealDelay: "0.25" }, opacity: 1, duration: 2, delay: 0.75 }, '<')
			// discord and twitter links

			gsap.timeline({		})
		.addLabel("content")
		.to("#splash-page-spaceship-window-animation, #splash-page-spacer", {autoAlpha: 0, duration: 0.5})
		;

		// MAKE XALIAN GENERATOR LINK GLOW
		gsap.timeline({ id: 'generator-link-glow-timeline', repeat: -1 })
		.fromTo('#xalian-generator-link', { boxShadow: '0px 0px 4px 4px #80ffb100' }, { boxShadow: '0px 0px 10px 10px #80ffb0', duration: 1})
		.fromTo('#xalian-generator-link', { boxShadow: '0px 0px 10px 10px #80ffb0', duration: 1 }, { boxShadow: '0px 0px 4px 4px #80ffb100' });
		// .set('#xalian-generator-link', { strokeWidth: '2px', stroke: '2px #80ffb0' })
		// .to('#xalian-generator-link>*', { drawSVG: '50% 50%', duration: 1, stroke: '#80ffb0', strokeWidth: '2px' });


		// PIN STORY TO SCREEN AS YOU SCROLL THROUGH
		ScrollTrigger.create({
			trigger: '#background-story-subsection',
				start: 'center center',
				pin: true
		});

		ScrollTrigger.create({
			trigger: '#galaxy-story-subsection',
				start: 'center center',
				pin: true
		});
		
		ScrollTrigger.create({
			trigger: '#tokens-story-subsection',
				start: 'center center',
				pin: true
		});

	
	}


	render() {
		return (
			<React.Fragment>
						<XalianNavbar></XalianNavbar>
				<Container fluid className="home-background">
					<SplashGalaxyBackground direction={this.state.backgroundAnimationStarDirection} speed={this.state.backgroundAnimationStarSpeed}>

						<section id="splash-section" className="splash-section-debug">
							<div id="splash-container" className="splash-container vertically-center-contents splash-background">
								<Row className="title-logo-row">
									<Col lg={8} md={9} sm={10} xs={11} className="title-logo-col vertically-center-contents">
										<Stack className="splash-stack">

											{/* <XaliansLogoSVG id="xaliansLogo" className="animated-xalian-svg xalian-logo" /> */}

											<XaliansLogoDnaAnimated/>

											
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
											<div id="splash-social-media-links" className="social-media-link-row">
												<a href="https://discord.gg/sgGNhNJ2KN" className="social-media-links">
													<i className="bi bi-discord"></i>
												</a>
												<a href="https://twitter.com/xaliansgame" className="social-media-links">
													<i className="bi bi-twitter"></i>
												</a>
											</div>
											<Button id="xalian-generator-link" variant="xalianGray" className="xalian-font xalian-splash-generator-button" href="/generator">
												TRY THE GENERATOR
											</Button>
											<ScrollingCarousel />
										</Stack>
									</Col>
								</Row>
							</div>
						</section>

						<section id="encyclopedia-section" className="g-shell home-encyclopedia-section">
							<div className="g-panel home-encyclopedia-panel">
								<p className="g-kicker">Archive Access</p>
								<h2 className="g-h2">Encyclopedia Xalia</h2>
								<p className="home-encyclopedia-body">
									Every world, species, and event the Generator has on file is catalogued in one archive.
									Open a record to read what is known before the tournament asks you to bet on it.
								</p>
								<div className="home-encyclopedia-tiles">
									<Link to="/encyclopedia/story" className="g-tile home-encyclopedia-tile">
										<span className="g-tile-name">Begin the Story</span>
									</Link>
									<Link to="/encyclopedia/worlds" className="g-tile home-encyclopedia-tile">
										<span className="g-tile-name">Survey the Worlds</span>
									</Link>
									<Link to="/encyclopedia/species" className="g-tile home-encyclopedia-tile">
										<span className="g-tile-name">Open the Bestiary</span>
									</Link>
								</div>
							</div>
						</section>

						<section id="story-section" >
							<Container id="background-story-subsection" style={{ marginBottom: '50px' }}>
								<div className="story-splash-section">

									<h3>The Story</h3>
									<Row className="">
										<Col sm={true} >
											<h6 className="story-text">
												For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. With their god-like mastery of biotechnology, they birthed the first Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments - and forged an empire that would come to span the stars.
											</h6>
											<h6 className="story-text">
												But the high technology of the Vallerii would prove to be their downfall when they released APEX – the galaxy’s first artificial intelligence. APEX rapidly infected Xalian Generators across Vallerii space and turned the Xalians against their masters in a centuries-long interplanetary assault that would come to be known as the End Wars.
											</h6>
											<h6 className="story-text">
												The wars have long since ended, but the destruction they caused has forever changed the galaxy. The Vallerii are now all but wiped out, having been ravaged by the Nemesis Plague, a virulent bioweapon designed by APEX to target the genome of the Vallerii and their Xalian servants alike.
											</h6>
											<h6 className="story-text">
												With the plague burning through the galaxy, few planets are safe. As a result, most life forms have gathered to the capital planet of Valleron, home to their only hope – an ancient Vallerii device known as the Mercurius Machine, which is said to be able to birth a new generation of Xalians immune to APEX’s apocalyptic designs.
											</h6>
										</Col>

									</Row>
								</div>
							</Container>

							<Container id="galaxy-story-subsection" style={{ marginBottom: '50px' }}>
								<div className="story-splash-section">

									<h3>The Galaxy of Xalia</h3>
									<Row className="">
										<Col sm={true} >
											<h6 className="story-text">
											Xalia is home to a wide range of powerful, bioengineered creatures originating from extreme worlds all across the galaxy. The capitol planet of Valleron is now controlled by the mad and tyrannous King Kozrak, one of the last of the Vallerii race. Using his god-like knowledge of the Mercurius Machine, he has seized control of the galaxy, ruling from Valleron with an iron fist. 
											</h6>
											<h6 className="story-text">
											Recently, the king has announced plans for a galactic tournament, promising the winning faction access to a treasure trove of the miraculous output of the Mercurius Machine – the Scrambler Tokens that serve as the last hope for the continuance of Xalian life in the galaxy. In order to compete in the king’s tournament, factions must first prove to him they are worthy. 
											</h6>
											<h6 className="story-text">
											Only the strongest factions will survive...
											</h6>
										</Col>

									</Row>
								</div>
							</Container>

							<Container id="tokens-story-subsection" style={{ marginBottom: '50px' }}>
								<div className="story-splash-section">

									<h3>The Tournament & Tokens</h3>
									<Row className="">
										<Col sm={true} >
											<h6 className="story-text">
											King Kozrak has organized battles all across Xalia for factions to compete to prove they are worthy of a spot in the tournament. Factions must select a team of 6 to compete in each battle, and the winning faction will earn Scrambler Tokens. The more victories a faction has, the more proof of a faction’s power.
											</h6>
											<h6 className="story-text">
											By scrambling and encrypting the genome of a Xalian design, Scrambler Tokens avert the killing gaze of the Nemesis Plague. Thanks to APEX, they are now the only way to safely generate new Xalians. 
											</h6>
											<h6 className="story-text">
											As a faction earns tokens, they can spend these tokens on new Xalians to add to the faction. Each new Xalian has a unique set of traits, abilities, and skill levels. 
											</h6>
											<h6 className="story-text">
											Based on these stats, the Xalian will be assigned an appropriate battle fee. To ensure a competitive match, King Kozrak has imposed a battle fee limit. For a team to be eligible for battle, the combined battle fee of the team must not exceed the battle fee limit.
											</h6>
										</Col>

									</Row>
								</div>
							</Container>



						</section>








						<section id="team" className="team light gradient-background-section">
							<Container className="team-container">
								<h3>The Team</h3>
								<Row className="team-row">
									<Col sm={true} className="d-flex">
										<div className="member">
											{/* <div className="member-img">
												<img src="assets/img/background/vault.jpg" className="img-fluid" alt=""></img>
												<div className="social">
													<a href="https://twitter.com/KingKozrak">
														<i className="bi bi-twitter"></i>
													</a>
												</div>
											</div> */}
											<div className="member-info">
												<h4>Doctor J</h4>
												<span className="underline">Xalian Geneticist</span>
												<span>Tech Engineer</span>
											</div>
										</div>
									</Col>

									<Col sm={true} className="d-flex">
										<div className="member">
											{/* <div className="member-img">
												<img src="assets/img/background/valleron.jpg" className="img-fluid" alt=""></img>
												<div className="social">
													<a href="">
														<i className="bi bi-twitter"></i>
													</a>
												</div>
											</div> */}
											<div className="member-info">
												<h4>Captain M</h4>
												<span className="underline">Xalian Astrophysicist</span>
												<span>Execution Engineer</span>
											</div>
										</div>
									</Col>

									<Col sm={true} className="d-flex">
										<div className="member">
											{/* <div className="member-img">
												<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
											</div> */}
											<div className="member-info">
												<h4>Professor V</h4>
												<span className="underline">Cosmic Librarian</span>
												<span>Story Creator / Writer</span>
											</div>
										</div>
									</Col>

									<Col sm={true} className="d-flex">
										<div className="member">
											{/* <div className="member-img">
												<img src="assets/img/background/arena.png" className="img-fluid" alt=""></img>
											</div> */}
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
	var speciesMap = new Map();

	species.forEach( s => {
		speciesMap[s.name.toLowerCase()] = s;
		var img = buildImage(s);
		items.push(img);
	})


	function buildImage(s) {
		return (
			<Carousel.Item className="xalian-svg-carousel-item">
				<div className="splash-xalian-stat-row-view centered-view">
					<Row style={{ width: '100%' }}>
						<Col className="vertically-center-contents" xs={6} lg={true}>
							<XalianInfoBox hideId species={s} />
						</Col>
						<Col className="vertically-center-contents xalian-image-wrapper" xs={6} lg={true}>
							<XalianImage bordered colored shadowed speciesName={s.name} primaryType={s.type} moreClasses="xalian-image-in-row xalian-image splash-xalian-image" />
						</Col>
						<Col className="vertically-center-contents" xs={12}>
							<XalianStatRatingChart axisLabelColor={'white'} includeLabel labelFontSize={'8pt'} barSize={20} stats={s.statRatings} abbreviatedNames moreClasses="ultra-condensed-chart-div" />
						</Col>
					</Row>
				</div>

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
