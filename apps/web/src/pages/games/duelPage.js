// Terminal: registry. The live board runs inside Kozrak's arena ledger.
import React from 'react';
import '../../styles/legacy/immersive.css';
import '../../styles/legacy/duel.css';
import XalianNavbar from '../../components/navbar';
import * as retrievalUtil from '../../utils/retrievalUtil';
import { Client } from 'boardgame.io/react';
import { Duel } from '../../components/games/duel/duel';
import DuelBoard  from '../../components/games/duel/board/duelBoard';
import * as translator from '../../utils/valueTranslator';
import * as gameConstants from '@xalians/rules/duel/duelGameConstants'
import { Local } from 'boardgame.io/multiplayer';
import DuelBotInstance from '../../components/games/duel/bot/duelBotInstance';
import * as duelConstants from '@xalians/rules/duel/duelGameConstants'; 
import * as duelPieceBuilder from '@xalians/rules/duel/duelPieceBuilder'; 
import gsap from 'gsap';

class DuelPage extends React.Component {
	state = {
		user: null,
		instructionText: 'Select Attacker',
		resultText: '',
	};

	componentDidMount() {
		// build the piece pools once so re-renders don't reshuffle mid-game
		if (!this.state.xalians) {
			this.setState({ xalians: this.buildTeams() });
		}
	}

	buildTeams = () => {
		let details = this.props.gameDetails;
		let xaliansPerTeam = details.numberOfPieces;

		let allPieces = [];
		let playerPieces = [];
		let opponentPieces = [];

		// the player's chosen real xalians, if any, go on team 0 first
		let squad = (details.playerSquad || []).slice(0, xaliansPerTeam);
		let squadIds = new Set(squad.map((x) => x.xalianId));
		squad.forEach((x) => {
			let transformed = duelPieceBuilder.buildDuelPiece(x);
			allPieces.push(transformed);
			playerPieces.push(transformed);
		});

		// copy the shared module array so shuffling/popping doesn't destroy it for later renders/games
		let samples = [...retrievalUtil.getMockXalianList()].filter((s) => !squadIds.has(s.xalianId));
		gsap.utils.shuffle(samples);

		while (playerPieces.length < xaliansPerTeam && samples.length > 0) {
			let sample = samples.pop();
			if (sample) {
				let transformed = duelPieceBuilder.buildDuelPiece(sample);
				allPieces.push(transformed);
				playerPieces.push(transformed);
			}
		}

		while (opponentPieces.length < xaliansPerTeam && samples.length > 0) {
			let sample = samples.pop();
			if (sample) {
				let transformed = duelPieceBuilder.buildDuelPiece(sample);
				allPieces.push(transformed);
				opponentPieces.push(transformed);
			}
		}

		return { allPieces: allPieces, playerPieces: playerPieces, opponentPieces: opponentPieces };
	}

	// handleClick = (id) => {
	// 	this.state.xalians.forEach((x) => {
	// 		if (x.xalianId === id) {
	// 			this.handleXalianSelection(x.attributes);
	// 		}
	// 	});
	// };

	// handleXalianSelection = (xalian) => {
	// 	if (this.state.instructionText === 'Select Attacker') {
	// 		this.handleAttackerSelection(xalian);
	// 	} else {
	// 		this.handleDefenderSelection(xalian);
	// 	}
	// };

	// handleAttackerSelection = (xalian) => {
	// 	this.setState({ instructionText: 'Now Select Defender', resultText: this.state.resultText + '\n :: ', attacker: xalian });
	// };

	// handleDefenderSelection = (xalian) => {
	// 	let a = this.state.attacker;

	// 	let attackResult = calc.calculateAttackResult(a.moves[0], a, xalian);
	// 	this.setState({ instructionText: 'Select Attacker', resultText: this.state.resultText + ` :: ${a.species.name} [attack=${a.stats['standardAttackPoints'].points}] attacks ${xalian.species.name} [defense=${xalian.stats['standardDefensePoints'].points}] for a result of ${attackResult}` });
	// };

	// buildSpeciesIcon(x) {
	// 	return (
	// 		<Col md={2} sm={3} xs={6} className="species-col">
	// 			<a onClick={() => this.handleClick(x.xalianId)}>
	// 				<XalianImage colored bordered speciesName={x.species.name} primaryType={x.elementType} moreClasses="xalian-image-grid" />
	// 				<Row style={{ width: '100%', margin: '0px', padding: '0px' }}>
	// 					{/* <Col xs={5} style={{ margin: 'auto', padding: '0px', paddingRight: '5px', textAlign: 'right' }}>
	// 						{svgUtil.getSpeciesTypeSymbol(x.elementType, true, 25)}
	// 					</Col> */}
	// 					{/* <Col xs={7} style={{ padding: '0px', height: '100%', margin: 'auto' }}> */}
	// 					<Col style={{ padding: '0px', height: '100%', margin: 'auto' }}>
	// 						<h6 className="condensed-row" style={{ textAlign: 'left', margin: 'auto', height: '100%', width: '100%' }}>
	// 							#{x.xalianId.split("-").pop()}
	// 						</h6>
	// 					</Col>
	// 				</Row>
	// 				<h5 className="condensed-row species-name-title" style={{ textAlign: 'center' }}>
	// 					{x.name}
	// 				</h5>
	// 			</a>
	// 		</Col>
	// 	);
	// }

	

	render() {
		let details = this.props.gameDetails;
		let xaliansPerTeam = details.numberOfPieces;
		let selectedMultiplayer = details.bot ? Local({
			bots: {
				1: DuelBotInstance
			},
		})
		: Local(
			{
				  // Enable localStorage cache.
					// persist: true,

					// Set custom prefix to store data under. Default: 'bgio'.
					// storageKey: 'bgio',
			}
		);
		// let xaliansPerTeam = duelConstants.XALIANS_PER_TEAM;

		if (this.state.xalians) {
			let { allPieces, playerPieces, opponentPieces } = this.state.xalians;

			let teams = [];
			teams.push(playerPieces.map(x => (x.xalianId)));
			teams.push(opponentPieces.map(x => (x.xalianId)));

			const duel = Duel(
				{
					user: this.state.user,
					playerXalians: playerPieces,
					opponentXalians: opponentPieces,
					teams: teams,
					xalians: allPieces,
					bot: details.bot,
					randomizeStartingPositions: details.randomizeStartingPositions
				}
			);

			const DuelClient = Client({
				// A game object.
				game: duel,

				// The number of players.
				numPlayers: 2,

				// Your React component representing the game board.
				// The props that this component receives are listed below.
				// When using TypeScript, type the component's properties as
				// extending BoardProps.
				board: DuelBoard,

				// Optional: React component to display while the client
				// is in the "loading" state prior to the initial sync
				// with the game master. Relevant only in multiplayer mode.
				// If this is not provided, the client displays "connecting...".
				// loading: LoadingComponent,

				// Set this to one of the following to enable multiplayer:
				//
				// SocketIO
				//   Implementation that talks to a remote server using socket.io.
				//
				//   How to import:
				//     import { SocketIO } from 'boardgame.io/multiplayer'
				//
				//   Arguments:
				//     Object with 2 parameters
				//        1. 'socketOpts' options to pass directly to socket.io client.
				//        2. 'server' specifies the server location in the format: [http[s]://]hostname[:port];
				//            defaults to current page host.
				//
				// Local
				//   Special local mode that uses an in-memory game master. Useful
				//   for testing multiplayer interactions locally without having to
				//   connect to a server.
				//
				//   How to import:
				//     import { Local } from 'boardgame.io/multiplayer'
				//
				// Additionally, you can write your own transport implementation.
				// See `src/client/client.js` for details.
				// multiplayer: false,
				multiplayer: selectedMultiplayer,

				// Set to false to disable the Debug UI.
				debug: details.debugMode,
				// debug: false,

				// An optional Redux store enhancer.
				// This is useful for augmenting the Redux store
				// for purposes of debugging or simply intercepting
				// events in order to kick off other side-effects in
				// response to moves.
				// enhancer: applyMiddleware(your_middleware),
			});
			
			return (
				// <React.Fragment>
					// <Container fluid className="content-background-container" style={{ background: '#1f1f1fff'}}>
					// <XalianNavbar></XalianNavbar>


					// <GameContainer>
					<div data-terminal="registry">
					{details.bot &&
						<>
						<DuelClient playerID="0" />
						{/* <DuelClient playerID="1" /> */}
						</>
					}

					{!details.bot &&
						<>
						<DuelClient playerID="0" />
						<DuelClient playerID="1" />
						</>
					}
					</div>
					// </GameContainer>

					// </Container>

				// </React.Fragment>
			);
		} else {
			return (
				<div className="g-console" data-terminal="registry">
					<XalianNavbar />

					<div className="g-shell registry-shell">
						<header className="g-masthead">
							<div className="g-masthead-heading">
								<p className="g-kicker">Valleron Arena Registry</p>
								<h1 className="g-title">Duel</h1>
							</div>
							<div className="g-masthead-aside">
								<span className="g-nameplate">Valleron Arena &middot; Window 2</span>
							</div>
						</header>

						<div className="g-counter registry-counter">
							WAITING ON RESPONSE...
						</div>
					</div>
				</div>
			);
		}
	}

	
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export default DuelPage;
