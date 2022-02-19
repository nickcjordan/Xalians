import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';
import XaliansLogoAnimatedSVG from '../svg/logo/xaliansLogoAnimatedSVG';

class Sandbox extends React.Component {
	render() {
		return (
			<React.Fragment>
				<Container fluid className="content-background-container">
					<XalianNavbar></XalianNavbar>

					<Container>
						<Row className="vertically-center-contents sandbox">
							<Col className="stackable-margin vertically-center-contents">
							<XaliansLogoAnimatedSVG/>
							</Col>
						</Row>
					</Container>
				</Container>
			</React.Fragment>
		);
	}
}

export default Sandbox;
