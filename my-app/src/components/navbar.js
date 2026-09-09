// Tier: chrome. The navbar is on every page, including unmigrated v3 ones,
// so it keeps its own data-tier="chrome" and uses only v4 primitives.
import React from 'react';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import AuthButtonGroup from './auth/authButtonGroup';
import BrandLockup from './brand/brandLockup';
import { Hub } from 'aws-amplify';
import FadeAlert from './fadeAlert';
import * as authUtil from '../utils/authUtil';
import { Auth } from 'aws-amplify';

const NAV_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/encyclopedia', label: 'Encyclopedia' },
	{ href: '/generator', label: 'Generator' },
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
				<div data-tier="chrome">
					<Navbar id="navvy" collapseOnSelect expand="xl" variant="dark" sticky="top" className="shell-nav">
						<Container fluid className="shell-nav-shell">
							<BrandLockup className="shell-nav-brand" />

							<Navbar.Toggle aria-controls="responsive-navbar-nav" className="shell-nav-toggle" />
							<Navbar.Collapse id="responsive-navbar-nav">
								<Nav className="shell-nav-links">
									{NAV_LINKS.map((link) => (
										<Nav.Link
											key={link.href}
											href={link.href}
											className={`shell-nav-link${this.isActiveRoute(link.href) ? ' on' : ''}`}>
											{link.label}
										</Nav.Link>
									))}
								</Nav>
								<div className="shell-nav-right">
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
