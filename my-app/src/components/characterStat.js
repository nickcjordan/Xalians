import React from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class CharacterStats extends React.Component {

    state = {
        translationMap: null
    }

    componentDidMount() {
        let transMap = new Map();
        transMap["standardAttackPoints"] = "Standard Attack";
        transMap["specialAttackPoints"] = "Special Attack";
        transMap["standardDefensePoints"] = "Standard Defense";
        transMap["specialDefensePoints"] = "Special Defense";
        transMap["speedPoints"] = "Speed";
        transMap["evasionPoints"] = "Evasion";
        transMap["staminaPoints"] = "Stamina";
        transMap["recoveryPoints"] = "Recovery";
        this.setState({translationMap: transMap})
    }

    translateStatName(key) {
        if (this.state.translationMap != null) {
            return this.state.translationMap[key];
        } else {
            return null;
        }
    }

    buildRow(key, val) {
        return <Row className="stat-row">
                <Col xs={8}>
                        <div className="d-flex justify-content-between align-items-start stat-name-col">
                            {this.translateStatName(key)}
                        </div>
                </Col>
                <Col xs={4}>
                    <div className="stat-rating-col">
                        {val}
                    </div>
                </Col>
            </Row>;
    }

    render() {
        let list = [];
        for (const key in this.props.stats) {
            let val = this.props.stats[key];
            list.push(this.buildRow(key, val));
        }
        return list;
    }

}

export default CharacterStats;


// let i = <ListGroup.Item as="li" className="d-flex justify-content-between align-items-start stat-list-item">
//                 <div className="ms-2 me-auto">
//                     <div className="fw-bold">{key}</div>
//                 </div>
//                 <Badge variant="primary" pill>{val}</Badge>
//             </ListGroup.Item>;