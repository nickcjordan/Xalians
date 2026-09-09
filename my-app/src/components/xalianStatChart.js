import React from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as valueTranslator from '../utils/valueTranslator';
import * as constants from '../constants/constants';
import { chart, ink } from '../constants/designTokens';

/**
 * A generated Xalian's eight stats as a horizontal bar chart, points plus
 * potential. Version 4 on the new stack: the wrapper is a flex column
 * instead of the retired `.centered-view`/`.chart-container` classes.
 * Recharts fills keep reading `designTokens.js`.
 */
class XalianStatChart extends React.Component {
	state = {};

	setupData = (stats) => {
		if (!stats) {
			return [];
		}

		var dataSet = [];
		var statMap = new Map();
		for (var key in stats) {
			let data = this.buildStatSet(key, stats[key]);
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
		let maxPoints = constants.STAT_POINT_MAX;
		let potentialPoints = Math.max(0, maxPoints - stat.points);
		return {
			statName: key,
			statLabel: translated,
			rangeName: rangeName,
			rangeNumber: rangeVal,
			points: stat.points,
			percentageText: percentageText,
			potentialPoints: potentialPoints,
			potentialPointsLabel: potentialPoints.toString(),
		};
	};

	render() {
		const minBarLength = 20;
		return (
			<div className={`flex h-full w-full flex-col ${this.props.moreClasses || ''}`}>
				{this.props.stats && (
					<ResponsiveContainer>
						<BarChart data={this.setupData(this.props.stats)} layout="vertical" maxBarSize={this.props.barSize || 35}>
							<XAxis type="number" hide />
							<YAxis
								width={this.props.yAxisWidth || (this.props.abbreviatedNames ? 60 : 150)}
								type="category"
								dataKey="statLabel"
								stroke={this.props.axisLabelColor || chart.axis}
								interval={0} />

							{this.props.includeRange && (
								<Bar radius={[10, 10, 10, 10]} isAnimationActive={false} dataKey="rangeNumber" fill={chart.rangeTrack} minPointSize={minBarLength}>
									{this.props.includeLabel && <LabelList dataKey="rangeName" position={this.props.labelPosition || 'center'} fill="white" style={{ fontSize: this.props.labelFontSize || '12pt' }} />}
									{this.state.data && this.state.data.map((entry, index) => <Cell key={`cell-${index}`} fill={valueTranslator.statFieldToBarColor(entry.statName)} />)}
								</Bar>
							)}
							<Bar radius={[0, 0, 0, 0]} isAnimationActive={false} dataKey="points" fill={chart.pointsFill} stackId="a" minPointSize={minBarLength}>
								{this.props.includeLabel && <LabelList dataKey="percentageText" position={this.props.labelPosition || 'center'} fill="white" style={{ fontSize: this.props.labelFontSize || '12pt' }} />}
								{this.setupData(this.props.stats).map((entry, index) => <Cell key={`cell-${index}`} fill={valueTranslator.statFieldToBarColor(entry.statName)} />)}
							</Bar>
							<Bar style={{ opacity: 0.35 }} radius={[0, 10, 10, 0]} isAnimationActive={false} dataKey="potentialPoints" fill={chart.pointsFill} stackId="a" minPointSize={minBarLength}>
								{this.props.includeLabel && <LabelList dataKey="potentialPointsLabel" position={this.props.labelPosition || 'center'} fill={chart.barLabel} style={{ fontSize: this.props.labelFontSize || '12pt' }} />}
								{this.setupData(this.props.stats).map((entry, index) => <Cell key={`cell-${index}`} fill={valueTranslator.statFieldToBarColor(entry.statName)} />)}
							</Bar>
							<Tooltip cursor={{ fill: chart.cursorFill }} content={<CustomTooltip />} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		);
	}
}

const CustomTooltip = ({ active, payload }) => {
	if (active && payload && payload.length) {
		return (
			<div className="border-2 bg-s1 p-2" style={{ borderColor: valueTranslator.statFieldToBarColor(payload[0].payload.statName) }}>
				<p className="type-legend m-0 text-ink">{payload[0].payload.statLabel}</p>
				<p className="m-0 font-body text-small text-ink-2">{`${payload[0].payload.rangeName}: ${payload[0].payload.points}`}</p>
				<p className="m-0 font-body text-small text-ink-2">{`${payload[1].value} potential points`}</p>
			</div>
		);
	}

	return null;
};

export default XalianStatChart;
