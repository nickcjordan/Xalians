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

  // if (this.props.G.unsetXalianIds.includes(this.state.selectedXalianId)) {
  //   this.props.moves.setPiece(index, this.state.selectedXalianId);
  // } else if (this.props.G.activeXalianIds.includes(this.state.selectedXalianId)) {
  //   this.props.moves.movePiece(this.state.selectedIndex, index, this.state.selectedXalianId);
  // } else if (this.props.G.unsetOpponentXalianIds.includes(this.state.selectedXalianId)) {
  //   this.props.moves.setPiece(index, this.state.selectedXalianId);
  // } else if (this.props.G.activeOpponentXalianIds.includes(this.state.selectedXalianId)) {
  //   this.props.moves.movePiece(this.state.selectedIndex, index, this.state.selectedXalianId);
  // }
	handleEmptyCellSelection = (destinationIndex) => {
		let game = this.props.G;
		let selectedId = this.state.selectedXalianId;
    let selectedIndex = this.state.selectedIndex;
		if (selectedId) {

			if (duelUtil.isPlayerPiece(selectedId, game)) {
        // handle player move
				if (duelUtil.isUnset(selectedId, game)) {
					this.props.moves.setPiece(destinationIndex, selectedId);
          this.setState({ selectedXalianId: null, selectedIndex: null });
				} else if (duelUtil.isActive(selectedId, game)) {
					this.props.moves.movePiece(selectedIndex, destinationIndex, selectedId);
          this.setState({ selectedXalianId: null, selectedIndex: null });
				} else {
          // do nothing because piece is out ?
        }
			} else if (duelUtil.isOpponentPiece(selectedId, game)) {
        // handle opponent move 
				if (duelUtil.isUnset(selectedId, game)) {
					this.props.moves.setPiece(destinationIndex, selectedId);
          this.setState({ selectedXalianId: null, selectedIndex: null });
				} else if (duelUtil.isActive(selectedId, game)) {
					this.props.moves.movePiece(selectedIndex, destinationIndex, selectedId);
          this.setState({ selectedXalianId: null, selectedIndex: null });
				} else {
          // do nothing because piece is out ?
        }
			}
		}
	};

	componentDidMount() {
		let x = this.props;

		if (this.props.ctx.gameover) {
			this.setState({ winner: this.props.ctx.gameover.winner !== undefined ? <div id="winner">Winner: {this.props.ctx.gameover.winner}</div> : <div id="winner">Draw!</div> });
		}
	}

	handleInitialPieceSelection = (xalian) => {
		console.log('selected xalian ' + xalian.species.name);
		this.setState({ selectedXalianId: xalian.xalianId });
	};

	handleActivePieceSelection = (xalian, index) => {
		if (this.state.selectedXalianId && this.props.G.xalians) {
			// attacking xalian at spot
			if ((duelUtil.isPlayerPiece(this.state.selectedXalianId, this.props.G) && duelUtil.isPlayerPiece(xalian.xalianId, this.props.G)) || (duelUtil.isOpponentPiece(this.state.selectedXalianId, this.props.G) && duelUtil.isOpponentPiece(xalian.xalianId, this.props.G))) {
				console.log('selected xalian ' + xalian.species.name + ' from square ' + index);
				this.setState({
					selectedXalianId: xalian.xalianId,
					selectedIndex: index,
				});
			} else {
				let attacker = this.getXalianFromId(this.state.selectedXalianId);
				let defender = xalian;
				// do attack action
				this.props.moves.doAttack(this.state.selectedIndex, index);

				// reset selection
				this.setState({
					selectedXalianId: null,
					selectedIndex: null,
				});
			}
		} else {
			// moving piece to empty spot
			console.log('selected xalian ' + xalian.species.name + ' from square ' + index);
			this.setState({
				selectedXalianId: xalian.xalianId,
				selectedIndex: index,
			});
		}
	};

	buildInitialSpeciesIcon(x, isOut = false) {
		let isSelected = this.state.selectedXalianId && this.state.selectedXalianId === x.xalianId;
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
					let cellClass = this.state.selectedXalianId && this.state.selectedXalianId === xalian.xalianId ? 'xalian-cell xalian-cell-selected' : 'xalian-cell';
					let bg = this.props.G.activeXalianIds.includes(xalianId) ? '#3b22a885' : '#a8222285';
					cell = (
						<div style={{ backgroundColor: bg }} className={cellClass} onClick={() => this.handleActivePieceSelection(xalian, index)}>
							<h5>{xalian.species.name}</h5>
              <h6>{xalian.stats.health}</h6>
						</div>
					);
				} else {
					cell = <button className="xalian-cell" onClick={() => this.handleEmptyCellSelection(index)} />;
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

		return (
			<div>
				<Row style={{ backgroundColor: '#a8222285' }}>{opponentCols}</Row>
				<Row style={{ backgroundColor: '#4b0f0f85' }}>{opponentOutCols}</Row>
				<table id="board">
					<tbody>{tbody}</tbody>
				</table>
				{this.state.winner}
				<Row style={{ backgroundColor: '#3b22a885' }}>{cols}</Row>
				<Row style={{ backgroundColor: '#170d4185' }}>{outCols}</Row>
			</div>
		);
	}
}

export default DuelBoard;
