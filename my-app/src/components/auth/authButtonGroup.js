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
        this.signUpCallback = this.signUpCallback.bind(this);
    }

    componentDidMount() {
        Auth.currentUserInfo().then(data => {
            if (data && data.attributes) {
                this.setAuthState(data.username, data.attributes.nickname, data.attributes.email, data.attributes.email_verified);
            }
        });

        Hub.listen('auth', (data) => {
            if (data.payload.event === 'signIn_failure') {
                if (data.payload.data.code === 'UserNotConfirmedException') {
                    this.setState({verifyEmailModalShow: true})
                }
            }
            this.handleAuthEvent(data.payload.event, data.payload.data);
        })
    }

    handleAuthEvent = (name, data) => {
        console.log(name + ' :: inbound event data:\n' + JSON.stringify(data, null, 2));
        let removeLoginInfo = ['signOut'];
        let addLoginInfo = ['signIn', 'signUp'];
        if (removeLoginInfo.includes(name)) {
            // store.clear();
            this.setState({ loggedInUser: null });
            this.props.authAlertCallback(null);
        } else if (addLoginInfo.includes(name)) {
            this.setAuthState(data.username, data.attributes.nickname, data.attributes.email, data.attributes.email_verified);
            this.props.authAlertCallback(authUtil.buildAuthState(data.username, data.attributes.nickname, data.attributes.email, data.attributes.email_verified));
        }
    }

    setAuthState = (username, alias, email, hasVerifiedEmail) => {
        let authState = authUtil.buildAuthState(username, alias, email, hasVerifiedEmail);
        // store.setState('loggedInUser', authState);
        this.setState({ loggedInUser: authState });
    }

    signUpCallback(info) {
        console.log(JSON.stringify(info, null, 2));
        store.setState('authenticatedUser', info);
        this.setState({
            emailToVerify: info.user.username
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

    verifyEmailCallback = () => {
        this.setState({signInModalShow: true})
    }

    handleSignOut = () => {
        store.clear();
        authUtil.signOut().then(() => {
            // var x = globalState.getValue();
            // x.authenticatedUser = {};
            // globalState.updateValue(val => x);
        });

    }

    printCurrentAuthUser = () => {
        Auth.currentAuthenticatedUser().then(user => {
            console.log(`auth user => \n${JSON.stringify(user, null, 2)}`);
        });
        Auth.currentUserInfo().then(user => {
            console.log(`user info => \n${JSON.stringify(user, null, 2)}`);
            store.setState('user', user);
        });
    }

    userLoggedIn() {
        let u = store.getState('user', { default: null });
        console.log(JSON.stringify(u, null, 2));
        return u;
    }
    userEmailVerified() {
        let u = store.getState('user', { default: null });
        if (u && u.value && u.value.attributes && u.value.attributes.email_verified) {
            return true;
        } else {
            return false;
        }
        // return  && store.getState('user').attributes && store.getState('user').attributes.email_verified 
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
                            {this.state.loggedInUser.alias}
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
                    callback={this.verifyEmailCallback}
                    onHide={() => this.setState({ verifyEmailModalShow: false })}
                    email={this.state.emailToVerify}
                ></VerifyEmailModal>

                <SignInModal
                    show={this.state.signInModalShow}
                    callback={this.signInCallback}
                    onHide={() => this.setState({ signInModalShow: false })}
                    verifyEmailCallback={email => this.setState({ emailToVerify: email })}
                ></SignInModal>

            </React.Fragment>
        );
    }




}

export default AuthButtonGroup;