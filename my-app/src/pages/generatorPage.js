import React from 'react';
import Modal from 'react-bootstrap/Modal';
import XalianMoveSet from '../components/xalianMoveSet';
import XalianRecord from '../components/xalianRecord';
import XalianNavbar from '../components/navbar';
import HelixSpinner from '../components/brand/helixSpinner';
import * as xalianApi from '../utils/xalianApi';
import * as dbApi from '../utils/dbApi';
import * as alertUtil from '../utils/alertUtil';
import { stat as statColors } from '../constants/designTokens';
import * as constants from '../constants/constants';

// Tier: chrome. Generation, review and keeping a Xalian is a configure/manage
// screen (docs/DESIGN_SYSTEM.md section 1); the record itself is a featured
// use of glass, not a game in progress.

const STAT_ROWS = [
	['standardAttackPoints', 'Std attack', statColors.standardAttack],
	['specialAttackPoints', 'Spc attack', statColors.specialAttack],
	['standardDefensePoints', 'Std defense', statColors.standardDefense],
	['specialDefensePoints', 'Spc defense', statColors.specialDefense],
	['speedPoints', 'Speed', statColors.speed],
	['evasionPoints', 'Evasion', statColors.evasion],
	['staminaPoints', 'Stamina', statColors.stamina],
	['recoveryPoints', 'Recovery', statColors.recovery],
];

class GeneratorPage extends React.Component {
	state = {
		xalian: null,
		isLoading: true,
		isGenerating: false,
		loggedInUser: null,
		jsonModalShow: false,
	};

	pageRef = React.createRef();

	componentDidMount() {
		this.getXalian();
	}

	setLoggedInUser = (user) => {
		this.setState({ loggedInUser: user });
	};

	renderStatMeter([key, label, color]) {
		let s = this.state.xalian.stats[key];
		let pct = Math.round((s.points / constants.STAT_POINT_MAX) * 100);
		return (
			<div className="g-meter-row" key={key}>
				<span className="g-meter-name">{label}</span>
				<div className="g-meter" style={{ '--g-el': color }}>
					<div className="g-meter-ghost" style={{ width: '100%' }} />
					<div className="g-meter-fill" style={{ width: `${pct}%` }} />
				</div>
				<span className="g-meter-value">{s.points}</span>
			</div>
		);
	}

	render() {
		let x = this.state.xalian;
		let printing = this.state.isGenerating;
		let canKeep = !!this.state.loggedInUser;

		return (
			<React.Fragment>
				<XalianNavbar authAlertCallback={this.setLoggedInUser}></XalianNavbar>

				<main className="g-page" data-tier="chrome" ref={this.pageRef}>
					<div className="g-shell gen-shell">
						<header className="g-masthead">
							<div className="g-masthead-heading">
								<p className="g-kicker">Generator</p>
								<h1 className="g-title">{x ? x.species.name : 'Generator'}</h1>
							</div>
							<div className="g-masthead-aside">
								{x &&
									<button
										type="button"
										className="g-btn g-btn--quiet"
										disabled={printing}
										onClick={() => this.setState({ jsonModalShow: true })}>
										View record data
									</button>
								}
								<button
									type="button"
									className="g-btn"
									disabled={!canKeep || !x || printing || this.state.isLoading}
									onClick={this.saveXalian}>
									{canKeep ? 'Keep' : 'Sign in to keep'}
								</button>
								<button
									type="button"
									className="g-btn g-btn--primary"
									disabled={printing}
									onClick={this.getXalian}>
									{x ? 'Generate another' : 'Generate a Xalian'}
								</button>
							</div>
						</header>

						{printing ? (
							<div className="g-glass gen-record gen-record--loading">
								<HelixSpinner size="lg" />
								<span className="g-legend">Generating</span>
							</div>
						) : x ? (
							<div className="g-glass">
								<XalianRecord xalian={x} />
							</div>
						) : (
							<div className="g-empty">
								<b>No Xalian yet</b>
								Generate one to see its record here.
							</div>
						)}

						{x && !printing &&
							<div className="gen-readouts">
								<div className="g-panel gen-stats">
									<div className="g-panel-head">
										<span className="g-legend">Stats</span>
										<span className="g-legend gen-panel-note">current / potential</span>
									</div>
									{STAT_ROWS.map((row) => this.renderStatMeter(row))}
								</div>

								<div className="g-panel gen-moves">
									<div className="g-panel-head">
										<span className="g-legend">Moves</span>
										<span className="g-legend gen-panel-note">rating</span>
									</div>
									<XalianMoveSet showDescription moves={x.moves} />
								</div>
							</div>
						}
					</div>
				</main>

				{x &&
					<Modal
						show={this.state.jsonModalShow}
						onHide={() => this.setState({ jsonModalShow: false })}
						size="lg"
						centered
						container={this.pageRef.current}
						className="themed-modal dark-themed-modal">
						<Modal.Header closeButton closeVariant="white">
							<Modal.Title>{x.species.name} Record Data</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<pre className="gen-json">{JSON.stringify(x, null, 2)}</pre>
						</Modal.Body>
					</Modal>
				}
			</React.Fragment>
		);
	}

	getXalian = () => {
		this.setState({ isGenerating: true }, () => {
			xalianApi.callGenerateXalian().then((x) => {
				this.setState({
					xalian: x,
					isLoading: false,
					isGenerating: false,
				});
			}).catch(() => {
				this.setState({ isGenerating: false });
				alertUtil.sendAlert('Could not generate a Xalian — please try again', null, 'danger');
			});
		});
	};

	saveXalian = () => {
		this.setState({
			isLoading: true,
		});
		// create the xalian record first so the user record never references a xalian that doesn't exist
		dbApi
			.callCreateXalian(this.state.xalian)
			.then(() => dbApi.callUpdateUserAddXalian(this.state.loggedInUser.username, this.state.xalian.xalianId))
			.then(() => {
				this.setState({ isLoading: false });
				alertUtil.sendAlert(`${this.state.xalian.species.name} kept.`, null, 'success');
			})
			.catch(() => {
				this.setState({ isLoading: false });
				alertUtil.sendAlert('Could not keep your Xalian — please try again', null, 'danger');
			});
	};
}
export default GeneratorPage;
