import React from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

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
        return  <TableRow key={val.name}>
                    <TableCell>{this.translateStatName(val.name)}</TableCell>
                    <TableCell>{val.range}</TableCell>
                    <TableCell>{val.points}</TableCell>
                    <TableCell>{val.percentage}%</TableCell>
                </TableRow>
    }

    render() {
        let list = [];
        for (const key in this.props.stats) {
            let val = this.props.stats[key];
            list.push(this.buildRow(val));
        }

        return <Table className="stat-table">
            <TableHeader>
                <TableRow>
                    <TableHead>Stat</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Result</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list}
            </TableBody>
        </Table>;
    }

}

export default CharacterStats;