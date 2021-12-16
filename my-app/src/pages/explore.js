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


class ExplorePage extends React.Component {

    state = {
        xalian: null
      }
      
      componentDidMount() {
        this.getXalian();
      }

      render() {
          return <React.Fragment>
              <div className="App">
                  <header className="App-header">

                      {(this.state.xalian == null) && <p>Thinking...</p>}

                      {!this.xalianisNull() &&
                          <React.Fragment>



                              <Container fluid className="whole-container">
                                  <Row className="d-flex align-items-center stat-row">
                                      <Col sm={true} className="title-col">
                                          <Row>
                                              <article className="species-title">{this.state.xalian.species.name}</article>
                                              <span style={{ color: 'lightgray', fontSize: '12pt' }}>Point Total: {this.state.xalian.meta.totalStatPoints} : {this.state.xalian.meta.avgPercentage}%</span>
                                          </Row>
                                          <Row style={{ paddingBottom: 50 }}>
                                              <span className="elements">
                                                  <span className="large-brackets">[  </span>
                                                  {this.getString(this.state.xalian.elements)}
                                                  <span className="large-brackets">  ]</span>
                                              </span>
                                          </Row>
                                          <Row style={{ paddingBottom: 50 }}>
                                              <div className="species-description-div">
                                                  <span className="species-description">
                                                      {this.state.xalian.species.description}
                                                  </span>
                                              </div>
                                          </Row>
                                      </Col>
                                      <Col lg>
                                        <Image src={this.getImageLocationFromSpecies(this.state.xalian.species.name)} rounded className="xalian-image"/>
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
          </React.Fragment>;
      }

    getXalian() {
        const url = "https://api.xalians.com/xalian";
        axios.get(url)
          .then(response => {
            var xalianObject = response.data;
            this.setState({ xalian: xalianObject })
            console.log(JSON.stringify(xalianObject, null, 2))
          }
        );
      }
    
      getString(list) {
        return list.reduce((a, b, index) => a + ", " + b, "").slice(2);
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