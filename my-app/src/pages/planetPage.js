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
import planets from '../json/planets.json';
import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';

class PlanetPage extends React.Component {

    buildPlanets() {
        var sortedPlanets = planets.sort(function(a, b) {
            var nameA = a.name.toUpperCase(); // ignore upper and lowercase
            var nameB = b.name.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {
              return -1;
            } else if (nameA > nameB) {
              return 1;
            } else { // names must be equal
                return 0; 
            }
          });

        var list = [];
        for (var ind in planets) {
            const p = planets[ind];
            list.push(<PlanetTable planet={p}/>);
        }
        return list;
    }

    render() {

        return <React.Fragment>

            <Container fluid className="home-background">
            <SplashGalaxyBackground direction={'bottom-left'} speed={0.2}>
                <XalianNavbar></XalianNavbar>

                <Container className="content-container" >
                    <Row >

                        <Col className="template-col-wrapper">
                            <h1 className="page-title-text">Discovered Planets</h1>
                            {this.buildPlanets()}
                        </Col>

                    </Row>

                </Container>
                </SplashGalaxyBackground>
            </Container>
        </React.Fragment>


    }

}


export default PlanetPage;