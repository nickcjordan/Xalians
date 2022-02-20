import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';
import XaliansLogoAnimatedSVG from '../svg/logo/xaliansLogoAnimatedSVG';
import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';

class Sandbox extends React.Component {
	render() {
		return (
			<React.Fragment>
					{/* <Container className="fullscreen">
						<Row className="sandbox">
							<Col className="sandbox-col">
								<XaliansLogoAnimatedSVG/>
							</Col>
						</Row>
						<Row className="spacer">
							<Col className="sandbox-col">
							</Col>
						</Row>
					</Container> */}
					{/* <canvas style={{ position: 'absolute', top: 0, left: 0 }}></canvas> */}
					<SplashGalaxyBackground className="galaxy-splash-animation-bg">
						<div><p>HI!!</p></div>
					</SplashGalaxyBackground>
			</React.Fragment>
		);
	}
}



export default Sandbox;
