import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';



class Home extends React.Component {
    

    state = { 
        isLoading: true
     }
    
    componentDidMount() {
        this.setState({isLoading: false})
        // var navbar = document.getElementById('navvy');
        // navbar.classList.add('no-height');
        // navbar.classList.add('hidden');
    }


    render() {

        return <React.Fragment>
            
            <span class="content-wrapper">
                <XalianNavbar></XalianNavbar>

            <section id="splash" class="d-flex align-items-center justify-content-center">
                <div class="container">
                    <div class="row justify-content-center" data-aos="fade-up">
                        <div class="col-xl-6 col-lg-8">
                            <img src="assets/img/logo/xalians_logo.png" class="xalians-logo" />
                            <h2 class="splash-subtitle">CREATE : EARN : TRADE : PLAY</h2>
                            <h3>Battles coming soon...</h3>
                            <div class="social-media-links">
                                    <a href="https://discord.gg/sgGNhNJ2KN" class="social-media-links"><i class="bi bi-discord"></i></a>
                                    <a href="https://twitter.com/xaliansgame" class="social-media-links"><i class="bi bi-twitter"></i></a>
                            </div>
                        </div>
                    </div>


                    {/* <div class="row justify-content-center xalian-generator-button" data-aos="fade-up" data-aos-delay="300">
                        <div class="col-xl-6 col-lg-8">
                            <Button href="/engine" variant="outline-warning">Try the Xalian Generator</Button>{' '}
                        </div>
                    </div> */}

                    {/* <div class="row gy-4 mt-5 justify-content-center" data-aos="zoom-in" data-aos-delay="450">
                        <div class="col-xl-2 col-md-4">
                            <a href="#story">
                                <div class="icon-box">
                                    <i class="bi bi-book"></i>
                                    <h3>Backstory</h3>
                                </div>
                            </a>
                        </div>
                        <div class="col-xl-2 col-md-4">
                            <a href="#planet-xalia-section">
                                <div class="icon-box">
                                    <i class="bi bi-stars"></i>
                                    <h3>Planet of Xalia</h3>
                                </div>
                            </a>
                        </div>
                        <div class="col-xl-2 col-md-4">
                            <a href="#tournament-section">
                                <div class="icon-box">
                                    <i class="bi bi-trophy"></i>
                                    <h3>Tournament</h3>
                                </div>
                            </a>
                        </div>
                        <div class="col-xl-2 col-md-4">
                            <a href="#tokens-section">
                                <div class="icon-box">
                                    <i class="bi bi-coin"></i>
                                    <h3>Tokens</h3>
                                </div>
                            </a>
                        </div>
                    </div> */}

                </div>
            </section>

            <main id="main">

                <section id="story" class="story light info-section-padded gradient-background-section">
                    <div class="container">

                        <div class="row align-items-center">

                            <Col md={true} className="text-center centered-div shadow-text text-wrapper" data-aos="fade-right">
                                <h3>The Backstory</h3>
                                <p>
                                    For hundreds of years, the galaxy of Xalia was plagued with disastrous, interplanetary warfare.
                                    The wars have long ended, but the destruction they caused has left few planets habitable. 
                                    From the Xalian Generators that were left behind, new life has begun to emerge.
                                </p>
                            </Col>
                            <Col md={true} className="centered-div" data-aos="fade-left" data-aos-delay="10">
                                <div className="embedded-img-wrapper">
                                    <img src="assets/img/background/castle.jpg" class="img-fluid" alt=""></img>
                                </div>
                            </Col>
                        </div>

                    </div>
                </section>

                <section id="planet-xalia-section" class="planet-xalia-section light info-section-padded">
                    <div class="container" data-aos="zoom-in">

                        <div class="text-center shadow-text text-wrapper">
                            <h3 className="section-title">The Galaxy of Xalia</h3>
                            <p>
                                Xalia is home to a wide range of powerful, magical creatures originating from planets all across the galaxy.
                                The galaxy is ruled by a powerful empire, controlled by the mad and tyrannous King Kozrak.
                                Recently, the king has announced plans for a worldwide tournament promising the winning faction enormous gold and riches.
                                In order to compete in the king's tournament, factions must first prove to him they are worthy.
                                Only the strongest factions will survive.
                            </p>
                        </div>

                    </div>
                </section>


                <section id="tournament-section" class="tournament-section light info-section-padded gradient-background-section">
                    <div class="container">

                        <div class="row align-items-center">

                            <Col md={true} className="centered-div" data-aos="fade-right" data-aos-delay="100">
                                <div className="embedded-img-wrapper">
                                    <img src="assets/img/background/arena.png" class="img-fluid" alt=""></img>
                                </div>
                            </Col>
                            <Col md={true} className="text-center centered-div shadow-text text-wrapper" data-aos="fade-left" data-aos-delay="10">
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


                <section id="tokens-section" class="tokens-section light info-section-padded">
                    <div class="container" data-aos="zoom-in">


                        <div class="text-center shadow-text text-wrapper">
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



                <section id="team" class="team light gradient-background-section">
                    <Container className="team-container" >
                        <h3>The Team</h3>
                        <Row className="team-row">

                            <Col sm={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="50">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_xylum.png" class="img-fluid" alt=""></img>
                                        <div class="social">
                                            <a href="https://twitter.com/KingKozrak"><i class="bi bi-twitter"></i></a>
                                        </div>
                                    </div>
                                    <div class="member-info">
                                        <h4>Doctor J</h4>
                                        <span class="underline">Xalian Geneticist</span>
                                        <span>Tech Engineer</span>
                                    </div>
                                </div>
                            </Col>

                            <Col sm={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="100">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_crystorn.png" class="img-fluid" alt=""></img>
                                        <div class="social">
                                            <a href=""><i class="bi bi-twitter"></i></a>
                                        </div>
                                    </div>
                                    <div class="member-info">
                                        <h4>Captain M</h4>
                                        <span class="underline">Xalian Astrophysicist</span>
                                        <span>Execution Engineer</span>
                                    </div>
                                </div>
                            </Col>

                            <Col sm={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="150">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_smokat.png" class="img-fluid" alt=""></img>
                                        {/* <div class="social">
                                                <a href=""><i class="bi bi-twitter"></i></a>
                                            </div> */}
                                    </div>
                                    <div class="member-info">
                                        <h4>Professor V</h4>
                                        <span class="underline">Cosmic Librarian</span>
                                        <span>Story Creator / Writer</span>
                                    </div>
                                </div>
                            </Col>

                            <Col sm={true} class="d-flex">
                                <div class="member" data-aos="fade-up" data-aos-delay="200">
                                    <div class="member-img">
                                        <img src="assets/img/xalians/xalians_icon_unknown.png" class="img-fluid" alt=""></img>
                                        {/* <div class="social">
                                                <a href=""><i class="bi bi-twitter"></i></a>
                                            </div> */}
                                    </div>
                                    <div class="member-info">
                                        <h4>Unknown Human</h4>
                                        <span class="underline">Xalian Researcher</span>
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
                                        <a href="https://discord.gg/sgGNhNJ2KN" class="discord"><i class="bi bi-discord"></i></a>
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
            {/* <a href="#" class="back-to-top d-flex align-items-center justify-content-center"><i class="bi bi-arrow-up-short"></i></a> */}
            </footer>
                { this.state.isLoading && <div id="preloader"></div> }

            </span>
        </React.Fragment>



    }

}

export default Home;