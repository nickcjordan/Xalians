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

                        <Col lg={8} className="topic-column">
                            <h1>Frequently Asked Questions</h1>
                            <ListGroup variant="flush">
                                <ListGroup.Item className="question-section">
                                    <h2>What is a Xalian NFT?</h2>
                                    <p>
                                        Each NFT will represent a unique instance of a Xalian creature.
                                        It will contain all of the data points representing a wide range of details about the creature's species, elemental type, abilities, battle statistics, and much more.
                                        <br></br><br></br>
                                        Upon minting your Xalian NFT, the Xalian Generator algorithm uses preset ranges when randomly generating certain statistics to make sure there are no Xalians that are too overpowered or too weak to a reasonable degree. For instance, if a Xalian is generated with a very high set of attacking stats, it is more likely the defensive stats are on the lower side.
                                    </p>
                                </ListGroup.Item>
                                <ListGroup.Item className="question-section">
                                    <h2>How do I use my Xalian NFT?</h2>
                                    <p>
                                        When you log into the Xalians Game website, all Xalian NFTs in your wallet will be available for you to play with in Xalians Game. You will be able to buy, sell, and trade Xalian NFTs on the open market, and mint them directly on our website.
                                    </p>
                                </ListGroup.Item>
                                <ListGroup.Item className="question-section">
                                    <h2>Who designs the Xalians?</h2>
                                    <h4>You!</h4>
                                    <p>
                                        Our team will design Generation 0, a small batch of Xalians that will be used as samples in the early stages of the project. However, starting with Generation 1, the community will design, submit, and select which Xalians make it into each new generation. 
                                    </p>
                                </ListGroup.Item>
                                
                                <ListGroup.Item className="question-section">
                                    <h2>Isn't an NFT just a picture?</h2>
                                    <p>
                                        A "non-fungible token" is simply a unique unit of data stored on a blockchain. Often times this data can describe an image, but it does not have to! 
                                        <br></br><br></br>
                                        The data in the Xalian NFT you own will contain all of the details about the creature itself, incuding some general descriptors that will help you imagine what the creature will look like. In the beginning, the Xalians Game may not use all of the data points in battle, but the Xalian NFTs are more than just pieces in the Xalians Game! 
                                        <br></br><br></br>
                                        The Xalians website will have one representation of what the creature could look like based on the data in the NFT, but the idea is that we want to create the NFTs in a way that will be reusable across all types of future projects.
                                    </p>
                                </ListGroup.Item>

                                <ListGroup.Item className="question-section">
                                    <h2>When will Xalians Game be ready?</h2>
                                    <p>
                                        Right now our team is still in the early design stages, but we are moving fast! Join our <a href="https://discord.com/invite/sgGNhNJ2KN" >discord</a> for the latest updates!
                                    </p>
                                </ListGroup.Item>

                                {/* 
                                <ListGroup.Item className="question-section">
                                    <h2>Question</h2>
                                    Answer
                                </ListGroup.Item> 
                                */}
                            </ListGroup>
                        </Col>

                    </Row>

                </Container>
            </Container>
        </React.Fragment>


    }

}


export default ProjectPage;