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

  render() {
    return (
      <div className="App">
        <header className="App-header">

            { (this.state.xalian == null) && <p>Thinking...</p> }

            { (this.state.xalian != null) && 
              <React.Fragment>



              <Container fluid="md">
                <Row className="d-flex align-items-center stat-row">
                  <Col sm={true}>
                    <div className="species-title">
                      <article>{this.state.xalian.species.name}</article>
                    </div>
                    <div className="elements">
                      {this.getString(this.state.xalian.elements)}
                    </div>
                  </Col>
                  <Col sm={true}>
                    <CharacterStats stats={this.state.xalian.stats}></CharacterStats>
                  </Col>
                </Row>
                <CharacterMoves stats={this.state.xalian.moves}></CharacterMoves>
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
