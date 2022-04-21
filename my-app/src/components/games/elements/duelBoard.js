/*
 * Copyright 2017 The boardgame.io Authors.
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import * as gameConstants from '../duelGameConstants';
import * as svgUtil from '../../../utils/svgUtil';
import XalianImage from '../../xalianImage';
import { Collapse } from 'react-bootstrap';
import * as duelUtil from '../../../utils/duelUtil';
import * as duelCalculator from '../../../gameplay/duelCalculator';

class DuelBoard extends React.Component {
	state = {};

	static propTypes = {
		G: PropTypes.any.isRequired,
		ctx: PropTypes.any.isRequired,
		moves: PropTypes.any.isRequired,
		playerID: PropTypes.string,
		isActive: PropTypes.bool,
		isMultiplayer: PropTypes.bool,
	};

	setSelection = (id, index) => {
		// this.props.G.selectedIndex = index;
		// this.props.G.selectedId = id;
		this.setState({ selectedXalianId: id, selectedIndex: index }); 
		this.props.moves.selectPiece(id, index);
	}

	handleEmptyCellSelection = (destinationIndex) => {
		let game = this.props.G;
		let selectedId = this.state.selectedXalianId;
		let selectedIndex = this.state.selectedIndex;

		var moves = [];
		if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			moves = duelCalculator.calculateMovableIndices(selectedIndex, this.getXalianFromId(selectedId), this.props.G, this.props.ctx);
		}

		if (selectedId) { // moving a piece
			// if (duelUtil.isPlayerPiece(selectedId, game)) {
				// handle player move
				if (duelUtil.isUnset(selectedId, game)) { // setting piece initially
					if (duelUtil.getStartingIndices(this.props.G, this.props.ctx).includes(destinationIndex)) {
						this.props.moves.setPiece(destinationIndex, selectedId);
						this.setSelection(null, null); 
					} else {
						console.error("CAN NOT SET INITIAL PIECE HERE");
					}
				} else if (duelUtil.isActive(selectedId, game)) { // moving existing piece
					if (moves.includes(destinationIndex)) { // valid move
						this.props.moves.movePiece(selectedIndex, destinationIndex, selectedId);
						this.setSelection(null, null); 
					} else {
						console.log("INVALID MOVE");
					}
				} else {
					// do nothing because piece is out ?
				}
			// } else if (duelUtil.isOpponentPiece(selectedId, game)) {
			// 	// handle opponent move
			// 	if (duelUtil.isUnset(selectedId, game)) { // setting piece initially
			// 		if (duelUtil.getStartingIndices(this.props.G, this.props.ctx).includes(destinationIndex)) {
			// 			this.props.moves.setPiece(destinationIndex, selectedId);
			// 			this.setState({ selectedXalianId: null, selectedIndex: null });
			// 		} else {
			// 			console.error("CAN NOT SET INITIAL PIECE HERE");
			// 		}
			// 	} else if (duelUtil.isActive(selectedId, game)) { // moving existing piece
			// 		if (moves.includes(destinationIndex)) { // valid move
			// 			this.props.moves.movePiece(selectedIndex, destinationIndex, selectedId);
			// 			this.setState({ selectedXalianId: null, selectedIndex: null });
			// 		} else {
			// 			console.log("INVALID MOVE");
			// 		}
			// 	} else {
			// 		// do nothing because piece is out ?
			// 	}
			// }
		}
	};

	componentDidMount() {
		if (this.props.ctx.gameover) {
			this.setState({ winner: this.props.ctx.gameover.winner !== undefined ? <div id="winner">Winner: {this.props.ctx.gameover.winner}</div> : <div id="winner">Draw!</div> });
		}
	}

	handlePieceSelection = (xalian) => { 

		var i = this.props.G.cells.length - 1;
		this.props.G.unsetXalianIds.forEach( id => {
			this.props.moves.setPiece(i--, id);
		})

		i = 0;
		this.props.G.unsetOpponentXalianIds.forEach( id => {
			this.props.moves.setPiece(i++, id);
		});


		// UNCOMMENT WHEN DONE DEBUGGING
		// this.handleInitialPieceSelection(xalian);
	}

	// called in setup when a piece is selected to be placed
	handleInitialPieceSelection = (xalian) => {
		if (this.state.selectedXalianId && this.state.selectedXalianId === xalian.xalianId) {
			console.log('UNselected xalian ' + xalian.species.name + ' from placing');
			this.setSelection(null, null); 
		} else if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, this.props.G, this.props.ctx)) {
			console.log('selected xalian ' + xalian.species.name + ' to place');
			this.setSelection(xalian.xalianId, null); 
		} else {
			console.log("CAN NOT SELECT OTHER PLAYERS PIECE");
		}
	};

	handleActivePieceSelection = (xalian, index) => {
		if (this.state.selectedXalianId && this.props.G.xalians) {
			let selectedId = this.state.selectedXalianId;
			let selectedIndex = this.state.selectedIndex;
			
			if ((duelUtil.isPlayerPiece(selectedId, this.props.G) && duelUtil.isPlayerPiece(xalian.xalianId, this.props.G)) 
			|| (duelUtil.isOpponentPiece(selectedId, this.props.G) && duelUtil.isOpponentPiece(xalian.xalianId, this.props.G))) {
				this.selectPiece(xalian, index); // switching piece selection from same team
			} else {
				var attackableIndices = [];
				if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
					attackableIndices = duelCalculator.calculateAttackableIndices(selectedIndex, this.getXalianFromId(selectedId), this.props.G, this.props.ctx);
				}
				if (attackableIndices.includes(index) && (!this.props.G.currentTurnState.hasAttacked)) {
					// do attack action
					this.props.moves.doAttack(selectedIndex, index);
	
					// reset selection
					this.setSelection(null, null);
				} else {
					console.log("CAN NOT ATTACK SPACE");
				}
				
			}
		} else {
			this.selectPiece(xalian, index);
		}
	};

	selectPiece = (xalian, index) => {
		if (this.state.selectedIndex === index) { // unselect
			console.log('UNselecting xalian ' + xalian.species.name + ' from square ' + index);
			this.setSelection(null, null);
		} else {
			if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, this.props.G, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' from square ' + index);
				this.setSelection(xalian.xalianId, index);
			} else {
				console.log('only referencing xalian ' + xalian.species.name + ' from square ' + index);
			}
		}
	};

	buildInitialSpeciesIcon(x, isOut = false) {
		let isSelected = this.state.selectedXalianId && this.state.selectedXalianId === x.xalianId;
		let opac = isOut ? 0.4 : 1;

		return (
			<Col md={2} sm={3} xs={6} className="species-col">
				<a onClick={() => this.handlePieceSelection(x)}>
					<XalianImage colored bordered selected={isSelected} speciesName={x.species.name} primaryType={x.elements.primaryType} moreClasses="xalian-image-grid" style={{ opacity: opac }} />
					<Row style={{ width: '100%', margin: '0px', padding: '0px' }}>
						{/* <Col xs={5} style={{ margin: 'auto', padding: '0px', paddingRight: '5px', textAlign: 'right' }}>
							{svgUtil.getSpeciesTypeSymbol(x.elements.primaryType, true, 25)}
						</Col> */}
						{/* <Col xs={7} style={{ padding: '0px', height: '100%', margin: 'auto' }}> */}
						<Col style={{ padding: '0px', height: '100%', margin: 'auto' }}>
							<h6 className="condensed-row" style={{ textAlign: 'center', margin: 'auto', height: '100%', width: '100%' }}>
								{x.xalianId.split('-').pop().substring(0, 4)}
							</h6>
						</Col>
					</Row>
					{/* <h5 className="condensed-row species-name-title" style={{ textAlign: 'center' }}>
						{x.name}
					</h5> */}
				</a>
			</Col>
		);
	}

	getXalianFromId = (id) => {
		return this.props.G.xalians.filter((x) => x.xalianId === id)[0];
	};

	render() {
		let selectedIndex = this.state.selectedIndex;
		let selectedId = this.state.selectedXalianId;
		var moves = getMovableIndices(selectedId, selectedIndex, this.props.G, this.props.ctx);
		var attackableIndices = [];
		if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			attackableIndices = duelCalculator.calculateAttackableIndices(selectedIndex, this.getXalianFromId(selectedId), this.props.G, this.props.ctx);
		}
		let tbody = [];
		for (let i = 0; i < gameConstants.BOARD_COLUMN_SIZE; i++) {
			let cells = [];
			for (let j = 0; j < gameConstants.BOARD_COLUMN_SIZE; j++) {
				const index = gameConstants.BOARD_COLUMN_SIZE * i + j;
				var cell = null;

				if (this.props.G.cells[index]) {
					let xalianId = this.props.G.cells[index];
					// let xalian = this.props.G.xalians.filter( x => x.xalianId === xalianId )[0];
					let xalian = this.getXalianFromId(xalianId);
					let cellClass = selectedId && selectedId === xalian.xalianId ? 'xalian-cell xalian-cell-selected' : 'xalian-cell';
					let bg = this.props.G.activeXalianIds.includes(xalianId) ? '#3b22a885' : '#a8222285';
					let attackable = attackableIndices && attackableIndices.includes(index) && (index != selectedIndex) && (!this.props.G.currentTurnState.hasAttacked);
					cell = (
						<div style={{ backgroundColor: bg, border: attackable ? 'solid 2px red' : '0px' }} className={cellClass} onClick={() => this.handleActivePieceSelection(xalian, index)}>
							<h5>{xalian.species.name}</h5>
							<h6>{xalian.stats.health}</h6>
						</div>
					);
				} else {
					let highlighted = moves && moves.includes(index);
					let sty = { backgroundColor: highlighted ? '#18d26e' : '#FFFFFF' };
					let cName = highlighted ? 'xalian-cell xalian-cell-highlighted' : 'xalian-cell';
					cell = (
						<button style={sty} className={cName} onClick={() => this.handleEmptyCellSelection(index)}>
							{index}
						</button>
					);
				}

				cells.push(<td key={index}>{cell}</td>);
			}
			tbody.push(<tr key={i}>{cells}</tr>);
		}

		var cols = [];
		var outCols = [];
		var opponentCols = [];
		var opponentOutCols = [];

		if (this.props.G.unsetXalianIds && this.props.G.unsetXalianIds.length > 0 && this.props.G.xalians) {
			this.props.G.unsetXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					cols.push(this.buildInitialSpeciesIcon(x));
				}
			});
		}

		if (this.props.G.unsetOpponentXalianIds && this.props.G.xalians) {
			this.props.G.unsetOpponentXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					opponentCols.push(this.buildInitialSpeciesIcon(x));
				}
			});
		}

		if (this.props.G.inactiveOpponentXalianIds && this.props.G.xalians) {
			this.props.G.inactiveOpponentXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					opponentOutCols.push(this.buildInitialSpeciesIcon(x, true));
				}
			});
		}

		if (this.props.G.inactiveXalianIds && this.props.G.xalians) {
			this.props.G.inactiveXalianIds.forEach((id) => {
				let x = this.props.G.xalians.filter((x) => x.xalianId === id)[0];
				if (x) {
					outCols.push(this.buildInitialSpeciesIcon(x, true));
				}
			});
		}

		let isPlayersTurn = parseInt(this.props.ctx.currentPlayer) == 0;

		return (
			<div>
				<div style={{ border: isPlayersTurn ? '0px' : 'solid 4px white' }}>
					<Row style={{ backgroundColor: '#a8222285' }}>{opponentCols}</Row>
					<Row style={{ backgroundColor: '#4b0f0f85' }}>{opponentOutCols}</Row>
				</div>
				<table id="board">
					<tbody>{tbody}</tbody>
				</table>
				{this.state.winner}
				<div style={{ border: isPlayersTurn ? 'solid 4px white' : '0px' }}>
					<Row style={{ backgroundColor: '#3b22a885' }}>{cols}</Row>
					<Row style={{ backgroundColor: '#170d4185' }}>{outCols}</Row>
				</div>
			</div>
		);
	}

	
}

function getMovableIndices(selectedId, selectedIndex, G, ctx) {
	var moves = [];
		if (ctx.phase === 'setup' && selectedId) {
			moves = duelUtil.getStartingIndices(G, ctx);
		} else if (ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			let xalian = G.xalians.filter((x) => x.xalianId === selectedId)[0];
			moves = duelCalculator.calculateMovableIndices(selectedIndex, xalian, G, ctx);
		}
	return moves;
}

export default DuelBoard;
