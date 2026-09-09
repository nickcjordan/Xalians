// Tier: chrome. The signed-in user's own Xalians: a grid of tiles linking
// out to each species' record, with a delete control on each (this is the
// user's own faction, so removal lives here — userDetailsPage.js reads
// someone else's holdings and carries no delete control).
import React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import VerifyRemoveXalianModal from '../components/verifyRemoveXalianModal';
import SignInModal from '../components/auth/signInModal';
import SignUpModal from '../components/auth/signUpModal';
import VerifyEmailModal from '../components/auth/verifyEmailModal';
import XalianImage from '../components/xalianImage';
import HelixSpinner from '../components/brand/helixSpinner';
import { routeFor } from '../lore/routeFor';
import * as authUtil from '../utils/authUtil';
import * as dbApi from '../utils/dbApi';
import { Auth, Hub } from 'aws-amplify';

class UserAccountPage extends React.Component {
	state = {
		verifyRemoveXalianModalShow: null,
		loggedInUser: null,
		xalianToDelete: null,
		isLoading: false,
		signInModalShow: false,
		signupModalShow: false,
		verifyEmailModalShow: false,
	};

	componentDidMount() {
		this.refreshUser();
		this.authListener = (data) => {
			if (data.payload.event === 'signIn') {
				this.setState({ signInModalShow: false });
				this.refreshUser();
			}
			if (data.payload.event === 'signIn_failure' && data.payload.data.code === 'UserNotConfirmedException') {
				this.setState({ signInModalShow: false, verifyEmailModalShow: true });
			}
		};
		Hub.listen('auth', this.authListener);
	}

	componentWillUnmount() {
		if (this.authListener) {
			Hub.remove('auth', this.authListener);
		}
	}

	refreshUser = () => {
		this.setState({ isLoading: true });
		Auth.currentUserInfo()
			.then((data) => {
				if (data) {
					let u = authUtil.buildAuthState(data);
					this.setState({ loggedInUser: u, signedOut: false, message: null });
					this.updateXaliansState(u.username);
				} else {
					this.setState({ isLoading: false, signedOut: true });
				}
			})
			.catch(() => {
				this.setState({ isLoading: false, signedOut: true });
			});
	};

	signUpCallback = (username, email, password) => {
		this.setState({ username, email, password, verifyEmailModalShow: true });
	};

	emailVerifiedCallback = () => {
		this.setState({ verifyEmailModalShow: false, signInModalShow: true });
	};

	updateXaliansState = (username) => {
		dbApi
			.callGetUser(username || this.state.loggedInUser.username, true)
			.then((user) => {
				this.setState({
					user: user,
					xalians: user.xalians,
					isLoading: false,
				});
			})
			.catch((e) => {
				this.setState({ isLoading: false, message: 'Could not load your Xalians — please try again later' });
			});
	};

	deleteXalianCallback = (xalian) => {
		this.setState({ xalianToDelete: xalian, verifyRemoveXalianModalShow: true });
	};

	verifyRemoveXalianCallback = () => {
		let deleted = this.state.xalianToDelete;
		let remaining = (this.state.xalians || []).filter((x) => x.xalianId !== deleted.xalianId);
		this.setState({
			xalians: remaining,
			verifyRemoveXalianModalShow: false,
			xalianToDelete: false,
		});
	};

	closeModalCallback = () => {
		this.setState({ verifyRemoveXalianModalShow: false, xalianToDelete: false });
	};

	renderXalianTile = (xalian) => {
		let x = xalian.attributes;
		let primaryType = x.elements.primaryType.toLowerCase();
		let secondaryType = x.elements.secondaryType.toLowerCase();
		return (
			<div key={xalian.xalianId} className={`account-tile g-el-${primaryType}`}>
				<Link to={routeFor('species', x.species.name.toLowerCase())} className="g-card-link account-tile-link">
					<div className="account-tile-plate">
						<XalianImage colored speciesName={x.species.name} primaryType={x.elements.primaryType} secondaryType={x.elements.secondaryType} />
					</div>
					<div className="account-tile-meta">
						<span className="g-legend-v4 account-tile-name">{x.species.name}</span>
						<div className="account-tile-chips">
							<span className={`g-chip g-el-${primaryType}`}>{x.elements.primaryType}</span>
							<span className={`g-chip g-el-${secondaryType}`}>{x.elements.secondaryType}</span>
						</div>
					</div>
				</Link>
				<button
					type="button"
					className="g-btn g-btn--danger g-btn--icon account-tile-delete"
					title="Release this Xalian"
					aria-label={`Release ${x.species.name} from your account`}
					onClick={() => this.deleteXalianCallback(xalian)}>
					<i className="bi bi-trash" aria-hidden="true"></i>
				</button>
			</div>
		);
	};

	render() {
		let xalians = this.state.xalians || [];
		return (
			<React.Fragment>
				<main className="g-page" data-tier="chrome">
					<XalianNavbar></XalianNavbar>

					<div className="g-shell account-shell">
						<header className="g-masthead">
							<div className="g-masthead-heading">
								<p className="g-kicker">Account</p>
								<h1 className="g-title-v4">{(this.state.loggedInUser && this.state.loggedInUser.username) || 'Your account'}</h1>
							</div>
						</header>

						{this.state.isLoading && (
							<div className="account-loading">
								<HelixSpinner />
							</div>
						)}

						{!this.state.isLoading && this.state.signedOut && (
							<div className="g-empty account-empty">
								<b>Sign in to see your Xalians</b>
								<div className="account-empty-actions">
									<button
										type="button"
										className="g-btn g-btn--primary"
										onClick={() => this.setState({ signInModalShow: true })}>
										Sign in
									</button>
									<button
										type="button"
										className="g-link account-empty-create"
										onClick={() => this.setState({ signupModalShow: true })}>
										Create account
									</button>
								</div>
							</div>
						)}

						{!this.state.isLoading && !this.state.signedOut && this.state.message && (
							<div className="g-empty account-empty">
								<b>{this.state.message}</b>
							</div>
						)}

						{!this.state.isLoading && !this.state.signedOut && !this.state.message && xalians.length === 0 && (
							<div className="g-empty account-empty">
								<b>No Xalians yet</b>
								Generate one and keep it to see it here.
								<Link className="g-btn account-empty-cta" to="/generator">Generate a Xalian</Link>
							</div>
						)}

						{!this.state.isLoading && !this.state.signedOut && xalians.length > 0 && (
							<div className="account-grid">{xalians.map((x) => this.renderXalianTile(x))}</div>
						)}
					</div>

					{this.state.xalianToDelete && (
						<VerifyRemoveXalianModal
							show={this.state.verifyRemoveXalianModalShow}
							onHide={() => this.closeModalCallback()}
							onXalianDelete={() => this.verifyRemoveXalianCallback()}
							xalian={this.state.xalianToDelete.attributes}
							username={this.state.loggedInUser.username}></VerifyRemoveXalianModal>
					)}

					<SignInModal
						show={this.state.signInModalShow}
						callback={() => {}}
						onHide={() => this.setState({ signInModalShow: false })}
						mustVerifyEmailCallback={(u) => this.setState({ username: u || this.state.username, verifyEmailModalShow: true })}
						username={this.state.username}
						password={this.state.password}
					/>

					<SignUpModal
						show={this.state.signupModalShow}
						callback={this.signUpCallback}
						onHide={() => this.setState({ signupModalShow: false })}
					/>

					<VerifyEmailModal
						show={this.state.verifyEmailModalShow}
						callback={this.emailVerifiedCallback}
						onHide={() => this.setState({ verifyEmailModalShow: false })}
						username={this.state.username}
						email={this.state.email}
					/>
				</main>
			</React.Fragment>
		);
	}
}

export default UserAccountPage;
