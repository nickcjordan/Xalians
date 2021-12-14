import logo from './logo.svg';
import './App.css';
import React from 'react'
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import CharacterStats from './components/characterStat';
import CharacterMoves from './components/characterMove';

class App extends React.Component {

  state = {
    xalian: null
  }
  
  componentDidMount() {
    this.getXalian();
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

  render() {
    return (
      <div className="App">
        <header className="App-header">

            { (this.state.xalian == null) && <p>Thinking...</p> }

            { !this.xalianisNull() && 
              <React.Fragment>



              <Container fluid className="whole-container">
                <Row className="d-flex align-items-center stat-row">
                  <Col sm={true} className="title-col">
                    <Row>
                      <article className="species-title">{this.state.xalian.species.name}</article>
                      <span style={{color: 'lightgray', fontSize: '12pt'}}>{this.state.xalian.meta.totalStatPoints} : {this.state.xalian.meta.avgPercentage}%</span>
                    </Row>
                    <Row style={{paddingBottom: 50}}>
                      <span className="elements">
                        <span className="large-brackets">[  </span>
                        {this.getString(this.state.xalian.elements)}
                        <span className="large-brackets">  ]</span>
                      </span>
                    </Row>
                    <Row style={{paddingBottom: 50}}>
                      <div className="species-description-div">
                        <span className="species-description">
                          {this.state.xalian.species.description}
                        </span>
                      </div>
                    </Row>
                  </Col>
                  <Col lg>
                    <CharacterStats stats={this.state.xalian.stats}></CharacterStats>
                  </Col>
                </Row>
                <Row>
                  <Col sm={6}>
                <CharacterMoves stats={this.state.xalian.moves}></CharacterMoves>
                  </Col>
                  <Col sm={6}>
                  </Col>
                </Row>
              </Container>







              

              

              

              

              </React.Fragment>
            } 
              {/* <div>
                <Button onClick={this.getXalian} className="generateButton" variant="outline-success">Generate Xalian</Button>{' '}
              </div> */}
          
        </header>
      </div>
    );
  }
}


export default App;
