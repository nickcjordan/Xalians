import React from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import SignUpModal from './signUpModal';
import VerifyEmailModal from './verifyEmailModal';
import SignInModal from './signInModal';
import * as authUtil from '../../utils/authUtil';
import * as dbApi from '../../utils/dbApi';
import { store } from 'state-pool';
import { Auth } from 'aws-amplify';
import { Hub, Logger } from 'aws-amplify';
import Button from 'react-bootstrap/Button';


class AuthButtonGroup extends React.Component {

    state = {
        signupModalShow: false,
        verifyEmailModalShow: false,
        signInModalShow: false,
        emailToVerify: null,
        loggedInUser: null
    };

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        Auth.currentUserInfo().then(data => {
            if (data && data.attributes) {
                this.setState({ loggedInUser: authUtil.buildAuthState(data) });
            }
        });

        Hub.listen('auth', (data) => {
            if (data.payload.event === 'signIn_failure') {
                if (data.payload.data.code === 'UserNotConfirmedException') {
                    this.setState({ verifyEmailModalShow: true })
                }
            }
            this.handleAuthEvent(data.payload.event, data.payload.data);
        })
    }

    handleAuthEvent = (name, data) => {
        console.log(name + ' :: inbound event data:\n' + JSON.stringify(data, null, 2));

        switch (name) {
            case 'signIn':
                console.log('LISTENER :: user signed in');
                this.handleSignInEvent(data);
                break;
            case 'signUp':
                console.log('LISTENER :: user signed up');
                break;
            case 'signOut':
                console.log('LISTENER :: user signed out');
                this.handleSignOutEvent();
                break;
            case 'signIn_failure':
                console.log('LISTENER :: user sign in failed :: code=' + data.code);
                if (data.code === 'UserNotConfirmedException') {
                    this.setState({ verifyEmailModalShow: true })
                }
                break;
            case 'tokenRefresh':
                console.log('LISTENER :: token refresh succeeded');
                break;
            case 'tokenRefresh_failure':
                console.log('LISTENER :: token refresh failed :: code=' + data.code);
                break;
            case 'configured':
                console.log('LISTENER :: the Auth module is configured');
        }
    }

    handleSignOutEvent = () => {
        this.setState({ loggedInUser: null });
        this.props.authAlertCallback(null);
    }

    handleSignInEvent = (data) => {
        let authState = authUtil.buildAuthState(data);
        this.setState({ loggedInUser: authState });
        this.props.authAlertCallback(authState);
    }

    signUpCallback = (username, email, password) => {
        // console.log(JSON.stringify(info, null, 2));
        // store.setState('authenticatedUser', info);
        this.setState({
            username: username,
            email: email,
            password: password
        }, () => {
            this.setState({
                verifyEmailModalShow: true
            })
        })
    }

    signInCallback = () => {
        // Auth.currentUserInfo().then(user => {
        // store.setState('user', user);
        // });
        // store.setState('authenticatedUser', info);
    }

    emailVerifiedCallback = () => {
        authUtil.signIn(
            this.state.username,
            this.state.password
        ).then(() => {
            this.setState({ isThinking: false });
            dbApi.callCreateUser({
                userId: this.state.username,
                attributes: {}
            });
        }).catch(e => {
            this.setState({ signInModalShow: true });
        });
    }

    handleSignOut = () => {
        store.clear();
        authUtil.signOut().then(() => {
            // var x = globalState.getValue();
            // x.authenticatedUser = {};
            // globalState.updateValue(val => x);
        });

    }

    render() {
        let list = [];
        for (const key in this.props.stats) {
            let val = this.props.stats[key];
            list.push(this.buildMoveRow(val));
        }
        return (
            <React.Fragment>
                {this.state.loggedInUser &&
                    <React.Fragment>
                        <h5 className="navbar-user-name-wrapper vertically-center-contents centered-view">
                            <a href={'/user/' + this.state.loggedInUser.username}>{this.state.loggedInUser.username}</a>
                        </h5>
                    </React.Fragment>
                }
                {!this.state.loggedInUser &&
                    <React.Fragment>
                        <div className="navbar-auth-button-wrapper">
                            <Button variant="primary" onClick={() => this.setState({ signInModalShow: true })}>
                                Sign In
                            </Button>
                        </div>
                    </React.Fragment>
                }
                {!this.state.loggedInUser &&
                    <React.Fragment>
                        <div className="navbar-auth-button-wrapper">
                            <Button variant="primary" onClick={() => this.setState({ signupModalShow: true })}>
                                Sign Up
                            </Button>
                        </div>
                    </React.Fragment>
                }
                {((this.state.loggedInUser && !this.state.loggedInUser.hasVerifiedEmail)) &&
                    <React.Fragment>
                        <div className="navbar-auth-button-wrapper">
                            <Button variant="primary" onClick={() => this.setState({ verifyEmailModalShow: true })}>
                                Verify Email
                            </Button>
                        </div>
                    </React.Fragment>
                }
                {this.state.loggedInUser &&
                    <React.Fragment>
                        <div className="navbar-auth-button-wrapper">
                            <Button variant="primary" onClick={() => this.handleSignOut()}>
                                Sign Out
                            </Button>
                        </div>
                    </React.Fragment>
                }






                {/* <div className="">
                                    <Button variant="primary" onClick={() => console.log(`user state => \n${JSON.stringify(store.getState('user'), null, 2)}`)}>
                                        Print State
                                    </Button>
                                </div>
                                <div className="">
                                    <Button variant="primary" onClick={() => this.printCurrentAuthUser()}>
                                        Print Auth
                                    </Button>
                                </div> */}



                <SignUpModal
                    show={this.state.signupModalShow}
                    callback={this.signUpCallback}
                    onHide={() => this.setState({ signupModalShow: false })}
                ></SignUpModal>

                <VerifyEmailModal
                    show={this.state.verifyEmailModalShow}
                    callback={this.emailVerifiedCallback}
                    onHide={() => this.setState({ verifyEmailModalShow: false })}
                    username={this.state.username}
                    email={this.state.email}
                ></VerifyEmailModal>

                <SignInModal
                    show={this.state.signInModalShow}
                    callback={this.signInCallback}
                    onHide={() => this.setState({ signInModalShow: false })}
                    mustVerifyEmailCallback={u => { this.setState({ username: u || this.state.username, verifyEmailModalShow: true }) }}
                    username={this.state.username}
                    password={this.state.password}
                ></SignInModal>

            </React.Fragment>
        );
    }




}

export default AuthButtonGroup;