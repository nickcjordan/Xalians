import axios from 'axios';
import React from 'react';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import CharacterStats from '../components/characterStat';
import CharacterMoves from '../components/characterMove';
import XalianNavbar from '../components/navbar';
import species from '../json/species.json';
import Table from 'react-bootstrap/Table';
import CharacterGeneratedStatChart from '../components/characterGeneratedStatChart';
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
        return <React.Fragment>



            <Container className="generator-page-content-background-container ">

                <XalianNavbar authAlertCallback={this.setLoggedInUser}></XalianNavbar>

                <Modal
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
                </Modal>

                {/* {!this.state.xalian &&
                    <React.Fragment>
                        <Row className="d-flex align-items-center  vertically-center-contents">
                            <Col md={true} className="title-col xalian-generator-button-col vertically-center-contents centered-view">
                                <button onClick={this.getXalian} className='xalian-generator-page-button'>Generate Xalian</button>
                            </Col>
                        </Row>
                    </React.Fragment>
                } */}


                {this.state.xalian &&
                    <React.Fragment>
                        <Container fluid className="whole-container ">

                            <Row className="generator-button-row">
                                <Col class="">
                                    <Button variant='xalianGray' disabled={!this.state.loggedInUser} onClick={this.saveXalian} className='save-xalian-generator-page-button'>{this.state.loggedInUser ? 'Keep This Xalian' : 'Sign In to Keep'}</Button>
                                </Col>
                                <Col class="">
                                    <Button variant="xalianGreen" onClick={this.getXalian}>Generate New Xalian</Button>
                                </Col>
                                <Col class="">
                                    <Button variant='xalianGray' onClick={this.test} className='save-xalian-generator-page-button'>Test</Button>
                                </Col>
                            </Row>

                            <hr className="xalian-hr"/>

                            <Row className="xalian-species-title">
                                <Stack>
                                <h1 className="species-detail-name">{this.state.xalian.species.name}</h1>
                                <h4 className="species-detail-id">#{this.state.xalian.speciesId}</h4>
                                <div className="centered-view">
                                <button className='json-modal-button' onClick={() => this.setState({ jsonModalShow: true })}><i class="bi bi-file-earmark-binary"></i></button>

                                </div>
                                </Stack>
                            </Row>

                            <Row className="centered-view squeezed-view third-height">


                                <Col className="">
                                    <Row>
                                        <Image src={this.getImageLocationFromSpecies(this.state.xalian.species.name)} rounded className={this.getTypeColorClassName() + " xalian-image-detail"} />
                                    </Row>
                                </Col>
                                <Col  className="vertically-center-contents">
                                    <Table hover size="sm" className="species-detail-table">
                                        <tbody>
                                            <tr><th>Generation:</th><td>{this.state.xalian.species.generation}</td></tr>
                                            <tr><th>Primary Element Type:</th><td>{this.state.xalian.elements.primaryType} [{this.state.xalian.elements.primaryElement}]</td></tr>
                                            <tr><th>Secondary Element Type:</th><td>{this.state.xalian.elements.secondaryType} [{this.state.xalian.elements.secondaryElement}]</td></tr>
                                            <tr><th>Origin Planet:</th><td>{this.state.xalian.species.planet}</td></tr>
                                            <tr><th>Avg Height:</th><td>{this.state.xalian.species.height}</td></tr>
                                            <tr><th>Avg Weight:</th><td>{this.state.xalian.species.weight}</td></tr>
                                            <tr><th>Total Stat Points:</th><td>{this.state.xalian.meta.totalStatPoints}</td></tr>
                                            <tr><th>Avg Stat Percentage:</th><td>{this.state.xalian.meta.avgPercentage}</td></tr>
                                        </tbody>
                                    </Table>

                                </Col>
                            </Row>
                            <Row className="centered-view squeezed-view third-height">
                                <div className="species-detail-description-div">
                                    <h4 className="species-detail-description">
                                        {this.state.xalian.species.description}
                                    </h4>
                                </div>
                            </Row>
                            <Row className="third-height ">
                                <Col>
                                    <CharacterGeneratedStatChart xalian={this.state.xalian} />
                                </Col>
                            </Row>
                            <Row className="centered-view squeezed-view third-height">
                                <Col>
                                    <CharacterMoves stats={this.state.xalian.moves}></CharacterMoves>
                                </Col>
                            </Row>
                        </Container>
                    </React.Fragment>
                }
            </Container>
            {this.state.isLoading && <div id="preloader"></div>}
        </React.Fragment>;
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
        
        // this.setState({
        //     isLoading: true
        // })

        dbApi.callUpdateUserAddXalian(this.state.loggedInUser.username, this.state.xalian.xalianId).then(x => {
            console.log(JSON.stringify(x, null, 2));
            // dbApi.update
            this.setState({
                isLoading: false
            });
            alertUtil.sendAlert('Xalian Saved!', null, 'success');
        }).catch(error => {
            console.log(JSON.stringify(error, null, 2));
            this.setState({
                isLoading: false
            });
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

    getTypeColorClassName() {
        return `${this.state.xalian.elements.primaryType.toLowerCase()}-color`;
    }

    getImageLocationFromSpecies(name) {
        return `/assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
    }

}
export default GeneratorPage;