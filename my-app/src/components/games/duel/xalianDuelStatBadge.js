import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { ReactComponent as AttackIcon } from '../../../svg/games/duel/duel_attack_icon.svg';
import { ReactComponent as DefenseIcon } from '../../../svg/games/duel/duel_defense_icon.svg';
import { ReactComponent as MoveIcon } from '../../../svg/games/duel/duel_move_icon.svg';
import { ReactComponent as RangeIcon } from '../../../svg/games/duel/duel_range_icon.svg';
import { ReactComponent as EvasionIcon } from '../../../svg/games/duel/duel_evasion_icon.svg';

class XalianDuelStatBadge extends React.Component {


	render() {
		var size = this.props.size || 40;

		let style = {fill:'darkgray'}
		let classes = 'duel-badge-icon';

		let badgeMap = new Map();
		badgeMap['attack'] =  <AttackIcon className={classes} style={style} />;
		badgeMap['defense'] =  <DefenseIcon className={classes} style={style} />;
		badgeMap['move'] =  <MoveIcon className={classes} style={style} />;
		badgeMap['range'] =  <RangeIcon className={classes} style={style} />;
		badgeMap['evasion'] =  <EvasionIcon className={classes} style={style} />;

		let badge = badgeMap[this.props.type];

		return (
			<div className='duel-badge-wrapper' style={{ maxWidth: size, height: size, borderRadius: `${size/2}px` }}>

                {badge}
                <h5 className='duel-badge-text' style={{ textAlign: 'center', alignItems: 'center', margin: 'auto', position: 'relative', width: '100%' }} >{this.props.val}</h5>
				
			</div>
		);
	}
}

export default XalianDuelStatBadge;
