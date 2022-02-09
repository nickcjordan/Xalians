import React, { PureComponent } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';



class CharacterStatRangeChart extends React.Component {

    render() {

        let x = this.props.xalian;

        let valMap = new Map();
        valMap["low"] = 1;
        valMap["medium"] = 2;
        valMap["high"] = 3;

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

        let stats = x.statRatings;
        var dataSet = [];
        for (var key in stats) {
            let val = stats[key];
            let translated = transMap[key];
            let intVal = valMap[val];
            if (translated && val) {
                // if (translated) {
                dataSet.push({
                    statName: key,
                    statLabel: translated,
                    valueName: val,
                    valueNumber: intVal
                });
            }
        }

        return (
            <div class="chart-div centered-view">
                <ResponsiveContainer className="chart-container centered-view">
                    <BarChart
                        data={dataSet}
                        layout="vertical"
                        maxBarSize={35}
                    >
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="statLabel" stroke="#80ffb1" />
                        {/* <Tooltip /> */}

                        <Bar 
                        dataKey="valueNumber" 
                        fill="#80ffb134" 
                        
                        >
                            <LabelList dataKey="valueName" position="center" fill="white" className="chart-bar-label" id="stat-bar-label"/>
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
}


export default CharacterStatRangeChart;