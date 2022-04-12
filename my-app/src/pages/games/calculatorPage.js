import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../../components/navbar';
import Form from 'react-bootstrap/Form';
import XalianImage from '../../components/xalianImage';
import MatchGameFlippedCard from '../../components/games/elements/matchGameFlippedCard';
import species from '../../json/species.json';
import GameContainer from '../../components/games/elements/gameContainer';
import * as calc from '../../gameplay/attackCalculator';
import * as retrievalUtil from '../../utils/retrievalUtil';
import * as svgUtil from '../../utils/svgUtil';

class CalculatorPage extends React.Component {
	state = {
		user: null,
		xalians: []
	};

	componentWillUnmount() {
	}

	componentDidMount() {
		retrievalUtil.getCurrentUserAndXalians().then(user => {
			
			let grid = [];
			user.xalians.forEach( x => {
				grid.push(this.buildSpeciesIcon(x))
			})
			
			
			this.setState({ user: user, xalians: user.xalians })

		})
	}

	buildSpeciesIcon(x) {
        return (
			<Col md={2} sm={3} xs={6} className="species-col">
				<a href={'/species/' + x.id}>
					<XalianImage colored bordered speciesName={x.name} primaryType={x.type} moreClasses="xalian-image-grid" />
					<Row style={{ width: '100%', margin: '0px', padding: '0px' }}>
						<Col xs={5} style={{ margin: 'auto', padding: '0px', paddingRight: '5px', textAlign: 'right' }}>
							{svgUtil.getSpeciesTypeSymbol(x.type, true, 25)}
						</Col>
						<Col xs={7} style={{ padding: '0px', height: '100%', margin: 'auto' }}>
							<h6 className="condensed-row" style={{ textAlign: 'left', margin: 'auto', height: '100%', width: '100%' }}>
								#{x.id}
							</h6>
						</Col>
					</Row>
					<h5 className="condensed-row species-name-title" style={{ textAlign: 'center' }}>
						{x.name}
					</h5>
				</a>
			</Col>
		);
    }

	render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                            <GameContainer>
								{this.state.xalianGrid && <React.Fragment>
									
								</React.Fragment>}
                                
                            </GameContainer>

            </Container>
        </React.Fragment>


    }


	
}

export default CalculatorPage;
