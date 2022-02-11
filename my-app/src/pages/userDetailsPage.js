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
import * as dbApi from '../utils/dbApi';
import { store } from 'state-pool';
import { Auth } from 'aws-amplify';
import { Hub, Logger } from 'aws-amplify';


class UserAccountPage extends React.Component {

    state = {
        loggedInUser: null,
        user: null,
        message: null,
        xalians: []
    };

    componentDidMount() {
        dbApi.callGetUser(this.props.id).then(u => {
            this.setState({ user: u });
            dbApi.callGetXalianBatch(u.xalianIds).then(xalians => {
                this.setState({ xalians: xalians });
            })
        }).catch(e => {
            this.setState({ message: `ERROR : ${JSON.stringify(e, null, 2)}` });
        })
        
    }


    setUserInfo = (user) => {
        this.setState({ loggedInUser: user })
    }

    render() {
        return (
            <React.Fragment>

                <Container fluid className="content-background-container">
                    <XalianNavbar authAlertCallback={this.setUserInfo}></XalianNavbar>

                    <Container className="content-container">
                        <Row className="">
                        {this.state.user && <p>user: {JSON.stringify(this.state.user, null, 2)}</p>}
                            
                            
                        </Row>

                    </Container>
                </Container>
            </React.Fragment>


        )
    }
}

export default UserAccountPage;