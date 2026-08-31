import React from 'react';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';

/**
 * The mark on an enemy you can strike right now.
 *
 * This began as four X icons laid over the creature's face, lighting N of them
 * where N was type effectiveness times two: a nought-to-four pip meter encoding
 * a 0/0.5/1/1.5/2 multiplier, drawn on top of the artwork you need in order to
 * tell the pieces apart.
 *
 * Replacing it with a ring around the body fixed the occlusion but not the
 * deeper problem, which is that a ring is screen-space UI stamped onto a
 * world-space object. You are looking down into an arena; a circle floating over
 * a creature belongs to a heads-up display, not to the floor.
 *
 * So the mark is painted on the arena floor instead: an ellipse concentric with
 * the piece's own footprint, in the same perspective as its plinth and drawn
 * beneath it, so the creature stands inside a marked strike zone. The multiplier
 * rides the edge of that zone, and only when it is worth saying.
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
			<React.Fragment>
				{/* painted on the floor, under the plinth, in the floor's perspective */}
				<span className="duel-target-zone" />
				{verdict.key !== 'even' &&
					<span className={`duel-target-verdict duel-target-verdict--${verdict.key}`}>
						{verdict.label}
					</span>
				}
			</React.Fragment>
		);
	}
}

export default AttackableMoveBadge;
