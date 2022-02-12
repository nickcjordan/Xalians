import React, { PureComponent } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import XalianImage from '../xalianImage';
import * as valueTranslator from '../../utils/valueTranslator';

class XalianStatRowView extends React.Component {
	state = {};

	componentDidMount() {
		this.setState({ data: this.setupData(this.props.xalian.attributes) });
	}

	setupData = (x) => {
		if (!x) {
			return [];
		}

		var dataSet = [];
		var statMap = new Map();
		for (var key in x.stats) {
			let data = this.buildStatSet(key, x.stats[key]);
			if (data.statName) {
				statMap[key] = data;
			}
		}
		dataSet.push(statMap['standardAttackPoints']);
		dataSet.push(statMap['specialAttackPoints']);
		dataSet.push(statMap['standardDefensePoints']);
		dataSet.push(statMap['specialDefensePoints']);
		dataSet.push(statMap['speedPoints']);
		dataSet.push(statMap['evasionPoints']);
		dataSet.push(statMap['staminaPoints']);
		dataSet.push(statMap['recoveryPoints']);
		return dataSet;
	};

	buildStatSet = (key, stat) => {
		let translated = this.props.abbreviatedNames ? valueTranslator.statFieldToDescriptionCondensed(key) : valueTranslator.statFieldToDescription(key);
		let rangeVal = valueTranslator.statRangeToScaledVal(stat.range);
		let rangeName = valueTranslator.statFieldToDescription(stat.range);
		let percentageText = this.props.longDescription ? stat.points + ' Points, ' + stat.percentage + '%' : stat.points;
		return {
			statName: key,
			statLabel: translated,
			rangeName: rangeName,
			rangeNumber: rangeVal,
			points: stat.points,
			percentageText: percentageText,
		};
	};

	render() {
		let x = this.props.xalian.attributes;

		return (
			<div classname="xalian-stat-row-view-wrapper">
				<Row>
					<Col>name</Col>
					<Col>
						<XalianImage colored bordered speciesName={x.species.name} speciesType={x.elements.primaryType} moreClasses="xalian-image-grid" />
					</Col>
					<Col>
						<div class="condensed-chart-div centered-view">
							{this.props.xalian && (
								<ResponsiveContainer className="chart-container centered-view">
									<BarChart data={this.state.data} layout="vertical" maxBarSize={this.props.barSize || 35}>
										<XAxis type="number" hide />
										{/* <YAxis width={60} type="category" dataKey="statLabel" stroke="#80ffb1" interval={0}/> */}
                                        <YAxis width={60} type="category" dataKey="statLabel" stroke="#ffffff" interval={0}/>

										{this.props.includeRange && (
											<Bar isAnimationActive={false} animationBegin={50} dataKey="rangeNumber" fill="#ecff8234">
												{this.props.includeLabel && <LabelList dataKey="rangeName" position={this.props.labelPosition || "center"} fill="white" style={{ fontSize: this.props.labelFontSize || '12pt' }} className="chart-bar-label" />}
												{this.state.data && this.state.data.map((entry, index) => <Cell key={`cell-${index}`} fill={valueTranslator.statFieldToBarColor(entry.statName)} />)}
											</Bar>
										)}
										<Bar isAnimationActive={false} animationBegin={50} dataKey="points" fill="#80dbff34">
											{this.props.includeLabel && <LabelList dataKey="percentageText" position={this.props.labelPosition || "center"} fill="white" style={{ fontSize: this.props.labelFontSize || '12pt' }} className="chart-bar-label" />}
											{this.state.data && this.state.data.map((entry, index) => <Cell key={`cell-${index}`} fill={valueTranslator.statFieldToBarColor(entry.statName)} />)}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>
					</Col>
					<Col>moves</Col>
				</Row>
			</div>
		);
	}
}

export default XalianStatRowView;
