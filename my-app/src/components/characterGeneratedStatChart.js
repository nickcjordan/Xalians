import React, { PureComponent } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

class CharacterGeneratedStatChart extends React.Component {

    state = {
    }

    componentDidMount() {
    }

    render() {
        let transMap = new Map();
        transMap["standardAttackRating"] = "Attack";
        transMap["specialAttackRating"] = "Sp. Attack";
        transMap["standardDefenseRating"] = "Defense";
        transMap["specialDefenseRating"] = "Sp. Defense";
        transMap["speedRating"] = "Speed";
        transMap["evasionRating"] = "Evasion";
        transMap["staminaRating"] = "Stamina";
        transMap["recoveryRating"] = "Recovery";

        transMap["standardAttackPoints"] = "Standard Attack";
        transMap["specialAttackPoints"] = "Special Attack";
        transMap["standardDefensePoints"] = "Standard Defense";
        transMap["specialDefensePoints"] = "Special Defense";
        transMap["speedPoints"] = "Speed";
        transMap["evasionPoints"] = "Evasion";
        transMap["staminaPoints"] = "Stamina";
        transMap["recoveryPoints"] = "Recovery";

        transMap["low"] = "Low";
        transMap["medium"] = "Medium";
        transMap["high"] = "High";
        
        let valMap = new Map();
        valMap["low"] = 1;
        valMap["medium"] = 2;
        valMap["high"] = 3;


        let x = this.props.xalian;

        var dataSet = [];
        for (var key in x.stats) {
            let stat = x.stats[key];
            let translated = transMap[key];
            let rangeVal = parseInt(valMap[stat.range]) * 250;
            if (translated) {
                dataSet.push({
                    statName: key,
                    statLabel: transMap[key],
                    rangeName: transMap[stat.range],
                    rangeNumber: rangeVal,
                    points: stat.points,
                    percentageText: stat.points + ' Points, ' + stat.percentage + '%'
                });
            }
        }

        return (
            <div class="expanded-chart-div centered-view">
                <ResponsiveContainer className="chart-container centered-view">
                    <BarChart
                        data={dataSet}
                        layout="vertical"
                        maxBarSize={35}
                    >
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="statLabel" stroke="#80ffb1" />
                        <Tooltip />

                        <Bar dataKey="rangeNumber" fill="#ecff8234" >
                            <LabelList dataKey="rangeName" position="center" fill="white" className="chart-bar-label" id="stat-bar-label"/>
                        </Bar>
                        <Bar dataKey="points" fill="#80dbff34" >
                            <LabelList dataKey="percentageText" position="center" fill="white" className="chart-bar-label" id="stat-bar-label"/>
                        </Bar>
                        {/* <Bar dataKey="percentage" fill="#80dbff34" >
                            <LabelList dataKey="percentage" position="center" fill="white" className="chart-bar-label" id="stat-bar-label"/>
                        </Bar> */}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

}


export default CharacterGeneratedStatChart;