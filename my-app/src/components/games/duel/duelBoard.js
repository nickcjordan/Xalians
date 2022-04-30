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
import * as gameConstants from '../../../gameplay/duel/duelGameConstants';
import * as svgUtil from '../../../utils/svgUtil';
import XalianImage from '../../xalianImage';
import { Collapse } from 'react-bootstrap';
import * as duelUtil from '../../../utils/duelUtil';
import * as duelCalculator from '../../../gameplay/duel/duelCalculator';

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
		if (duelUtil.isPlayersTurn(this.props.ctx)) {
			// this.setState({ selectedId: id, selectedIndex: index }); 
			// disallowed move when not your turn
			this.props.moves.selectPiece(id);
		}
	}

	handleEmptyCellSelection = (destinationIndex) => {
		let game = this.props.G;
		// let selectedId = this.state.selectedId;
		let selectedId = this.props.G.selectedId;
		// let selectedIndex = this.state.selectedIndex;
		// let selectedIndex = this.props.G.selectedIndex;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);

		var paths = [];
		if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			paths = duelCalculator.calculateMovablePaths(selectedIndex, this.getXalianFromId(selectedId), this.props.G, this.props.ctx);
		}
		let moves = paths.map( path => path.endIndex );

		if (selectedId) { // moving a piece
			// if (duelUtil.isPlayerPiece(selectedId, game)) {
				// handle player move
				if (duelUtil.isUnset(selectedId, game)) { // setting piece initially
					if (duelUtil.getStartingIndices(this.props.G, this.props.ctx).includes(destinationIndex)) {
						this.props.moves.setPiece(destinationIndex, selectedId);
						this.setState({ referencedXalianId: null });
					} else {
						console.error("CAN NOT SET INITIAL PIECE HERE");
					}
				} else if (duelUtil.isActive(selectedId, game)) { // moving existing piece
					if (moves.includes(destinationIndex)) { // valid move
						let path = duelCalculator.calculatePathToTarget(selectedIndex, destinationIndex, this.props.G, this.props.ctx);
						this.props.moves.movePiece(path);
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
			// 			this.setState({ selectedId: null, selectedIndex: null });
			// 		} else {
			// 			console.error("CAN NOT SET INITIAL PIECE HERE");
			// 		}
			// 	} else if (duelUtil.isActive(selectedId, game)) { // moving existing piece
			// 		if (moves.includes(destinationIndex)) { // valid move
			// 			this.props.moves.movePiece(selectedIndex, destinationIndex, selectedId);
			// 			this.setState({ selectedId: null, selectedIndex: null });
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

	// called in setup when a piece is selected to be placed
	handleInitialPieceSelection = (xalian) => {

		if (true) { // DEBUG
			let options = [56, 57, 58, 59, 60, 61, 62, 63];
			var ind = -1;
			var isEmpty = false;
			while(ind < 0 && !isEmpty) {
				ind = Math.round(Math.random() * (options.length - 1));
				isEmpty = this.props.G.cells[ind] ? true : false;
			}
			let selection = options[ind];
			this.props.moves.setPiece(selection, xalian.xalianId);
		} else {
			if (this.props.G.selectedId && this.props.G.selectedId === xalian.xalianId) {
				console.log('UNselected xalian ' + xalian.species.name + ' from placing');
				this.setSelection(null, null); 
				this.setState({ referencedXalianId: null });
			} else if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, this.props.G, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' to place');
				this.setSelection(xalian.xalianId, null); 
			} else {
				console.log("CAN NOT SELECT OTHER PLAYERS PIECE");
				this.setState({ referencedXalianId: xalian.xalianId });
			}
		}
	};

	handleActivePieceSelection = (xalian, index) => {
		if (this.props.G.selectedId && this.props.G.xalians) {
			let selectedId = this.props.G.selectedId;
			// let selectedIndex = this.props.G.selectedIndex;
			let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);
			
			if ((duelUtil.isPlayerPiece(selectedId, this.props.G) && duelUtil.isPlayerPiece(xalian.xalianId, this.props.G)) 
			|| (duelUtil.isOpponentPiece(selectedId, this.props.G) && duelUtil.isOpponentPiece(xalian.xalianId, this.props.G))) {
				this.selectPiece(xalian, index); // switching piece selection from same team
			} else {
				var attackablePaths = [];
				if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
					attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, this.getXalianFromId(selectedId), this.props.G, this.props.ctx);
				}
				var attackableIndices = attackablePaths.map( p => p.endIndex);
				if (attackableIndices.includes(index) && (!this.props.G.currentTurnState.hasAttacked)) {
					// do attack action
					let path = duelCalculator.calculatePathToTarget(selectedIndex, index, this.props.G, this.props.ctx)
					this.props.moves.doAttack(path);
	
					// reset selection
					this.setState({ referencedXalianId: null });
				} else {
					console.log("CAN NOT ATTACK SPACE");
				}
				
			}
		} else {
			this.selectPiece(xalian, index);
		}
	};

	selectPiece = (xalian, index) => {
		let selectedId = this.props.G.selectedId;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);
		if (selectedIndex === index) { // unselect
			console.log('UNselecting xalian ' + xalian.species.name + ' from square ' + index);
			this.setSelection(null, null);
			this.setState({ referencedXalianId: null });
		} else {
			if (duelUtil.isCurrentTurnsXalian(xalian.xalianId, this.props.G, this.props.ctx)) {
				console.log('selected xalian ' + xalian.species.name + ' from square ' + index);
				this.setSelection(xalian.xalianId, index);
			} else {
				console.log('only referencing xalian ' + xalian.species.name + ' from square ' + index);
				this.setState({ referencedXalianId: xalian.xalianId });
			}
		}
	};

	buildInitialSpeciesIcon(x, isOut = false) {
		let isSelected = this.props.G.selectedId && this.props.G.selectedId === x.xalianId;
		let opac = isOut ? 0.4 : 1;

		return (
			<Col md={2} sm={3} xs={6} className="species-col">
				<a onClick={() => this.handleInitialPieceSelection(x)}>
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
		let selectedId = this.props.G.selectedId;
		let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);
		let xalian = duelUtil.getXalianFromId(selectedId, this.props.G);
		// let selectedIndex = this.props.G.selectedIndex;
		var moves = getMovableIndices(selectedId, selectedIndex, this.props.G, this.props.ctx);
		var attackablePaths = [];
		if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, xalian, this.props.G, this.props.ctx);
		}
		var attackableIndices = attackablePaths.map(p => p.endIndex);
		let tbody = [];
		for (let i = 0; i < gameConstants.BOARD_COLUMN_SIZE; i++) {
			let cells = [];
			for (let j = 0; j < gameConstants.BOARD_COLUMN_SIZE; j++) {
				const index = gameConstants.BOARD_COLUMN_SIZE * i + j;
				var cell = null;

				let isPlayerFlagIndex = duelUtil.getPlayerFlagIndex(this.props.G) == index;
				let isOpponentFlagIndex = duelUtil.getOpponentFlagIndex(this.props.G) == index;


				let border = isPlayerFlagIndex ? 'double 8px #947dfaff' 
					: isOpponentFlagIndex ? 'double 8px #ff7a7aff': '';

				if (this.props.G.cells[index]) {
					let xalianId = this.props.G.cells[index];
					// let xalian = this.props.G.xalians.filter( x => x.xalianId === xalianId )[0];
					let xalian = duelUtil.getXalianFromId(xalianId, this.props.G);
					let cellClass = selectedId && selectedId === xalian.xalianId ? 'xalian-cell xalian-cell-selected' : 'xalian-cell';
					let bg = this.props.G.activeXalianIds.includes(xalianId) ? '#3b22a885' : '#a8222285';
					let attackable = attackableIndices && attackableIndices.includes(index) && (index != selectedIndex) && (!this.props.G.currentTurnState.hasAttacked);
					
					cell = (
						<div style={{ backgroundColor: bg, border: border !== '' ? border : attackable ? 'solid 2px red' : '' }} className={cellClass} onClick={() => this.handleActivePieceSelection(xalian, index)}>
							<h5>{xalian.species.name}</h5>
							<h6>{xalian.stats.health}</h6>
						</div>
					);
				} else {
					let highlighted = moves && moves.includes(index);
					
					let sty = { backgroundColor: highlighted ? '#18d26e' : '#FFFFFF', border: border };
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

		let selectedXalian = duelUtil.getXalianFromId(this.props.G.selectedId || this.state.referencedXalianId, this.props.G);
		let selectedXalianDescription = JSON.stringify(selectedXalian, null, 2);

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
				<Row>
					<Col>
					
						<div style={{ backgroundColor: 'black' }}>
							{selectedXalianDescription}
						</div>

					</Col>
				</Row>
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
