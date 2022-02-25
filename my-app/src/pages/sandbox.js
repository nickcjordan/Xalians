import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';
import { ReactComponent as SpeciesBlueprintSVG } from '../svg/animations/species_blueprint.svg';
import { ReactComponent as VoteSubmissionSVG } from '../svg/animations/vote_submission.svg';
import { ReactComponent as VoteSubmission2SVG } from '../svg/animations/vote_submission2.svg';

import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import SmokeEmitter from '../components/animations/smokeEmitter';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);

class Sandbox extends React.Component {
	componentDidMount() {

		let testWidth = `${this.props.animationWidth || 200}px`;
		
		// SETUP VIEW
		gsap.set('#vote-submission', { 
			width: testWidth, 
			position: 'absolute', 
			overflow: 'visible', 
			transformOrigin: "center",
			xPercent:-50, left:"50%", yPercent:-50, top:"50%", x:0, y:0 // sets to center of screen
		});

		let lastRow = document.getElementById('vote-row6').getBoundingClientRect();
		let lastRowMinusCheckbox = document.getElementById('vote-row6-row').getBoundingClientRect();

		gsap.set(".vote2-group", { scaleY: 1/11 });
		
		gsap.set('#species-blueprint', { width: lastRow.width, position: 'absolute'});
		gsap.set('#vote-submission2', { width: lastRowMinusCheckbox.width, position: 'absolute', opacity: 0, transformOrigin: "top right", overflow: 'visible'});
		gsap.set('#vote-row1', { transformOrigin: "center"});
		gsap.set('#vote-row6, #vote-check-1, #vote-check-2, #vote-selected-box', {opacity: 0});

		gsap.set("#vote-row6", { transformOrigin: "center" });
		gsap.set("#species-blueprint", { transformOrigin: "center" });


		
		let blueprintMoveDelta = getTargetDelta('species-blueprint', 'vote-row6');
		let x = blueprintMoveDelta.dx;
		let y = blueprintMoveDelta.dy;







		var tl = gsap.timeline({ delay: 1,
			scrollTrigger: {
				trigger: "#section3",
				scrub: true,
				markers: true,
				// pin: true
			}
		});
		
		// TRANSFORM BLUEPRINT TO ROW
		tl.to('#blueprint-text', { opacity: 0, duration: 0.5}, "<");
		tl.to('#blueprint-lines', { opacity: 0,	duration: 0.5}, "<");

		// SCALE
		tl.to('#species-blueprint', { scaleY: 0.06, ease: "slow(0.7, 0.7, false)", duration: 1 }, "<");

		// BLUEPRINT MOTION FOLLOW PATH
		tl.to('#species-blueprint', {
			duration: 2,
			motionPath: {
				path: [
					{ x: 0, y: 0 },
					{ x: x/3, y: y/2 },
					{ x: x/2, y: y },
					{ x: x, y: y },
				],
				type: 'cubic',
			},
			ease: "slow(0.7, 0.7, false)",
		}, "<");


		// REPLACE BOTTOM ROW WITH BLUEPRINT
		tl.to("#vote-row6", {opacity: 1, duration: 0.5});
		tl.to("#species-blueprint", {opacity: 0, duration: 0.5}, "<");


		// CHECK MARK 1 ON
		tl.to('#vote-check-2', {opacity: 1, scaleX:1.5, scaleY:1.5, duration: 0.15});
		tl.to('#vote-check-2', {scaleX:1, scaleY:1, duration: 0.15});
		// CHECK MARK 2 ON
		tl.to('#vote-check-1', {opacity: 1, scaleX:1.5, scaleY:1.5, duration: 0.15, delay: 0.5});
		tl.to('#vote-check-1', {scaleX:1, scaleY:1, duration: 0.15});
		// CHECK MARKS OFF
		tl.to('#vote-check-2', {opacity: 0, duration: 1});
		tl.to('#vote-check-1', {opacity: 0, duration: 1}, "<");


		// REORDER ROWS
		tl.to("#vote-row6", { yPercent: -400, duration: 0.5 });
		tl.to("#vote-row5", { yPercent: 200, duration: 0.5 }, "<");
		tl.to("#vote-row4", { yPercent: 200, duration: 0.5 }, "<");

		// SHOW HIGHEST VOTES BOX
		tl.to("#vote-selected-box", { opacity: 0.2, duration: 0.5 });

		// SHAKE AND DROP EXTRA ROWS
		tl.add(this.getShakeAnimation("#vote-row4, #vote-row5"));
		tl.to("#vote-row4", {rotate: 75, y: '+=500', duration: 1, delay: 0.3});
		tl.to("#vote-row5", {rotate: 60, y: '+=500', duration: 1, delay: 0.02}, "<");
		tl.to("#vote-row4", {opacity: 0, duration: 0.2, delay: 0.3}, "<");
		tl.to("#vote-row5", {opacity: 0, duration: 0.2, delay: 0.3}, "<");

		// HIDE CHECK BOXES AND HIGHEST VOTES BOX
		tl.to(".vote-check-box, #vote-selected-box", {opacity: 0}, "<");


		
		let row1 = document.getElementById("vote-row1").getBoundingClientRect();
		
		let row1Y = row1.top;
		let row1X = row1.right;

		let sub2 = document.getElementById("vote-submission2").getBoundingClientRect();
		
		let sub2Y = sub2.top;
		let sub2X = sub2.right;

		let d = getDelta({x:sub2X, y:sub2Y}, {x:row1X, y:row1Y});

		// REPLACE WITH NEXT SVG
		tl.set("#vote-submission2", { x: d.dx, y: d.dy});
		tl.to("#vote-submission2", { opacity: 1, duration: 0 });
		tl.to("#vote-submission", { opacity: 0, duration: 0 }, "<");
		
		// SHOW XALIANS
		tl.to(".vote2-row-xalian", {opacity: 1, duration: 0.5});

		tl.to("#vote2-row1-group, #vote2-row2-group, #vote2-row3-group, #vote2-row4-group", { scaleY: 1, duration: 0.5 }, "<");

		tl.to("#vote2-row1-group", { y: '-=150%', duration: 0.5 }, "<"); 
		tl.to("#vote2-row2-group", { y: '-=50%', duration: 0.5 }, "<"); 
		tl.to("#vote2-row3-group", { y: '+=50%', duration: 0.5 }, "<"); 
		tl.to("#vote2-row4-group", { y: '+=150%', duration: 0.5 }, "<"); 

		console.log();
	}



	getShakeAnimation = (id, delay = 0.2) => {
		let rowShakeTl = gsap.timeline({ delay: delay});
		rowShakeTl.set(id, { transformOrigin: 'center'});
		rowShakeTl.to(id, { rotate: Math.random()*2, x: `+=${Math.random()}`, y: `+=${Math.random()}`, duration: 0.05});
		rowShakeTl.to(id, { rotate: -(Math.random()*2), x: `-=${Math.random()}`, y: `-=${Math.random()}`, duration: 0.05});
		rowShakeTl.to(id, { rotate: Math.random()*2, x: `+=${Math.random()}`, y: `+=${Math.random()}`, duration: 0.05});
		rowShakeTl.to(id, { rotate: -(Math.random()*2), x: `-=${Math.random()}`, y: `-=${Math.random()}`, duration: 0.05});
		rowShakeTl.to(id, { rotate: Math.random()*2, x: `+=${Math.random()}`, y: `+=${Math.random()}`, duration: 0.05});
		rowShakeTl.to(id, { rotate: -(Math.random()*2), x: `-=${Math.random()}`, y: `-=${Math.random()}`, duration: 0.05});
		rowShakeTl.to(id, { rotate: Math.random()*2, x: `+=${Math.random()}`, y: `+=${Math.random()}`, duration: 0.05});
		rowShakeTl.to(id, { rotate: -(Math.random()*2), x: `-=${Math.random()}`, y: `-=${Math.random()}`, duration: 0.05});
		rowShakeTl.set(id, { transformOrigin: 'top left'});
		return rowShakeTl;
	}

	

	render() {
		return (
			<React.Fragment>
				<Container className="fullscreen">
					<Row className="sandbox">
						<Col className="sandbox-col">
							{/* <SmokeEmitter/> */}
							<div style={{ height: '200vh', width: '100vw' }}>
								<Row><Col style={{ height: '100%', width: '100%' }} ><h1>SECTION 1</h1></Col></Row>
							</div>
							<div style={{ height: '200vh', width: '100%' }}>
								<Row><Col style={{ height: '100%', width: '100%' }} ><h1>SECTION 2</h1></Col></Row>
							</div>
							<div id="section3" style={{ height: '100vh', width: '100%', borderColor: "#fbff00", borderWidth: "2px", borderStyle: "solid" }}>
								<div id="blueprint-wrapper">
									<SpeciesBlueprintSVG id="species-blueprint" />
								</div>
								<div id="vote-wrapper">
									<VoteSubmissionSVG id="vote-submission"/>
									<VoteSubmission2SVG id="vote-submission2"/>
								</div>
							</div>
							<div style={{ height: '200vh', width: '100%' }}>
								<Row><Col style={{ height: '100%', width: '100%' }} ><h1>SECTION 4</h1></Col></Row>
							</div>
						</Col>
					</Row>
				</Container>
			</React.Fragment>
		);
	}
}

function getTargetDelta(srcId, targetId) {
	return getDelta(getViewportOrigin(srcId), getViewportOrigin(targetId));
}

function getBBoxOf(id) {
	return getBBox(document.getElementById(id));
}


function getDelta(src, target) {
	return {
		dx: target.x - src.x,
		dy: target.y - src.y
	};
}

function getViewportOrigin(id) {
	let e = document.getElementById(id)
	let loc = e.getBoundingClientRect();
	return getOrigin(loc);
}

function getOrigin(e) {
	return {
	 x: e.x + (e.width/2),
	 y: e.y + (e.height/2)
	};
}

function printIt(id, spot) {
	printOne("#species-blueprint", spot);
	printOne("#vote-row6", spot);
}

function printOne(id, spot) {
		console.log(`${spot} :: id=${id} ==> x=${gsap.getProperty(id, "x")} :: y=${gsap.getProperty(id, "x")} :: height=${gsap.getProperty(id, "height")} :: width=${gsap.getProperty(id, "width")}`);
}


/**
 * @param {SVGElement} element - Element to get the bounding box for
 * @param {boolean} [withoutTransforms=false] - If true, transforms will not be calculated
 * @param {SVGElement} [toElement] - Element to calculate bounding box relative to
 * @returns {SVGRect} Coordinates and dimensions of the real bounding box
 */
function getBBox(element, withoutTransforms, toElement) {
  
	var svg = element.ownerSVGElement;
	
	if (!svg) {
	//   return { x: 0, y: 0, width: 0, height: 0 };
	  svg = element;
	}
	  
	if (withoutTransforms) {
	  return element.getBBox();
	}
	
	var p = svg.createSVGPoint();
	var r = element.getBBox();     
		
	var matrix = (toElement || svg).getScreenCTM().inverse().multiply(element.getScreenCTM()); 
  
	p.x = r.x;
	p.y = r.y;
	var a = p.matrixTransform(matrix);
  
	p.x = r.x + r.width;
	p.y = r.y;
	var b = p.matrixTransform(matrix);
  
	p.x = r.x + r.width;
	p.y = r.y + r.height;
	var c = p.matrixTransform(matrix);
  
	p.x = r.x;
	p.y = r.y + r.height;
	var d = p.matrixTransform(matrix);
  
	var minX = Math.min(a.x, b.x, c.x, d.x);
	var maxX = Math.max(a.x, b.x, c.x, d.x);
	var minY = Math.min(a.y, b.y, c.y, d.y);
	var maxY = Math.max(a.y, b.y, c.y, d.y);
	  
	var width = maxX - minX;
	var height = maxY - minY;
	
	return {
	  x: minX,
	  y: minY,
	  width: width,
	  height: height,        
	  cx: minX + width / 2,
	  cy: minY + height / 2
	};
  }

export default Sandbox;
