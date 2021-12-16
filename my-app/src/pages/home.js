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

                        <div class="row">

                            {/* ADD IMAGE TO RIGHT SIDE */}
                           {/*  <div class="col-lg-6 order-1 order-lg-2" data-aos="fade-left" data-aos-delay="100">
                                <img src="assets/img/ruins.jpg" class="img-fluid" alt=""></img>
                            </div> */}


                            <div class="text-center " data-aos="fade-right" data-aos-delay="10">
                                <h3>The Backstory</h3>
                                <p>
                                For hundreds of years, the galaxy of Valleron was plagued with disastrous, interplanetary warfare.
The wars have long ended, but the destruction they caused has left few planets habitable.
As a result, most life forms across the galaxy have concentrated to the capitol planet, Xalia. 
                                </p>
                            </div>
                        </div>

                    </div>
                </section>

           {/*      <section id="clients" class="clients">
                    <div class="container" data-aos="zoom-in">

                        <div class="clients-slider swiper">
                            <div class="swiper-wrapper align-items-center">
                                <div class="swiper-slide"><img src="assets/img/clients/client-1.png" class="img-fluid" alt=""></img></div>
                                <div class="swiper-slide"><img src="assets/img/clients/client-2.png" class="img-fluid" alt=""></img></div>
                                <div class="swiper-slide"><img src="assets/img/clients/client-3.png" class="img-fluid" alt=""></img></div>
                                <div class="swiper-slide"><img src="assets/img/clients/client-4.png" class="img-fluid" alt=""></img></div>
                                <div class="swiper-slide"><img src="assets/img/clients/client-5.png" class="img-fluid" alt=""></img></div>
                                <div class="swiper-slide"><img src="assets/img/clients/client-6.png" class="img-fluid" alt=""></img></div>
                                <div class="swiper-slide"><img src="assets/img/clients/client-7.png" class="img-fluid" alt=""></img></div>
                                <div class="swiper-slide"><img src="assets/img/clients/client-8.png" class="img-fluid" alt=""></img></div>
                            </div>
                            <div class="swiper-pagination"></div>
                        </div>

                    </div>
                </section> */}

 {/*                <section id="features" class="features">
                    <div class="container" data-aos="fade-up">

                        <div class="row">
                            //<div class="image col-lg-6" style='background-image: url("assets/img/features.jpg");' data-aos="fade-right"></div>
                            <div class="image col-lg-6" data-aos="fade-right"></div>
                            <div class="col-lg-6" data-aos="fade-left" data-aos-delay="100">
                                <div class="icon-box mt-5 mt-lg-0" data-aos="zoom-in" data-aos-delay="150">
                                    <i class="bx bx-receipt"></i>
                                    <h4>Est labore ad</h4>
                                    <p>Consequuntur sunt aut quasi enim aliquam quae harum pariatur laboris nisi ut aliquip</p>
                                </div>
                                <div class="icon-box mt-5" data-aos="zoom-in" data-aos-delay="150">
                                    <i class="bx bx-cube-alt"></i>
                                    <h4>Harum esse qui</h4>
                                    <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt</p>
                                </div>
                                <div class="icon-box mt-5" data-aos="zoom-in" data-aos-delay="150">
                                    <i class="bx bx-images"></i>
                                    <h4>Aut occaecati</h4>
                                    <p>Aut suscipit aut cum nemo deleniti aut omnis. Doloribus ut maiores omnis facere</p>
                                </div>
                                <div class="icon-box mt-5" data-aos="zoom-in" data-aos-delay="150">
                                    <i class="bx bx-shield"></i>
                                    <h4>Beatae veritatis</h4>
                                    <p>Expedita veritatis consequuntur nihil tempore laudantium vitae denat pacta</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </section> */}


                {/* <section id="services" class="services">
                    <div class="container" data-aos="fade-up">

                        <div class="section-title">
                            <h2>Services</h2>
                            <p>Check our Services</p>
                        </div>

                        <div class="row">
                            <div class="col-lg-4 col-md-6 d-flex align-items-stretch" data-aos="zoom-in" data-aos-delay="100">
                                <div class="icon-box">
                                    <div class="icon"><i class="bx bxl-dribbble"></i></div>
                                    <h4><a href="">Lorem Ipsum</a></h4>
                                    <p>Voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi</p>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 d-flex align-items-stretch mt-4 mt-md-0" data-aos="zoom-in" data-aos-delay="200">
                                <div class="icon-box">
                                    <div class="icon"><i class="bx bx-file"></i></div>
                                    <h4><a href="">Sed ut perspiciatis</a></h4>
                                    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore</p>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 d-flex align-items-stretch mt-4 mt-lg-0" data-aos="zoom-in" data-aos-delay="300">
                                <div class="icon-box">
                                    <div class="icon"><i class="bx bx-tachometer"></i></div>
                                    <h4><a href="">Magni Dolores</a></h4>
                                    <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia</p>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 d-flex align-items-stretch mt-4" data-aos="zoom-in" data-aos-delay="100">
                                <div class="icon-box">
                                    <div class="icon"><i class="bx bx-world"></i></div>
                                    <h4><a href="">Nemo Enim</a></h4>
                                    <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis</p>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 d-flex align-items-stretch mt-4" data-aos="zoom-in" data-aos-delay="200">
                                <div class="icon-box">
                                    <div class="icon"><i class="bx bx-slideshow"></i></div>
                                    <h4><a href="">Dele cardo</a></h4>
                                    <p>Quis consequatur saepe eligendi voluptatem consequatur dolor consequuntur</p>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 d-flex align-items-stretch mt-4" data-aos="zoom-in" data-aos-delay="300">
                                <div class="icon-box">
                                    <div class="icon"><i class="bx bx-arch"></i></div>
                                    <h4><a href="">Divera don</a></h4>
                                    <p>Modi nostrum vel laborum. Porro fugit error sit minus sapiente sit aspernatur</p>
                                </div>
                            </div>

                        </div>

                    </div>
                </section> */}


                <section id="ruins" class="ruins light info-section-padded">
                    <div class="container" data-aos="zoom-in"  data-aos-delay="10">

                        <div class="text-center">
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
                    <div class="container" data-aos="fade-up"  data-aos-delay="10">

                    <div class="text-center">
                            <h3>The Tournament</h3>
                            <p>
                            King Kozrak's empire has organized battles all across Xalia for factions to compete to prove they are worthy of a spot in the tournament.
Factions must select a team of 6 to compete in each battle, and the winning faction will earn tokens that represent their victory.
The more victories a faction has, the more proof a faction's power.
                            </p>
                        </div>

                        {/* <div class="section-title">
                            <h2>Portfolio</h2>
                            <p>Check our Portfolio</p>
                        </div>

                        <div class="row" data-aos="fade-up" data-aos-delay="100">
                            <div class="col-lg-12 d-flex justify-content-center">
                                <ul id="portfolio-flters">
                                    <li data-filter="*" class="filter-active">All</li>
                                    <li data-filter=".filter-app">App</li>
                                    <li data-filter=".filter-card">Card</li>
                                    <li data-filter=".filter-web">Web</li>
                                </ul>
                            </div>
                        </div>

                        <div class="row portfolio-container" data-aos="fade-up" data-aos-delay="200">

                            <div class="col-lg-4 col-md-6 portfolio-item filter-app">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-1.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>App 1</h4>
                                        <p>App</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-1.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="App 1"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-web">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-2.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>Web 3</h4>
                                        <p>Web</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-2.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="Web 3"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-app">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-3.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>App 2</h4>
                                        <p>App</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-3.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="App 2"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-card">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-4.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>Card 2</h4>
                                        <p>Card</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-4.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="Card 2"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-web">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-5.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>Web 2</h4>
                                        <p>Web</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-5.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="Web 2"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-app">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-6.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>App 3</h4>
                                        <p>App</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-6.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="App 3"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-card">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-7.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>Card 1</h4>
                                        <p>Card</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-7.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="Card 1"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-card">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-8.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>Card 3</h4>
                                        <p>Card</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-8.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="Card 3"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-4 col-md-6 portfolio-item filter-web">
                                <div class="portfolio-wrap">
                                    <img src="assets/img/portfolio/portfolio-9.jpg" class="img-fluid" alt=""></img>
                                    <div class="portfolio-info">
                                        <h4>Web 3</h4>
                                        <p>Web</p>
                                        <div class="portfolio-links">
                                            <a href="assets/img/portfolio/portfolio-9.jpg" data-gallery="portfolioGallery" class="portfolio-lightbox" title="Web 3"><i class="bx bx-plus"></i></a>
                                            <a href="portfolio-details.html" title="More Details"><i class="bx bx-link"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
 */}
                    </div>
                </section>


                {/* <section id="counts" class="counts">
                    <div class="container" data-aos="fade-up">

                        <div class="row no-gutters">
                            <div class="image col-xl-5 d-flex align-items-stretch justify-content-center justify-content-lg-start" data-aos="fade-right" data-aos-delay="100"></div>
                            <div class="col-xl-7 ps-0 ps-lg-5 pe-lg-1 d-flex align-items-stretch" data-aos="fade-left" data-aos-delay="100">
                                <div class="content d-flex flex-column justify-content-center">
                                    <h3>Voluptatem dignissimos provident quasi</h3>
                                    <p>
                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Duis aute irure dolor in reprehenderit
                                    </p>
                                    <div class="row">
                                        <div class="col-md-6 d-md-flex align-items-md-stretch">
                                            <div class="count-box">
                                                <i class="bi bi-emoji-smile"></i>
                                                <span data-purecounter-start="0" data-purecounter-end="65" data-purecounter-duration="2" class="purecounter"></span>
                                                <p><strong>Happy Clients</strong> consequuntur voluptas nostrum aliquid ipsam architecto ut.</p>
                                            </div>
                                        </div>

                                        <div class="col-md-6 d-md-flex align-items-md-stretch">
                                            <div class="count-box">
                                                <i class="bi bi-journal-richtext"></i>
                                                <span data-purecounter-start="0" data-purecounter-end="85" data-purecounter-duration="2" class="purecounter"></span>
                                                <p><strong>Projects</strong> adipisci atque cum quia aspernatur totam laudantium et quia dere tan</p>
                                            </div>
                                        </div>

                                        <div class="col-md-6 d-md-flex align-items-md-stretch">
                                            <div class="count-box">
                                                <i class="bi bi-clock"></i>
                                                <span data-purecounter-start="0" data-purecounter-end="35" data-purecounter-duration="4" class="purecounter"></span>
                                                <p><strong>Years of experience</strong> aut commodi quaerat modi aliquam nam ducimus aut voluptate non vel</p>
                                            </div>
                                        </div>

                                        <div class="col-md-6 d-md-flex align-items-md-stretch">
                                            <div class="count-box">
                                                <i class="bi bi-award"></i>
                                                <span data-purecounter-start="0" data-purecounter-end="20" data-purecounter-duration="4" class="purecounter"></span>
                                                <p><strong>Awards</strong> rerum asperiores dolor alias quo reprehenderit eum et nemo pad der</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </section> */}


                <section id="testimonials" class="testimonials light info-section-padded">
                    <div class="container" data-aos="zoom-in">


                    <div class="text-center">
                            <h3>The Tokens</h3>
                            <p>
                            As a faction earns tokens, they can spend these tokens on new recruits to the faction.
Each new Xalian has a unique set of traits, abilities, skill levels, etc.
Based on these stats, the Xalian will be assigned an appropriate battle fee.
To ensure a competitive match, King Kozrak has imposed a battle fee limit.  
For a team to be eligible for battle, the combined battle fee of the team must not exceed the battle fee limit.
                            </p>
                        </div>

                        {/* <div class="testimonials-slider swiper" data-aos="fade-up" data-aos-delay="100">
                            <div class="swiper-wrapper">

                                

                                <div class="swiper-slide">
                                    <div class="testimonial-item">
                                        <img src="assets/img/testimonials/testimonials-5.jpg" class="testimonial-img" alt=""></img>
                                        <h3>John Larson</h3>
                                        <h4>Entrepreneur</h4>
                                        <p>
                                            <i class="bx bxs-quote-alt-left quote-icon-left"></i>
                                            Quis quorum aliqua sint quem legam fore sunt eram irure aliqua veniam tempor noster veniam enim culpa labore duis sunt culpa nulla illum cillum fugiat legam esse veniam culpa fore nisi cillum quid.
                                            <i class="bx bxs-quote-alt-right quote-icon-right"></i>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="swiper-pagination"></div>
                        </div> */}

                    </div>
                </section>


                <section id="team" class="team light">
                    <Container className="team-container" fluid="sm" data-aos="fade-up">
                        <h3>The Team</h3>
                     {/*    <div class="section-title">
                            <h2>Team</h2>
                            <p>Check our Team</p>
                        </div>
 */}
                        <Row className="team-row">

                                <Col sm={true} class="d-flex">
                                    <div class="member" data-aos="fade-up" data-aos-delay="100">
                                        <div class="member-img">
                                            <img src="assets/img/xalians/xalians_icon_xylum.png" class="img-fluid" alt=""></img>
                                            <div class="social">
                                                <a href=""><i class="bi bi-twitter"></i></a>
                                                <a href=""><i class="bi bi-facebook"></i></a>
                                                <a href=""><i class="bi bi-instagram"></i></a>
                                                <a href=""><i class="bi bi-linkedin"></i></a>
                                            </div>
                                        </div>
                                        <div class="member-info">
                                            <h4>Nick</h4>
                                            <span>Founder</span>
                                        </div>
                                    </div>
                                </Col>

                                <Col sm={true} class="d-flex">
                                    <div class="member" data-aos="fade-up" data-aos-delay="200">
                                        <div class="member-img">
                                            <img src="assets/img/xalians/xalians_icon_dromeus.png" class="img-fluid" alt=""></img>
                                            <div class="social">
                                                <a href=""><i class="bi bi-twitter"></i></a>
                                                <a href=""><i class="bi bi-facebook"></i></a>
                                                <a href=""><i class="bi bi-instagram"></i></a>
                                                <a href=""><i class="bi bi-linkedin"></i></a>
                                            </div>
                                        </div>
                                        <div class="member-info">
                                            <h4>Dan</h4>
                                            <span>Founder</span>
                                        </div>
                                    </div>
                                </Col>

                                <Col sm={true} class="d-flex">
                                    <div class="member" data-aos="fade-up" data-aos-delay="400">
                                        <div class="member-img">
                                            <img src="assets/img/xalians/xalians_icon_unknown.png" class="img-fluid" alt=""></img>
                                            <div class="social">
                                                <a href=""><i class="bi bi-twitter"></i></a>
                                                <a href=""><i class="bi bi-facebook"></i></a>
                                                <a href=""><i class="bi bi-instagram"></i></a>
                                                <a href=""><i class="bi bi-linkedin"></i></a>
                                            </div>
                                        </div>
                                        <div class="member-info">
                                            <h4>Unknown Human</h4>
                                            <span>Artist</span>
                                        </div>
                                    </div>
                                </Col>

                        </Row>

                    </Container>
                </section>

               {/*  <section id="contact" class="contact">
                    <div class="container" data-aos="fade-up">

                        <div class="section-title">
                            <h2>Contact</h2>
                            <p>Contact Us</p>
                        </div>

                        <div>
                            <iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12097.433213460943!2d-74.0062269!3d40.7101282!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0xb89d1fe6bc499443!2sDowntown+Conference+Center!5e0!3m2!1smk!2sbg!4v1539943755621" frameborder="0" allowfullscreen></iframe>
                        </div>

                        <div class="row mt-5">

                            <div class="col-lg-4">
                                <div class="info">
                                    <div class="address">
                                        <i class="bi bi-geo-alt"></i>
                                        <h4>Location:</h4>
                                        <p>A108 Adam Street, New York, NY 535022</p>
                                    </div>

                                    <div class="email">
                                        <i class="bi bi-envelope"></i>
                                        <h4>Email:</h4>
                                        <p>info@example.com</p>
                                    </div>

                                    <div class="phone">
                                        <i class="bi bi-phone"></i>
                                        <h4>Call:</h4>
                                        <p>+1 5589 55488 55s</p>
                                    </div>

                                </div>

                            </div>

                            <div class="col-lg-8 mt-5 mt-lg-0">

                                <form action="forms/contact.php" method="post" role="form" class="php-email-form">
                                    <div class="row">
                                        <div class="col-md-6 form-group">
                                            <input type="text" name="name" class="form-control" id="name" placeholder="Your Name" required></input>
                                        </div>
                                        <div class="col-md-6 form-group mt-3 mt-md-0">
                                            <input type="email" class="form-control" name="email" id="email" placeholder="Your Email" required></input>
                                        </div>
                                    </div>
                                    <div class="form-group mt-3">
                                        <input type="text" class="form-control" name="subject" id="subject" placeholder="Subject" required></input>
                                    </div>
                                    <div class="form-group mt-3">
                                        <textarea class="form-control" name="message" rows="5" placeholder="Message" required></textarea>
                                    </div>
                                    <div class="my-3">
                                        <div class="loading">Loading</div>
                                        <div class="error-message"></div>
                                        <div class="sent-message">Your message has been sent. Thank you!</div>
                                    </div>
                                    <div class="text-center"><button type="submit">Send Message</button></div>
                                </form>

                            </div>

                        </div>

                    </div>
                </section> */}

            </main>

            <footer id="footer">
                <div class="footer-top">
                    <div class="container">
                        <div class="row">

                            <div class="col-lg-3 col-md-6 social-links-footer">
                                <div class="footer-info">
                                    <h3>come check it out<span>.</span></h3>

                                    {/* ADD SOCIALS BELOW */}

                                    <div class="social-links mt-3">
                                        <a href="https://discord.gg/fWMvsQ7v" class="discord"><i class="bi bi-discord"></i></a>
                                        <a href="https://twitter.com/xaliansgame" class="twitter"><i class="bi bi-twitter"></i></a>
                                    </div>
                                </div>
                            </div>
{/* 
                            <div class="col-lg-2 col-md-6 footer-links">
                                <h4>Useful Links</h4>
                                <ul>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Home</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">About us</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Services</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Terms of service</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Privacy policy</a></li>
                                </ul>
                            </div>

                            <div class="col-lg-3 col-md-6 footer-links">
                                <h4>Our Services</h4>
                                <ul>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Web Design</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Web Development</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Product Management</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Marketing</a></li>
                                    <li><i class="bx bx-chevron-right"></i> <a href="#">Graphic Design</a></li>
                                </ul>
                            </div>

                            <div class="col-lg-4 col-md-6 footer-newsletter">
                                <h4>Our Newsletter</h4>
                                <p>Tamen quem nulla quae legam multos aute sint culpa legam noster magna</p>
                                <form action="" method="post">
                                    <input type="email" name="email"></input>
                                    <input type="submit" value="Subscribe"></input>
                                </form>

                            </div> */}

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