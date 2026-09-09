import React from 'react';
import { LabelList, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ink, chart } from '../constants/designTokens';

/**
 * An early stat-range chart, kept for compatibility. Version 4 on the new
 * stack: fixed the `class=` typo (it never applied) and swapped the
 * wrapper for Tailwind. Recharts fills keep reading `designTokens.js`.
 */
class CharacterStatRangeChart extends React.Component {
	render() {
		let x = this.props.xalian;

		let valMap = new Map();
		valMap['low'] = 1;
		valMap['medium'] = 2;
		valMap['high'] = 3;

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

		let stats = x.statRatings;
		var dataSet = [];
		for (var key in stats) {
			let val = stats[key];
			let translated = transMap[key];
			let intVal = valMap[val];
			if (translated && val) {
				dataSet.push({
					statName: key,
					statLabel: translated,
					valueName: val,
					valueNumber: intVal,
				});
			}
		}

		return (
			<div className="flex h-full w-full flex-col">
				<ResponsiveContainer>
					<BarChart data={dataSet} layout="vertical" maxBarSize={35}>
						<XAxis type="number" hide />
						<YAxis type="category" dataKey="statLabel" stroke={ink.base} />

						<Bar dataKey="valueNumber" fill={chart.rangeTrack}>
							<LabelList dataKey="valueName" position="center" fill="white" />
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		);
	}
}

export default CharacterStatRangeChart;
