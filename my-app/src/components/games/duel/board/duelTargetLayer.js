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

/**
 * The bracket is drawn on the lower part of the tile rather than around all of
 * it. A creature's art rises about a quarter of a square above the ground it is
 * standing on - its footprint is the token base near the tile's bottom edge, not
 * the tile's outline - so a bracket squared up on the full tile put its top two
 * corners behind the creature's head, and a mark floating behind a creature does
 * not read as ground. Sitting low and wide it reads as the patch of floor the
 * thing is standing on, which is what it is.
 */
const TICK_INSET = 0.085;
const TICK_TOP = 0.42;
const TICK_LENGTH = 0.26;

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
		// the floor patch: the full width of the tile, but only its lower half
		const x0 = c + i;
		const x1 = c + 1 - i;
		const y0 = r + TICK_TOP;
		const y1 = r + 1 - i;
		const V = Math.min(L, (y1 - y0) / 2.2);
		const ticks = [
			`M ${x0} ${y0 + V} L ${x0} ${y0} L ${x0 + L} ${y0}`,
			`M ${x1 - L} ${y0} L ${x1} ${y0} L ${x1} ${y0 + V}`,
			`M ${x0} ${y1 - V} L ${x0} ${y1} L ${x0 + L} ${y1}`,
			`M ${x1 - L} ${y1} L ${x1} ${y1} L ${x1} ${y1 - V}`,
		].join(' ');

		return (
			<g key={`tile-${targetIndex}`} className={`duel-target-tile duel-target-tile--${verdict.key}`}>
				<rect className="duel-target-wash" x={x0} y={y0} width={x1 - x0} height={y1 - y0} />
				{/* The bracket is cut into the floor rather than drawn over it: a dark
				    groove first, then the lit edge sitting a hair above it. One flat
				    stroke of red was a diagram laid on the arena; a groove with light
				    catching its lip is a thing the floor has. */}
				<path className="duel-target-groove" d={ticks} vectorEffect="non-scaling-stroke" />
				<path className="duel-target-ticks" d={ticks} vectorEffect="non-scaling-stroke" />
				{/* The multiplier, stencilled beside the patch - only when it is
				    worth saying, because a neutral trade is the default. It rides
				    the bracket's top right because a piece's element disc sits at
				    its bottom left, and the two were colliding. */}
				{verdict.key !== 'even' &&
					<text className="duel-target-figure" x={x1 - 0.03} y={y0 - 0.09} textAnchor="end">
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
