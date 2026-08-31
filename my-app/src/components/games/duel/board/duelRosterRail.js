import React from 'react';
import XalianImage from '../../../xalianImage';
import { ReactComponent as DuelFlagIcon } from '../../../../svg/games/duel/duel_flag_icon.svg';
import * as duelUtil from '../../../../utils/duelUtil';
import * as gameConstants from '../../../../gameplay/duel/duelGameConstants';
import XalianTypeEffectivenessSummary from './xalianTypeEffectivenessSummary';
import { lamp, stat, brass } from '../../../../constants/designTokens';

/**
 * A side's whole squad, as a rail beside the board.
 *
 * This replaces two things that used to live above and below the board: the
 * tray you picked unplaced pieces out of during setup, and a row that appeared
 * only once something died. Neither told you how the match was going, and the
 * second one changed the page layout at the worst possible moment.
 *
 * The rail is one component doing both jobs. Every piece a side owns has a
 * fixed slot in it for the whole match, in a fixed order, so nothing reshuffles
 * under the cursor: unplaced during setup, then alive with its vitals, then
 * struck out when it dies. Because the vitals live here, the pieces on the
 * board no longer each carry a pair of two-pixel bars that could not have
 * communicated a number anyway.
 */
class DuelRosterRail extends React.Component {

	healthColour(pct) {
		if (pct > 50) return stat.stamina;
		if (pct > 25) return lamp.amber;
		return lamp.red;
	}

	/** a segmented bulb meter, the same construction the rest of the system uses */
	renderMeter(value, max, colour, label) {
		let pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
		return (
			<div className="duel-roster-meter-row">
				<span className="duel-roster-meter-label">{label}</span>
				<span className="duel-roster-meter" style={{ '--duel-meter': colour }}>
					<span className="duel-roster-meter-fill" style={{ width: `${pct}%` }} />
				</span>
				<span className="duel-roster-meter-value">{value}</span>
			</div>
		);
	}

	/**
	 * The deeper reading on one piece, docked inside its own slot.
	 *
	 * This used to be an offcanvas sheet that opened centred over the board, so
	 * asking what a piece was cost you sight of the thing you were asking about.
	 * Everything else about a piece already lives in this slot, so this does too.
	 */
	renderDetail = (xalian) => {
		return (
			<div className="duel-roster-detail">
				<dl className="duel-roster-detail-stats">
					{[
						['Attack', xalian.stats.attack],
						['Defense', xalian.stats.defense],
						['Move', xalian.stats.distance],
						['Range', xalian.stats.range],
						['Evasion', xalian.stats.evasion],
					].map(([label, value]) => (
						<div className="duel-roster-stat" key={label}>
							<dt className="duel-roster-stat-label">{label}</dt>
							<dd className="duel-roster-stat-value">{value}</dd>
						</div>
					))}
				</dl>
				<div className="duel-roster-detail-matchups">
					<XalianTypeEffectivenessSummary type={xalian.elementType} />
				</div>
			</div>
		);
	}

	renderEntry = (xalian) => {
		const {
			boardState, ctx, phase, teamColor, isOwn,
			selectedXalianId, referencedXalianId, attackableIds, targetVerdicts, expandedXalianId,
		} = this.props;

		let id = xalian.xalianId;
		let isUnset = duelUtil.isUnset(id, boardState);
		let isDown = duelUtil.isInactive(id, boardState);
		let isSelected = selectedXalianId === id;
		let isReferenced = referencedXalianId === id;
		let isTargetable = !!(attackableIds && attackableIds.has(id));
		let verdict = targetVerdicts ? targetVerdicts[id] : null;

		// carrying the enemy flag is the win condition, so it is the loudest
		// thing an entry can say
		let flag = duelUtil.getFlagState(isOwn ? 1 : 0, boardState);
		let isCarrying = !!(flag && flag.holder === id);

		let health = (xalian.state && xalian.state.health) || 0;
		let stamina = (xalian.state && xalian.state.stamina) || 0;
		let healthPct = (health / gameConstants.MAX_HEALTH_POINTS) * 100;

		let classes = ['duel-roster-entry'];
		if (isDown) classes.push('duel-roster-entry--down');
		if (isUnset) classes.push('duel-roster-entry--unset');
		if (isSelected) classes.push('duel-roster-entry--selected');
		if (isReferenced && !isSelected) classes.push('duel-roster-entry--referenced');
		if (isTargetable) classes.push('duel-roster-entry--targetable');
		if (isCarrying) classes.push('duel-roster-entry--carrying');

		// during setup an own unplaced piece is the thing you press to pick it up
		let isPlaceable = isOwn && isUnset && phase === 'setup';
		let isExpanded = expandedXalianId === id;
		if (isExpanded) classes.push('duel-roster-entry--expanded');

		return (
			<button
				type="button"
				key={id}
				className={classes.join(' ')}
				style={{ '--duel-team': teamColor }}
				aria-pressed={isSelected}
				aria-expanded={isExpanded}
				onClick={() => this.props.onSelect && this.props.onSelect(xalian, { isUnset, isDown })}>

				<span className="duel-roster-portrait">
					<XalianImage
						padding="0px"
						speciesName={xalian.species.name}
						primaryType={xalian.elementType}
						moreClasses="duel-roster-portrait-art" />
					{isCarrying &&
						<DuelFlagIcon className="duel-roster-flag" />
					}
				</span>

				<span className="duel-roster-body">
					<span className="duel-roster-ident">
						<span className="duel-roster-name">{xalian.species.name}</span>
						{isDown && <span className="duel-roster-tag duel-roster-tag--down">Down</span>}
						{isPlaceable && <span className="duel-roster-tag duel-roster-tag--place">Place</span>}
						{isUnset && !isPlaceable && <span className="duel-roster-tag">Unplaced</span>}
						{/* the slot's hazard border already says "you can reach this",
						    so the multiplier only appears when it is worth saying -
						    the same rule the board's strike zone follows */}
						{isTargetable && verdict && verdict.key !== 'even' &&
							<span className={`duel-roster-tag duel-roster-tag--verdict duel-roster-verdict--${verdict.key}`}>
								{verdict.label}
							</span>
						}
					</span>

					{!isUnset && !isDown &&
						<span className="duel-roster-meters">
							{this.renderMeter(health, gameConstants.MAX_HEALTH_POINTS, this.healthColour(healthPct), 'HP')}
							{this.renderMeter(stamina, gameConstants.MAX_STAMINA_POINTS, brass.base, 'STA')}
						</span>
					}

					{isExpanded && this.renderDetail(xalian)}
				</span>
			</button>
		);
	}

	render() {
		const { xalians, title, teamColor, isTurn, side } = this.props;
		if (!xalians || !xalians.length) return null;

		let standing = xalians.filter(x => !duelUtil.isInactive(x.xalianId, this.props.boardState)).length;

		return (
			<aside
				className={`duel-roster-rail duel-roster-rail--${side} ${isTurn ? 'duel-roster-rail--active' : ''}`}
				style={{ '--duel-team': teamColor }}>

				<header className="duel-roster-header">
					<span className="duel-roster-title">{title}</span>
					<span className="duel-roster-count">{standing}<span className="duel-roster-count-of">/{xalians.length}</span></span>
				</header>

				<div className="duel-roster-entries">
					{xalians.map(this.renderEntry)}
				</div>
			</aside>
		);
	}
}

export default DuelRosterRail;
