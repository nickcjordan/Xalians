import React, { PureComponent } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';

class XalianDuelStatChart extends React.Component {
	state = {};

	setupData = (xalian) => {
		if (!xalian) {
			return [];
		}
        let stats = xalian.stats;
        let traits = xalian.traits;

		var dataSet = [];
		var statMap = new Map();
		for (var key in stats) {
            let val = stats[key];
            if (val) {
                let data = this.buildStatSet(key, val);
                if (data.statName) {
                    statMap[key] = data;
                }
            }
		}
        var headers = ['attack', 'defense', 'range', 'distance', 'evasion'];

        
		
        headers.forEach(header => {
            if (statMap[header]) {
                dataSet.push(statMap[header]);
            }
        });
		return dataSet;
	};



	buildStatSet = (key, val) => {
        var translationMap = new Map();
        translationMap['attack'] = 'Attack';
        translationMap['defense'] = 'Defense';
        translationMap['range'] = 'Attack Range';
        translationMap['distance'] = 'Move Distance';
        translationMap['evasion'] = 'Evasion';
        return {
			statName: key,
			statLabel: translationMap[key],
			statValue: val
		};
	};

    render() {
        if (this.props.xalian) {

            let data = this.setupData(this.props.xalian);
            return (
                <div className={(this.props.moreClasses || '') + " centered-view"}>
                        <ResponsiveContainer className="chart-container centered-view">
                            <BarChart data={data} layout="vertical" maxBarSize={this.props.barSize || 35}>
                                <XAxis type="number" hide />
                                <YAxis width={60} type="category" dataKey="statLabel" stroke={this.props.axisLabelColor || '#ffffff'} interval={0} />

                                <Bar radius={[10, 10, 10, 10]} isAnimationActive={false} animationBegin={50} dataKey="statValue" fill="#ecff8234">
                                    <LabelList dataKey="statValue" position={this.props.labelPosition || 'center'} fill="white" style={{ fontSize: this.props.labelFontSize || '12pt' }} className="chart-bar-label" />
                                    {data && data.map((val, index) => <Cell key={`cell-${index}`} fill={'blue'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                </div>
            );
        }
    }
}

export default XalianDuelStatChart;
