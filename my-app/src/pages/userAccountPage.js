import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import SignUpModal from '../components/auth/signUpModal';
import VerifyRemoveXalianModal from '../components/verifyRemoveXalianModal';
import SignInModal from '../components/auth/signInModal';
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
				this.setState({ loggedInUser: u, isLoading: false });
				this.updateXaliansState(u.username);
			}
		});
	}

	updateXaliansState = (username) => {
		dbApi
			.callGetUser(username || this.state.user.username, true)
			.then((user) => {
				this.setState({
					user: user,
					xalians: user.xalians,
				});
			})
			.catch((e) => {
				this.setState({ message: `ERROR : ${JSON.stringify(e, null, 2)}` });
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
		return rows;
	};

	verifyRemoveXalianCallback = () => {
		this.setState({ verifyRemoveXalianModalShow: false, xalianToDelete: false });
		this.updateXaliansState();
	};

	closeModalCallback = () => {
		this.setState({ verifyRemoveXalianModalShow: false, xalianToDelete: false });
	};

	render() {
		return (
			<React.Fragment>
				<Container fluid className="content-background-container">
					<XalianNavbar></XalianNavbar>

					<Container className="content-container">
						<Row className='account-page-xalians-title vertically-center-contents'>
							<h1>Your Xalian Faction</h1>
						</Row>
						<Row className="">{this.buildXaliansView()}</Row>
					</Container>

					{this.state.xalianToDelete && <VerifyRemoveXalianModal show={this.state.verifyRemoveXalianModalShow} onHide={() => this.closeModalCallback()} onXalianDelete={() => this.verifyRemoveXalianCallback()} xalian={this.state.xalianToDelete.attributes} username={this.state.loggedInUser.username}></VerifyRemoveXalianModal>}
				</Container>
				{this.state.isLoading && <div id="preloader"></div>}
			</React.Fragment>
		);
	}
}

export default UserAccountPage;
