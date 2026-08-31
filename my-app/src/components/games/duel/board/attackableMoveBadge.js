import React from 'react';
import { lamp, hull, ink } from '../../../../constants/designTokens';
import { Row, Col, Stack } from 'react-bootstrap';
import { ReactComponent as AttackIcon } from '../../../../svg/games/duel/duel_attack_icon.svg';
import typeEffectivenessMatrix from '../../../../json/typeEffectivenessMatrix.json';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import * as duelValueTranslator from '../../../../gameplay/duel/duelValueTranslator';


class AttackableMoveBadge extends React.Component {


	render() {

		if (this.props.attacker && this.props.defender) {
			let attackResult = duelCalculator.calculateAttackResult(this.props.attacker, this.props.defender, this.props.boardState, this.props.ctx, true);

			let effectivenessIconCount = parseFloat(attackResult.typeEffectiveness * 2);

			let icons = [];
			for (var i = 0; i < effectivenessIconCount; i++) {
				icons.push(<AttackIcon key={`effective-icon-${i}`} className="" style={{ fill: lamp.red, stroke: hull.seam, strokeWidth: '2px', filter: 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.9))', height: '25%', width: '25%' }} />);
			}
			while (icons.length < 4) {
				icons.push(<AttackIcon key={`empty-icon-${icons.length}`} className="" style={{ fill: hull.seam, stroke: ink.low, strokeWidth: '2px', filter: 'none', height: '25%', width: '25%' }} />);
			}
			return (
			// <React.Fragment>

					<div className="duel-attack-icon-wrapper" style={{zIndex: this.props.zIndex,  opacity: this.props.isEnemy ? 1 : 0}}>
						<Stack gap={0} direction="horizontal" style={{ backgroundColor: 'rgba(10, 10, 7, 0.7)', borderRadius: 'var(--g-radius-sm)', opacity: 1, padding: '5%', width: '100%', position: 'absolute', bottom: '20%', left: '50%', transform: 'translate(-50%, -50%)' }}>
							{icons}
						</Stack>
					</div>
			// </React.Fragment>
			);
		}
		else {
			return null;
		}


	}
}

export default AttackableMoveBadge;
