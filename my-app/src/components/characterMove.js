import React from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class CharacterMoves extends React.Component {

    buildMoveRow(val) {
        return <React.Fragment>
            <Row className="moves-row">
                <Col xs={2}>
                    <div className="d-flex justify-content-between align-items-center move-rating">
                        {val.rating}
                    </div>
                </Col>
                <Col xs={10}>
                    <Row>
                        <div className="d-flex justify-content-between align-items-center move-name">
                            {val.name}
                        </div>
                    </Row>
                    <Row>
                        <div className="d-flex align-items-center move-description">
                            {val.description}
                        </div>
                    </Row>
                </Col>

            </Row>
        </React.Fragment>
    }

    render() {
        let list = [];
        for (const key in this.props.stats) {
            let val = this.props.stats[key];
            list.push(this.buildMoveRow(val));
        }
        return list;
    }

  
    

}

export default CharacterMoves;