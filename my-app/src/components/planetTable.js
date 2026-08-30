import React from 'react'
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import TextReaderModal from '../components/textReaderModal';
import * as constants from '../constants/colorConstants';
import * as styleUtil from '../utils/styleUtil';
import { Hub } from 'aws-amplify';
import XalianSpeciesBadge from './xalianSpeciesBadge';

class PlanetTable extends React.Component {

  state = { showing: false }

  buildRow(key, val) {
    return <tr>
      <th scope="row">{key}:</th>
      <td>{val}</td>
    </tr>
  }

  toggleShowHistory = () => {
    if (!this.state.showing) {
      Hub.dispatch('navbar-channel', { event: 'hide-navbar', data: null, message: null });
    } else {
      Hub.dispatch('navbar-channel', { event: 'show-navbar', data: null, message: null });
    }
    this.setState({ showing: !this.state.showing });
  }

  hideHistory = () => {
    Hub.dispatch('navbar-channel', { event: 'show-navbar', data: null, message: null });
    this.setState({ showing: false });
  }

  getHistoryParagraphs(history) {
    let images = ["assets/img/background/castle.jpg", "assets/img/background/castle.jpg", "assets/img/background/castle.jpg"]
    var result = [];
    var tempImage = null;
    history.forEach(para => {
      if (tempImage) {
        result.push(<p>{para} <img src={tempImage} style={{ float: 'left', maxWidth: '25vw', width: '100px', padding: '5px' }} /></p>);
        tempImage = null;
      } else if (para.toString().includes('IMAGE_INSERT:')) {
        tempImage = para.replace('IMAGE_INSERT:', '');
      } else {
        result.push(<p>{para}</p>);
      }
    });
    return result;
  }



  render() {
    let list = [];
    for (const key in this.props.planet.data) {
      let val = this.props.planet.data[key];
      if (key.toLowerCase() != 'type') {
        list.push(this.buildRow(key, val));
      }
    }

    return (
		<React.Fragment>
			{/* a panel is matte metal: the element shows as a painted band along the
			    top edge rather than as a glow bleeding out of the card */}
			<Container className={`g-panel g-panel--tagged g-el-${this.props.planet.data.Type.toLowerCase()} planet-panel`} >
				<Row className="planet-details-row vertically-center-contents">
					<Col xs={12} md={3} className="planet-details-row-col">
						<img src={this.props.planet.planetImage} class="planet-gif" alt=""></img>
					</Col>
					<Col xs={12} md={6} className="planet-description-col">
						<Row className="planet-title-row">
							<Col xs={12}>
								{/* a planet name is stencilled on the plate, not glowing */}
								<h2 className="g-h2">{this.props.planet.name}</h2>
							</Col>
                <Col xs={12}>
                  <XalianSpeciesBadge type={this.props.planet.data.Type.toLowerCase()} />
								</Col>
							{this.props.planet.history && this.props.planet.history.length > 0 && (
								<Col xs={12}>
									<h6 className="planet-history-link" onClick={this.toggleShowHistory}>
										<i class="bi bi-book"> </i><span style={{ fontStyle: 'italic', textDecoration: 'underline' }}>Read the Story of {this.props.planet.name}</span>
									</h6>
								</Col>
							)}
						</Row>
            {/* <Row style={{ marginBottom: '10px' }} >
            </Row> */}
						<div class="planet-table">
							<table class="planet-table">
								<tbody>{list}</tbody>
							</table>
						</div>
					</Col>
					<Col xs={12} md={3} className="planet-details-row-col">
						<img src={this.props.planet.image} className="planet-img img-fluid" alt=""></img>
					</Col>
				</Row>

				{/* <Row className="planet-details-row vertically-center-contents">
            {this.getPlanetHistory()}
        </Row> */}
			</Container>

			{this.props.planet.history && 
        <TextReaderModal 
          title={'The History of ' + this.props.planet.name} 
          body={this.getHistoryParagraphs(this.props.planet.history)} 
          show={this.state.showing}
          light
          onHide={this.hideHistory}>
        </TextReaderModal>
      }
		</React.Fragment>
	);
  }

  
  
}



export default PlanetTable;

