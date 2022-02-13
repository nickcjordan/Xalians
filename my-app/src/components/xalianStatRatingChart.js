import React, { PureComponent } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import * as valueTranslator from '../utils/valueTranslator';

class XalianStatRatingChart extends React.Component {
	state = {};

	componentDidMount() {
		this.setState({ data: this.setupData(this.props.stats) });
	}

	setupData = (stats) => {
		if (!stats) {
			return [];
		}

		var dataSet = [];
		var statMap = new Map();
		for (var key in stats) {
            let val = stats[key];
            if (val) {
                let data = this.buildStatSet(key, stats[key]);
                if (data.statName) {
                    statMap[key] = data;
                }
            }
		}
        var headers = ['standardAttackRating', 'specialAttackRating', 'standardDefenseRating', 'specialDefenseRating', 'speedRating','evasionRating', 'staminaRating', 'recoveryRating']
		
        headers.forEach(header => {
            if (statMap[header]) {
                dataSet.push(statMap[header]);
            }
        });
		return dataSet;
	};



	buildStatSet = (key, val) => {
		let translated = this.props.abbreviatedNames ? valueTranslator.statFieldToDescriptionCondensed(key) : valueTranslator.statFieldToDescription(key);
		let rangeVal = valueTranslator.statRangeToScaledVal(val);
		let rangeName = valueTranslator.statFieldToDescription(val);
        return {
			statName: key,
			statLabel: translated,
			rangeName: rangeName + ' Range',
			rangeNumber: rangeVal
		};
	};

	render() {
		return (
			<div className={(this.props.moreClasses || '') + " centered-view"}>
				{this.props.stats && (
					<ResponsiveContainer className="chart-container centered-view">
						<BarChart data={this.state.data} layout="vertical" maxBarSize={this.props.barSize || 35}>
							<XAxis type="number" hide />
							<YAxis width={60} type="category" dataKey="statLabel" stroke={this.props.axisLabelColor || '#ffffff'} interval={0} />

								<Bar radius={[10, 10, 10, 10]} isAnimationActive={false} animationBegin={50} dataKey="rangeNumber" fill="#ecff8234">
									{this.props.includeLabel && <LabelList dataKey="rangeName" position={this.props.labelPosition || 'center'} fill="white" style={{ fontSize: this.props.labelFontSize || '12pt' }} className="chart-bar-label" />}
									{this.state.data && this.state.data.map((val, index) => <Cell key={`cell-${index}`} fill={valueTranslator.statFieldToBarColor(val.statName)} />)}
								</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		);
	}
}

export default XalianStatRatingChart;
