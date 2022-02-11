import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import SignUpModal from '../components/auth/signUpModal';
import VerifyEmailModal from '../components/auth/verifyEmailModal';
import SignInModal from '../components/auth/signInModal';
import * as authUtil from '../utils/authUtil';
import { store } from 'state-pool';
import { Auth } from 'aws-amplify';
import { Hub, Logger } from 'aws-amplify';


class UserAccountPage extends React.Component {

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
        Auth.currentUserInfo().then(data => {
            if (data) {
                this.setAuthState(data.username, data.attributes.nickname, data.attributes.email, data.attributes.email_verified);
            } 
        });

        Hub.listen('auth', (data) => {
            this.handleAuthEvent(data.payload.event, data.payload.data);           
        })
    }

    handleAuthEvent = (name, data) => {
        console.log(name + ' :: inbound event data:\n' + JSON.stringify(data, null, 2));
        let removeLoginInfo = ['signOut'];
        let addLoginInfo = ['signIn', 'signUp'];
        if (removeLoginInfo.includes(name)) {
            store.clear();
            this.setState({ loggedInUser: null});
        } else if (addLoginInfo.includes(name)) {
            this.setAuthState(data);
        }
    }

    setAuthState = (data) => {
        let authState = authUtil.buildAuthState(data);
        store.setState('loggedInUser', authState);
        this.setState({ loggedInUser: authState});
    }

    componentDidMount() {
    }

    // Auth.currentUserInfo().then(user => {
        //     store.setState('user', user);
        //     this.setState({ loggedInUser: user })
        // });

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
        Auth.currentUserInfo().then(user => {
            store.setState('user', user);
        });
        // store.setState('authenticatedUser', info);
    }

    verifyEmailCallback = (info) => {
        console.log(JSON.stringify(info, null, 2));
        alert('verified!');
    }

    handleSignOut = () => {
        store.clear();
        if (this.userLoggedIn()) {
            console.log('???');
        }
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
        let u = store.getState('user', {default: null});
        console.log(JSON.stringify(u, null, 2));
        return u;
    }
    userEmailVerified() { 
        let u = store.getState('user', {default: null});
        if (u && u.value && u.value.attributes && u.value.attributes.email_verified) {
            return true;
        } else {
            return false;
        }
        // return  && store.getState('user').attributes && store.getState('user').attributes.email_verified 
    }

    render() {
        return (
            <React.Fragment>

                <Container fluid className="content-background-container">
                    <XalianNavbar></XalianNavbar>

                    <Container className="content-container">
                        <Row className="">
                            {!this.state.loggedInUser &&
                                <React.Fragment>
                                    <Row>
                                <Col lg={true} className="template-col-wrapper">
                                    <Button variant="primary" onClick={() => this.setState({ signInModalShow: true })}>
                                        Sign In
                                    </Button>
                                </Col>
                            </Row>
                                </React.Fragment>
                            }
                            {this.state.loggedInUser && !this.state.loggedInUser.hasVerifiedEmail &&
                                <React.Fragment>
                                    <Row>
                                <Col lg={true} className="template-col-wrapper">
                                    <Button variant="primary" onClick={() => this.setState({ verifyEmailModalShow: true })}>
                                        Verify Email
                                    </Button>
                                </Col>
                            </Row>
                                </React.Fragment>
                            }
                            {this.state.loggedInUser &&
                                <React.Fragment>
                                    <Row>
                                <Col lg={true} className="template-col-wrapper">
                                    <Button variant="primary" onClick={() => this.handleSignOut()}>
                                        Sign Out
                                    </Button>
                                </Col>
                            </Row>
                                </React.Fragment>
                            }
                            {!this.state.loggedInUser &&
                                <React.Fragment>
                                    <Row>
                                <Col lg={true} className="template-col-wrapper">
                                    <Button variant="primary" onClick={() => this.setState({ signupModalShow: true })}>
                                        Sign Up
                                    </Button>
                                </Col>
                            </Row>
                                </React.Fragment>
                            }
                            
                            
                            
                            <Row>
                                <Col lg={true} className="template-col-wrapper">
                                    <Button variant="primary" onClick={() => console.log(`user state => \n${JSON.stringify(store.getState('user'), null, 2)}`)}>
                                        Print State
                                    </Button>
                                </Col>
                            </Row>
                            <Row>
                                <Col lg={true} className="template-col-wrapper">
                                    <Button variant="primary" onClick={() => this.printCurrentAuthUser()}>
                                        Print Auth
                                    </Button>
                                </Col>
                            </Row>



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
                            ></SignInModal>

                        </Row>

                    </Container>
                </Container>
            </React.Fragment>


        )
    }
}

export default UserAccountPage;