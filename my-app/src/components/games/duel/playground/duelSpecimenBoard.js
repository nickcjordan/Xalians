import React from 'react';
import DuelPieceToken from '../board/duelPieceToken';
import DuelMoveRegion from '../board/duelMoveRegion';
import DuelTargetLayer from '../board/duelTargetLayer';
import { ReactComponent as DuelFlagIcon } from '../../../../svg/games/duel/duel_flag_icon.svg';
import * as duelConstants from '../../../../gameplay/duel/duelGameConstants';

/**
 * A board fragment, described rather than played.
 *
 * The arena is normally rendered from a live boardgame.io game, so the only way
 * to see a state was to reach it in a match: play until something is carrying a
 * flag, or until a piece is down to two health, or until an immune matchup comes
 * up. That is a terrible way to look at a design.
 *
 * This takes a plain description of a position - pieces here, region there,
 * these targets - and renders it with the same components and the same CSS the
 * match uses. Nothing here is a mock of the board. It is the board, handed a
 * position instead of a game.
 */

class DuelSpecimenBoard extends React.Component {

	occupied(index) {
		return (this.props.pieces || []).some(p => p.index === index);
	}

	/**
	 * The scoring cut into the floor. An empty square draws its left and top
	 * lines; an occupied one draws a stub on every side whose neighbour is empty,
	 * so the lattice runs unbroken around a piece rather than stopping at it.
	 */
	renderConnectors(index) {
		const cols = this.props.columns;
		const c = index % cols;
		const r = Math.floor(index / cols);
		const size = `${this.props.cellSize}px`;
		const lines = [];

		if (this.occupied(index)) {
			const sides = [
				[c - 1, r, { width: '100%', height: '2px', top: '50%', left: '0' }],
				[c, r - 1, { width: '2px', height: '100%', top: '0', left: '50%' }],
				[c + 1, r, { width: '100%', height: '2px', top: '50%', left: '100%' }],
				[c, r + 1, { width: '2px', height: '100%', top: '100%', left: '50%' }],
			];
			sides.forEach(([nc, nr, style], i) => {
				if (nc < 0 || nr < 0 || nc >= cols || nr >= cols) return;
				if (this.occupied(nr * cols + nc)) return;
				lines.push(<div key={i} className="duel-board-cell-connector occupied-connector" style={style} />);
			});
		} else {
			if (c > 0 && !this.occupied(index - 1)) {
				lines.push(<div key="l" className="duel-board-cell-connector unoccupied-cell-connector"
					style={{ width: size, height: '2px', top: '50%', left: '0' }} />);
			}
			if (r > 0 && !this.occupied(index - cols)) {
				lines.push(<div key="t" className="duel-board-cell-connector unoccupied-cell-connector"
					style={{ width: '2px', height: size, top: '0', left: '50%' }} />);
			}
		}
		return lines;
	}

	renderCell(index) {
		const { cellSize, pieces, flags } = this.props;
		const piece = (pieces || []).find(p => p.index === index);
		const flag = (flags || []).find(f => f.index === index);
		const px = `${cellSize}px`;

		return (
			<div key={index} className="duel-specimen-cell" style={{ width: px, height: px, lineHeight: px }}>
				<div style={{ position: 'absolute', inset: 0 }}>
					{this.renderConnectors(index)}
				</div>

				<div className="duel-board-cell" style={{ position: 'relative', width: px, height: px, lineHeight: px, textAlign: 'center' }}>
					{flag && !piece &&
						<DuelFlagIcon className="duel-flag" style={{ fill: this.teamColour(flag.team) }} />
					}
					{piece &&
						<DuelPieceToken
							xalian={piece.xalian}
							cellSize={cellSize}
							teamColor={this.teamColour(piece.team)}
							flagColor={this.teamColour(piece.flagTeam || (piece.team === 'own' ? 'foe' : 'own'))}
							selected={piece.selected}
							referenced={piece.referenced}
							carrying={piece.carrying}
							zIndex={200 + index} />
					}
				</div>
			</div>
		);
	}

	teamColour(team) {
		return team === 'foe' ? duelConstants.PLAYER_TWO_COLOR : duelConstants.PLAYER_ONE_COLOR;
	}

	render() {
		const { columns, cellSize, move, referencedMove, targets, originIndex, caption, note } = this.props;
		const grid = columns * cellSize;
		const cells = [];
		for (let i = 0; i < columns * columns; i++) cells.push(this.renderCell(i));

		return (
			<figure className={`duel-specimen ${columns >= 6 ? 'duel-specimen--wide' : ''}`}>
				<div className="duel-board-wrapper duel-specimen-wrapper">
					<div className="duel-board-wrapper-background" />
					<div className="duel-board-wrapper-background-overlay" />

					<div className="duel-board-grid" style={{ position: 'relative' }}>
						<div className="duel-specimen-cells"
							style={{ gridTemplateColumns: `repeat(${columns}, ${cellSize}px)` }}>
							{cells}
						</div>

						{referencedMove &&
							<DuelMoveRegion
								indices={referencedMove.indices}
								originIndex={referencedMove.origin}
								columns={columns}
								size={grid}
								variant="referenced" />
						}
						{move &&
							<DuelMoveRegion
								indices={move.indices}
								originIndex={move.origin}
								columns={columns}
								size={grid} />
						}
						{targets && targets.length > 0 &&
							<DuelTargetLayer
								targets={targets}
								originIndex={originIndex}
								columns={columns}
								size={grid} />
						}
					</div>
				</div>

				{(caption || note) &&
					<figcaption className="duel-specimen-caption">
						{caption && <span className="duel-specimen-name">{caption}</span>}
						{note && <span className="duel-specimen-note">{note}</span>}
					</figcaption>
				}
			</figure>
		);
	}
}

DuelSpecimenBoard.defaultProps = { columns: 5, cellSize: 62 };

export default DuelSpecimenBoard;
