// Tier: chrome. Someone else's Xalians, read the same way as your own on
// userAccountPage.js — the same tile grid, no delete control.
import React from 'react';
import { Link } from 'react-router-dom';
import XalianNavbar from '../components/navbar';
import XalianImage from '../components/xalianImage';
import HelixSpinner from '../components/brand/helixSpinner';
import { routeFor } from '../lore/routeFor';
import * as dbApi from '../utils/dbApi';

class UserDetailsPage extends React.Component {
	state = {
		user: null,
		message: null,
		xalians: [],
		isLoading: false,
	};

	componentDidMount() {
		this.setState({ isLoading: true });
		dbApi
			.callGetUser(this.props.id, true)
			.then((u) => {
				this.setState({ isLoading: false, user: u, xalians: u.xalians });
			})
			.catch((e) => {
				this.setState({ message: "Could not load this user's Xalians — please try again later", isLoading: false });
			});
	}

	renderXalianTile = (xalian) => {
		let x = xalian.attributes;
		let primaryType = x.elements.primaryType.toLowerCase();
		let secondaryType = x.elements.secondaryType.toLowerCase();
		return (
			<Link
				key={xalian.xalianId}
				to={routeFor('species', x.species.name.toLowerCase())}
				className={`g-card-link account-tile-link account-tile-link--standalone g-el-${primaryType}`}>
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
		);
	};

	render() {
		let xalians = this.state.xalians || [];
		let title = (this.state.user && (this.state.user.username || this.state.user.userId)) || 'Xalian account';
		return (
			<main className="g-page" data-tier="chrome">
				<XalianNavbar></XalianNavbar>

				<div className="g-shell page-shell account-shell">
					<header className="g-masthead">
						<div className="g-masthead-heading">
							<p className="g-kicker">Account</p>
							<h1 className="g-title-v4">{title}</h1>
						</div>
					</header>

					{this.state.isLoading && (
						<div className="account-loading">
							<HelixSpinner />
						</div>
					)}

					{!this.state.isLoading && this.state.message && (
						<div className="g-empty account-empty">
							<b>{this.state.message}</b>
						</div>
					)}

					{!this.state.isLoading && !this.state.message && xalians.length === 0 && (
						<div className="g-empty account-empty">
							<b>No Xalians yet</b>
							This account has not kept any Xalians.
						</div>
					)}

					{!this.state.isLoading && xalians.length > 0 && (
						<div className="account-grid">{xalians.map((x) => this.renderXalianTile(x))}</div>
					)}
				</div>
			</main>
		);
	}
}

export default UserDetailsPage;
