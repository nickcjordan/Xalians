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
                            <Col className="species-detail-chart-header">Primary Element Type:</Col>
                            <Col className="species-detail-chart-text">
                                {this.props.xalian.elements.primaryType} [{this.props.xalian.elements.primaryElement}]
                            </Col>
                        </Row>
                        <Row>
                            <Col className="species-detail-chart-header">Secondary Element Type:</Col>
                            <Col className="species-detail-chart-text">
                                {this.props.xalian.elements.secondaryType} [{this.props.xalian.elements.secondaryElement}]
                            </Col>
                        </Row>
                    </React.Fragment>
                }
                {this.props.xalian && this.props.xalian.species && 
                    <React.Fragment>
                        <Row>
                            <Col className="species-detail-chart-header">Generation:</Col>
                            <Col className='species-detail-chart-text'>{this.props.xalian.species.generation}</Col>
                        </Row>
                        <Row>
                            <Col className="species-detail-chart-header">Origin Planet:</Col>
                            <Col className="species-detail-chart-text">{this.props.xalian.species.planet}</Col>
                        </Row>
                        <Row>
                            <Col className="species-detail-chart-header">Avg Height:</Col>
                            <Col className="species-detail-chart-text">{this.props.xalian.species.height}</Col>
                        </Row>
                        <Row>
                            <Col className="species-detail-chart-header">Avg Weight:</Col>
                            <Col className="species-detail-chart-text">{this.props.xalian.species.weight}</Col>
                        </Row>
                    </React.Fragment>
                }
                {this.props.species && 
                    <React.Fragment>
                        <Row>
                            <Col className="species-detail-chart-header">Generation:</Col>
                            <Col className='species-detail-chart-text'>{this.props.species.generation || '0'}</Col>
                        </Row>
                        <Row>
                            <Col className="species-detail-chart-header">Origin Planet:</Col>
                            <Col className="species-detail-chart-text">{this.props.species.planet}</Col>
                        </Row>
                        <Row>
                            <Col className="species-detail-chart-header">Avg Height:</Col>
                            <Col className="species-detail-chart-text">{this.props.species.height}</Col>
                        </Row>
                        <Row>
                            <Col className="species-detail-chart-header">Avg Weight:</Col>
                            <Col className="species-detail-chart-text">{this.props.species.weight}</Col>
                        </Row>
                    </React.Fragment>
                }
                {this.props.xalian && this.props.xalian.meta &&
                    <React.Fragment>

                    <Row>
                        <Col className="species-detail-chart-header">Total Stat Points:</Col>
                        <Col className="species-detail-chart-text">{this.props.xalian.meta.totalStatPoints}</Col>
                    </Row>
                    <Row>
                        <Col className="species-detail-chart-header">Avg Stat Percentage:</Col>
                        <Col className="species-detail-chart-text">{this.props.xalian.meta.avgPercentage}</Col>
                    </Row>
                    </React.Fragment>
                }
			</div>
		);
	}
}

export default XalianAttributeChart;
