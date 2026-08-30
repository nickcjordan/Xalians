import React from 'react';
import XalianMoveSet from '../components/xalianMoveSet';
import XalianRecord from '../components/xalianRecord';
import XalianNavbar from '../components/navbar';
import XalianStatChart from '../components/xalianStatChart';
import * as xalianApi from '../utils/xalianApi';
import * as dbApi from '../utils/dbApi';
import * as alertUtil from '../utils/alertUtil';
import SmokeEffectBackground from '../components/views/smokeEffectBackground';
import gsap from 'gsap';

class GeneratorPage extends React.Component {
	state = {
		xalian: null,
		isLoading: true,
		loggedInUser: null,
		jsonModalShow: false,
	};

	constructor(props) {
		super(props);
	}

	componentDidMount() {
		this.getXalian();
	}

	setLoggedInUser = (user) => {
		this.setState({ loggedInUser: user });
	};

	render() {
		return (
			<React.Fragment>
				<XalianNavbar authAlertCallback={this.setLoggedInUser}></XalianNavbar>
				<SmokeEffectBackground id="smokeBackgroundCanvasBelow" particleCount={10} />
				<SmokeEffectBackground id="smokeBackgroundCanvas" />
				<div className="generator-page-gradient-overlay" />

				{/* The smoke effect covers the whole viewport while the Lambda is
				    answering, which on a cold start is several seconds of opaque grey
				    with nothing to say the site is still working. */}
				{this.state.isGenerating &&
					<div className="generator-loading-overlay" role="status" aria-live="polite">
						<div className="generator-loading-text">Generating Xalian...</div>
						<div className="generator-loading-sub">Running the Xalian Generator</div>
					</div>
				}
				<div className="g-shell generator-shell">
					{/* the two keys that drive the machine, on their own rail above the
					    record they produce */}
					<div className="generator-controls">
						<button type="button" className="g-btn g-btn--primary" onClick={this.getXalian}>
							Generate New Xalian
						</button>
						<button
							type="button"
							className="g-btn"
							disabled={!this.state.loggedInUser}
							onClick={this.saveXalian}>
							{this.state.loggedInUser ? 'Save to Your Faction' : 'Sign In to Keep'}
						</button>
					</div>

					{this.state.xalian && (
						<div id="generated-xalian-fragment">
							<XalianRecord
								kicker="Generator Output"
								xalian={this.state.xalian}
								json={JSON.stringify(this.state.xalian, null, 2)}>

								<section className="specimen-readout">
									<p className="g-kicker">Stat Allocation</p>
									<XalianStatChart
										includeLabel
										labelFontSize={'10pt'}
										barSize={26}
										stats={this.state.xalian.stats}
										moreClasses="specimen-chart" />
								</section>

								<section className="specimen-readout">
									<p className="g-kicker">Move Set</p>
									<XalianMoveSet showDescription moves={this.state.xalian.moves} />
								</section>
							</XalianRecord>
						</div>
					)}
				</div>

				{/* {this.state.isLoading && <div id="preloader"></div>} */}
			</React.Fragment>
		);
	}

	getXalian = () => {
		this.setState({ isGenerating: true });
		// this.setState({ showXalian: false }, () => {
			// gsap.to('#generated-xalian-div', { opacity: 0, duration: 1, ease: 'power2.in' });
			gsap.timeline()
                .to('#generated-xalian-fragment', { opacity: 0, duration: 1, ease: 'power2.in' })
				.to('#smokeBackgroundCanvas', { opacity: 1, duration: 1, ease: 'power2.out' }, '<')
				.then(() => {
					xalianApi.callGenerateXalian().then((x) => {
						console.log(JSON.stringify(x, null, 2));
						this.setState(
							{
								xalian: x,
								isLoading: false,
								isGenerating: false,
							},
							() => {
								// this.setState({ showXalian: true }, () => {
									gsap.to('#smokeBackgroundCanvas', { opacity: 0, duration: 1, ease: 'power2.in' });
									gsap.to('#generated-xalian-fragment', { opacity: 1, duration: 0.5, ease: 'power2.out' }, '<');
								// });
							}
						);
					}).catch(() => {
						this.setState({ isGenerating: false });
						alertUtil.sendAlert('Could not generate a Xalian — please try again', null, 'danger');
						gsap.to('#smokeBackgroundCanvas', { opacity: 0, duration: 1, ease: 'power2.in' });
						gsap.to('#generated-xalian-fragment', { opacity: 1, duration: 0.5, ease: 'power2.out' }, '<');
					});
				});
		// });
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

	test = () => {
		// dbApi.callGetXalian(this.state.xalian.xalianId).then(x => {
		//     alert('WOOO!\n\n' + JSON.stringify(x, null, 2));
		// }).catch(error => {
		//     alert('AHHH!!!!\n\n' + JSON.stringify(error, null, 2));
		// });

		// let loggedInUser = this.state.loggedInUser;
		// dbApi.callGetUser(loggedInUser.userId).then(x => {
		//     alert('WOOO!\n\n' + JSON.stringify(x, null, 2));
		// }).catch(error => {
		//     alert('AHHH!!!!\n\n' + JSON.stringify(error, null, 2));
		// });

		if (this.state.loggedInUser.username) {
			alertUtil.sendAlert('Logged in as ' + this.state.loggedInUser.username, 'You have successfully logged in', 'success');
		} else {
			alertUtil.sendAlert('No user logged in', null, 'error');
		}
	};
}
export default GeneratorPage;
