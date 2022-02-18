import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ThemedSceneDiv from '../components/views/themedSceneDiv'
import { Reveal, Tween, ScrollTrigger, Controls, Timeline, PlayState } from 'react-gsap';
import * as animations from '../components/animations/fadeAnimation';
import { gsap } from 'gsap';

class Home extends React.Component {
    

    state = { 
        isLoading: true
     }

	 constructor(props) {
		 super(props);
		//  this.xalianLogoRef = React.createRef();

	 }
    
    componentDidMount() {
        this.setState({isLoading: false})
		// console.log(`this.xalianLogoRef = ${this.xalianLogoRef}`);
		// gsap.to(this.xalianLogoRef.current, { rotation: "+=360" });


		// var animationTimeline = gsap.timeline({ repeat: -1, yoyo: true});
		var splashTl = gsap.timeline({ repeat: 0});
		splashTl.fromTo("#xalianLogo", {opacity: 0}, {opacity: 1, duration: 1, ease:'sine.in'});
		splashTl.fromTo("#first-line", {opacity: 0}, {opacity: 1, duration: 0.5});
		splashTl.fromTo("#second-line", {opacity: 0}, {opacity: 1, duration: 0.5});
		splashTl.fromTo("#third-line", {opacity: 0}, {opacity: 1, duration: 0.5});
		splashTl.fromTo("#navvy", {opacity: 0}, {opacity: 1, duration: 1, ease:'sine.in'});

		gsap.to("#inside-spinner", {duration: 10, rotation: 360, transformOrigin: "50% 50%", repeat: -1, ease: 'none', });
		gsap.to("#outside-spinner", {duration: 20, rotation: -360, transformOrigin: "50% 50%", repeat: -1, ease: 'none', });
		// gsap.from("#story", {
		// 	scrollTrigger: {
		// 		trigger: "#story",
		// 		toggleActions: "restart pause reverse pause",
		// 		start: "top 80%",
		// 		scrub: 1
		// 	},
		// 	opacity: 0
		// })
    }


    render() {


        return (
			<React.Fragment>
				{/* <Controls playState={PlayState.stop}>
					<Timeline target={this.xalianLogoRef}>
						<Tween from={{ opacity: 0 }} to={{ opacity: 1 }} duration={2} />
						<Tween to={{ x: '200px' }} />
						<Tween to={{ rotation: 180 }} position="+=1" />
					</Timeline>
				</Controls> */}

				<Container fluid className=" home-background-image">
					<XalianNavbar></XalianNavbar>

					<section id="splash" className="d-flex align-items-center justify-content-center home-background">
						<div className="container">
							{/* <div className="row justify-content-center" data-aos="fade-up"> */}
							<div className="row justify-content-center">
								<div className="col-xl-6 col-lg-8">
									{/* <Reveal repeat>
										<Tween from={{ opacity: 0 }} to={{ opacity: 1 }} duration={4}>
                                        <img src="assets/img/logo/xalians_logo.png" className="xalians-logo" />
										</Tween>
									</Reveal> */}
									{/* <animations.FadeIn> */}
									{/* <div ref={this.xalianLogoRef}> */}

										<img id='xalianLogo' src="assets/img/logo/xalians_logo.png" className="xalians-logo" />
									{/* </div> */}
									{/* </animations.FadeIn> */}

									<h2 id='first-line' className="splash-subtitle">CREATE : EARN : TRADE : PLAY</h2>
									<h3 id='second-line' >Battles coming soon...</h3>
									<div id='third-line'  className="social-media-links">
										<a href="https://discord.gg/sgGNhNJ2KN" className="social-media-links">
											<i className="bi bi-discord"></i>
										</a>
										<a href="https://twitter.com/xaliansgame" className="social-media-links">
											<i className="bi bi-twitter"></i>
										</a>
									</div>
								</div>
							</div>

							{/* <div className="row justify-content-center xalian-generator-button" data-aos="fade-up" data-aos-delay="300">
                        <div className="col-xl-6 col-lg-8">
                            <Button href="/engine" variant="outline-warning">Try the Xalian Generator</Button>{' '}
                        </div>
                    </div> */}

							{/* <div className="row gy-4 mt-5 justify-content-center" data-aos="zoom-in" data-aos-delay="450">
                        <div className="col-xl-2 col-md-4">
                            <a href="#story">
                                <div className="icon-box">
                                    <i className="bi bi-book"></i>
                                    <h3>Backstory</h3>
                                </div>
                            </a>
                        </div>
                        <div className="col-xl-2 col-md-4">
                            <a href="#planet-xalia-section">
                                <div className="icon-box">
                                    <i className="bi bi-stars"></i>
                                    <h3>Planet of Xalia</h3>
                                </div>
                            </a>
                        </div>
                        <div className="col-xl-2 col-md-4">
                            <a href="#tournament-section">
                                <div className="icon-box">
                                    <i className="bi bi-trophy"></i>
                                    <h3>Tournament</h3>
                                </div>
                            </a>
                        </div>
                        <div className="col-xl-2 col-md-4">
                            <a href="#tokens-section">
                                <div className="icon-box">
                                    <i className="bi bi-coin"></i>
                                    <h3>Tokens</h3>
                                </div>
                            </a>
                        </div>
                    </div> */}
						</div>
					</section>

					<main id="main">



						<ThemedSceneDiv id="story" className="story light info-section-padded gradient-background-section">
							<div className="container">
								<div className="row align-items-center">
									{/* <Col md={true} className="text-center centered-div shadow-text text-wrapper" data-aos="fade-right"> */}
									<Col md={true} className="text-center centered-div shadow-text text-wrapper">
										<h3>The Backstory</h3>
										<p>For thousands of years, the ancient race known as the Vallerii dominated the galaxy of Xalia. Their mastery of biotechnology led to generating the first Xalians – bioengineered organisms designed to thrive in Xalia’s most extreme environments. But the high technology of the Vallerii would prove to be their downfall when their own artificial intelligence infected the Xalian Generators with a virus that turned the Xalians against them. The centuries-long interplanetary assault known as the End Wars have long since ended, but the destruction they caused all but wiped out the Vallerii and has forever changed the galaxy.</p>
									</Col>
									{/* <Col md={true} className="centered-div" data-aos="fade-left" data-aos-delay="10"> */}
									<Col md={true} className="centered-div">
										<div className="embedded-img-wrapper">
											<img src="assets/img/background/castle.jpg" className="img-fluid" alt=""></img>
										</div>
									</Col>
								</div>
							</div>
						</ThemedSceneDiv>

						<section id="planet-xalia-section" className="planet-xalia-section light info-section-padded">
							{/* <div className="container" data-aos="zoom-in"> */}
							<div className="container" >
								<div className="text-center shadow-text text-wrapper">
									<h3 className="section-title">The Galaxy of Xalia</h3>
									<p>Xalia is home to a wide range of powerful, magical creatures originating from planets all across the galaxy. The galaxy is ruled by a powerful empire, controlled by the mad and tyrannous King Kozrak. Recently, the king has announced plans for a worldwide tournament promising the winning faction enormous gold and riches. In order to compete in the king's tournament, factions must first prove to him they are worthy. Only the strongest factions will survive.</p>
								</div>
							</div>
						</section>

						<section id="tournament-section" className="tournament-section light info-section-padded gradient-background-section">
							<div className="container">
								<div className="row align-items-center">
									{/* <Col md={true} className="centered-div" data-aos="fade-right" data-aos-delay="100"> */}
									<Col md={true} className="centered-div">
										<div className="embedded-img-wrapper">
											<img src="assets/img/background/arena.png" className="img-fluid" alt=""></img>
										</div>
									</Col>
									<Col md={true} className="text-center centered-div shadow-text text-wrapper">
										<h3>The Tournament</h3>
										<p>King Kozrak's empire has organized battles all across Xalia for factions to compete to prove they are worthy of a spot in the tournament. Factions must select a team of 6 to compete in each battle, and the winning faction will earn tokens that represent their victory. The more victories a faction has, the more proof a faction's power.</p>
									</Col>
								</div>
							</div>
						</section>

						<section id="tokens-section" className="tokens-section light info-section-padded">
							<div className="container">
								<div className="text-center shadow-text text-wrapper">
									<h3>The Tokens</h3>
									<p>As a faction earns tokens, they can spend these tokens on new recruits to the faction. Each new Xalian has a unique set of traits, abilities, skill levels, etc. Based on these stats, the Xalian will be assigned an appropriate battle fee. To ensure a competitive match, King Kozrak has imposed a battle fee limit. For a team to be eligible for battle, the combined battle fee of the team must not exceed the battle fee limit.</p>
								</div>
							</div>
						</section>

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
												{/* <div className="social">
                                                <a href=""><i className="bi bi-twitter"></i></a>
                                            </div> */}
											</div>
											<div className="member-info">
												<h4>Professor V</h4>
												<span className="underline">Cosmic Librarian</span>
												<span>Story Creator / Writer</span>
											</div>
										</div>
									</Col>

									<Col sm={true} className="d-flex">
										<div className="member" >
											<div className="member-img">
												<img src="assets/img/xalians/xalians_icon_unknown.png" className="img-fluid" alt=""></img>
												{/* <div className="social">
                                                <a href=""><i className="bi bi-twitter"></i></a>
                                            </div> */}
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
					</main>

					<footer id="footer">
						<div className="footer-top">
							<div className="container">
								<div className="row">
									<div className="col-lg-3 col-md-6 social-links-footer">
										<div className="footer-info">
											<h3>
												join our team<span>:</span>
											</h3>
											{/* ADD SOCIALS BELOW */}

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

						{/*   <div className="container">
                    <div className="copyright">
                        &copy; Copyright <strong><span>Gp</span></strong>. All Rights Reserved
                    </div>
                    <div className="credits">
                        Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a>
                    </div>
                </div> */}
						{/* <a href="#" className="back-to-top d-flex align-items-center justify-content-center"><i className="bi bi-arrow-up-short"></i></a> */}
					</footer>
					{this.state.isLoading && <div id="preloader"></div>}
				</Container>
			</React.Fragment>
		);



    }

}

export default Home;