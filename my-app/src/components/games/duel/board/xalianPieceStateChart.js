import React from 'react';
import * as gameConstants from '../../../../gameplay/duel/duelGameConstants';
import { lamp, brass, hull, stat } from '../../../../constants/designTokens';

/**
 * A piece's vitals, as two bulb strips under its base.
 *
 * Was two rounded bars with outset borders, coloured glow and a gradient fill —
 * the only place on the site still lighting the hull. These are segmented
 * strips like every other meter in the system: health reads green, amber then
 * red as it falls, stamina reads brass, and neither of them glows.
 */
class XalianPieceStateChart extends React.Component {

    healthColour(pct) {
        if (pct > 50) return stat.stamina;
        if (pct > 25) return lamp.amber;
        return lamp.red;
    }

    /** a strip of lit bulbs: colour where filled, dead socket where not */
    buildStrip(pct, colour, height) {
        return {
            height,
            marginTop: '1px',
            pointerEvents: 'none',
            borderRadius: '1px',
            background: hull.seam,
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.9)',
            backgroundImage: `linear-gradient(90deg, ${colour} 0 ${pct}%, transparent ${pct}% 100%)`,
        };
    }

    render() {
        let classes = this.props.classes || 'duel-state-chart-wrapper-position';
        let wrapperClasses = this.props.wrapperClasses || 'duel-status-bar-wrapper';
        let barHeight = this.props.barHeight || '2px';

        let xalianState = this.props.xalianState;

        let healthPct = (xalianState.health / gameConstants.MAX_HEALTH_POINTS) * 100;
        healthPct = healthPct < 4 ? 4 : healthPct;

        let staminaPct = (xalianState.stamina / gameConstants.MAX_STAMINA_POINTS) * 100;
        staminaPct = staminaPct < 4 ? 4 : staminaPct;

        return (
            <div className={classes} style={{ height: 'auto', minWidth: '25px', pointerEvents: 'none', width: '100%', zIndex: '104' }}>
                <div className={wrapperClasses} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={this.buildStrip(healthPct, this.healthColour(healthPct), barHeight)} />
                    <div style={this.buildStrip(staminaPct, brass.base, barHeight)} />
                </div>
            </div>
        );
    }
}

export default XalianPieceStateChart;
