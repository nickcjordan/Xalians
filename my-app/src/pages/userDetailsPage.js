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
import XalianStatRowView from '../components/views/xalianStatRowView'


class UserAccountPage extends React.Component {

    state = {
        loggedInUser: null,
        user: null,
        message: null,
        xalians: [],
        isLoading: false
    };

    componentDidMount() {
        this.setState({ isLoading: true });
        dbApi.callGetUser(this.props.id,true).then(u => {
            this.setState({ isLoading: false });
            this.setState({ user: u, xalians: u.xalians });
        }).catch(e => {
            this.setState({ message: `ERROR : ${JSON.stringify(e, null, 2)}`, isLoading: false });
        })

        // let mockXalians = JSON.parse('[ { "speciesId": "00014", "xalianId": "00014-b049976e-1a31-4728-8817-923d444a80b8", "attributes": { "xalianId": "00014-b049976e-1a31-4728-8817-923d444a80b8", "species": { "generation": "0", "planet": "Drainov", "name": "Venemist", "description": "The toxic mist expelled from a tube in its mouth helps to dissolve its prey. With only 2 teeth, this tactic is necessary for the creature to survive.", "weight": "103 lbs / 46 kg", "id": "00014", "height": "38 in / 96 cm" }, "healthPoints": 999, "stats": { "evasionPoints": { "name": "evasionPoints", "range": "medium", "points": 458, "percentage": 91 }, "standardAttackPoints": { "name": "standardAttackPoints", "range": "medium", "points": 551, "percentage": 110 }, "standardDefensePoints": { "name": "standardDefensePoints", "range": "medium", "points": 440, "percentage": 88 }, "staminaPoints": { "name": "staminaPoints", "range": "high", "points": 680, "percentage": 90 }, "specialDefensePoints": { "name": "specialDefensePoints", "range": "low", "points": 238, "percentage": 95 }, "recoveryPoints": { "name": "recoveryPoints", "range": "low", "points": 284, "percentage": 113 }, "specialAttackPoints": { "name": "specialAttackPoints", "range": "medium", "points": 418, "percentage": 83 }, "speedPoints": { "name": "speedPoints", "range": "low", "points": 270, "percentage": 108 } }, "moves": [ { "name": "Modest Infectious Shot", "rating": 9, "description": "Chemical-typed sufficiently sized attack hard enough to cause injury", "cost": 10, "type": "Chemical", "element": "Infectious" }, { "name": "Irritating Lunge", "rating": 6, "description": "Causing physical discomfort, sudden forward strike", "cost": 10 }, { "name": "Unfriendly Microbe Bang", "rating": 8, "description": "Chemical-typed disagreeable or hostile, vigorous attack", "cost": 10, "type": "Chemical", "element": "Microbe" }, { "name": "Heroic Boot", "rating": 10, "description": "Impressive and courageous attack with the foot", "cost": 10 } ], "meta": { "avgPercentage": 97, "totalStatPoints": 3339 }, "elements": { "secondaryType": "Dark", "primaryType": "Chemical", "secondaryElement": "Shadow", "primaryElement": "Poison" }, "speciesId": "00014", "createTimestamp": 1644614990305 } } ]');
        // let mockUser = JSON.parse('{ "attributes": { "userId": "King_Kozrak", "attributes": {} }, "xalianIds": [ "00018-11cefad5-3873-4ce6-870f-b73d8f01f442", "00014-b049976e-1a31-4728-8817-923d444a80b8" ], "userId": "king_kozrak" }');
        // this.setState({
        //     user: mockUser,
        //     xalians: mockXalians
        // })
        
    }


    setUserInfo = (user) => {
        this.setState({ loggedInUser: user })
    }

    buildXaliansView = () => {
        var rows = [];
        if (this.state.xalians) {
            this.state.xalians.forEach(xalian => {
                rows.push(<XalianStatRowView xalian={xalian}/>);
            });
        }
        return rows;
    }

    render() {
        return (
            <React.Fragment>

                <Container fluid className="content-background-container">
                    <XalianNavbar authAlertCallback={this.setUserInfo}></XalianNavbar>

                    <Container className="content-container">

                    <Row className='account-page-xalians-title vertically-center-contents'>
                        {this.state.user && 
                            <h1>{this.state.user.username || this.state.user.userId + "'s Xalian Faction"}</h1>
                        }
							
						</Row>
                        <Row>
                            {this.buildXaliansView()}
                        </Row>

                    </Container>
                    
                </Container>
                {this.state.isLoading && <div id="preloader"></div>}
            </React.Fragment>


        )
    }
}

export default UserAccountPage;