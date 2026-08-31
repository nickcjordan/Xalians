import React from 'react';

/**
 * What the selected piece can strike, drawn on the arena floor.
 *
 * Three attempts got this wrong in the same way. Four X icons over the
 * creature's face, then a ring around its body, then an ellipse around its
 * plinth: all of them decorated the target, and decorating an object cannot say
 * anything about a *relationship* between two objects. A ring concentric with a
 * piece's base is just a second base. It tells you the machine has noticed this
 * creature; it does not tell you that the piece you are holding can reach it.
 *
 * Reach is relational, so the mark is too: a firing solution is struck across
 * the floor from the attacker to each thing it can hit, and the target's own
 * square is marked out with registration ticks painted into the tile. Both are
 * grid-aligned floor markings under the pieces rather than badges on top of
 * them, and together they say the thing that matters: from here, that one.
 */

/** the five readings the type matrix can produce */
export function verdictFor(effectiveness) {
	if (effectiveness === 0) return { key: 'immune', label: 'x0' };
	if (effectiveness < 1) return { key: 'weak', label: 'x½' };
	if (effectiveness === 1) return { key: 'even', label: 'x1' };
	if (effectiveness < 2) return { key: 'strong', label: 'x1.5' };
	return { key: 'super', label: 'x2' };
}

/** how far the solution stops short of each piece, so it runs floor to floor */
const CLEARANCE = 0.44;
/** registration ticks: how far in from the tile edge, and how long */
const TICK_INSET = 0.085;
const TICK_LENGTH = 0.3;

class DuelTargetLayer extends React.Component {

	centre(index) {
		const { columns } = this.props;
		return [(index % columns) + 0.5, Math.floor(index / columns) + 0.5];
	}

	/** the run of the solution, trimmed clear of both pieces */
	renderSolution(targetIndex) {
		const [ox, oy] = this.centre(this.props.originIndex);
		const [tx, ty] = this.centre(targetIndex);
		const dx = tx - ox;
		const dy = ty - oy;
		const len = Math.hypot(dx, dy) || 1;
		const ux = dx / len;
		const uy = dy / len;
		if (len <= CLEARANCE * 2) return null;
		return (
			<line
				key={`solution-${targetIndex}`}
				className="duel-solution"
				x1={ox + ux * CLEARANCE}
				y1={oy + uy * CLEARANCE}
				x2={tx - ux * CLEARANCE}
				y2={ty - uy * CLEARANCE}
				vectorEffect="non-scaling-stroke"
			/>
		);
	}

	/** the target's square, marked out in the floor's own geometry */
	renderTile(targetIndex, verdict) {
		const { columns } = this.props;
		const c = targetIndex % columns;
		const r = Math.floor(targetIndex / columns);
		const i = TICK_INSET;
		const L = TICK_LENGTH;
		const ticks = [
			`M ${c + i} ${r + i + L} L ${c + i} ${r + i} L ${c + i + L} ${r + i}`,
			`M ${c + 1 - i - L} ${r + i} L ${c + 1 - i} ${r + i} L ${c + 1 - i} ${r + i + L}`,
			`M ${c + i} ${r + 1 - i - L} L ${c + i} ${r + 1 - i} L ${c + i + L} ${r + 1 - i}`,
			`M ${c + 1 - i - L} ${r + 1 - i} L ${c + 1 - i} ${r + 1 - i} L ${c + 1 - i} ${r + 1 - i - L}`,
		].join(' ');

		return (
			<g key={`tile-${targetIndex}`} className={`duel-target-tile duel-target-tile--${verdict.key}`}>
				<rect className="duel-target-wash" x={c} y={r} width={1} height={1} />
				<path className="duel-target-ticks" d={ticks} vectorEffect="non-scaling-stroke" />
				{/* the multiplier, stencilled on the tile - only when it is worth
				    saying, because a neutral trade is the default */}
				{verdict.key !== 'even' &&
					<text className="duel-target-figure" x={c + 0.5} y={r + 1 - i - 0.07} textAnchor="middle">
						{verdict.label}
					</text>
				}
			</g>
		);
	}

	render() {
		const { targets, originIndex, columns, size } = this.props;
		if (!targets || !targets.length || originIndex == null || originIndex < 0) return null;

		return (
			<svg
				className="duel-target-layer"
				width={size}
				height={size}
				viewBox={`0 0 ${columns} ${columns}`}
				preserveAspectRatio="none"
				aria-hidden="true">
				{targets.map((t) => this.renderSolution(t.index))}
				{targets.map((t) => this.renderTile(t.index, t.verdict))}
			</svg>
		);
	}
}

export default DuelTargetLayer;
