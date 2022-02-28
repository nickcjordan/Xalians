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
import { TextPlugin } from 'gsap/TextPlugin';
import { EasePack } from 'gsap/EasePack';
import FigzyAnimatedSVG from '../svg/figzyAnimatedSVG';
import VoltishAnimatedSVG from '../svg/voltishAnimatedSVG';
import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import XaliansLogoAnimatedSVG from '../svg/logo/xaliansLogoAnimatedSVG';
import SplashBackgroundAnimatedSVG from '../svg/background/splashBackgroundAnimatedSVG';
import { useState, useEffect } from "react";
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(TextPlugin);
gsap.registerPlugin(EasePack);


class Home extends React.Component {
	state = {
		isLoading: true,
		backgroundAnimationStarDirection: 'bottom-left',
		backgroundAnimationStarSpeed: 0.2,
	};

	constructor(props) {
		super(props);
		// document.addEventListener('DOMContentLoaded', function () {
		// 	if (navbar) {
		// 		var last_scroll_top = 0;
		// 		window.addEventListener('scroll', function () {
		// 			let scroll_top = window.scrollY;
		// 			if (scroll_top > 30) {
		// 				if (scroll_top < last_scroll_top) {
		// 					// scrolling up
		// 				} else {
		// 					// scrolling down
		// 					this.setState()
		// 				}
		// 			}

		// 			last_scroll_top = scroll_top;
		// 		});
		// 	}
		// });
	}



	componentDidMount() {

		this.setState({ isLoading: false });

		gsap.from('#navvy', { opacity: 0, duration: 2, ease: 'sine.in', delay: 2.5 });
		gsap.from("#xalian-splash-svg-animation", {yPercent: 100, duration: 3, delay: 0.5, ease: "power4.out" });
		var scrollTimeline = gsap.timeline({
			scrollTrigger: {
				trigger: '#xalianLogo',
				start: 'top 20%',
				endTrigger: "#splash-section",
				end: 'bottom 20%',
				markers: true,
				toggleActions: "play pause reset reverse",
				scrub: 1
			}
		});


		var splashTl = gsap.timeline({ repeat: 0, delay: 2,
			scrollTrigger: {
				trigger: '#xalianLogo',
				// start: 'top 20%',
				// endTrigger: "#xalian-generator-link",
				// end: 'bottom 80%',
				// markers: true,
				toggleActions: "play complete complete complete",
			} });

		splashTl.to('#subline1', { opacity: 1, duration: 0.5});
		splashTl.to('#subline2', { opacity: 1, duration: 0.5}, "<");
		splashTl.to('#subline3', { opacity: 1, duration: 0.5}, "<");
		splashTl.fromTo('#xalian-generator-link', { opacity: 0 }, { opacity: 1, duration: 1});
		splashTl.fromTo('#third-line', { opacity: 0 }, { opacity: 1, duration: 1 });

		// splashTl.to('#first-line', { text: { type: 'diff', value: 'CREATE', speed: 4}, delay: 0.08});
		splashTl.to('#first-line', { opacity: 1, duration: 0.5});
		splashTl.to('#first-line', { text: { type: 'diff', value: 'EARN', speed: 3}, delay: 0.08});
		splashTl.to('#first-line', { text: { type: 'diff', value: 'TRADE', speed: 3}, delay: 0.08});
		splashTl.to('#first-line', { text: { type: 'diff', value: 'PLAY', speed: 3}, delay: 0.08});
		splashTl.to('#first-line', { text: { type: 'diff', value: 'Start Generating Now...', speed: 4, newClass: "splash-subtitle-smaller" }, delay: 0.5 });
		splashTl.to('#first-line', { opacity: 0, duration: 0.5, delay: 0.5});

	
		scrollTimeline.to("#xalian-splash-svg-animation, #xalianLogo, #xalian-generator-link", { autoAlpha: 0, duration: 0.5, delay: 0});
		scrollTimeline.to("#xalian-splash-svg-animation, #xalianLogo, #xalian-generator-link", { scale: 100, duration: 2, delay: 0}, "<");

		scrollTimeline.to("#xalian-splash-svg-animation, #xalian-generator-link", { yPercent: 200, duration: 0.8, delay: 0}, "<");
		scrollTimeline.to("#xalianLogo", { yPercent: -200, duration: 0.8, delay: 0}, "<");
		scrollTimeline.to('#first-line, #third-line, #subline1, #subline2, #subline3', { autoAlpha: 0, duration: 0.1}, "<");

		var contentTl = gsap.timeline({
			repeat: 0,
			delay: 0,
			scrollTrigger: {
				trigger: '#splash-page-spacer',
				end: "center center",
				markers: true,
				scrub: true,
			},
		});

		contentTl.from("#story-section", {xPercent: 100, duration: 1});
		contentTl.to("#story-section", {xPercent: -100, duration: 1, delay: 2});

		contentTl.from("#second-section", {xPercent: 100, duration: 1, delay: 0.5});
		contentTl.to("#second-section", {xPercent: -100, duration: 1, delay: 2});

		contentTl.from("#third-section", {xPercent: 100, duration: 1, delay: 0.5});
		contentTl.to("#third-section", {xPercent: -100, duration: 1, delay: 2});
	}

	render() {
		return (
			<React.Fragment>
				<Container fluid className="home-background">
					<SplashGalaxyBackground direction={this.state.backgroundAnimationStarDirection} speed={this.state.backgroundAnimationStarSpeed}>
						<XalianNavbar></XalianNavbar>

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

										<Button variant="xalianGreen" className="xalian-font xalian-splash-generator-button" id="xalian-generator-link" href="/generator">
											GENERATE XALIANS
										</Button>
										<div id="third-line" className="social-media-links">
											<a href="https://discord.gg/sgGNhNJ2KN" className="social-media-links">
												<i className="bi bi-discord"></i>
											</a>
											<a href="https://twitter.com/xaliansgame" className="social-media-links">
												<i className="bi bi-twitter"></i>
											</a>
										</div>
									</Col>
								</Row>
								<SplashBackgroundAnimatedSVG id="xalian-splash-svg-animation" />
							</Container>
						</section>

						<Container id="splash-page-spacer" className="splash-page-spacer">
							<section id="story-section" className="splash-page-panel">
								<ThemedSceneDiv id="story-section-div" className="splash-panel">
									<div className="container">
										<div className="row align-items-center">
											<Col md={true} className="text-center centered-div shadow-text text-wrapper">
												<h3>The Backstory</h3>
												<p>For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments. But the high technology of the Vallerii would prove to be their downfall when their own artificial intelligence infected the Xalian Generators with a virus that turned the Xalians against them. The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.</p>
											</Col>
											<Col md={true} className="centered-div">
												<div className="embedded-img-wrapper">
													<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
												</div>
											</Col>
										</div>
									</div>
								</ThemedSceneDiv>
							</section>
							<section id="second-section" className="splash-page-panel">
								<ThemedSceneDiv id="story-section-div" className="splash-panel">
									<div className="container">
										<div className="row align-items-center">
											<Col md={true} className="text-center centered-div shadow-text text-wrapper">
												<h3>The Second Section</h3>
												<p>For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments. But the high technology of the Vallerii would prove to be their downfall when their own artificial intelligence infected the Xalian Generators with a virus that turned the Xalians against them. The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.</p>
											</Col>
											<Col md={true} className="centered-div">
												<div className="embedded-img-wrapper">
													<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
												</div>
											</Col>
										</div>
									</div>
								</ThemedSceneDiv>
							</section>
							<section id="third-section" className="splash-page-panel">
								<ThemedSceneDiv id="story-section-div" className="splash-panel">
									<div className="container">
										<div className="row align-items-center">
											<Col md={true} className="text-center centered-div shadow-text text-wrapper">
												<h3>The Third Section</h3>
												<p>For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments. But the high technology of the Vallerii would prove to be their downfall when their own artificial intelligence infected the Xalian Generators with a virus that turned the Xalians against them. The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.</p>
											</Col>
											<Col md={true} className="centered-div">
												<div className="embedded-img-wrapper">
													<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
												</div>
											</Col>
										</div>
									</div>
								</ThemedSceneDiv>
							</section>
						</Container>

						{/* <div id="test-div" style={{ backgroundColor: '#FFFFFF', width: '50px', height: '50px' }}></div> */}

						{/* <section id="story-section">
							<ThemedSceneDiv id="story-section-div" className="story light info-section-padded gradient-background-section">
								<div className="container">
									<div className="row align-items-center">
										<Col md={true} className="text-center centered-div shadow-text text-wrapper">
											<h3>The Backstory</h3>
											<p>For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments. But the high technology of the Vallerii would prove to be their downfall when their own artificial intelligence infected the Xalian Generators with a virus that turned the Xalians against them. The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.</p>
										</Col>
										<Col md={true} className="centered-div">
											<div className="embedded-img-wrapper">
												<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
											</div>
										</Col>
									</div>
								</div>
							</ThemedSceneDiv>
						</section> */}

						{/* <section id="team" className="team light gradient-background-section">
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
						</section> */}

						{/* <footer id="footer">
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
						</footer> */}
					</SplashGalaxyBackground>
					{this.state.isLoading && <div id="preloader"></div>}
				</Container>
			</React.Fragment>
		);
	}
}

export default Home;
