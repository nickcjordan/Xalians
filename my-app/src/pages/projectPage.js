import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';


class ProjectPage extends React.Component {

    render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                <Container className="content-container">
                    <Row className="content-row">

                        <Col lg={true} className="topic-column">
                            <h3>CREATE</h3>
                            <ListGroup variant="flush">
                                <ListGroup.Item><i class="bi bi-dot"></i>Each Generation of Xalians NFTs will be designed by the community through a submission and voting process</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>When a new Xalian Generation is released, the design submissions that are ranked the highest will become official Xalians</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>Once a submission becomes official, it will be available to mint as an NFT and can be used to battle in the Xalians Game</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>Every time a Xalians NFT is minted, the original designer of the Xalian will receive a small percentage of royalties</ListGroup.Item>
                            </ListGroup>
                        </Col>

                        <Col lg={true} className="topic-column">
                            <h3>OWN</h3>
                            <ListGroup variant="flush">
                                <ListGroup.Item><i class="bi bi-dot"></i>When you mint a Xalian NFT, you will own the full set of stats and abilities that the AI will generate and assign to your Xalian on mint</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>These stats are randomly generated within defined ranges that retain fairness while still allowing for rarities</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>Our website will read from your cryptocurrency wallet to see all the Xalians you own and import them into your Xalian Faction</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>Any Xalian NFT you own will be avaiable for you to battle with in the Xalians Game</ListGroup.Item>
                            </ListGroup>
                        </Col>

                        <Col lg={true} className="topic-column">
                            <h3>TRADE</h3>
                            <ListGroup variant="flush">
                                <ListGroup.Item><i class="bi bi-dot"></i>Just like other NFT projects, Xalian NFTs will be available to buy, sell, and trade on the open market</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>The 1000's of unique combinations of species, types, stats, and abilities will create rarities among Xalians</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>By using the market, you can build your Faction with a specific strategy in mind</ListGroup.Item>
                            </ListGroup>
                        </Col>

                        <Col lg={true} className="topic-column">
                            <h3>PLAY</h3>
                            <ListGroup variant="flush">
                                <ListGroup.Item><i class="bi bi-dot"></i>Xalians Game is a revolutionary new game that blends the concepts of online trading cards with creature battle games, all built with blockchain technology</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>As you play Xalians Game, you will be rewarded in tokens that can be used to mint more Xalian NFTs and upgrade your Faction</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>Factions will be ranked on the Global Leaderboard where King Kozrak will track how powerful your Faction is</ListGroup.Item>
                                <ListGroup.Item><i class="bi bi-dot"></i>Build your Faction and compete to prove you are worthy of King Kozrak's tournament!</ListGroup.Item>
                            </ListGroup>
                        </Col>
                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

}


export default ProjectPage;