import React from 'react';

/**
 * The ground a piece can reach, drawn as one shape.
 *
 * This was built per cell: every square in the set painted its own fill and put
 * a border on the sides where its neighbour was missing. That gets you a
 * continuous outline, and convex corners can be rounded with border-radius, but
 * a concave corner is drawn by two *different* cells meeting at right angles and
 * neither of them can shorten itself to make room for a curve. So the arms of a
 * cross ended in soft corners while the joints between them stayed sharp, which
 * read as separate pills rather than one region.
 *
 * So the region is traced instead: boundary edges are chained into loops and
 * emitted as a single path whose every turn is rounded, inward and outward
 * alike. Holes come out as holes, because an interior loop traces the opposite
 * way round and the even-odd fill rule does the rest.
 */

/** how far back from a corner the curve starts, in cell widths */
const CORNER = 0.24;

const key = (p) => `${p[0]},${p[1]}`;

/**
 * Every boundary edge of the set, directed so that following one edge into the
 * next walks the outline in a consistent direction.
 */
function boundaryEdges(cellSet, columns) {
	const has = (c, r) => c >= 0 && r >= 0 && c < columns && r < columns && cellSet.has(r * columns + c);
	const edges = new Map();
	const add = (start, end) => {
		let k = key(start);
		if (!edges.has(k)) edges.set(k, []);
		edges.get(k).push([start, end]);
	};

	cellSet.forEach((i) => {
		const c = i % columns;
		const r = Math.floor(i / columns);
		if (!has(c, r - 1)) add([c + 1, r], [c, r]);
		if (!has(c, r + 1)) add([c, r + 1], [c + 1, r + 1]);
		if (!has(c - 1, r)) add([c, r], [c, r + 1]);
		if (!has(c + 1, r)) add([c + 1, r + 1], [c + 1, r]);
	});

	return edges;
}

/** walk the edge set into closed loops of points */
function traceLoops(edges) {
	const loops = [];
	const take = (k) => {
		const list = edges.get(k);
		if (!list || !list.length) return null;
		const edge = list.pop();
		if (!list.length) edges.delete(k);
		return edge;
	};

	while (edges.size) {
		const startKey = edges.keys().next().value;
		let edge = take(startKey);
		if (!edge) break;
		const points = [edge[0]];
		// a malformed set must not spin forever, so the walk is bounded
		let guard = 0;
		while (edge && guard++ < 4096) {
			points.push(edge[1]);
			edge = take(key(edge[1]));
		}
		if (points.length > 3) loops.push(points);
	}
	return loops;
}

/**
 * One loop as a path with every corner rounded. Collinear points are dropped
 * first so a straight run of four cells is one segment rather than four.
 */
function roundedLoop(points, radius) {
	const raw = points.slice(0, -1);
	const turns = [];
	for (let i = 0; i < raw.length; i++) {
		const prev = raw[(i - 1 + raw.length) % raw.length];
		const cur = raw[i];
		const next = raw[(i + 1) % raw.length];
		const cross = (cur[0] - prev[0]) * (next[1] - cur[1]) - (cur[1] - prev[1]) * (next[0] - cur[0]);
		if (cross !== 0) turns.push(cur);
	}
	if (turns.length < 3) return '';

	let d = '';
	for (let i = 0; i < turns.length; i++) {
		const prev = turns[(i - 1 + turns.length) % turns.length];
		const cur = turns[i];
		const next = turns[(i + 1) % turns.length];
		const lenPrev = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
		const lenNext = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
		// never eat more than half a segment, or adjacent curves would overlap
		const r = Math.min(radius, lenPrev / 2, lenNext / 2);
		const a = [cur[0] + ((prev[0] - cur[0]) / lenPrev) * r, cur[1] + ((prev[1] - cur[1]) / lenPrev) * r];
		const b = [cur[0] + ((next[0] - cur[0]) / lenNext) * r, cur[1] + ((next[1] - cur[1]) / lenNext) * r];
		d += i === 0 ? `M ${a[0].toFixed(3)} ${a[1].toFixed(3)}` : ` L ${a[0].toFixed(3)} ${a[1].toFixed(3)}`;
		d += ` Q ${cur[0]} ${cur[1]} ${b[0].toFixed(3)} ${b[1].toFixed(3)}`;
	}
	return d + ' Z';
}

export function buildRegionPath(indices, columns) {
	if (!indices || !indices.length) return '';
	const cellSet = new Set(indices);
	return traceLoops(boundaryEdges(cellSet, columns))
		.map((loop) => roundedLoop(loop, CORNER))
		.filter(Boolean)
		.join(' ');
}

class DuelMoveRegion extends React.Component {
	render() {
		const { indices, originIndex, columns, size, variant } = this.props;
		if (!indices || !indices.length) return null;

		// The square the piece is standing on joins the shape even though it is
		// not a place you can move to. Leaving it out punched a hole through the
		// middle of every reachable area, which stopped it reading as one piece
		// of ground.
		const shape = (originIndex != null && originIndex >= 0 && !indices.includes(originIndex))
			? indices.concat([originIndex])
			: indices;

		const path = buildRegionPath(shape, columns);
		if (!path) return null;

		return (
			<svg
				className={`duel-move-layer ${variant ? `duel-move-layer--${variant}` : ''}`}
				width={size}
				height={size}
				viewBox={`0 0 ${columns} ${columns}`}
				preserveAspectRatio="none"
				aria-hidden="true">
				<path className="duel-move-shape" d={path} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
				{/* a mark on each square you may actually land on - not on the one
				    the piece already occupies */}
				{indices.map((i) => (
					<circle
						key={i}
						className="duel-move-pip"
						cx={(i % columns) + 0.5}
						cy={Math.floor(i / columns) + 0.5}
						r={0.07}
					/>
				))}
			</svg>
		);
	}
}

export default DuelMoveRegion;
