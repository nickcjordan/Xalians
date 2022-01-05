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
                                image="assets/img/planets/landscape/fire_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/fire_planet_gif.gif"
                                data={{
                                    "Type": "Fire",
                                    "Terrain": "Jagged Molten Cliffs, Lava Pits",
                                    "Size": "3.88 x Earth",
                                    "Radius": "15,360 miles / 24,719 km",
                                    "Gravity": "1.25 x Earth",
                                    "Temperature Low": "65 °C / 149 °F",
                                    "Temperature High": "355 °C / 671 °F",
                                    "Known Native Species": "Dromeus"
                                }}></PlanetTable>

                            <PlanetTable
                                name="Poseidas"
                                image="assets/img/planets/landscape/water_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/water_planet_gif.gif"
                                data={{
                                    "Type": "Water",
                                    "Terrain": "Mostly Ocean, Scarce Sandy Islands",
                                    "Size": "1.34 x Earth",
                                    "Radius": "5,305 miles / 8,537 km",
                                    "Gravity": "1.7 x Earth",
                                    "Temperature Low": "5 °C / 41 °F",
                                    "Temperature High": "67 °C / 152.6 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>

                            <PlanetTable
                                name="Grimedes"
                                image="assets/img/planets/landscape/dark_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/dark_planet_gif.gif"
                                data={{
                                    "Type": "Dark",
                                    "Terrain": "Ice Canyons, Rocky Crystalline Mountains",
                                    "Size": "2.1 x Earth",
                                    "Radius": "8,313 miles / 13,379 km",
                                    "Gravity": "0.90 x Earth",
                                    "Temperature Low": "-170 °C / -274 °F",
                                    "Temperature High": "-78 °C / -108.4 °F",
                                    "Known Native Species": "Tetrahive"
                                }}></PlanetTable>

                            <PlanetTable
                                name="Luminax"
                                image="assets/img/planets/landscape/light_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/light_planet_gif.gif"
                                data={{
                                    "Type": "Light",
                                    "Terrain": "Smooth Sandy Deserts, Rocky Plateus, Scarce Oases",
                                    "Size": "0.84 x Earth",
                                    "Radius": "3,325 miles / 5,352 km",
                                    "Gravity": "1.17 x Earth",
                                    "Temperature Low": "24.5 °C / 76.1 °F",
                                    "Temperature High": "122 °C / 251.6 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>

                            <PlanetTable
                                name="Floria"
                                image="assets/img/planets/landscape/botanical_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/botanical_planet_gif.gif"
                                data={{
                                    "Type": "Botanical",
                                    "Terrain": "Abundant Forests, Marshy Wetlands",
                                    "Size": "8.17 x Earth",
                                    "Radius": "32,343 miles / 52,051 km",
                                    "Gravity": "0.80 x Earth",
                                    "Temperature Low": "-4 °C / 24.8 °F",
                                    "Temperature High": "40 °C / 104 °F",
                                    "Known Native Species": "Xylum"
                                }}></PlanetTable>

                            <PlanetTable
                                name="Zolton"
                                image="assets/img/planets/landscape/electrical_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/electrical_planet_gif.gif"
                                data={{
                                    "Type": "Electrical",
                                    "Terrain": "Mountainous, Metallic Peaks, Frozen Canyons",
                                    "Size": "0.62 x Earth",
                                    "Radius": "2,454 miles / 3,950 km",
                                    "Gravity": "1.59 x Earth",
                                    "Temperature Low": "-71 °C / -95.8 °F",
                                    "Temperature High": "57 °C / 134.6 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>


                            <PlanetTable
                                name="Phantiri"
                                image="assets/img/planets/landscape/spectral_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/spectral_planet_gif.gif"
                                data={{
                                    "Type": "Spectral",
                                    "Terrain": "Rocky Cliffs, Shallow Oceans, Thick Haze",
                                    "Size": "7.92 x Earth",
                                    "Radius": "31,353 miles / 50,458 km",
                                    "Gravity": "1.65 x Earth",
                                    "Temperature Low": "-58 °C / -72.4 °F",
                                    "Temperature High": "53 °C / 127.4 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>

                            
                            <PlanetTable
                                name="Stonera"
                                image="assets/img/planets/landscape/geological_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/geological_planet_gif.gif"
                                data={{
                                    "Type": "Geological",
                                    "Terrain": "Rough, Rocky Landscape, Craters, Snowcapped Mountains",
                                    "Size": "8.78 x Earth",
                                    "Radius": "34,758 miles / 55,937 km",
                                    "Gravity": "0.74 x Earth",
                                    "Temperature Low": "-28 °C / -18.4 °F",
                                    "Temperature High": "34 °C / 93.2 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>


                            <PlanetTable
                                name="Drainov"
                                image="assets/img/planets/landscape/chemical_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/chemical_planet_gif.gif"
                                data={{
                                    "Type": "Chemical",
                                    "Terrain": "Acid Swamps, Gaseous Smog, Toxic Atmosphere",
                                    "Size": "0.49 x Earth",
                                    "Radius": "1,940 miles / 3,122 km",
                                    "Gravity": "0.94 x Earth",
                                    "Temperature Low": "-24 °C / -11.2 °F",
                                    "Temperature High": "43 °C / 109.4 °F",
                                    "Known Native Species": "Bioflim"
                                }}></PlanetTable>

                                <PlanetTable
                                name="Saiphus"
                                image="assets/img/planets/landscape/air_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/air_planet_gif.gif"
                                data={{
                                    "Type": "Air",
                                    "Terrain": "Clusters of Rolling Plains, Canyons, Dense Fog",
                                    "Size": "1.63 x Earth",
                                    "Radius": "6,453 miles / 10,385 km",
                                    "Gravity": "1.16 x Earth",
                                    "Temperature Low": "-66 °C / -86.8 °F",
                                    "Temperature High": "58 °C / 136.4 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>

                                <PlanetTable
                                name="Nitros"
                                image="assets/img/planets/landscape/explosive_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/explosive_planet_gif.gif"
                                data={{
                                    "Type": "Explosive",
                                    "Terrain": "Desert, Combustible Gas Pockets, Smoky Atmosphere",
                                    "Size": "3.43 x Earth",
                                    "Radius": "13,579 miles / 21,853 km",
                                    "Gravity": "0.97 x Earth",
                                    "Temperature Low": "-63 °C / -81.4 °F",
                                    "Temperature High": "117 °C / 242.6 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable> 


                                <PlanetTable
                                name="Telypso"
                                image="assets/img/planets/landscape/psychic_landscape_planet.jpg"
                                planetImage="assets/img/planets/gif/psychic_planet_gif.gif"
                                data={{
                                    "Type": "Psychic",
                                    "Terrain": "Dense Flora, Rivers, Flourescent Mist",
                                    "Size": "2.49 x Earth",
                                    "Radius": "9,857 miles / 15,864 km",
                                    "Gravity": "0.90 x Earth",
                                    "Temperature Low": "7 °C / 44.6 °F",
                                    "Temperature High": "65 °C / 149 °F",
                                    "Known Native Species": ""
                                }}></PlanetTable>   
                        </Col>

                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

}


export default PlanetPage;