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

                            <PlanetTable
                                name="Magmuth"
                                image="assets/img/planets/fire_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/fire_planet_gif.gif"
                                data={{
                                    "Composition": "Fire, Magma",
                                    "Size": "0.45 x Earth",
                                    "Radius": "1,781 miles / 2,867 km",
                                    "Gravity": "1.25 x Earth",
                                    "Moons": 0,
                                    "Temperature Low": "65 °C / 149 °F",
                                    "Temperature High": "355 °C / 671 °F",
                                    "Known Native Species": "Dromeus"
                                }}></PlanetTable>

                            <PlanetTable
                                name="Poseidas"
                                image="assets/img/planets/water_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/water_planet_gif.gif"
                                data={{
                                    "Composition": "Mostly Water, Patches of Land",
                                    "Size": "1.34 x Earth",
                                    "Radius": "5,305 miles / 8,537 km",
                                    "Gravity": "1.7 x Earth",
                                    "Moons": 2,
                                    "Temperature Low": "5 °C / 41 °F",
                                    "Temperature High": "67 °C / 152.6 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>

                            <PlanetTable
                                name="Spectiri"
                                image="assets/img/planets/dark_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/dark_planet_gif.gif"
                                data={{
                                    "Composition": "Dark, Icy Rock Matter",
                                    "Size": "2.1 x Earth",
                                    "Radius": "8,313 miles / 13,379 km",
                                    "Gravity": "0.90 x Earth",
                                    "Moons": 17,
                                    "Temperature Low": "-170 °C / -274 °F",
                                    "Temperature High": "-78 °C / -108.4 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>

                            <PlanetTable
                                name="Floron"
                                image="assets/img/planets/botanical_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/botanical_planet_gif.gif"
                                data={{
                                    "Composition": "Covered in lush flora",
                                    "Size": "8.17 x Earth",
                                    "Radius": "32,343 miles / 52,051 km",
                                    "Gravity": "0.80 x Earth",
                                    "Moons": 0,
                                    "Temperature Low": "-4 °C / 24.8 °F",
                                    "Temperature High": "40 °C / 104 °F",
                                    "Known Native Species": "Xylum"
                                }}></PlanetTable>


                        </Col>

                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

}


export default PlanetPage;