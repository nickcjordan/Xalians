import React from 'react';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';

/**
 * The mark on an enemy you can strike right now.
 *
 * This was four X icons in a row laid over the creature's face, lighting N of
 * them where N was type effectiveness times two. So it was a nought-to-four pip
 * meter encoding a 0/0.5/1/1.5/2 multiplier, drawn on top of the artwork you
 * need in order to tell the pieces apart, on every eligible enemy at once.
 *
 * The question it was trying to answer is a single one: if I spend my one
 * attack here, does it go well? So it is now a reticle bracketing the token
 * (targetable) plus one chip carrying the multiplier — and the chip only
 * appears when the answer is interesting, because a neutral matchup is the
 * default and does not need saying.
 */

/** the five readings the type matrix can produce, as marks rather than pips */
export function verdictFor(effectiveness) {
	if (effectiveness === 0) return { key: 'immune', label: 'x0' };
	if (effectiveness < 1) return { key: 'weak', label: 'x½' };
	if (effectiveness === 1) return { key: 'even', label: 'x1' };
	if (effectiveness < 2) return { key: 'strong', label: 'x1.5' };
	return { key: 'super', label: 'x2' };
}

class AttackableMoveBadge extends React.Component {

	render() {
		if (!this.props.attacker || !this.props.defender || !this.props.isTargetable) {
			return null;
		}

		let result = duelCalculator.calculateAttackResult(
			this.props.attacker, this.props.defender,
			this.props.boardState, this.props.ctx, true
		);
		let effectiveness = (result && result.typeEffectiveness != null) ? result.typeEffectiveness : 1;
		let verdict = verdictFor(effectiveness);

		return (
			<span className="duel-target" style={{ zIndex: this.props.zIndex }}>
				{/* a ring, not a bracket: the selected piece already wears corner
				    brackets, and two marks separated only by colour is exactly the
				    confusion the old selected/referenced pair created */}
				<span className="duel-target-ring" />
				{verdict.key !== 'even' &&
					<span className={`duel-target-verdict duel-target-verdict--${verdict.key}`}>
						{verdict.label}
					</span>
				}
			</span>
		);
	}
}

export default AttackableMoveBadge;
