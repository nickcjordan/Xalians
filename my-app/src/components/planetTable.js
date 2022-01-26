import React from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

class PlanetTable extends React.Component {

  state = { showing: false }

  constructor() {
    super()
    this.toggleShowHistory = this.toggleShowHistory.bind(this);
  }

  buildRow(key, val) {
    return <tr>
      <th scope="row">{key}:</th>
      <td>{val}</td>
    </tr>
  }

  toggleShowHistory() {
    this.setState({ showing: !this.state.showing });
  }

  getHistoryParagraphs(history) {
    var result = [];
    history.forEach(para => {
      result.push(<p>{para}</p>);
    });
    return result;
  }

  getPlanetHistory(isShowing) {
    if (this.props.planet.history.length > 0) {
      if (isShowing) {
        return <React.Fragment>
        <Button className="planet-show-toggle-button" onClick={this.toggleShowHistory}>
          <div class="planet-history-wrapper">
            <h2>{this.props.planet.name} History</h2>
            {this.getHistoryParagraphs(this.props.planet.history)}
            <i class="bi bi-chevron-up"></i>
          </div>
        </Button>
      </React.Fragment>;
    } else {
      return <React.Fragment>
        <Button className="planet-show-toggle-button" onClick={this.toggleShowHistory}>
          <div class="planet-history-wrapper">
            <h2>{this.props.planet.name} History</h2>
            <i class="bi bi-chevron-down"></i>
          </div>
        </Button>
      </React.Fragment>;
    }
  }
  }

  render() {
    let list = [];
    for (const key in this.props.planet.data) {
      let val = this.props.planet.data[key];
      list.push(this.buildRow(key, val));
    }

    return <React.Fragment>

      <Container className="dark-section-div">

        <Row className="planet-details-row vertically-center-contents">
          <Col sm={3} className="planet-details-row-col">
            <img src={this.props.planet.planetImage} class="planet-gif" alt=""></img>
          </Col>
          <Col sm={6} className="planet-description-col">
            <Row className="planet-title-row">
              <Col>
                <h2>{this.props.planet.name}</h2>
              </Col>
            </Row>
            <div class="planet-table">
              <table class="planet-table">
                <tbody>
                  {list}
                </tbody>
              </table>
            </div>
          </Col>
          <Col sm={3} className="planet-details-row-col">
            <img src={this.props.planet.image} class="planet-img img-fluid" alt=""></img>
          </Col>
        </Row>

        <Row className="planet-details-row vertically-center-contents">
          <Col lg={true}>
            {this.getPlanetHistory(this.state.showing)}
          </Col>
        </Row>
      </Container>

    </React.Fragment>;
  }




}

export default PlanetTable;

