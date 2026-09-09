import React from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import * as valueTranslator from '../utils/valueTranslator';
import { chart, ink } from '../constants/designTokens';

/**
 * A species' coarse stat ratings ("low"/"medium"/"high") as a horizontal
 * bar chart. Version 4 on the new stack: no react-bootstrap imports (they
 * were unused leftovers); the wrapper is a flex column instead of the old
 * `.centered-view` class. Recharts fills keep reading `designTokens.js`.
 */
class XalianStatRatingChart extends React.Component {
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
		var headers = ['standardAttackRating', 'specialAttackRating', 'standardDefenseRating', 'specialDefenseRating', 'speedRating', 'evasionRating', 'staminaRating', 'recoveryRating'];

		headers.forEach((header) => {
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
			rangeName: rangeName,
			rangeNumber: rangeVal,
		};
	};

	render() {
		let data = this.setupData(this.props.stats);
		return (
			<div className={`flex h-full w-full flex-col ${this.props.moreClasses || ''}`}>
				{this.props.stats && (
					<ResponsiveContainer>
						<BarChart data={data} layout="vertical" maxBarSize={this.props.barSize || 35}>
							<XAxis type="number" hide />
							<YAxis width={60} type="category" dataKey="statLabel" stroke={this.props.axisLabelColor || ink.base} interval={0} />

							<Bar radius={[10, 10, 10, 10]} isAnimationActive={false} animationBegin={50} dataKey="rangeNumber" fill={chart.rangeTrack}>
								{this.props.includeLabel && <LabelList dataKey="rangeName" position={this.props.labelPosition || 'center'} fill="white" style={{ fontSize: this.props.labelFontSize || '12pt' }} />}
								{data.map((val, index) => <Cell key={`cell-${index}`} fill={valueTranslator.statFieldToBarColor(val.statName)} />)}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		);
	}
}

export default XalianStatRatingChart;
