// Terminal: relay. The navbar's auth keys: sign in, sign up, verify, sign
// out, moulded into the relay's cover plate alongside the route legends.
import React from 'react'
import SignUpModal from './signUpModal';
import VerifyEmailModal from './verifyEmailModal';
import SignInModal from './signInModal';
import * as authUtil from '../../utils/authUtil';
import * as dbApi from '../../utils/dbApi';
import { store } from 'state-pool';
import { Auth } from 'aws-amplify';
import { Hub } from 'aws-amplify';


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

        this.authListener = (data) => {
            if (data.payload.event === 'signIn_failure') {
                if (data.payload.data.code === 'UserNotConfirmedException') {
                    this.setState({ verifyEmailModalShow: true })
                }
            }
            this.handleAuthEvent(data.payload.event, data.payload.data);
        };
        Hub.listen('auth', this.authListener);
    }

    componentWillUnmount() {
        if (this.authListener) {
            Hub.remove('auth', this.authListener);
        }
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
    }

    emailVerifiedCallback = () => {
        this.setState({verifyEmailModalShow: false});
        authUtil.signIn(
            this.state.username,
            this.state.password
        ).then(() => {
            this.setState({ isThinking: false });
            dbApi.callCreateUser({
                userId: this.state.username,
                xalianIds: []
            });
        }).catch(e => {
            this.setState({ signInModalShow: true });
        });
    }

    handleSignOut = () => {
        store.clear();
        authUtil.signOut().then(() => {
        });
    }

    render() {
        return (
            <React.Fragment>
                {this.state.loggedInUser &&
                    <span className="relay-username">
                        <a className="g-legend relay-username-link" href={'/account'}>{this.state.loggedInUser.username}</a>
                    </span>
                }
                {!this.state.loggedInUser &&
                    <button type="button" className="g-key relay-auth-key" onClick={() => this.setState({ signInModalShow: true })}>
                        Sign In
                    </button>
                }
                {!this.state.loggedInUser &&
                    <button type="button" className="g-key relay-auth-key" onClick={() => this.setState({ signupModalShow: true })}>
                        Sign Up
                    </button>
                }
                {((this.state.loggedInUser && !this.state.loggedInUser.hasVerifiedEmail)) &&
                    <button type="button" className="g-key relay-auth-key" onClick={() => this.setState({ verifyEmailModalShow: true })}>
                        Verify Email
                    </button>
                }
                {this.state.loggedInUser &&
                    <button type="button" className="g-key relay-auth-key" onClick={() => this.handleSignOut()}>
                        Sign Out
                    </button>
                }

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
