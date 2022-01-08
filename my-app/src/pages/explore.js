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


class ExplorePage extends React.Component {

    state = {
        xalian: null,
        isLoading: true
    }

    componentDidMount() {
        this.getXalian();
    }

    render() {
        return <React.Fragment>
            <div className="App">
                <header className="content-background-container">
                    <XalianNavbar></XalianNavbar>


                    {(this.state.xalian == null) && <p>Thinking...</p>}

                    {!this.xalianisNull() &&
                        <React.Fragment>



                            <Container fluid className="whole-container">
                                <Row className="d-flex align-items-center">
                                    <Col md={true} className="title-col">
                                        <Row>
                                            <article className="species-title">{this.state.xalian.species.name}</article>
                                            <h4 class="species-description">Generation 0</h4>
                                            <h4 class="light-text">Point Total: {this.state.xalian.meta.totalStatPoints} : {this.state.xalian.meta.avgPercentage}%</h4>
                                        </Row>
                                        <Row>
                                            <h2>
                                                {this.state.xalian.elements.primaryType} [{this.state.xalian.elements.primaryElement}]
                                            </h2>
                                        </Row>
                                        {this.state.xalian.elements.secondaryType && 
                                            <React.Fragment>
                                            <h3>
                                                {this.state.xalian.elements.secondaryType} [{this.state.xalian.elements.secondaryElement}]
                                            </h3>
                                            </React.Fragment>
                                        }
                                        <Row>
                                            <div className="species-description-div">
                                                <h4 className="species-description">
                                                    {this.state.xalian.species.description}
                                                </h4>
                                            </div>
                                        </Row>
                                    </Col>
                                    <Col md={true}>
                                        <Image src={this.getImageLocationFromSpecies(this.state.xalian.species.name)} rounded className={this.getTypeColorClassName() + " xalian-image"} />
                                    </Col>
                                </Row>
                                <Row className="d-flex align-items-center">
                                    <Col sm={6}>
                                        <CharacterMoves stats={this.state.xalian.moves}></CharacterMoves>
                                    </Col>
                                    <Col lg={6}>
                                        <CharacterStats stats={this.state.xalian.stats}></CharacterStats>
                                    </Col>
                                </Row>
                            </Container>
                        </React.Fragment>
                    }
                </header>
            </div>
            {this.state.isLoading && <div id="preloader"></div>}
        </React.Fragment>;
    }

    getTypeColorClassName() {
        return `${this.state.xalian.elements.primaryType.toLowerCase()}-color`;
    }

    getXalian() {
        const url = "https://api.xalians.com/xalian";
        axios.get(url)
            .then(response => {
                var xalianObject = response.data;
                this.setState({
                    xalian: xalianObject,
                    isLoading: false
                })
                console.log(JSON.stringify(xalianObject, null, 2))
            }
            );
    }

    xalianisNull() {
        let x = this.state.xalian;
        let isNull = (x == null) || (x == undefined);
        if (!isNull) {
            console.log(JSON.stringify(x, null, 2));
        }
        return isNull;
    }

    getImageLocationFromSpecies(name) {
        return `assets/img/xalians/xalians_icon_${name.toLowerCase()}.png`;
    }

}
export default ExplorePage;