import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Authenticator } from '@aws-amplify/ui-react';
import AuthButtonGroup from './auth/authButtonGroup';
import { Hub } from 'aws-amplify';
import { store } from 'state-pool';
import FadeAlert from './fadeAlert';
import * as authUtil from '../utils/authUtil';
import { Auth } from 'aws-amplify';
import { gsap } from 'gsap';

class XalianNavbar extends React.Component {
	state = {};

	componentDidMount() {
		var navbar = document.getElementById('navvy');


		this.hubListener = (data) => {
			if (navbar) {
				if (data.payload.event === 'show-navbar') {
					navbar.classList.remove('hidden');
					navbar.classList.add('visible');
				} else if (data.payload.event === 'hide-navbar') {
					navbar.classList.remove('visible');
					navbar.classList.add('hidden');
				}
			}
		};
		Hub.listen('navbar-channel', this.hubListener);

		// var animationTimeline = gsap.timeline({ repeat: 0});
		// animationTimeline.fromTo("#navvy", {opacity: 0}, {opacity: 1, duration: 2, ease:'sine.in'});

		if (navbar) {
			var last_scroll_top = 0;
			this.scrollListener = function () {
				let scroll_top = window.scrollY;
				if (scroll_top > 30) {
					if (scroll_top < last_scroll_top) {
						navbar.classList.remove('hidden');
						navbar.classList.add('visible');
					} else {
						navbar.classList.remove('visible');
						navbar.classList.add('hidden');
					}
				} else {
					// at the top of the page the navbar should always be visible
					navbar.classList.remove('hidden');
					navbar.classList.add('visible');
				}

				last_scroll_top = scroll_top;
			};
			window.addEventListener('scroll', this.scrollListener);
		}

		Auth.currentUserInfo().then((data) => {
			if (data && data.attributes) {
				this.handleUserAuthAction(authUtil.buildAuthState(data));
			}
		});
	}

	componentWillUnmount() {
		if (this.hubListener) {
			Hub.remove('navbar-channel', this.hubListener);
		}
		if (this.scrollListener) {
			window.removeEventListener('scroll', this.scrollListener);
		}
	}

	handleUserAuthAction = (user) => {
		if (this.props.authAlertCallback) {
			this.props.authAlertCallback(user);
		}
		this.setState({ loggedInUser: user });
	};

	render() {
		return (
			<React.Fragment>
				{/* <ScrollTrigger start="-200px center" end="200px center" scrub={0.5} markers> */}
					{/* <Tween from={{ opacity: 0 }} duration={2}> */}
						<Navbar id="navvy" collapseOnSelect expand="xl" variant="dark" sticky="top" className="xalian-navbar">
							{/* the bar carries a brand, six links, a CTA and two auth keys, which
							    together need more than bootstrap's fixed container width - they were
							    being clipped off the right edge between 1200 and 1400px. Fluid, with
							    the same gutter the page shell uses, so the bar lines up with the
							    content beneath it. */}
							<Container fluid className="navbar-shell">
								<Navbar.Brand href="/">
									<img src="/assets/img/logo/xalians_logo_small.png" height="30px" />
								</Navbar.Brand>
								<Navbar.Toggle aria-controls="responsive-navbar-nav" />
								<Navbar.Collapse id="responsive-navbar-nav">
									<Nav className="me-auto nav-text-shadow">
										<Nav.Link href="/">Home</Nav.Link>
										{/* <Nav.Link href="/community">Xalian Community</Nav.Link> */}
										{/* <Nav.Link href="/project">Learn More</Nav.Link> */}
										<Nav.Link href="/encyclopedia">Encyclopedia</Nav.Link>
										<Nav.Link href="/species">Species</Nav.Link>
										<Nav.Link href="/planets">Planets</Nav.Link>
										<Nav.Link href="/glossary">Glossary</Nav.Link>
										<Nav.Link href="/duel">Duel</Nav.Link>
										<Nav.Link href="/train">Training</Nav.Link>
										{/* <Nav.Link href="/faq">FAQ</Nav.Link> */}
										{/* <Nav.Link href="/login">Login</Nav.Link> */}
										{/* <Nav.Link href="/designer">Designer</Nav.Link> */}
										{/* <NavDropdown title="Dropdown" id="collasible-nav-dropdown">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
                        </NavDropdown> */}
									</Nav>
									<Nav>
										{/* <Nav.Link className="xalian-generator-button" href="/engine">Try the Xalian Generator</Nav.Link> */}
										<Nav.Link className="me-auto xalian-generator-navbar-button" href="/generator">
											{this.state.loggedInUser ? 'Generate a Xalian' : 'Try the Xalian Generator'}
										</Nav.Link>
										{/* <Nav.Link eventKey={2} href="#memes">
                            Dank memes
                        </Nav.Link> */}
									</Nav>
									<Nav>
										<AuthButtonGroup authAlertCallback={this.handleUserAuthAction}></AuthButtonGroup>
									</Nav>
								</Navbar.Collapse>
							</Container>
						</Navbar>
					{/* </Tween> */}
				{/* </ScrollTrigger> */}
				<FadeAlert />
			</React.Fragment>
		);
	}
}

export default XalianNavbar;
