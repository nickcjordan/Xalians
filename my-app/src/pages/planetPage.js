import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import Image from 'react-bootstrap/Image'
import Table from 'react-bootstrap/Table'
import PlanetTable from '../components/planetTable';


class PlanetPage extends React.Component {

    render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                <Container className="content-container">
                    <Row className="content-row">

                        <Col lg={10} className="planet-col-wrapper">
                            <h1>Discovered Planets</h1>

                            <Container className="planet-div">
                                <Row className="planet-title-row">
                                    <Col>
                                        <h2>Magmuth</h2>
                                    </Col>
                                </Row>
                                <Row className="planet-details-row vertically-center-contents">
                                    <Col sm={3}>
                                        <img src="assets/img/planets/gif/fire_planet_gif.gif" class="planet-gif" alt=""></img>
                                    </Col>
                                    <Col sm={6} className="planet-description-col">
                                        <div class="planet-table">
                                            <PlanetTable title="" data={{
                                                "Type": "Fire, Magma",
                                                "Size": "0.45 x Earth",
                                                "Radius": "1,781 miles / 2,867 km",
                                                "Gravity": "1.25 x Earth",
                                                "Moons": 0,
                                                "Temperature Low": "65 °C / 149 °F",
                                                "Temperature High": "355 °C / 671 °F",
                                                "Temperature High": "355 °C / 671 °F",
                                                "Known Native Species": "Dromeus" 
                                            }}></PlanetTable>
                                        </div>
                                    </Col>
                                    <Col sm={3}>
                                        <img src="assets/img/planets/fire_landscape_planet.jpg" class="planet-img img-fluid" alt=""></img>
                                    </Col>
                                </Row>
                            </Container>
                        </Col>

                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

}


export default PlanetPage;