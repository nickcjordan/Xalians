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
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import species from '../json/species.json';

class SpeciesPage extends React.Component {

    state = {
        gridList: []
    }

    
    componentDidMount() {
        this.setState({
            gridList: this.buildSpeciesIcons()
        });
    }

    buildSpeciesIcons() {
        species.sort((a, b) => a.id - b.id);
        var list = [];
        for (let ind in species) {
            list.push(
                this.buildSpeciesIcon(species[ind])
            );
        }
        return list;
    }

    buildSpeciesIcon(x) {
        return <Col sm={4} md={2} className="species-col">
            <a href={"/species/" + x.id}>
                <Image src={this.getImageLocationFromSpecies(x.name)} rounded className={this.getTypeColorClassName(x) + " xalian-image"} />
                <h4>#{x.id}</h4>
                <h2>{x.name}</h2>
                <h3>{x.type}</h3>
            </a>
        </Col>
    }

    getImageLocationFromSpecies(name) {
        return `/assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
    }

    getTypeColorClassName(x) {
        return `${x.type.toLowerCase()}-color`;
    }

    render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                <Container className="">
                    <Row className="">

                        <Col lg={true} className="template-col-wrapper">
                            <h1>Discovered Species</h1>

                            {species &&
                                    <Tabs defaultActiveKey="grid" id="gridTab" className="species-tab-group">
                                        <Tab eventKey="grid" title="Grid" className="species-tab">
                                            <Row>
                                            {this.state.gridList}
                                            </Row>
                                        </Tab>
                                        {/* <Tab eventKey="profile" title="Profile">
                                            profile
                                        </Tab>
                                        <Tab eventKey="contact" title="Contact" disabled>
                                            disabled
                                        </Tab> */}
                                    </Tabs>
                            }

                            {/* <PlanetTable
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
                                }}></PlanetTable>    */}
                        </Col>

                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

}


export default SpeciesPage;