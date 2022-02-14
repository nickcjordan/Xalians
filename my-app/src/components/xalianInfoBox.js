import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import Col from 'react-bootstrap/Col';
import XalianSpeciesBadge from './xalianSpeciesBadge';
import Modal from 'react-bootstrap/Modal';

class XalianInfoBox extends React.Component {

	state = {
		jsonModalShow: false
	}

	render() {
		return (
			<React.Fragment>
				{this.props.xalian && (
					<Col className="vertically-center-contents xalian-info-box">
						<Stack>
							<h1 className="species-detail-name ">{this.props.xalian.species.name}</h1>
							<h4 className="species-detail-id">#{this.props.xalian.speciesId}</h4>
							<XalianSpeciesBadge type={this.props.xalian.elements.primaryType} />
							<XalianSpeciesBadge type={this.props.xalian.elements.secondaryType} />
							{this.props.json && (
								<div className="centered-view">
									<button className="json-modal-button" onClick={() => this.setState({ jsonModalShow: true })}>
										<i class="bi bi-file-earmark-binary"></i>
									</button>
								</div>
							)}
						</Stack>
					</Col>
				)}
				{this.props.species && (
					<Col className="vertically-center-contents xalian-info-box">
						<Stack>
							<h1 className="species-detail-name ">{this.props.species.name}</h1>
							<h4 className="species-detail-id">#{this.props.species.id}</h4>
							<XalianSpeciesBadge type={this.props.species.type} />
							{this.props.json && (
								<div className="centered-view">
									<button className="json-modal-button" onClick={() => this.setState({ jsonModalShow: true })}>
										<i class="bi bi-file-earmark-binary"></i>
									</button>
								</div>
							)}
						</Stack>
					</Col>
				)}

			{this.props.json && 
				<Modal show={this.state.jsonModalShow} onHide={() => this.setState({ jsonModalShow: false })} size="lg" aria-labelledby="contained-modal-title-vcenter" centered className="themed-modal">
					<Modal.Header closeButton closeVariant='white'>
						<Modal.Title id="contained-modal-title-vcenter">{this.props.xalian ? this.props.xalian.species.name : this.props.species ? this.props.species.name : 'Xalian'} JSON Details</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<pre>{this.props.json}</pre>
					</Modal.Body>
				</Modal>
			}
			</React.Fragment>
		);
	}
}

export default XalianInfoBox;
