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

class GeneratorPage extends React.Component {

    state = {
        xalian: null,
        isLoading: true
    }

    componentDidMount() {
        this.getXalian();
    }

    render() {
        return <React.Fragment>

            {this.state.xalian &&


                <Container fluid className="content-background-container">

                    <XalianNavbar></XalianNavbar>
                    <Container fluid className="whole-container">
                        <Row className="centered-view squeezed-view third-height">
                            <Col md={6} className="">
                                <Row className="vertically-center-contents species-detail-title-row">
                                    <Col md={true}>
                                        <h1 className="species-detail-name">{this.state.xalian.species.name}</h1>
                                    </Col>
                                    <Col md={true}>
                                        <h4 className="species-detail-id">#{this.state.xalian.speciesId}</h4>
                                    </Col>
                                </Row>
                                <Row>
                                    <Image src={this.getImageLocationFromSpecies(this.state.xalian.species.name)} rounded className={this.getTypeColorClassName() + " xalian-image-detail"} />
                                </Row>
                            </Col>
                            <Col md={6} className="vertically-center-contents">
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
                        <Row className="centered-squeezed-view third-height">
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
                </Container>
            }
            {this.state.isLoading && <div id="preloader"></div>}
        </React.Fragment>;
    }

    getXalian() {
        xalianApi.callGenerateXalian().then(x => {
            console.log(JSON.stringify(x, null, 2));
            this.setState({
                xalian: x,
                isLoading: false
            })
        });
    }

    getTypeColorClassName() {
        return `${this.state.xalian.elements.primaryType.toLowerCase()}-color`;
    }

    getImageLocationFromSpecies(name) {
        return `/assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
    }

}
export default GeneratorPage;