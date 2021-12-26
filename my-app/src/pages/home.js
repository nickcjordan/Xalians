import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';

class Home extends React.Component {

    render() {

        return <React.Fragment>
            {/*   <header id="header" class="fixed-top">
                <div class="container d-flex align-items-center justify-content-lg-between">

                    <h1 class="logo me-auto me-lg-0"><a href="index.html">Gp<span>.</span></a></h1>

                    <nav id="navbar" class="navbar order-last order-lg-0">
                        <ul>
                            <li><a class="nav-link scrollto active" href="#hero">Home</a></li>
                            <li><a class="nav-link scrollto" href="#about">About</a></li>
                            <li><a class="nav-link scrollto" href="#services">Services</a></li>
                            <li><a class="nav-link scrollto " href="#portfolio">Portfolio</a></li>
                            <li><a class="nav-link scrollto" href="#team">Team</a></li>
                            <li class="dropdown"><a href="#"><span>Drop Down</span> <i class="bi bi-chevron-down"></i></a>
                                <ul>
                                    <li><a href="#">Drop Down 1</a></li>
                                    <li class="dropdown"><a href="#"><span>Deep Drop Down</span> <i class="bi bi-chevron-right"></i></a>
                                        <ul>
                                            <li><a href="#">Deep Drop Down 1</a></li>
                                            <li><a href="#">Deep Drop Down 2</a></li>
                                            <li><a href="#">Deep Drop Down 3</a></li>
                                            <li><a href="#">Deep Drop Down 4</a></li>
                                            <li><a href="#">Deep Drop Down 5</a></li>
                                        </ul>
                                    </li>
                                    <li><a href="#">Drop Down 2</a></li>
                                    <li><a href="#">Drop Down 3</a></li>
                                    <li><a href="#">Drop Down 4</a></li>
                                </ul>
                            </li>
                            <li><a class="nav-link scrollto" href="#contact">Contact</a></li>
                        </ul>
                        <i class="bi bi-list mobile-nav-toggle"></i>
                    </nav>

                    <a href="#about" class="get-started-btn scrollto">Get Started</a>

                </div>
            </header> */}

            <section id="hero" class="d-flex align-items-center justify-content-center">
                <div class="container" data-aos="fade-up">

                    <div class="row justify-content-center" data-aos="fade-up" data-aos-delay="150">
                        <div class="col-xl-6 col-lg-8">
                            <h1>Xalians<span>.</span></h1>
                            <h2>Battles coming soon...</h2>
                            <div class="social-media-links">
                                    <a href="https://discord.gg/fWMvsQ7v" class="social-media-links"><i class="bi bi-discord"></i></a>
                                    <a href="https://twitter.com/xaliansgame" class="social-media-links"><i class="bi bi-twitter"></i></a>
                            </div>
                        </div>
                    </div>


                    <div class="row justify-content-center xalian-generator-button" data-aos="fade-up" data-aos-delay="300">
                        <div class="col-xl-6 col-lg-8">
                            <Button href="/engine" variant="outline-warning">Try the Xalian Generator</Button>{' '}
                        </div>
                    </div>

                    <div class="row gy-4 mt-5 justify-content-center" data-aos="zoom-in" data-aos-delay="450">
                        <div class="col-xl-2 col-md-4">
                            <a href="#story">
                                <div class="icon-box">
                                    <i class="bi bi-book"></i>
                                    <h3>Backstory</h3>
                                </div>
                            </a>
                        </div>
                        <div class="col-xl-2 col-md-4">
                            <a href="#ruins">
                                <div class="icon-box">
                                    <i class="bi bi-stars"></i>
                                    <h3>Planet of Xalia</h3>
                                </div>
                            </a>
                        </div>
                        <div class="col-xl-2 col-md-4">
                            <a href="#portfolio">
                                <div class="icon-box">
                                    <i class="bi bi-trophy"></i>
                                    <h3>Tournament</h3>
                                </div>
                            </a>
                        </div>
                        <div class="col-xl-2 col-md-4">
                            <a href="#testimonials">
                                <div class="icon-box">
                                    <i class="bi bi-coin"></i>
                                    <h3>Tokens</h3>
                                </div>
                            </a>
                        </div>
                    </div>

                </div>
            </section>

            <main id="main">

                <section id="story" class="story light info-section-padded">
                    <div class="container" data-aos="fade-up">

                        <div class="row align-items-center">

                            <Col md={true} className="centered-div shadow-text" data-aos="fade-right" data-aos-delay="10">
                                <h3>The Backstory</h3>
                                <p>
                                    For hundreds of years, the galaxy of Valleron was plagued with disastrous, interplanetary warfare.
                                    The wars have long ended, but the destruction they caused has left few planets habitable.
                                    As a result, most life forms across the galaxy have concentrated to the capitol planet, Xalia.
                                </p>
                            </Col>
                            <Col md={true} className="centered-div" data-aos="fade-left" data-aos-delay="100">
                                <div className="embedded-img-wrapper">
                                    <img src="assets/img/background/castle.jpg" class="img-fluid" alt=""></img>
                                </div>
                            </Col>
                        </div>

                    </div>
                </section>

                <section id="ruins" class="ruins light info-section-padded">
                    <div class="container" data-aos="zoom-in" data-aos-delay="10">

                        <div class="text-center shadow-text">
                            <h3>The Planet of Xalia</h3>
                            <p>
                                Xalia is home to a wide range of powerful, magical creatures originating from planets all across the galaxy.
                                The planet is controlled by a powerful empire, ruled by the mad and tyrannous King Kozrak.
                                Recently, the king has announced plans for a worldwide tournament promising the winning faction enormous gold and riches.
                                In order to compete in the king's tournament, factions must first prove to him they are worthy.
                                Only the strongest factions will survive.
                            </p>
                        </div>

                    </div>
                </section>


                <section id="portfolio" class="portfolio light info-section-padded">
                    <div class="container" data-aos="fade-up" data-aos-delay="10">

                        <div class="row align-items-center">

                            <Col md={true} className="centered-div" data-aos="fade-right" data-aos-delay="100">
                                <div className="embedded-img-wrapper">
                                    <img src="assets/img/background/arena.png" class="img-fluid" alt=""></img>
                                </div>
                            </Col>
                            <Col md={true} className="centered-div shadow-text" data-aos="fade-left" data-aos-delay="10">
                                <h3>The Tournament</h3>
                                <p>
                                    King Kozrak's empire has organized battles all across Xalia for factions to compete to prove they are worthy of a spot in the tournament.
                                    Factions must select a team of 6 to compete in each battle, and the winning faction will earn tokens that represent their victory.
                                    The more victories a faction has, the more proof a faction's power.
                                </p>
                            </Col>
                        </div>
                    </div>






                </section>


                <section id="testimonials" class="testimonials light info-section-padded">
                    <div class="container" data-aos="zoom-in" data-aos-delay="10">


                        <div class="text-center shadow-text">
                            <h3>The Tokens</h3>
                            <p>
                                As a faction earns tokens, they can spend these tokens on new recruits to the faction.
                                Each new Xalian has a unique set of traits, abilities, skill levels, etc.
                                Based on these stats, the Xalian will be assigned an appropriate battle fee.
                                To ensure a competitive match, King Kozrak has imposed a battle fee limit.
                                For a team to be eligible for battle, the combined battle fee of the team must not exceed the battle fee limit.
                            </p>
                        </div>

                    </div>
                </section>

                <section id="project_details" class="project_details light info-section-padded">
                <div class="container" data-aos="fade-up" data-aos-delay="10">
                    <Row>
                        <Col md={true}>
                            <div class="text-center shadow-text">
                                <h3>Create</h3>
                                <p>
                                - Each generation of Xalians NFTs will be designed by the community through a submission and voting process
	- a generation will be limited to a certain number
- Each Xalian will be generated on mint with 500 unique attributes
	- dont know the purpose of all of them today, but the game will grow around the NFTs
	- we want the NFTs to be used for projects far beyond our game
- Xalian attributes will determine its power and abilities in the battle arena
                                </p>
                            </div>
                        </Col>
                    </Row>

                        <div class="text-center shadow-text">
                            <h3>The Tokens</h3>
                            <p>
                                As a faction earns tokens, they can spend these tokens on new recruits to the faction.
                                Each new Xalian has a unique set of traits, abilities, skill levels, etc.
                                Based on these stats, the Xalian will be assigned an appropriate battle fee.
                                To ensure a competitive match, King Kozrak has imposed a battle fee limit.
                                For a team to be eligible for battle, the combined battle fee of the team must not exceed the battle fee limit.
                            </p>
                        </div>

                    </div>
                </section>


                <section id="team" class="team light">
                    <Container className="team-container" fluid="sm" data-aos="fade-up" >
                        <h3>The Team</h3>
                        <Row className="team-row">

                            <Col md={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="100">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_xylum.png" class="img-fluid" alt=""></img>
                                        <div class="social">
                                            <a href="https://twitter.com/KingKozrak"><i class="bi bi-twitter"></i></a>
                                        </div>
                                    </div>
                                    <div class="member-info">
                                        <h4>Doctor J</h4>
                                        <span>Xalian Geneticist</span>
                                        <span>Tech Engineer</span>
                                    </div>
                                </div>
                            </Col>

                            <Col md={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="200">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_tetrahive.png" class="img-fluid" alt=""></img>
                                        <div class="social">
                                            <a href=""><i class="bi bi-twitter"></i></a>
                                        </div>
                                    </div>
                                    <div class="member-info">
                                        <h4>Professor M</h4>
                                        <span>Xalian Astrophysicist</span>
                                        <span>Execution Engineer</span>
                                    </div>
                                </div>
                            </Col>

                            <Col md={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="400">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_unknown.png" class="img-fluid" alt=""></img>
                                        {/* <div class="social">
                                                <a href=""><i class="bi bi-twitter"></i></a>
                                            </div> */}
                                    </div>
                                    <div class="member-info">
                                        <h4>Unknown Human</h4>
                                        <span>Xalian Researcher</span>
                                        <span>Story Creator / Writer</span>
                                    </div>
                                </div>
                            </Col>

                            <Col md={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="400">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_unknown.png" class="img-fluid" alt=""></img>
                                        {/* <div class="social">
                                                <a href=""><i class="bi bi-twitter"></i></a>
                                            </div> */}
                                    </div>
                                    <div class="member-info">
                                        <h4>Unknown Human</h4>
                                        <span>Xalian Researcher</span>
                                        <span>Visual Creator / Artist</span>
                                    </div>
                                </div>
                            </Col>

                        </Row>

                    </Container>
                </section>

               

            </main>

            <footer id="footer">
                <div class="footer-top">
                    <div class="container">
                        <div class="row">

                            <div class="col-lg-3 col-md-6 social-links-footer">
                                <div class="footer-info">
                                    <h3>join our team<span>:</span></h3>
                                    {/* ADD SOCIALS BELOW */}

                                    <div class="social-links mt-3">
                                        <a href="https://discord.gg/fWMvsQ7v" class="discord"><i class="bi bi-discord"></i></a>
                                        <a href="https://twitter.com/xaliansgame" class="twitter"><i class="bi bi-twitter"></i></a>
                                    </div>
                                </div>
                            </div>
                           

                        </div>
                    </div>
                </div>

                {/*   <div class="container">
                    <div class="copyright">
                        &copy; Copyright <strong><span>Gp</span></strong>. All Rights Reserved
                    </div>
                    <div class="credits">
                        Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a>
                    </div>
                </div> */}
            </footer>

            {/* <div id="preloader"></div> */}
            <a href="#" class="back-to-top d-flex align-items-center justify-content-center"><i class="bi bi-arrow-up-short"></i></a>
        </React.Fragment>



    }

}



export default Home;