import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';

class XalianAttributeChart extends React.Component {
	render() {
		return (
			<div className="species-detail-chart">
                {this.props.xalian && this.props.xalian.elements && 
                    <React.Fragment>
                        <Row>
                            <Col className="x-detail-label">Primary Element:</Col>
                            <Col className="x-detail-value">
                                {this.props.xalian.elements.primaryType} [{this.props.xalian.elements.primaryElement}]
                            </Col>
                        </Row>
                        <Row>
                            <Col className="x-detail-label">Secondary Element:</Col>
                            <Col className="x-detail-value">
                                {this.props.xalian.elements.secondaryType} [{this.props.xalian.elements.secondaryElement}]
                            </Col>
                        </Row>
                    </React.Fragment>
                }
                {this.props.xalian && this.props.xalian.species && 
                    <React.Fragment>
                        <Row>
                            <Col className="x-detail-label">Generation:</Col>
                            <Col className="x-detail-value">{this.props.xalian.species.generation}</Col>
                        </Row>
                        <Row>
                            <Col className="x-detail-label">Origin Planet:</Col>
                            <Col className="x-detail-value">{this.props.xalian.species.planet}</Col>
                        </Row>
                        <Row>
                            <Col className="x-detail-label">Avg Height:</Col>
                            <Col className="x-detail-value">{this.props.xalian.species.height}</Col>
                        </Row>
                        <Row>
                            <Col className="x-detail-label">Avg Weight:</Col>
                            <Col className="x-detail-value">{this.props.xalian.species.weight}</Col>
                        </Row>
                    </React.Fragment>
                }
                {this.props.species && 
                    <React.Fragment>
                        <Row>
                            <Col className="x-detail-label">Generation:</Col>
                            <Col className="x-detail-value">{this.props.species.generation || '0'}</Col>
                        </Row>
                        <Row>
                            <Col className="x-detail-label">Origin Planet:</Col>
                            <Col className="x-detail-value">{this.props.species.planet}</Col>
                        </Row>
                        <Row>
                            <Col className="x-detail-label">Avg Height:</Col>
                            <Col className="x-detail-value">{this.props.species.height}</Col>
                        </Row>
                        <Row>
                            <Col className="x-detail-label">Avg Weight:</Col>
                            <Col className="x-detail-value">{this.props.species.weight}</Col>
                        </Row>
                    </React.Fragment>
                }
                {this.props.xalian && this.props.xalian.meta &&
                    <React.Fragment>

                    {/* <Row>
                        <Col className="x-detail-label">Total Stat Points:</Col>
                        <Col className="x-detail-value">{this.props.xalian.meta.totalStatPoints}</Col>
                    </Row>
                    <Row>
                        <Col className="x-detail-label">Potential Stat Points:</Col>
                        <Col className="x-detail-value">{this.props.xalian.meta.potentialStatPoints}</Col>
                    </Row> */}
                    <Row>
                        <Col className="x-detail-label">Stat Score:</Col>
                        <Col className="x-detail-value">{this.props.xalian.meta.statScore}</Col>
                    </Row>
                    <Row>
                        <Col className="x-detail-label">Stat Potential Score:</Col>
                        <Col className="x-detail-value">{this.props.xalian.meta.potentialStatScore}</Col>
                    </Row>
                    </React.Fragment>
                }
			</div>
		);
	}
}

export default XalianAttributeChart;
