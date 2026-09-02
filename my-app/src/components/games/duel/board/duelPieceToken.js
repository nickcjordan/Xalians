import React from 'react';
import XalianImage from '../../../xalianImage';
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import XalianPieceStateChart from './xalianPieceStateChart';
import { ReactComponent as DuelFlagIcon } from '../../../../svg/games/duel/duel_flag_icon.svg';
import gsap from 'gsap';

/**
 * A creature standing on the arena floor.
 *
 * This was written inline inside the board cell, which meant the only way to
 * look at a piece in a given state was to play a match into that state. It is a
 * pure function of its props with no game object in sight, so the playground can
 * render the real thing rather than a copy of it that quietly drifts.
 */

/** a tight rim in the team's colour plus a shadow cast onto the floor */
export function pieceShadowFilter(teamColor, cellSize) {
	const shadow = (blur, color, x = 0, y = 0) => `drop-shadow(${x}px ${y}px ${blur}px ${color})`;
	return [
		shadow(1, gsap.utils.interpolate(teamColor, 'white', 0.25)),
		shadow(cellSize / 26, gsap.utils.interpolate(teamColor, 'black', 0.25)),
		shadow(cellSize / 14, 'rgba(0, 0, 0, 0.85)', 0, cellSize / 22),
	].join(' ');
}

class DuelPieceToken extends React.Component {

	render() {
		// `targetable` is deliberately not a class on the piece. Being in reach is
		// a relationship between two pieces, so it is drawn on the floor between
		// them by duelTargetLayer - there is nothing to put on the creature, and a
		// class that styles nothing only invites someone to style it.
		const {
			xalian, cellSize, teamColor, flagColor, elementColor,
			selected, referenced, carrying,
			id, zIndex, moreClasses,
		} = this.props;

		let classes = ['duel-piece', `duel-${xalian.xalianId}-piece`];
		if (selected) classes.push('duel-piece--selected');
		if (referenced && !selected) classes.push('duel-piece--referenced');
		if (carrying) classes.push('duel-piece--carrying');
		if (moreClasses) classes.push(moreClasses);

		return (
			<div
				id={id}
				className={classes.join(' ')}
				style={{
					position: 'absolute', height: '100%', width: '100%',
					zIndex: zIndex == null ? 200 : zIndex,
					'--duel-team': teamColor,
					'--duel-flag': flagColor || teamColor,
					'--duel-element': elementColor,
				}}>

				<XalianImage className='animate-state'
					padding={'0px'}
					speciesName={xalian.species.name}
					primaryType={xalian.elementType}
					fill={'black'}
					filter={pieceShadowFilter(teamColor, cellSize)}
					moreClasses="duel-piece-xalian-icon"
				/>

				{/* TOKEN BASE - the creature stands on a machined disc rimmed in its
				    team's colour, so a piece reads as an object on the floor rather
				    than as artwork printed onto the square */}
				<span className="duel-piece-base" />

				<XalianTypeSymbolBadge size={cellSize / 2.5} type={xalian.elementType.toLowerCase()} />

				{/* VITALS - these live in the roster rail now. On the board they
				    surface only when you point at a piece, so twelve of them are not
				    competing with the board at all times. */}
				<span className="duel-piece-vitals">
					<XalianPieceStateChart xalianState={xalian.state} />
				</span>

				{carrying &&
					<DuelFlagIcon className="duel-flag-carried" style={{ fill: flagColor || teamColor }} />
				}
			</div>
		);
	}
}

export default DuelPieceToken;
