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


		Hub.listen('navbar-channel', (data) => {
			if (navbar) {
				if (data.payload.event === 'show-navbar') {
					navbar.classList.remove('hidden');
					navbar.classList.add('visible');
				} else if (data.payload.event === 'hide-navbar') {
					navbar.classList.remove('visible');
					navbar.classList.add('hidden');
				} 
			}
		})

		// var animationTimeline = gsap.timeline({ repeat: 0});
		// animationTimeline.fromTo("#navvy", {opacity: 0}, {opacity: 1, duration: 2, ease:'sine.in'});

		// this.flipShowAuth = this.flipShowAuth.bind(this);
		// var navbar = document.getElementById('navvy');
		document.addEventListener('DOMContentLoaded', function () {
			if (navbar) {
				var last_scroll_top = 0;
				window.addEventListener('scroll', function () {
					let scroll_top = window.scrollY;
					if (scroll_top > 30) {
						// navbar.classList.remove('no-height');
						if (scroll_top < last_scroll_top) {
							// gsap.fromTo("#navvy", {opacity: 0, duration: 0.25}, {opacity: 1, duration: 0.25});
							navbar.classList.remove('hidden');
							navbar.classList.add('visible');
						} else {
							// gsap.fromTo("#navvy", {opacity: 1, height: '35px', duration: 2, ease:'sine.in'}, {opacity: 0, height: '0px', duration: 2, ease:'sine.out'});
							// gsap.fromTo("#navvy", {opacity: 1, duration: 0.25}, {opacity: 0, duration: 0.25});
							navbar.classList.remove('visible');
							navbar.classList.add('hidden');
						}
					}

					last_scroll_top = scroll_top;
				});
			}
		});

		Auth.currentUserInfo().then((data) => {
			if (data && data.attributes) {
				this.handleUserAuthAction(authUtil.buildAuthState(data));
			}
		});
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
						<Navbar id="navvy" collapseOnSelect expand="lg" variant="dark" sticky="top" className="xalian-navbar">
							<Container>
								<Navbar.Brand href="/">
									<img src="/assets/img/logo/xalians_logo_small.png" height="30px" />
								</Navbar.Brand>
								<Navbar.Toggle aria-controls="responsive-navbar-nav" />
								<Navbar.Collapse id="responsive-navbar-nav">
									<Nav className="me-auto nav-text-shadow">
										<Nav.Link href="/">Home</Nav.Link>
										{/* <Nav.Link href="/community">Xalian Community</Nav.Link> */}
										{/* <Nav.Link href="/project">Learn More</Nav.Link> */}
										<Nav.Link href="/species">Species</Nav.Link>
										<Nav.Link href="/planets">Planets</Nav.Link>
										<Nav.Link href="/glossary">Glossary</Nav.Link>
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
