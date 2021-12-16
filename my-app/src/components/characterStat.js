import React from 'react'
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table'

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

    buildRow(val) {
        return  <tr>
                    <td>{this.translateStatName(val.name)}</td>
                    <td>{val.range}</td>
                    <td>{val.points}</td>
                    <td>{val.percentage}%</td>
                </tr>
    }

    render() {
        let list = [];
        for (const key in this.props.stats) {
            let val = this.props.stats[key];
            list.push(this.buildRow(val));
        }

        // return <Table striped bordered hover variant="dark" size="sm" className="stat-table">
        return <Table hover variant="dark" bordered size="sm" className="stat-table">
            <thead>
                <tr>
                    <th>Stat</th>
                    <th>Range</th>
                    <th>Points</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
                {list}
            </tbody>
        </Table>;
    }

}

export default CharacterStats;