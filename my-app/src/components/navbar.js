// Terminal: relay. The navbar is the relay's own control strip: it carries
// the unit's status (signal bars, the entangled lamp) on every page, so it
// sets data-terminal="relay" on itself rather than inheriting the page's.
import React from 'react';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import AuthButtonGroup from './auth/authButtonGroup';
import { Hub } from 'aws-amplify';
import FadeAlert from './fadeAlert';
import * as authUtil from '../utils/authUtil';
import { Auth } from 'aws-amplify';

const RELAY_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/encyclopedia', label: 'Encyclopedia' },
	{ href: '/duel', label: 'Duel' },
	{ href: '/reclamation', label: 'Reclamation' },
	{ href: '/long-return', label: 'Expedition' },
	{ href: '/train', label: 'Training' },
];

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

		if (navbar) {
			var last_scroll_top = window.scrollY;
			var mountedAt = Date.now();
			this.scrollListener = function () {
				let scroll_top = window.scrollY;
				// Some pages animate their own scroll position on mount (the
				// encyclopedia's hash-anchored sections do this with a smooth
				// scrollIntoView, several small events over ~1s). That is not the
				// user scrolling, so hide-on-scroll is suppressed for a moment
				// after mount rather than reading the page's own jump as one.
				let settling = Date.now() - mountedAt < 1500;
				if (scroll_top > 30 && !settling) {
					if (scroll_top < last_scroll_top) {
						navbar.classList.remove('hidden');
						navbar.classList.add('visible');
					} else {
						navbar.classList.remove('visible');
						navbar.classList.add('hidden');
					}
				} else {
					// at the top of the page, or still settling in, the navbar
					// should always be visible
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

	isActiveRoute = (href) => {
		if (typeof window === 'undefined') {
			return false;
		}
		let path = window.location.pathname;
		if (href === '/') {
			return path === '/';
		}
		return path === href || path.startsWith(href + '/');
	};

	render() {
		return (
			<React.Fragment>
				<div data-terminal="relay">
					<Navbar id="navvy" collapseOnSelect expand="xl" variant="dark" sticky="top" className="g-cover-plate relay-navbar">
						<Container fluid className="relay-navbar-shell">
							<Navbar.Brand href="/" className="relay-wordmark">
								<img src="/assets/img/logo/xalians_logo_small.png" height="30px" alt="Xalians" />
								<span className="g-nameplate relay-wordmark-text">QED Relay &middot; Zolton-3</span>
							</Navbar.Brand>

							<div className="relay-status">
								<span className="relay-signal" aria-hidden="true">
									<i className="relay-signal-bar" style={{ '--h': '5px' }}></i>
									<i className="relay-signal-bar" style={{ '--h': '8px' }}></i>
									<i className="relay-signal-bar" style={{ '--h': '11px' }}></i>
									<i className="relay-signal-bar relay-signal-bar--off" style={{ '--h': '14px' }}></i>
								</span>
								<span className="g-lamp relay-entangled-lamp">Entangled</span>
							</div>

							<Navbar.Toggle aria-controls="responsive-navbar-nav" className="g-key relay-toggle" />
							<Navbar.Collapse id="responsive-navbar-nav">
								<Nav className="relay-links">
									{RELAY_LINKS.map((link) => (
										<Nav.Link
											key={link.href}
											href={link.href}
											className={`g-legend relay-link${this.isActiveRoute(link.href) ? ' relay-link--active' : ''}`}>
											{link.label}
										</Nav.Link>
									))}
								</Nav>
								<Nav className="relay-actions">
									{/* The navbar carries the relay's plain key everywhere; the page
									    underneath owns the single --primary accent (docs/DESIGN_SYSTEM.md
									    rule A, "one primary action per screen", round1-findings.md S9). */}
									<Nav.Link className="g-key relay-key" href="/generator">
										Generator
									</Nav.Link>
								</Nav>
								<div className="relay-auth">
									<AuthButtonGroup authAlertCallback={this.handleUserAuthAction}></AuthButtonGroup>
								</div>
							</Navbar.Collapse>
						</Container>
					</Navbar>
				</div>
				<FadeAlert />
			</React.Fragment>
		);
	}
}

export default XalianNavbar;
