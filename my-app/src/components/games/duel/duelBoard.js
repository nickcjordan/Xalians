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
import { ReactComponent as AttackIcon } from '../../../svg/games/duel/duel_attack_icon.svg';
import species from '../../../json/species.json';


import { Hub } from "aws-amplify";
import XalianDuelStatChart from './xalianDuelStatChart';
import XalianDuelStatBadge from './xalianDuelStatBadge';

const reqSvgs = require.context ( '../../../svg/species', true, /\.svg$/ );
const svgs = reqSvgs.keys () .map ( path => ({ path, file: reqSvgs ( path ) }) );

class DuelBoard extends React.Component {
	state = {
		speciesSvgMap: {}
	};

	static propTypes = {
		G: PropTypes.any.isRequired,
		ctx: PropTypes.any.isRequired,
		moves: PropTypes.any.isRequired,
		playerID: PropTypes.string,
		isActive: PropTypes.bool,
		isMultiplayer: PropTypes.bool,
	};

	componentDidMount() {
		var speciesMap = new Map();
		var svgMap = new Map();

		species.forEach( s => {
			speciesMap[s.name.toLowerCase()] = s;
		})

		svgs.forEach( xalianSvg => {
			let path = xalianSvg.path.toLowerCase();
			let speciesName = path.substring(2, path.length - 4);
			let species = speciesMap[speciesName];
			if (species) {
				svgMap[speciesName] = {
					species: species,
					svg: xalianSvg
				}
			}
		})

		this.setState({ speciesSvgMap: svgMap });


		if (this.props.ctx.gameover) {
			this.setState({ winner: this.props.ctx.gameover.winner !== undefined ? <div id="winner">Winner: {this.props.ctx.gameover.winner}</div> : <div id="winner">Draw!</div> });
		}

		this.setupAnimationHub()
		
	}
	
	setupAnimationHub = () => {
		Hub.listen("duel-animation-event", (data) => {
			const type = data.payload.event;
			const req = data.payload.data;
			if (type == "attack") {
			//   this.setState(
			// 	{
			// 	  isShowing: true,
			// 	  variant: req.variant || "dark",
			// 	  headerText: req.title,
			// 	  bodyText: req.text,
			// 	},
			// 	() => {
			// 	  setTimeout(() => {
			// 		Hub.dispatch("alert", { event: "hide-alert", data: null, message: null });
			// 	  }, 3000);
			// 	}
			//   );
			} else if (type == "hide-alert") {
			//   this.setState({ isShowing: false });
			} else if (type == "show-alert") {
			//   this.setState({ isShowing: true });
			}
		  });
	}

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
		if (this.props.ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			paths = duelCalculator.calculateMovablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, this.props.G), this.props.G, this.props.ctx);
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
					attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, duelUtil.getXalianFromId(selectedId, this.props.G), this.props.G, this.props.ctx);
				}
				var attackableIndices = attackablePaths.map( p => p.endIndex);
				if (attackableIndices.includes(index) && (!this.props.G.currentTurnDetails.hasAttacked)) {
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
						<Col style={{ padding: '0px', height: '100%', margin: 'auto' }}>
							<h6 className="condensed-row" style={{ textAlign: 'center', margin: 'auto', height: '100%', width: '100%' }}>
								{x.xalianId.split('-').pop().substring(0, 4)}
							</h6>
						</Col>
					</Row>
				</a>
			</Col>
		);
	}

	buildOccupiedCell = (index, selectedIndex, selectedId, border, attackableIndices, G) => {
		let xalianId = G.cells[index];
		let xalian = duelUtil.getXalianFromId(xalianId, G);
		let cellClass = selectedId && selectedId === xalian.xalianId ? 'xalian-cell xalian-cell-selected' : 'xalian-cell';
		let bg = G.activeXalianIds.includes(xalianId) ? '#9380eb85' : '#e4939385';

		let attackable = attackableIndices && attackableIndices.includes(index) && (index != selectedIndex) && (!G.currentTurnDetails.hasAttacked);
		var healthBarPercentage = (xalian.stats.health/gameConstants.MAX_HEALTH_POINTS) * 100; 
		healthBarPercentage = healthBarPercentage < 5 ? 5 : healthBarPercentage;
		let barColor = healthBarPercentage > 50 ? 'green' : healthBarPercentage > 25 ? 'orange' : 'red'; 

		let moveDistanceIndicators = [];
		for (var i = 0; i < xalian.stats.distance; i++) {
			moveDistanceIndicators.push(<React.Fragment>
				<Col xs={1} style={{padding: '10%', paddingTop: '0px'}}>
					<div style={{ width: '2px', height: '2px', margin: 'auto', backgroundColor: 'yellow', zIndex: '999' }} />
				</Col>
			</React.Fragment>)
		}
		// let xalianSvg = this.state.speciesSvgMap ? this.state.speciesSvgMap[xalian.species.name.toLowerCase()].svg : {}; 
		return (
			// <div style={{ backgroundColor: bg, border: border !== '' ? border : attackable ? 'solid 2px red' : '' }} className={cellClass} onClick={() => this.handleActivePieceSelection(xalian, index)}>
			<div style={{ backgroundColor: bg, border: border, position: 'relative'}} className={cellClass} onClick={() => this.handleActivePieceSelection(xalian, index)}>
				
				<XalianImage padding={'0px'} speciesName={xalian.species.name} primaryType={xalian.elements.primaryType} moreClasses="duel-piece-xalian-icon" />
				
				<Row style={{zIndex: '9999', position: 'absolute', top: 0, left: 0, marginLeft: 0, marginRight: 0, width: '100%', justifyContent: 'center'}}>
					{moveDistanceIndicators}
				</Row>


				{attackable && 
					<AttackIcon style={{ position: 'absolute', top: 0, left: 0, opacity: 0.4, height: '100%', width: '100%' }} />
				}
				<div style={{ width: `${healthBarPercentage}%`, backgroundColor: barColor }} className='duel-health-bar'/>
			</div>
		);
	}

	buildUnoccupiedCell(moves, index, border) {
		let highlighted = moves && moves.includes(index);

		let sty = { backgroundColor: highlighted ? '#18d26e' : '#FFFFFF', border: border, color: '#9e9e9e' };
		let cName = highlighted ? 'xalian-cell xalian-cell-highlighted' : 'xalian-cell';
		return (
			<button style={sty} className={cName} onClick={() => this.handleEmptyCellSelection(index)}>
				{index}
			</button>
		);
	}

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
					cell = this.buildOccupiedCell(index, selectedIndex, selectedId, border, attackableIndices, this.props.G);
				} else {
					cell = this.buildUnoccupiedCell(moves, index, border);
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
		// let selectedXalianDescription = JSON.stringify(selectedXalian, null, 2);

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
				{selectedXalian &&
					<Row style={{ width: '50%' }} >
						<Col>
							<XalianDuelStatBadge type='attack' val={selectedXalian.stats.attack} />
						</Col>
						<Col>
							<XalianDuelStatBadge type='defense' val={selectedXalian.stats.defense} />
						</Col>
						<Col>
							<XalianDuelStatBadge type='move' val={selectedXalian.stats.distance} />
						</Col>
						<Col>
							<XalianDuelStatBadge type='range' val={selectedXalian.stats.range} />
						</Col>
						<Col>
							<XalianDuelStatBadge type='evasion' val={selectedXalian.stats.evasion} />
						</Col>
					</Row>
				}
				{/* <Row style={{ height: '100px' }}> */}
					{/* <Col style={{ height: '100px' }}> */}
					{/*  */}
						{/* <div style={{ height: '100px' }}> */}
							{/* {selectedXalianDescription} */}
							{/* {selectedXalian &&  */}
								{/* <React.Fragment> */}
									{/* <h5>{selectedXalian.species.name}</h5> */}
									{/* <XalianDuelStatChart xalian={selectedXalian} moreClasses='duel-stat-chart' /> */}
								{/* </React.Fragment> */}
							{/* } */}
						{/* </div> */}
{/*  */}
					{/* </Col> */}
				{/* </Row> */}
			</div>
		);
	}

	

	
}



function getMovableIndices(selectedId, selectedIndex, G, ctx) {
	var moves = [];
		if (ctx.phase === 'setup' && selectedId) {
			moves = duelUtil.getStartingIndices(G, ctx);
		} else if (ctx.phase === 'play' && selectedId && (selectedIndex != null && selectedIndex != undefined)) {
			let xalian = duelUtil.getXalianFromId(selectedId, G);
			moves = duelCalculator.calculateMovableIndices(selectedIndex, xalian, G, ctx);
		}
	return moves;
}

export default DuelBoard;
