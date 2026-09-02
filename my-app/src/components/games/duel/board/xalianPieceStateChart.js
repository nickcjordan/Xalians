import React from 'react';
import * as gameConstants from '../../../../gameplay/duel/duelGameConstants';
import { lamp, brass, stat } from '../../../../constants/designTokens';

/**
 * A piece's vitals, as a small plate that surfaces when you point at it.
 *
 * These were two full-width bars two pixels tall, sitting under the token. At a
 * 48px cell that is a one-pixel line: enough to say "there is a meter here" and
 * not enough to say anything about a number, which is the entire job. Worse,
 * they were the same width as the square, so twelve of them tiled the board with
 * horizontal rules.
 *
 * It is now a readout - the figure first, because the figure is what you act on,
 * with a short track beside it for the at-a-glance shape. It floats above the
 * creature on hover rather than hiding beneath it.
 */
class XalianPieceStateChart extends React.Component {

    healthColour(pct) {
        if (pct > 50) return stat.stamina;
        if (pct > 25) return lamp.amber;
        return lamp.red;
    }

    render() {
        let xalianState = this.props.xalianState;

        let health = xalianState.health;
        let stamina = xalianState.stamina;
        let healthPct = Math.max(0, Math.min(100, (health / gameConstants.MAX_HEALTH_POINTS) * 100));
        let staminaPct = Math.max(0, Math.min(100, (stamina / gameConstants.MAX_STAMINA_POINTS) * 100));

        // damage is fractional, so health is too - round it to something a
        // player can act on rather than printing 5.9999
        let shownHealth = Math.round(health * 10) / 10;

        return (
            <div className="duel-vitals-plate">
                <div className="duel-vitals-row">
                    <span className="duel-vitals-figure">{shownHealth}</span>
                    <span className="duel-vitals-track">
                        <span
                            className="duel-vitals-fill"
                            style={{ width: `${healthPct}%`, background: this.healthColour(healthPct) }} />
                    </span>
                </div>
                <div className="duel-vitals-row duel-vitals-row--stamina">
                    <span className="duel-vitals-figure">{stamina}</span>
                    <span className="duel-vitals-track">
                        <span
                            className="duel-vitals-fill"
                            style={{ width: `${staminaPct}%`, background: brass.base }} />
                    </span>
                </div>
            </div>
        );
    }
}

export default XalianPieceStateChart;
