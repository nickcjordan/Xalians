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
import ApexCharts from 'apexcharts';
import CharacterStatRangeChart from '../components/characterStatRangeChart';

class SpeciesDetailPage extends React.Component {

    state = {};

    componentDidMount() {
        console.log(`INBOUND: ${JSON.stringify(this.props, null, 2)} :: ${this.props.id.toString()}`)
        var map = new Map();
        for (var ind in species) {
            let x = species[ind];
            map[x.id] = x;
        }
        let inboundId = this.props.id;
        let xal = map[inboundId];
        console.log("found xal " + xal.name);
        this.setState({
            id: inboundId,
            xalian: xal
        });
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
                                        <h1 class="species-detail-name">{this.state.xalian.name}</h1>
                                    </Col>
                                    <Col md={true}>
                                        <h4 class="species-detail-id">#{this.state.xalian.id}</h4>
                                    </Col>
                                </Row>
                                <Row>
                                    <Image src={this.getImageLocationFromSpecies(this.state.xalian.name)} rounded className={this.getTypeColorClassName() + " xalian-image-detail"} />
                                </Row>
                            </Col>
                            <Col md={6} className="vertically-center-contents">
                                <Table hover size="sm" className="species-detail-table">
                                    <tbody>
                                        <tr><th>Type:</th><td>{this.state.xalian.type}</td></tr>
                                        <tr><th>Origin Planet:</th><td>{this.state.xalian.planet}</td></tr>
                                    </tbody>
                                </Table>

                            </Col>
                        </Row>
                        <Row className="centered-view squeezed-view third-height">
                            <div className="species-detail-description-div">
                                <h4 className="species-detail-description">
                                    {this.state.xalian.description}
                                </h4>
                            </div>
                        </Row>
                        <Row className="centered-squeezed-view third-height">
                            <Col>
                                <CharacterStatRangeChart xalian={this.state.xalian}/>
                            </Col>
                        </Row>
                    </Container>
                </Container>
            }
        </React.Fragment>;
    }

    getTypeColorClassName() {
        return `${this.state.xalian.type.toLowerCase()}-color`;
    }

    getImageLocationFromSpecies(name) {
        return `/assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
    }

}
export default SpeciesDetailPage;