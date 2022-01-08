import React from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class PlanetTable extends React.Component {

  buildRow(key, val) {
    return <tr>
      <th scope="row">{key}:</th>
      <td>{val}</td>
    </tr>
  }

  getTitle() {
    return <h4>{this.props.title}</h4>
  }

  render() {
    let list = [];
    for (const key in this.props.data) {
      let val = this.props.data[key];
      list.push(this.buildRow(key, val));
    }

    return <React.Fragment>

      <Container className="dark-section-div">

        <Row className="planet-details-row vertically-center-contents">
          <Col sm={3} className="planet-details-row-col">
            <img src={this.props.planetImage} class="planet-gif" alt=""></img>
          </Col>
          <Col sm={6} className="planet-description-col">
            <Row className="planet-title-row">
              <Col>
                <h2>{this.props.name}</h2>
              </Col>
            </Row>
            <div class="planet-table">
              {this.props.title && this.getTitle()}

              <table class="planet-table">
                <tbody>
                  {list}
                </tbody>
              </table>

            </div>
          </Col>
          <Col sm={3}>
            <img src={this.props.image} class="planet-img img-fluid" alt=""></img>
          </Col>
        </Row>
      </Container>

    </React.Fragment>;
  }




}

export default PlanetTable;

