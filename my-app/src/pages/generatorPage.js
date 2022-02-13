import axios from 'axios';
import React from 'react';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import CharacterStats from '../components/characterStat';
import XalianMoveSet from '../components/xalianMoveSet';
import XalianAttributeChart from '../components/xalianAttributeChart';
import XalianImage from '../components/xalianImage';
import XalianInfoBox from '../components/xalianInfoBox';
import XalianNavbar from '../components/navbar';
import species from '../json/species.json';
import XalianStatChart from '../components/xalianStatChart';
import * as xalianApi from '../utils/xalianApi';
import * as dbApi from '../utils/dbApi';
import * as alertUtil from '../utils/alertUtil';
import Modal from 'react-bootstrap/Modal';
import Stack from 'react-bootstrap/Stack'
import { a } from 'aws-amplify';

class GeneratorPage extends React.Component {

    state = {
        xalian: null,
        isLoading: true,
        loggedInUser: null,
        jsonModalShow: false
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.getXalian();

    }

    setLoggedInUser = (user) => {
        this.setState({ loggedInUser: user });
    }

    render() {
        return (
			<React.Fragment>
				<Container className="generator-page-content-background-container ">
					<XalianNavbar authAlertCallback={this.setLoggedInUser}></XalianNavbar>

					{/* <Modal
                    show={this.state.jsonModalShow}
                    onHide={() => this.setState({ jsonModalShow: false })}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    className="themed-modal"
                >
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">
                            Your {this.state.xalian ? this.state.xalian.species.name : 'Xalian'}'s Details
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <pre>
                            {JSON.stringify(this.state.xalian, null, 2)}
                        </pre>

                    </Modal.Body>
                </Modal> */}

					{/* {!this.state.xalian &&
                    <React.Fragment>
                        <Row className="d-flex align-items-center  vertically-center-contents">
                            <Col md={true} className="title-col xalian-generator-button-col vertically-center-contents centered-view">
                                <button onClick={this.getXalian} className='xalian-generator-page-button'>Generate Xalian</button>
                            </Col>
                        </Row>
                    </React.Fragment>
                } */}

					{this.state.xalian && (
						<React.Fragment>
							<Container fluid className="whole-container ">
								<Row className="generator-button-row">
									<Col class="">
										<Button variant="xalianGray" disabled={!this.state.loggedInUser} onClick={this.saveXalian} className="save-xalian-generator-page-button">
											{this.state.loggedInUser ? 'Save to Your Faction' : 'Sign In to Keep'}
										</Button>
									</Col>
									<Col class="">
										<Button variant="xalianGreen" onClick={this.getXalian}>
											Generate New Xalian
										</Button>
									</Col>
									{/* <Col class="">
                                    <Button variant='xalianGray' onClick={this.test} className='save-xalian-generator-page-button'>Test</Button>
                                </Col> */}
								</Row>

								<hr className="xalian-hr" />

								<Row className="xalian-species-title"></Row>

								<Row className="centered-view squeezed-view third-height">
									<Col lg={3} md={6} xs={6} className='stackable-padding'>
										<XalianInfoBox xalian={this.state.xalian} json={JSON.stringify(this.state.xalian, null, 2)} />
									</Col>

									<Col lg={3} md={6} xs={6} className='stackable-padding'>
										<Row className="xalian-image-row">
											<XalianImage colored bordered shadowed speciesName={this.state.xalian.species.name} speciesType={this.state.xalian.elements.primaryType} moreClasses="xalian-image-detail" />
										</Row>
									</Col>
									<Col lg={true} className="vertically-center-contents centered-view stackable-padding">
										<XalianAttributeChart xalian={this.state.xalian} />
									</Col>
								</Row>
								<Row className="centered-view squeezed-view third-height ">
									<div className="species-detail-description-div">
										<h6 className="species-detail-description">{this.state.xalian.species.description}</h6>
									</div>
								</Row>
								<Row className="third-height stackable-padding">
									<Col>
										<XalianStatChart axisLabelColor={'white'} includeLabel labelFontSize={'10pt'} barSize={30} stats={this.state.xalian.stats} moreClasses="full-chart-div padded-row" />
									</Col>
								</Row>
								<Row className="centered-view squeezed-view third-height stackable-padding">
									<Col>
										<XalianMoveSet showDescription moves={this.state.xalian.moves}></XalianMoveSet>
									</Col>
								</Row>
							</Container>
						</React.Fragment>
					)}
				</Container>
				{this.state.isLoading && <div id="preloader"></div>}
			</React.Fragment>
		);
    }

    getXalian = () => {
        xalianApi.callGenerateXalian().then(x => {
            console.log(JSON.stringify(x, null, 2));
            this.setState({
                xalian: x,
                isLoading: false
            })
        });
    }

    saveXalian = () => {
        this.setState({
            isLoading: true
        })
        dbApi.callCreateXalian(this.state.xalian);

        dbApi.callUpdateUserAddXalian(this.state.loggedInUser.username, this.state.xalian.xalianId).then(x => {
            this.setState({ isLoading: false });
            console.log(JSON.stringify(x, null, 2));
            alertUtil.sendAlert('Xalian Saved!', null, 'success');
        }).catch(error => {
            this.setState({ isLoading: false });
            console.log(JSON.stringify(error, null, 2));
        });
    }

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
    }

}
export default GeneratorPage;