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
import XalianImage from '../components/xalianImage'
import XalianSpeciesRowView from '../components/views/xalianSpeciesRowView'
import XalianSpeciesBadge from '../components/xalianSpeciesBadge'


class SpeciesPage extends React.Component {

    state = {
        gridList: [],
        statRowList: [],
    }

    
    componentDidMount() {
        this.setState({
            gridList: this.buildSpeciesIcons(),
            statRowList: this.buildStatRows()
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

    buildStatRows() {
        species.sort((a, b) => a.id - b.id);
        var list = [];
        for (let ind in species) {
            list.push(
                this.buildStatRow(species[ind])
            );
        }
        return list;
    }

    buildSpeciesIcon(x) {
        return <Col md={2} sm={3} xs={6} className="species-col">
            <a href={"/species/" + x.id}>
                {/* <Image src={this.getImageLocationFromSpecies(x.name)} rounded className={this.getTypeColorClassName(x) + " xalian-image"} /> */}
                <XalianImage colored bordered speciesName={x.name} primaryType={x.type} moreClasses='xalian-image-grid'/>
                <h4 className='condensed-row' >#{x.id}</h4>
                <h2 className='condensed-row species-name-title'>{x.name}</h2>
                {/* <h3 className='condensed-row'><XalianSpeciesBadge type={x.type} /></h3> */}
            </a>
        </Col>
    }

    buildStatRow(x) {
        return <a href={"/species/" + x.id}><XalianSpeciesRowView species={x} /></a>;
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

                        <Col lg={true} className="template-col-wrapper ">
                            <h1>Discovered Species</h1>

                            {species &&
                                    <Tabs defaultActiveKey="grid" id="tabbs" className="species-tab-group">
                                        <Tab eventKey="grid" title="Grid" className="species-tab">
                                            <Row>
                                            {this.state.gridList}
                                            </Row>
                                        </Tab>
                                        <Tab eventKey="stat-row" title="Stats" className="">
                                            <Row>
                                                {this.state.statRowList}
                                            </Row>
                                        </Tab>
                                    </Tabs>
                            }

                        </Col>

                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

}


export default SpeciesPage;