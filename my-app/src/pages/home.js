import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
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
import FigzyAnimatedSVG from '../svg/figzyAnimatedSVG';
import VoltishAnimatedSVG from '../svg/voltishAnimatedSVG';
import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import XaliansLogoAnimatedSVG from '../svg/logo/xaliansLogoAnimatedSVG';
import SplashBackgroundAnimatedSVG from '../svg/background/splashBackgroundAnimatedSVG';
import { useState, useEffect } from 'react';
import { ReactComponent as SpaceshipWindowSVG } from '../svg/animations/xalian_spaceship_window.svg'
import { ReactComponent as SpaceshipComputerScreenGridSVG } from '../svg/animations/spaceship_computer_screen_grid.svg'
import { ReactComponent as SpaceshipComputerScreenSVG } from '../svg/animations/spaceship_computer_screen.svg'
import { ReactComponent as SpaceshipWallSVG } from '../svg/animations/spaceship_wall.svg'
import { IconMaximize } from '@aws-amplify/ui-react';
import Carousel from 'react-bootstrap/Carousel'
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(TextPlugin);
gsap.registerPlugin(EasePack);
gsap.registerPlugin(ScrollToPlugin);

const reqSvgs = require.context ( '../svg', true, /\.svg$/ );
const svgs = reqSvgs.keys () .map ( path => ({ path, file: reqSvgs ( path ) }) );

class Home extends React.Component {
	state = {
		isLoading: true,
		backgroundAnimationStarDirection: 'bottom-left',
		backgroundAnimationStarSpeed: 0.2,
		width: null,
		height: null
	};

	constructor(props) {
		super(props);
		this.setState({width: window.innerWidth, height: window.innerHeight});
	}

	setSize = (w, h) => {
		let max = Math.max(w, h);
		let min = Math.min(w, h);
		
		this.setState({
			width: w, height: h, 
			max: max, min: min, 
			minXOffset: (w/2) - (min/2), minYOffset: (h/2) - (min/2), 
			maxXOffset: (w/2) - (max/2), maxYOffset: (h/2) - (max/2),
		});
	}

	updateSize = () => {
		this.setSize(window.innerWidth, window.innerHeight);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.updateSize);
	}

	componentDidMount() {
		this.setState({ isLoading: false });
		window.addEventListener('resize', this.updateSize);
		this.updateSize();

		gsap.from('#navvy', { opacity: 0, duration: 2, ease: 'sine.in', delay: 2.5 });
		// gsap.set('#spaceship-window-animation-svg', {transformOrigin: "center"});
		

		var splashTl = gsap.timeline({
			// repeat: 0,
			delay: 2,
			scrollTrigger: {
				// trigger: '#xalian-generator-link',
                trigger: '#splash-section',
                // start: 'top 20%',
                // endTrigger: '#splash-section',
				end: 'bottom top',
				// toggleActions: 'restart none restart none',
                markers: true,
			},
		});

		splashTl.to('#subline1', { opacity: 1, duration: 0.5 });
		splashTl.to('#subline2', { opacity: 1, duration: 0.5 }, '<');
		splashTl.to('#subline3', { opacity: 1, duration: 0.5 }, '<');
		splashTl.fromTo('#xalian-generator-link', { opacity: 0 }, { opacity: 1, duration: 1 });
		splashTl.fromTo('#third-line', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.2 }, "<");
		
		splashTl.to('#first-line', { opacity: 1, duration: 0.5, delay: 0.4 }, "<");
		splashTl.to('#first-line', { text: { type: 'diff', value: 'EARN', speed: 3 }, delay: 0.08 });
		splashTl.to('#first-line', { text: { type: 'diff', value: 'TRADE', speed: 3 }, delay: 0.08 });
		splashTl.to('#first-line', { text: { type: 'diff', value: 'PLAY', speed: 3 }, delay: 0.08 });
		splashTl.to('#first-line', { text: { type: 'diff', value: 'Start Generating Now...', speed: 4, newClass: 'splash-subtitle-smaller' }, delay: 0.5 });
		splashTl.to('#first-line', { opacity: 0, duration: 0.5, delay: 0.5 });


        var splashPiecesRemovalTl = gsap.timeline({
			scrollTrigger: {
                trigger: '#splash-section',
				start: 'bottom 80%',
				end: 'bottom top',
				toggleActions: 'play complete reverse reset',
				scrub: 1,
			},
		});
		splashPiecesRemovalTl.to('#xalianLogo', { autoAlpha: 0, duration: 0.5, delay: 0 });
		splashPiecesRemovalTl.to('#xalian-generator-link', { scale: 2, duration: 2, delay: 0 }, '<');
		splashPiecesRemovalTl.to('#xalianLogo', { scale: 10, duration: 2, delay: 0 }, '<');

		splashPiecesRemovalTl.to('#xalian-generator-link', { yPercent: 200, duration: 0.8, delay: 0 }, '<');
		splashPiecesRemovalTl.to('#xalianLogo', { yPercent: -200, duration: 0.8, delay: 0 }, '<');
		splashPiecesRemovalTl.to('#first-line, #third-line, #subline1, #subline2, #subline3', { autoAlpha: 0, duration: 0.1 }, '<');
		


		var spaceshipTl = gsap.timeline({
            scrollTrigger: {
                trigger: '#splash-section',
                scrub: true,
                start: 'bottom bottom',
                end: '+=200%',
				markers: true,
                snap: "labelsDirectional",
				preventOverlaps: "spaceship-animation-group",
				anticipatePin: 1
            },
        });
		spaceshipTl
		.addLabel("before-spaceship-window-animation")
		.from('#spaceship-window-animation-svg', { scale: 10, duration: 1, ease: 'none' })
		.to('#spaceship-window-animation-svg', { xPercent: -100, ease: 'none' })
		.from('#spaceship-animation-panel-wrapper', { xPercent: 100, ease: 'none' }, "<")
		.to('#spaceship-computer-outside-animation', { autoAlpha: 0, scale: 5 })
		.fromTo('#spaceship-computer-screen-animation-svg', {autoAlpha: 0 }, { width: this.state.max, height: this.state.max, autoAlpha: 1 }, "<")
		.addLabel("after-spaceship-window-animation");


		var contentParentTl = gsap.timeline({
            scrollTrigger: {
                trigger: '#splash-page-spacer',
                pin: true,
                scrub: true,
                start: 'center center',
                end: '+=600%',
                // snap: "labelsDirectional",
                onSnapComplete: ({progress, direction, isActive}) => console.log(progress, direction, isActive),
				preventOverlaps: "spaceship-animation-group"
            },
        });


        contentParentTl.addLabel('horizontal-content-start');

        buildPanelAnimation(contentParentTl,
            '#content-section-1', 
            '#content-section-1', 
            'For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first species of Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments.',
        );
        buildPanelAnimation(contentParentTl,
            '#content-section-2', 
            '#content-section-2', 
            'The high technology of the Vallerii would eventually prove to be their downfall when their own artificial intelligence took control of the Xalian Generators, turning the creatures against their creators.',
        );
        buildPanelAnimation(contentParentTl,
            '#content-section-3', 
            '#content-section-3', 
            'The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.'
        );
        contentParentTl.addLabel('horizontal-content-end');




			spaceshipTl.add(contentParentTl);





        function buildPanelAnimation(tl, secId, panId, text, timescale = 4) {
            let inTl = gsap.timeline();
            inTl.fromTo(panId, {rotate: 12 }, {rotate: 0, duration: (timescale/2) })
            .from(panId, { scale: 0.1, xPercent: 50, autoAlpha: 0, ease: 'power2', duration: timescale }, "<")
            .to(panId + ' p', { speed: 3, text: { value: text }});
            
            let outTl = gsap.timeline();
            outTl.to(panId, { scale: 4, xPercent: -200, ease: 'power2', duration: timescale/2, delay: timescale })
            outTl.to(panId, { autoAlpha: 0, duration: timescale }, "<")
            outTl.to(panId, {duration: (timescale/2), rotate: -12 }, "<");

            tl.add(inTl);
            tl.addLabel(secId);
            tl.add(outTl);

        }

	}
    

	render() {
		let im = svgs[0];
		return (
			<React.Fragment>
				<Container fluid className="home-background">
					<SplashGalaxyBackground direction={this.state.backgroundAnimationStarDirection} speed={this.state.backgroundAnimationStarSpeed}>
						<XalianNavbar></XalianNavbar>
						<image src={im}/>
						{/* <div id="splash-page-spaceship-window-animation" className="splash-page-spaceship-window-animation debug-box" style={{width: Math.max(this.state.height, this.state.width) * 2, height: this.state.height}}> */}

						<section id="splash-section" className="">
							<Container id="splash-container" className="splash-container vertically-center-contents-grid splash-background">
								<Row className="row justify-content-center title-logo-row">
									<Col lg={8} md={9} sm={10} xs={11} className="title-logo-col vertically-center-contents-grid">
										<XaliansLogoAnimatedSVG id="xalianLogo" delay={0.5} />
										<h5 id="subline1" className="splash-subline">
											Magical, Bioengineered, Digital Creatures
										</h5>
										<h5 id="subline2" className="splash-subline">
											100% Unique AI Generated Stats
										</h5>
										<h5 id="subline3" className="splash-subline">
											Designed, Voted On, & Owned by You
										</h5>
										<h1 id="first-line" className="splash-subtitle shadow-text">
											CREATE
										</h1>
										<Button variant="xalianGreen" className="xalian-font xalian-splash-generator-button clickable" id="xalian-generator-link" href="/generator">
											GENERATE XALIANS
										</Button>
										<div id="third-line" className="social-media-links clickable">
											<a href="https://discord.gg/sgGNhNJ2KN" className="social-media-links">
												<i className="bi bi-discord"></i>
											</a>
											<a href="https://twitter.com/xaliansgame" className="social-media-links">
												<i className="bi bi-twitter"></i>
											</a>
										</div>
										{/* <SplashBackgroundAnimatedSVG id="xalian-splash-svg-animation" /> */}
									</Col>
								</Row>
							</Container>
						</section>
						<div id="splash-page-spaceship-window-animation" className="splash-page-spaceship-window-animation debug-box" >
							<div className="spaceship-animation-window-panel-wrapper" style={{left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max}}>
								<SpaceshipWindowSVG className='debug-box' id='spaceship-window-animation-svg' style={{left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max}} /> 
							</div>
							<div id="spaceship-animation-panel-wrapper" className="spaceship-animation-screen-panel-wrapper" style={{left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max}}>
								<SpaceshipComputerScreenGridSVG className='debug-box spaceship-screen-grid-svg' id='spaceship-computer-screen-animation-svg' style={{left: this.state.maxXOffset, top: this.state.maxYOffset, width: this.state.max, height: this.state.max}}/>
								<div className='debug-box spaceship-screen' id='spaceship-computer-outside-animation' style={{backgroundSize: this.state.min, width: this.state.min, height: this.state.min}}/>
							</div>
						</div>
					

						{/* <div id="splash-page-spaceship-computer-animation" className="splash-page-spaceship-computer-animation">
							 <SpaceshipComputerSVG id='spaceship-computer-animation-svg' /> 
						</div> */}

						<div id="splash-page-spacer" className="splash-page-full-content-wrapper">


                            <section id="content-section-1" class="splash-page-content-section">
								<div className="splash-page-content-panel">
									<Row className="splash-page-content-panel-row">
										<Col sm={12} md={8} lg={6} className="shadow-text centered-div text-wrapper">
											<h3>Xalian Creatures</h3>
											<p></p>
										</Col>
										<Col sm={12} md={4} lg={6} className="centered-div">
											<div className="embedded-img-wrapper">
												<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
											</div>
										</Col>
									</Row>
								</div>
							</section>

							<section id="content-section-2" class="splash-page-content-section">
								<div className="splash-page-content-panel">
									<Row className="splash-page-content-panel-row">
										<Col sm={12} md={8} lg={6} className="shadow-text centered-div text-wrapper">
											<h3>Fall of the Vallerii</h3>
											<p></p>
										</Col>
										<Col sm={12} md={4} lg={6} className="centered-div">
											<div className="embedded-img-wrapper">
												<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
											</div>
										</Col>
									</Row>
								</div>
							</section>

							<section id="content-section-3" class="splash-page-content-section">
								<div className="splash-page-content-panel">
									<Row className="splash-page-content-panel-row">
										<Col sm={12} md={8} lg={6} className="shadow-text centered-div text-wrapper">
											<h3>End War</h3>
											<p></p>
										</Col>
										<Col sm={12} md={4} lg={6} className="centered-div">
											<div className="embedded-img-wrapper">
												<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
											</div>
										</Col>
									</Row>
								</div>
							</section>

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
	const [index, setIndex] = useState(0);
  
	const handleSelect = (selectedIndex, e) => {
	  setIndex(selectedIndex);
	};
  
	return (
	  <Carousel activeIndex={index} onSelect={handleSelect}>
		<Carousel.Item>
		  <img
			className="d-block w-100"
			src="holder.js/800x400?text=First slide&bg=373940"
			alt="First slide"
		  />
		  <Carousel.Caption>
			<h3>First slide label</h3>
			<p>Nulla vitae elit libero, a pharetra augue mollis interdum.</p>
		  </Carousel.Caption>
		</Carousel.Item>
		<Carousel.Item>
		  <img
			className="d-block w-100"
			src="holder.js/800x400?text=Second slide&bg=282c34"
			alt="Second slide"
		  />
  
		  <Carousel.Caption>
			<h3>Second slide label</h3>
			<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
		  </Carousel.Caption>
		</Carousel.Item>
		<Carousel.Item>
		  <img
			className="d-block w-100"
			src="holder.js/800x400?text=Third slide&bg=20232a"
			alt="Third slide"
		  />
  
		  <Carousel.Caption>
			<h3>Third slide label</h3>
			<p>
			  Praesent commodo cursus magna, vel scelerisque nisl consectetur.
			</p>
		  </Carousel.Caption>
		</Carousel.Item>
	  </Carousel>
	);
  }

export default Home;
