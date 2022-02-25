import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { ReactComponent as SpeciesBlueprintSVG } from '../../../svg/animations/species_blueprint.svg';
import { ReactComponent as VoteSubmissionSVG } from '../../../svg/animations/vote_submission.svg';
import { ReactComponent as VoteSubmission2SVG } from '../../../svg/animations/vote_submission2.svg';

import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);

class SpeciesBlueprintSubmissionAnimation extends React.Component {

    constructor(props) {
        super(props);
        this.state = { width: 0, height: 0 };
        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
      }
      
      componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDimensions);
      }
      
      updateWindowDimensions() {
        let testWidth = `${this.props.animationWidth || 200}px`;
        let parent = this.props.parentId || 'animation1-scroll-trigger-wrapper';
        let container = document.getElementById(parent).getBoundingClientRect();
        let w = window.innerWidth;
        let h = window.innerHeight;
        let viewProps = {
            itemWidth: testWidth,
            xCenter: container.x + (w/2),
            yCenter: container.y + (h/2),
            xQuarter: container.x + (w/4),
            yQuarter: container.y + (h/4),
            x: container.x,
            y: container.y,
            width: window.innerWidth,
            height: window.innerHeight
        }
        this.setState({ viewProps:viewProps });
      }

    

	componentDidMount() {
		let pos = 'absolute';

        this.updateWindowDimensions();
        window.addEventListener('resize', this.updateWindowDimensions);

		let testWidth = `${this.props.animationWidth || 200}px`;

        gsap.set('#vote-submission', { 
			transformOrigin: "center",
            width: testWidth,
			position: pos
		});
		let lastRow = document.getElementById('vote-row6').getBoundingClientRect();
		let lastRowMinusCheckbox = document.getElementById('vote-row6-row').getBoundingClientRect();
		gsap.set("#vote-row6, #species-blueprint, #vote-row1", { transformOrigin: "center" });
		gsap.set(".vote2-group", { scaleY: 1/11 });
		gsap.set('#species-blueprint', { width: lastRow.width, position: pos});
		// gsap.set('#species-blueprint', { scaleX: lastRow.width/testWidth, position: 'relative'});
		gsap.set('#vote-submission2', { width: lastRowMinusCheckbox.width, position: pos, autoAlpha: 0, transformOrigin: "top right", overflow: 'visible'});
		gsap.set('#vote-row6, #vote-check-1, #vote-check-2, #vote-selected-box', {autoAlpha: 0});

		let change = getTargetDelta('vote-submission', this.props.parentId);

		// SETUP VIEW
		gsap.set('#vote-submission', { 
			overflow: 'visible', 
			x: change.dx,
            y: change.dy // sets to center of screen
		});

		let change2 = getTargetDelta('species-blueprint', this.props.parentId);
		
		// SETUP VIEW
		gsap.set('#species-blueprint', { 
			overflow: 'visible', 
			x: change2.dx/2,
            y: (change2.dy/2)
		});
		
		let gh = getViewportOrigin('species-blueprint');
		let ghf = getViewportOrigin('vote-row6');

        
		var tl = gsap.timeline({ delay: 2, repeatDelay: 2, repeat: -1,
			scrollTrigger: {
				// trigger: `#${this.props.parentId || 'animation1-scroll-trigger-wrapper'}`,
                trigger: `#${this.props.parentId}`,
				markers: true,
                toggleActions: "play pause pause pause",
                // start: "center center",
                // end: "bottom 10%",
				// pin: true,
                // scrub: true,
                // duration: 10
			}
		});

		
		// TRANSFORM BLUEPRINT TO ROW
		tl.to('#blueprint-text', { autoAlpha: 0, duration: 0.5, delay: 1}, "<");
		tl.to('#blueprint-lines', { autoAlpha: 0,	duration: 0.5}, "<");
		
		// SCALE
		tl.to('#species-blueprint', { scaleY: 0.06, ease: "slow(0.7, 0.7, false)", duration: 1 }, "<");
		
		
		// BLUEPRINT MOTION FOLLOW PATH
		// tl.to('#species-blueprint', {
			// 	duration: 1,
			// 	motionPath: {
				// 		path: [
					// 			{ x: 0, y: 0 },
					// 			{ x: x/3, y: y/2 },
					// 			{ x: x/2, y: y },
					// 			{ x: x, y: y },
					// 		],
					// 		type: 'cubic',
		// 	},
		// 	ease: "slow(0.7, 0.7, false)",
		// }, "<");
		let blueprintMoveDelta = getTargetDelta('species-blueprint', 'vote-row6');

		tl.to('#species-blueprint', {
			x: "+=" + blueprintMoveDelta.dx,
			y: "+=" + blueprintMoveDelta.dy,
			duration: 1,
			ease: "slow(0.7, 0.7, false)",
		}, "<");


		// REPLACE BOTTOM ROW WITH BLUEPRINT
		tl.to("#vote-row6", {autoAlpha: 1, duration: 0.5});
		tl.to("#species-blueprint", {autoAlpha: 0, duration: 0.5}, "<");


		// CHECK MARK 1 ON
		tl.to('#vote-check-2', {autoAlpha: 1, scaleX:1.5, scaleY:1.5, duration: 0.15});
		tl.to('#vote-check-2', {scaleX:1, scaleY:1, duration: 0.15});
		// CHECK MARK 2 ON
		tl.to('#vote-check-1', {autoAlpha: 1, scaleX:1.5, scaleY:1.5, duration: 0.15, delay: 0.5});
		tl.to('#vote-check-1', {scaleX:1, scaleY:1, duration: 0.15});
		// CHECK MARKS OFF
		tl.to('#vote-check-2', {autoAlpha: 0, duration: 1});
		tl.to('#vote-check-1', {autoAlpha: 0, duration: 1}, "<");


		// REORDER ROWS
		tl.to("#vote-row6", { yPercent: -400, duration: 0.5 });
		tl.to("#vote-row5", { yPercent: 200, duration: 0.5 }, "<");
		tl.to("#vote-row4", { yPercent: 200, duration: 0.5 }, "<");

		// SHOW HIGHEST VOTES BOX
		tl.to("#vote-selected-box", { autoAlpha: 0.5, duration: 0.5 });

		// SHAKE AND DROP EXTRA ROWS
		tl.add(this.getShakeAnimation("#vote-row4, #vote-row5"));
		tl.to("#vote-row4", {rotate: 75, y: '+=500', duration: 1, delay: 0.3});
		tl.to("#vote-row5", {rotate: 60, y: '+=500', duration: 1, delay: 0.02}, "<");
		tl.to("#vote-row4", {autoAlpha: 0, duration: 0.2, delay: 0.3}, "<");
		tl.to("#vote-row5", {autoAlpha: 0, duration: 0.2, delay: 0.3}, "<");

		// HIDE CHECK BOXES AND HIGHEST VOTES BOX
		tl.to(".vote-check-box, #vote-selected-box", {autoAlpha: 0}, "<");


		
		let row1 = document.getElementById("vote-row1").getBoundingClientRect();
		
		let row1Y = row1.top;
		let row1X = row1.right;

		let sub2 = document.getElementById("vote-submission2").getBoundingClientRect();
		
		let sub2Y = sub2.top;
		let sub2X = sub2.right;

		let d = getDelta({x:sub2X, y:sub2Y}, {x:row1X, y:row1Y});

		// REPLACE WITH NEXT SVG
		tl.set("#vote-submission2", { x: d.dx, y: d.dy, autoAlpha: 1});
		tl.to("#vote-submission", { autoAlpha: 0, duration: 0 }, "<");
		
        
        tl.add(this.getMoveRowsToCenterAnimation(this.state.viewProps))

        tl.to("#vote2-row1-group, #vote2-row2-group, #vote2-row3-group, #vote2-row4-group", { autoAlpha: 0, duration: 2, delay: 1 }, "<");

		console.log();
	}

    getMoveRowsToCenterAnimation = (viewProps) => {
        var tl = gsap.timeline();
        // SHOW XALIANS
        tl.set("#vote2-row1-group, #vote2-row2-group, #vote2-row2-group, #vote2-row2-group", { transformOrigin: "center" }); 
		tl.to(".vote2-row-xalian", {autoAlpha: 1, duration: 0.2, delay: 0.2});
        
        tl.to("#vote2-row1-group, #vote2-row2-group, #vote2-row3-group, #vote2-row4-group", { scaleY: 1, duration: 0.2 }, "<");
        tl.to("#vote2-row1-group", { yPercent: 70, duration: 0.3 }, "<"); 
		tl.to("#vote2-row2-group", { yPercent: 51, duration: 0.3 }, "<"); 
		tl.to("#vote2-row3-group", { yPercent: -10, duration: 0.3 }, "<"); 
		tl.to("#vote2-row4-group", { yPercent: -29, duration: 0.3 }, "<"); 
        
        tl.to("#vote2-row1-group", { x: '-=55%', y: '-=55%', duration: 1}); 
		tl.to("#vote2-row2-group", { x: '+=55%', y: '-=55%', duration: 1 }, "<"); 
		tl.to("#vote2-row3-group", { x: '-=55%', y: '+=55%', duration: 1 }, "<"); 
		tl.to("#vote2-row4-group", { x: '+=55%', y: '+=55%', duration: 1 }, "<"); 
        return tl;
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
                <div id="animation1-scroll-trigger-wrapper" className="animation1-scroll-trigger-wrapper">

									<SpeciesBlueprintSVG id="species-blueprint" />
									<VoteSubmissionSVG id="vote-submission"/>
									<VoteSubmission2SVG id="vote-submission2"/>
                </div>
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

export default SpeciesBlueprintSubmissionAnimation;
