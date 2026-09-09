import React from 'react';
import { LabelList, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { phosphor, chart } from '../constants/designTokens';

/**
 * An early stat chart, kept for compatibility. Version 4 on the new stack:
 * fixed the `class=` typo (it never applied) and swapped the wrapper for
 * Tailwind. Recharts fills keep reading `designTokens.js`.
 */
class CharacterGeneratedStatChart extends React.Component {
	setupData = (x) => {
		if (!x) {
			return [];
		}
		let transMap = new Map();
		transMap['standardAttackRating'] = 'Attack';
		transMap['specialAttackRating'] = 'Sp. Attack';
		transMap['standardDefenseRating'] = 'Defense';
		transMap['specialDefenseRating'] = 'Sp. Defense';
		transMap['speedRating'] = 'Speed';
		transMap['evasionRating'] = 'Evasion';
		transMap['staminaRating'] = 'Stamina';
		transMap['recoveryRating'] = 'Recovery';

		transMap['standardAttackPoints'] = 'Standard Attack';
		transMap['specialAttackPoints'] = 'Special Attack';
		transMap['standardDefensePoints'] = 'Standard Defense';
		transMap['specialDefensePoints'] = 'Special Defense';
		transMap['speedPoints'] = 'Speed';
		transMap['evasionPoints'] = 'Evasion';
		transMap['staminaPoints'] = 'Stamina';
		transMap['recoveryPoints'] = 'Recovery';

		transMap['low'] = 'Low';
		transMap['medium'] = 'Medium';
		transMap['high'] = 'High';

		let valMap = new Map();
		valMap['low'] = 1;
		valMap['medium'] = 2;
		valMap['high'] = 3;

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
					percentageText: stat.points + ' Points, ' + stat.percentage + '%',
				});
			}
		}
		return dataSet;
	};

	render() {
		return (
			<div className="flex h-full w-full flex-col">
				{this.props.xalian && (
					<ResponsiveContainer>
						<BarChart data={this.setupData(this.props.xalian)} layout="vertical" maxBarSize={35}>
							<XAxis type="number" hide />
							<YAxis type="category" dataKey="statLabel" stroke={phosphor.base} />

							<Bar isAnimationActive={false} animationBegin={50} dataKey="rangeNumber" fill={chart.rangeTrack}>
								<LabelList dataKey="rangeName" position="center" fill="white" />
							</Bar>
							<Bar isAnimationActive={false} animationBegin={50} dataKey="points" fill={chart.pointsFill}>
								<LabelList dataKey="percentageText" position="center" fill="white" />
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		);
	}
}

export default CharacterGeneratedStatChart;
