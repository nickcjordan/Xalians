import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class XalianMoveSet extends React.Component {
	buildMoveRow(val) {
		return (
			<Row style={{ paddingTop: this.props.spacing || '5px', paddingBottom: this.props.spacing || '5px' }} className="moves-row ms-auto me-auto ">
				<Row>
					<Col xs={2} className="move-rating-col">
						<h4 className="move-rating">{val.rating}</h4>
					</Col>
					<Col xs={true} className="">
						<Row>
							<h5 className="move-name">{val.name}</h5>
						</Row>
					</Col>
					{this.props.showDescription && (
						<Col lg={6} className="">
							<Row>
								<h6 className="move-description">{val.description}</h6>
							</Row>
						</Col>
					)}
				</Row>
				{/* {this.props.showDescription && (
					<Row>
						<h6 className="move-description">{val.description}</h6>
					</Row>
				)} */}
			</Row>
		);
	}

	render() {
		let list = [];
		this.props.moves.forEach((move) => {
			list.push(this.buildMoveRow(move));
		});
		return <div className="xalian-move-set-wrapper padded-row">{list}</div>;
	}
}

export default XalianMoveSet;
