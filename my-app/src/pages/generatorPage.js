import React from 'react';
import Modal from 'react-bootstrap/Modal';
import XalianMoveSet from '../components/xalianMoveSet';
import XalianRecord from '../components/xalianRecord';
import XalianNavbar from '../components/navbar';
import XalianStatChart from '../components/xalianStatChart';
import * as xalianApi from '../utils/xalianApi';
import * as dbApi from '../utils/dbApi';
import * as alertUtil from '../utils/alertUtil';

// Terminal: field, with readout as its print mode. Salvaged ECHELON survey
// hardware pointed at a Generator: the CRT hands over to the machine's own
// voice while a creature prints, then cuts back to the record in color.
class GeneratorPage extends React.Component {
	state = {
		xalian: null,
		isLoading: true,
		isGenerating: false,
		loggedInUser: null,
		jsonModalShow: false,
	};

	componentDidMount() {
		this.getXalian();
	}

	setLoggedInUser = (user) => {
		this.setState({ loggedInUser: user });
	};

	render() {
		let x = this.state.xalian;
		let element = x ? x.elements.primaryType.toLowerCase() : null;
		let printing = this.state.isGenerating;

		return (
			<React.Fragment>
				<XalianNavbar authAlertCallback={this.setLoggedInUser}></XalianNavbar>

				<main className="g-console" data-terminal="field">
					<div className="g-shell field-shell">
						<header className="g-masthead">
							<div className="g-masthead-heading">
								<p className="g-kicker">Field terminal</p>
								<h1 className="g-title">Generator</h1>
							</div>
							<div className="g-masthead-aside">
								<span className="g-nameplate">PSU-7 &middot; Echelon Bioworks</span>
							</div>
						</header>

						<section className="g-case g-object field-case">
							<div className="g-case-hinge" />
							<span className="g-case-screw g-case-screw--tl" />
							<span className="g-case-screw g-case-screw--tr" />
							<span className="g-case-screw g-case-screw--bl" />
							<span className="g-case-screw g-case-screw--br" />

							<span className="g-tape field-tape">reconditioned &middot; do not return to depot</span>

							<div className="g-vfd field-vfd" role="status" aria-live="polite">
								<span>PSU-7&nbsp;&nbsp;BATT 61%</span>
								<span>{printing ? 'LINK RELAY/ZOLTON-3 HELD' : x ? 'GENOME CHIP READ' : 'LINK RELAY/ZOLTON-3 HELD'}</span>
							</div>

							<div className={`g-crt field-crt${element && !printing ? ` g-el-${element}` : ''}${printing ? ' g-readout-mode' : ''}`}>
								{printing ? (
									<div className="g-screen field-readout" id="generator-readout">
										<p className="g-screen-line">TOKEN ACCEPTED &middot; GENOME DECRYPTED</p>
										<p className="g-screen-line g-screen-line--dim">ENVIRONMENT: DECRYPTING</p>
										<p className="g-screen-line">
											PRINTING<span className="g-cursor" aria-hidden="true" />
										</p>
									</div>
								) : x ? (
									<div id="generated-xalian-fragment">
										<XalianRecord kicker="Generator Output" xalian={x}>
											<section className="field-readout-section">
												<p className="g-legend">Stat Allocation</p>
												<XalianStatChart
													includeLabel
													labelFontSize={'10pt'}
													barSize={26}
													stats={x.stats}
													moreClasses="field-stat-chart" />
											</section>

											<section className="field-readout-section">
												<p className="g-legend">Move Set</p>
												<XalianMoveSet showDescription moves={x.moves} />
											</section>
										</XalianRecord>
									</div>
								) : (
									<div className="g-screen field-readout">
										<p className="g-screen-line g-screen-line--dim">AWAITING GENOME CHIP</p>
									</div>
								)}
							</div>

							<div className="g-keybank">
								<span className="g-lamp field-keybank-legend">Generator link</span>
								<span className="field-keybank-btns">
									<button
										type="button"
										className="g-key g-key--primary"
										disabled={printing}
										onClick={this.getXalian}>
										Generate
									</button>
									<button
										type="button"
										className="g-key"
										disabled={!this.state.loggedInUser || !x || printing}
										onClick={this.saveXalian}>
										{this.state.loggedInUser ? 'Save to Your Faction' : 'Sign In to Keep'}
									</button>
									<button
										type="button"
										className="g-key field-json-key"
										disabled={!x || printing}
										title="View raw record"
										aria-label="View raw record"
										onClick={() => this.setState({ jsonModalShow: true })}>
										JSON
									</button>
								</span>
							</div>

							<div className="g-asset-plate">
								<span>Property of Echelon Bioworks</span>
								<span>Asset 0419-PSU</span>
							</div>
						</section>
					</div>
				</main>

				{x &&
					<Modal
						show={this.state.jsonModalShow}
						onHide={() => this.setState({ jsonModalShow: false })}
						size="lg"
						centered
						className="themed-modal dark-themed-modal">
						<Modal.Header closeButton closeVariant="white">
							<Modal.Title>{x.species.name} Record Data</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<pre className="g-screen field-json">{JSON.stringify(x, null, 2)}</pre>
						</Modal.Body>
					</Modal>
				}
			</React.Fragment>
		);
	}

	getXalian = () => {
		// The CRT hands over to the readout mode the instant the request goes
		// out and hands back the instant it lands: a cut, not a fade (Rule C,
		// "motion is mechanical").
		this.setState({ isGenerating: true }, () => {
			xalianApi.callGenerateXalian().then((x) => {
				console.log(JSON.stringify(x, null, 2));
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
			.then((x) => {
				this.setState({ isLoading: false });
				console.log(JSON.stringify(x, null, 2));
				alertUtil.sendAlert('Xalian Saved!', null, 'success');
			})
			.catch((error) => {
				this.setState({ isLoading: false });
				console.log(JSON.stringify(error, null, 2));
				alertUtil.sendAlert('Could not save your Xalian — please try again', null, 'danger');
			});
	};
}
export default GeneratorPage;
