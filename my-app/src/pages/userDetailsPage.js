// Terminal: relay. A user's record, read over the Zolto relay the same way
// your own faction is on userAccountPage.js — the same tube, no delete key.
import React from 'react';
import XalianNavbar from '../components/navbar';
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
            this.setState({ message: 'Could not load this user\'s Xalians — please try again later', isLoading: false });
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
                rows.push(<XalianStatRowView screen xalian={xalian} key={xalian.xalianId} />);
            });
        }
        return rows;
    }

    render() {
        return (
            <React.Fragment>

                <div className="g-console" data-terminal="relay">
                    <XalianNavbar authAlertCallback={this.setUserInfo}></XalianNavbar>

                    <div className="g-shell page-shell account-shell">
                        <header className="g-masthead">
                            <div className="g-masthead-heading">
                                <p className="g-kicker">Relay</p>
                                <h1 className="g-title">
                                    {(this.state.user && (this.state.user.username || this.state.user.userId) + "'s Xalian faction") || 'Xalian faction'}
                                </h1>
                            </div>
                            <div className="g-masthead-aside">
                                <span className="g-nameplate">Registry holdings</span>
                            </div>
                        </header>

                        {this.state.message &&
                            <div className="g-panel account-notice">
                                <p className="g-empty account-notice-text">{this.state.message}</p>
                            </div>
                        }

                        {this.state.xalians && this.state.xalians.length > 0 &&
                            <section className="g-cover-plate g-object">
                                <span className="g-cover-screw" style={{ left: '10px', top: '10px' }}></span>
                                <span className="g-cover-screw" style={{ right: '10px', top: '10px' }}></span>
                                <span className="g-cover-screw" style={{ left: '10px', bottom: '10px' }}></span>
                                <span className="g-cover-screw" style={{ right: '10px', bottom: '10px' }}></span>
                                <div className="g-crt relay-record-tube">{this.buildXaliansView()}</div>
                            </section>
                        }
                    </div>
                </div>
                {this.state.isLoading && <div id="preloader"></div>}
            </React.Fragment>


        )
    }
}

export default UserAccountPage;
