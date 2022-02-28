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
gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(TextPlugin);
gsap.registerPlugin(EasePack);
gsap.registerPlugin(ScrollToPlugin);

class Home extends React.Component {
	state = {
		isLoading: true,
		backgroundAnimationStarDirection: 'bottom-left',
		backgroundAnimationStarSpeed: 0.2,
	};

	constructor(props) {
		super(props);
	}

	componentDidMount() {
		this.setState({ isLoading: false });

		gsap.from('#navvy', { opacity: 0, duration: 2, ease: 'sine.in', delay: 2.5 });
		gsap.from('#xalian-splash-svg-animation', { yPercent: 100, duration: 3, delay: 0.5, ease: 'power4.out' });
	

		var splashTl = gsap.timeline({
			repeat: 0,
			delay: 2,
			scrollTrigger: {
				trigger: '#xalian-generator-link',
                // start: 'top 20%',
                // endTrigger: '#splash-section',
				end: 'bottom top',
				// toggleActions: 'play pause play none',
                // markers: true,
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
				trigger: '#xalianLogo',
				start: 'top 20%',
				endTrigger: '#splash-section',
				end: 'bottom top',
				// markers: true,
				// toggleActions: 'play pause reverse pause',
				scrub: 1,
                pinSpacing: false
			},
		});
		splashPiecesRemovalTl.to('#xalian-splash-svg-animation, #xalianLogo', { autoAlpha: 0, duration: 0.5, delay: 0 });
		splashPiecesRemovalTl.to('#xalian-generator-link', { scale: 2, duration: 2, delay: 0 }, '<');
		splashPiecesRemovalTl.to('#xalian-splash-svg-animation, #xalianLogo', { scale: 100, duration: 2, delay: 0 }, '<');

		splashPiecesRemovalTl.to('#xalian-splash-svg-animation, #xalian-generator-link', { yPercent: 200, duration: 0.8, delay: 0 }, '<');
		splashPiecesRemovalTl.to('#xalianLogo', { yPercent: -200, duration: 0.8, delay: 0 }, '<');
		splashPiecesRemovalTl.to('#first-line, #third-line, #subline1, #subline2, #subline3', { autoAlpha: 0, duration: 0.1 }, '<');


        let sections = 3;
        var contentParentTl = gsap.timeline({
            scrollTrigger: {
                trigger: '#splash-page-spacer',
                pin: true,
                scrub: true,
                start: 'top top',
                end: '+=400%',
                snap: "labelsDirectional",
                // snap:(1/ (sections - 1))
                // snap: "100vh",
            },
            // scrollTrigger: {
            //     trigger: secId,
            //     scrub: true,
            //     pin: true,
            //     // markers: true,
            //     start: 'top top',
            //     end: '+=100%',
            //     snap: "labelsDirectional",
            //     // snap: "labels",
            //     pinSpacing: false
            // },
        });

        contentParentTl.addLabel('horizontal-content-start');

        buildPanelAnimation(contentParentTl,
            '#content-section-1', 
            '#content-section-1', 
            // '#content-section-1 .splash-page-content-panel', 
            'For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first species of Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments.',
        );
        buildPanelAnimation(contentParentTl,
            '#content-section-2', 
            '#content-section-2', 
            // '#content-section-2 .splash-page-content-panel',
            'The high technology of the Vallerii would eventually prove to be their downfall when their own artificial intelligence took control of the Xalian Generators, turning the creatures against their creators.',
        );
        buildPanelAnimation(contentParentTl,
            '#content-section-3', 
            '#content-section-3', 
            // '#content-section-3 .splash-page-content-panel',
            'The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.'
        );

        contentParentTl.addLabel('horizontal-content-end');


        function buildPanelAnimation(tl, secId, panId, text) {
            tl
            // .addLabel(secId + 'start')
            .fromTo(panId, {rotate: 12 }, {rotate: 0, duration: 0.5 })
            .from(panId, { scale: 0.1, xPercent: 50, autoAlpha: 0, ease: 'power4', duration: 1 }, "<")
            .to(panId + ' p', { speed: 3, text: { value: text }})
            .addLabel(secId)
            .to(panId, { scale: 0.1, xPercent: -50, autoAlpha: 0, ease: 'power4', duration: 1, delay: 1 })
            .to(panId, {duration: 0.5, rotate: -12 }, "<")
            // .addLabel(secId + 'end');
            // return tl;
            // if (nextSectionId) {
            //     tl.to(window, {duration: 2, scrollTo: nextSectionId});
            // }
        }

	}
    

	render() {
		return (
			<React.Fragment>
				<Container fluid className="home-background">
					<SplashGalaxyBackground direction={this.state.backgroundAnimationStarDirection} speed={this.state.backgroundAnimationStarSpeed}>
						{/* <XalianNavbar></XalianNavbar> */}

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
										<SplashBackgroundAnimatedSVG id="xalian-splash-svg-animation" />
									</Col>
								</Row>
							</Container>
						</section>

						<div id="splash-page-spacer" className="splash-page-full-content-wrapper">
							{/* <section id="content-section-1" class="splash-page-content-section">
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

							<section id="" class="splash-page-content-end-section"></section> */}

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

export default Home;
