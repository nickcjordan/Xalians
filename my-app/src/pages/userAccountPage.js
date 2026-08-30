import React from 'react';
import XalianNavbar from '../components/navbar';
import VerifyRemoveXalianModal from '../components/verifyRemoveXalianModal';
import * as authUtil from '../utils/authUtil';
import * as alertUtil from '../utils/alertUtil';
import * as dbApi from '../utils/dbApi';
import { store } from 'state-pool';
import { Auth } from 'aws-amplify';
import { Hub, Logger } from 'aws-amplify';
import XalianStatRowView from '../components/views/xalianStatRowView';

class UserAccountPage extends React.Component {
	state = {
		verifyRemoveXalianModalShow: null,
		loggedInUser: null,
		xalianToDelete: null,
		isLoading: false
	};

	// constructor(props) {
	// 	super(props);
	// }

	componentDidMount() {
		this.setState({isLoading: true});
		Auth.currentUserInfo().then((data) => {
			if (data) {
				let u = authUtil.buildAuthState(data);
				this.setState({ loggedInUser: u });
				this.updateXaliansState(u.username);
			} else {
				this.setState({ isLoading: false, message: 'Sign in to see your Xalian Faction' });
			}
		}).catch(() => {
			this.setState({ isLoading: false, message: 'Sign in to see your Xalian Faction' });
		});
	}

	updateXaliansState = (username) => {
		dbApi
			.callGetUser(username || this.state.loggedInUser.username, true)
			.then((user) => {
				this.setState({
					user: user,
					xalians: user.xalians,
				}, () => {
					this.buildXaliansView();
				});
			})
			.catch((e) => {
				this.setState({ isLoading: false, message: 'Could not load your Xalians — please try again later' });
			});
	};

	setAuthState = (data) => {
		this.setState({ loggedInUser: authUtil.buildAuthState(data) });
	};

	deleteXalianCallback = (xalian) => {
		this.setState({ xalianToDelete: xalian, verifyRemoveXalianModalShow: true });
	};

	buildXaliansView = () => {
		var rows = [];
		if (this.state.xalians) {
			this.state.xalians.forEach((xalian) => {
				rows.push(<XalianStatRowView accountPage accountPageCallback={this.deleteXalianCallback} xalian={xalian} />);
			});
		}
		this.setState({ xalianRows: rows, isLoading: false });
		// return rows;
	};

	verifyRemoveXalianCallback = () => {
		let deleted = this.state.xalianToDelete;
		let remaining = (this.state.xalians || []).filter((x) => x.xalianId != deleted.xalianId);
		this.setState({
			xalians: remaining,
			xalianRows: this.state.xalianRows.filter((row) => row.props.xalian.xalianId != deleted.xalianId),
			verifyRemoveXalianModalShow: false,
			xalianToDelete: false,
		});
	};

	closeModalCallback = () => {
		this.setState({ verifyRemoveXalianModalShow: false, xalianToDelete: false });
	};

	render() {
		return (
			<React.Fragment>
				<div className="g-console">
					<XalianNavbar></XalianNavbar>

					<div className="g-shell page-shell account-shell">
						<header className="page-header">
							<p className="g-kicker">Registry Holdings</p>
							<h1 className="g-title">Your Xalian Faction</h1>
						</header>

						{/* signed out, or an empty faction: say so on a panel with the way
						    forward on it, rather than one line of green text on a starfield */}
						{this.state.message &&
							<div className="g-panel account-notice">
								<p className="g-empty account-notice-text">{this.state.message}</p>
								<a className="g-btn g-btn--primary" href="/generator">Generate a Xalian</a>
							</div>
						}

						{this.state.xalianRows && this.state.xalianRows.length > 0 &&
							<div className="species-stat-rows">{this.state.xalianRows}</div>
						}
					</div>

					{this.state.xalianToDelete && <VerifyRemoveXalianModal show={this.state.verifyRemoveXalianModalShow} onHide={() => this.closeModalCallback()} onXalianDelete={() => this.verifyRemoveXalianCallback()} xalian={this.state.xalianToDelete.attributes} username={this.state.loggedInUser.username}></VerifyRemoveXalianModal>}
				</div>
				{this.state.isLoading && <div id="preloader"></div>}
			</React.Fragment>
		);
	}
}

export default UserAccountPage;
