import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import * as gameConstants from '../../../../gameplay/duel/duelGameConstants';
import XalianImage from '../../../xalianImage';
import * as duelUtil from '../../../../utils/duelUtil';
import * as duelCalculator from '../../../../gameplay/duel/duelCalculator';
import * as duelConstants from '../../../../gameplay/duel/duelGameConstants';
import { ReactComponent as AttackIcon } from '../../../../svg/games/duel/duel_attack_icon.svg';
import { ReactComponent as DuelFlagIcon } from '../../../../svg/games/duel/duel_flag_icon.svg';
import species from '../../../../json/species.json';
import { Hub } from "aws-amplify";
import XalianTypeSymbolBadge from './xalianTypeSymbolBadge';
import DuelXalianSuggestionDetails from './duelXalianSelectionDetails';
import XalianDuelStatBadge from './xalianDuelStatBadge';

class DuelBoardCell extends React.Component {
	state = {
		// size: { min: 50 },
		contentLoaded: false,
	};

	
	componentDidMount() {

        if (this.props.ctx.gameover) {
			this.setState({ winner: this.props.ctx.gameover.winner !== undefined ? <div id="winner">Winner: {this.props.ctx.gameover.winner}</div> : <div id="winner">Draw!</div> });
		}

		// this.setupAnimationHub()

	}
	
	// setupAnimationHub = () => {
	// 	Hub.listen("duel-animation-event", (data) => {
	// 		const type = data.payload.event;
	// 		const attackResult = data.payload.data;
	// 		if (type == "attack") {
	// 			this.setState(
	// 				{
	// 					showAttack: true,
	// 					attackData: attackResult
	// 				},
	// 				() => {
	// 					setTimeout(() => {
	// 						// Hub.dispatch("alert", { event: "hide-alert", data: null, message: null });
	// 						this.setState({
	// 							showAttack: false,
	// 							attackData: null
	// 						})
	// 					}, 3000);
	// 				}
	// 			);
	// 		}
	// 	  });
	// }




	buildUnoccupiedCell(moves, index, flagIfPresent, size, attackAnimation) {
		let highlighted = moves && moves.includes(index);
		// let sty = { backgroundColor: highlighted ? '#18d26f3f' : '', border: 0, position: 'relative', width: size, height: size, lineHeight: size, textAlign: 'center' };
		let sty = { border: 0, position: 'relative', width: size, height: size, lineHeight: size, textAlign: 'center' };
		let grid = duelCalculator.buildGrid();
		let shouldConnectCellLeft = this.shouldConnectToEmptyCellLeft(grid, index);
		let shouldConnectCellTop = this.shouldConnectToEmptyCellTop(grid, index);
		// let dotBg = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 5%, rgba(255,255,255,0.25) 20%, rgba(255,255,255,0) 60%)';
		return (
			<div id={`cell-${index}`} style={sty} onClick={() => this.props.handleEmptyCellSelection(index)}>
				<h6 style={{ position: 'absolute', color: '#9e9e9e2c' }} >{index}</h6>


				{shouldConnectCellLeft &&
					<div className="duel-board-cell-connector" style={{ width: '100%', height: '5px', top: '50%', left: '0' }} />
				}
				{shouldConnectCellTop &&
					<div className="duel-board-cell-connector" style={{ width: '5px', height: '100%', top: '0', left: '50%' }} />
				}
				{highlighted && 
					<div className="duel-board-cell-dot" style={{background: 'radial-gradient(circle, #32a852 0%, #32a85200 100%)', filter: 'drop-shadow(0px 0px 5px #32a852)'}} />
				}
				{!highlighted && 
					<div className="duel-board-cell-dot" style={{ background: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 5%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0) 60%)', margin: 'auto' }} />
				}
				{flagIfPresent}

				{attackAnimation}

			</div>
		);
	}
		

	// buildOccupiedCell = (index, selectedIndex, selectedId, border, attackableIndices, G) => {
	buildOccupiedCell = (index, selectedIndex, selectedId, flagIfPresent, attackableIndices, size, attackAnimation) => {
		let xalianId = this.props.G.cells[index];
		let xalian = duelUtil.getXalianFromId(xalianId, this.props.G);
		let isSelectedXalian = selectedId && selectedId === xalian.xalianId;
		let teamColor = this.props.G.activeXalianIds.includes(xalianId) ? '#9480eb' : '#e49393';

		let attackable = attackableIndices && attackableIndices.includes(index) && (index != selectedIndex) && (!this.props.G.currentTurnDetails.hasAttacked);
		var healthBarPercentage = (xalian.stats.health/gameConstants.MAX_HEALTH_POINTS) * 100; 
		healthBarPercentage = healthBarPercentage < 5 ? 5 : healthBarPercentage;
		let barColor = healthBarPercentage > 50 ? 'green' : healthBarPercentage > 25 ? 'orange' : 'red'; 

		// let moveDistanceIndicators = [];
		// for (var i = 0; i < xalian.stats.distance; i++) {
		// 	moveDistanceIndicators.push(<React.Fragment>
		// 		<Col xs={1} style={{padding: '10%', paddingTop: '0px'}}>
		// 			<div style={{ width: '2px', height: '2px', margin: 'auto', backgroundColor: 'yellow', zIndex: '999' }} />
		// 		</Col>
		// 	</React.Fragment>)
		// }
		// let xalianSvg = this.state.speciesSvgMap ? this.state.speciesSvgMap[xalian.species.name.toLowerCase()].svg : {}; 

		let connectors = this.buildConnectorsForOccupiedCell(index);
		
		return (
				<div   style={{ zIndex: 100 + parseInt(index), position: 'relative', width: size, height: size, lineHeight: size, textAlign: 'center'}} onClick={() => this.props.handleActivePieceSelection(xalian, index)}>

						{connectors}
						
					<div id={'duel-' + xalian.xalianId + '-piece'} className={'duel-' + xalian.xalianId + '-piece'} style={{position: 'relative', height: '100%',  width: '100%'}}>

						<XalianImage className='animate-state' padding={'0px'} speciesName={xalian.species.name} primaryType={xalian.elements.primaryType} moreClasses="duel-piece-xalian-icon" fill={'black'} filter={`drop-shadow(0px 0px 8px ${teamColor})`}/>
						
						{/* MOVE DISTANCE INDICATORS */}
						{/* <Row style={{zIndex: '9999', position: 'absolute', top: '-50%', left: 0, marginLeft: 0, marginRight: 0, width: '100%', justifyContent: 'center', pointerEvents: 'none'}}> */}
							{/* {moveDistanceIndicators} */}
						{/* </Row> */}

						{/* UNDERGLOW */}
						<div style={{zIndex: '1', background: `radial-gradient(circle, ${teamColor} 0%, ${teamColor + '00'} 100%)`, position: 'absolute', width: '100%', height: '20%', bottom: '20%', left: '0', opacity: 1, pointerEvents: 'none', filter: `drop-shadow(0px 0px 10px ${teamColor})` }} />


						{flagIfPresent}

						{attackable && 
							<AttackIcon className="duel-attack-cell-icon"/>
						}

						{/* HEALTH BAR */}
						<div className='duel-health-bar-wrapper'> 
							<div style={{ width: `${healthBarPercentage}%`, backgroundColor: barColor,  pointerEvents: 'none', boxShadow: `0px 0px 4px 4px ${barColor}` }} className='duel-health-bar'/> 
						</div>

						{/* <Row className='duel-xalian-cell-badge-row'> */}
							{/* <Col xs={4}> */}
								{/* MOVE SYMBOL */}
								{/* <XalianDuelStatBadge hideName size={'30%'} type='move' val={xalian.stats.distance}/> */}
							{/* </Col> */}
							{/* <Col xs={4}> */}
								{/* ATTACK RANGE SYMBOL */}
								{/* <XalianDuelStatBadge hideName size={'30%'} type='range' val={xalian.stats.range} /> */}
							{/* </Col> */}
							{/* <Col xs={4}> */}
								{/* TYPE SYMBOL */}
								<XalianTypeSymbolBadge size={30} type={xalian.elements.primaryType.toLowerCase()}  />
							{/* </Col> */}
						{/* </Row> */}

						{attackAnimation}

					</div>
				</div>
		);
	}

	buildConnectorsForOccupiedCell = (index) => {
		var cellConnectors = [];
		let grid = duelCalculator.buildGrid();
		let offset = duelConstants.BOARD_COLUMN_SIZE;
		let currentCoord = grid.map[index];
		
		// build top connector
		let leftIndex = 	this.getIndexIfValidCell(currentCoord[0] - 1, currentCoord[1], grid);
		let topIndex = 		this.getIndexIfValidCell(currentCoord[0], currentCoord[1] - 1, grid);
		let rightIndex = 	this.getIndexIfValidCell(currentCoord[0] + 1, currentCoord[1], grid);
		let bottomIndex = 	this.getIndexIfValidCell(currentCoord[0], currentCoord[1] + 1, grid);


		if (leftIndex != undefined && !this.cellIsOccupied(leftIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector" style={{ width: '100%', height: '5px', top: '50%', left: '0'  }} />			
			)
		}
		if (topIndex != undefined && !this.cellIsOccupied(topIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector" style={{ width: '5px', height: '100%', top: '0', left: '50%' }} />
			)
		}

		if (rightIndex != undefined && !this.cellIsOccupied(rightIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector" style={{ width: '100%', height: '5px', top: '50%', left: '100%'  }} />			
			)
		}
		if (bottomIndex != undefined && !this.cellIsOccupied(bottomIndex)) {
			cellConnectors.push(
				<div className="duel-board-cell-connector" style={{ width: '5px', height: '100%', top: '100%', left: '50%'  }} />
			)
		}
		
		return cellConnectors;

	}

	getIndexIfValidCell(x, y, grid) {
		if (grid.rows[y]) {
			let index = grid.rows[y][x];
			if (index != undefined && index != null) {
				return index;
			} 
		}
	}

	cellIsOccupied(index) {
		return this.props.G.cells[index];
	}

	shouldConnectToEmptyCellLeft(grid, currentIndex) {
		var connect = true;
		let currentCoord = grid.map[currentIndex];
		if (currentCoord[0] == 0) {
			connect = false;
		} else {
			let leftCellIndex = currentIndex - 1;
			if (this.props.G.cells[leftCellIndex]) {
				connect = false;
			}
		}
		return connect;
	}

	shouldConnectToEmptyCellTop(grid, currentIndex) {
		var connect = true;
		let currentCoord = grid.map[currentIndex];
		if (currentCoord[1] == 0) {
			connect = false;
		} else {
			let topCellIndex = currentIndex - duelConstants.BOARD_COLUMN_SIZE;
			if (this.props.G.cells[topCellIndex]) {
				connect = false;
			}
		}
		return connect;
	}



	render() {
		// let size = this.determineCellSize();
		// let selectedId = this.props.G.selectedId;
		// let selectedIndex = duelUtil.getIndexOfXalian(selectedId, this.props.G);
		// let xalian = duelUtil.getXalianFromId(selectedId, this.props.G);
		// // let selectedIndex = this.props.G.selectedIndex;
		// var moves = getMovableIndices(selectedId, selectedIndex, this.props.G, this.props.ctx);
		// var attackablePaths = [];
		// if (selectedId && (selectedIndex != null && selectedIndex != undefined)) {
		// 	attackablePaths = duelCalculator.calculateAttackablePaths(selectedIndex, xalian, this.props.G, this.props.ctx);
		// }
		// var attackableIndices = attackablePaths.map(p => p.endIndex);

		let flag = this.props.flag;
		let cellIndex = this.props.cellIndex;
		let attackableIndices = this.props.attackableIndices;
		let size = this.props.size;
		let selectedIndex = this.props.selectedIndex;
		let selectedId = this.props.selectedId;
		let movableIndices = this.props.movableIndices;

		let attackAnimation = this.buildAttackAnimation();

		var cell = null;

        if (this.props.G.cells[cellIndex]) {
            cell = this.buildOccupiedCell(cellIndex, selectedIndex, selectedId, flag, attackableIndices, size, attackAnimation);
        } else {
            cell = this.buildUnoccupiedCell(movableIndices, cellIndex, flag, size, attackAnimation);
        }
		return cell;
	}


	buildAttackAnimation = () => {

		if (this.state.showAttack && (this.state.attackData.defenderIndex == this.props.cellIndex)) {

			// console.log("\n\n\n\tATTACK!!!\n\n\n");
			console.log(JSON.stringify(this.state.attackData, null, 2));
			return (<React.Fragment>
				{this.state.showAttack && (this.state.attackData.defenderIndex == this.props.cellIndex) &&
					<div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} >
						<XalianTypeSymbolBadge classes={'duel-type-attack-badge'} size={30} type={this.state.attackData.attackerType.toLowerCase()} />
					</div>
				}
			</React.Fragment>);
		}
	}
	
}



export default DuelBoardCell;
