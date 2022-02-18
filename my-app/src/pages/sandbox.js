import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';

class Sandbox extends React.Component {
	render() {
		return (
			<React.Fragment>
				<Container fluid className="content-background-container">
					<XalianNavbar></XalianNavbar>

					<Container>
						<Row className="">
							<Col className="stackable-margin vertically-center-contents">
								Welcome to the Xalian Community
								<iframe className='community-poll-wrapper' scrolling="no" frameborder="0" style={{ display: 'block', height: '760px', width: '100%', maxWidth: '460px'}} src={"https://embed.pollforall.com/?pollId=" + POLL_ID}></iframe>
							</Col>
						</Row>
					</Container>
				</Container>
			</React.Fragment>
		);
	}
}

export default Sandbox;
