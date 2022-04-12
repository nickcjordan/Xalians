import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';
import { ReactComponent as XaliansDNALogoSVG } from '../svg/logo/xalians_dna_logo.svg';
import { ReactComponent as XaliansLogoSVG } from '../svg/logo/xalians_logo.svg';
import { ReactComponent as VoteSubmissionSVG } from '../svg/animations/vote_submission.svg';
import { ReactComponent as VoteSubmission2SVG } from '../svg/animations/vote_submission2.svg';

import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import SmokeEmitter from '../components/animations/smokeEmitter';
import { ReactComponent as SpaceshipComputerScreenTitlePanelSVG } from '../svg/animations/spaceship_computer_screen_title_panel.svg';

import SpeciesBlueprintSubmissionAnimation from '../components/animations/sections/speciesBlueprintSubmissionAnimation';

import SmokeEffectBackground from '../components/views/smokeEffectBackground';
import XalianSpeciesSizeComparisonView from '../components/views/xalianSpeciesSizeComparisonView';

import * as timerUtil from '../utils/timerUtil';

import Timer from '../components/games/elements/timer';

import * as animationUtil from '../utils/animationUtil';

import GeneratorAnimation from '../components/animations/generatorAnimation';
import { ReactDOM } from 'react';
import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { Flip } from 'gsap/Flip'
import GameContainer from '../components/games/elements/gameContainer';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(MotionPathPlugin);
gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin, DrawSVGPlugin);

class Sandboxthree extends React.Component {

	componentDidMount() {
		document.addEventListener('DOMContentLoaded', function () {
			morph();
		});
	}
	
	// morph = () => {
	// 	animationUtil.getAllElements("xalians-logo-dna-line").forEach(elem => {
	// 		let r1 = getRandomScaledPercentage();
	// 		let r2 = getRandomScaledPercentage();
	// 		let r3 = getRandomScaledPercentage();
	// 		gsap.timeline({  repeat: -1, yoyo: true })
	// 		.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r1}% ${getValSpacedAway(r1)}%`, ease: 'none'})
	// 		.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r2}% ${getValSpacedAway(r2)}%`, ease: 'none'})
	// 		.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r3}% ${getValSpacedAway(r3)}%`, ease: 'none'});
	// 	});
	// }

	

	// morph = () => {
	// 	let delay = 0;
	// 	// let start = gsap.timeline()
	// 	// .to(animationUtil.getAllElements("xalians-logo-dna-line"), { duration: 1, drawSVG: "50% 50%", strokeWidth: '0' })
	// 	// .to("#xalians-logo-dna-x-long", { duration: 1, morphSVG: "#xalians-logo-x-long" })
	// 	// .to("#xalians-logo-dna-x-top", { duration: 1, morphSVG: "#xalians-logo-x-top" }, "<")
	// 	// .to("#xalians-logo-dna-x-bottom", { duration: 1, morphSVG: "#xalians-logo-x-bottom" }, "<")
	// 	// ;

	// 	let start = gsap.timeline()
	// 	// .to(animationUtil.getAllElements("xalians-logo-dna-line"), { duration: 1, drawSVG: "50% 50%", strokeWidth: '0' })
	// 	.to("#xalians-logo-x-long", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-long" })
	// 	.to("#xalians-logo-x-top", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-top" }, "<")
	// 	.to("#xalians-logo-x-bottom", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-bottom" }, "<")
	// 	.to("#xalians-logo", { duration: 1, opacity: 0, ease: 'none' }, "<")
	// 	;

	// 	let dnaTl = gsap.timeline();
	// 	animationUtil.getAllElements("xalians-logo-dna-line").forEach(elem => {
	// 		let r1 = getRandomScaledPercentage();
	// 		let r2 = getRandomScaledPercentage();
	// 		let r3 = getRandomScaledPercentage();
	// 		let main = gsap.timeline();
	// 		main.add(gsap.timeline().to(elem, { duration: 1, opacity: 1, strokeWidth: 6}));
	// 		main.add(
	// 			gsap.timeline({  repeat: -1, yoyo: true }, "<")
	// 				.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r1}% ${getValSpacedAway(r1)}%`, ease: 'none'})
	// 				.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r2}% ${getValSpacedAway(r2)}%`, ease: 'none'})
	// 				.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r3}% ${getValSpacedAway(r3)}%`, ease: 'none'}),
	// 				"<"
	// 		);
	// 		dnaTl.add(main, "<");

	// 	});

	// 	let main = gsap.timeline({ id: 'xalian-logo-timeline'
	// 	});
	// 	main
	// 	.add(buildLetterEntry('#xalians-logo-x-long', delay + 0))
	// 	.add(buildLetterEntry('#xalians-logo-x-top', delay + 0), '<')
	// 	.add(buildLetterEntry('#xalians-logo-x-bottom', delay + 0), '<')
	// 	.add(buildLetterEntry('#xalians-logo-a1', delay + 0.05), '<')
	// 	.add(buildLetterEntry('#xalians-logo-l', delay + 0.1), '<')
	// 	.add(buildLetterEntry('#xalians-logo-i', delay + 0.15), '<')
	// 	.add(buildLetterEntry('#xalians-logo-a2', delay + 0.2), '<')
	// 	.add(buildLetterEntry('#xalians-logo-n', delay + 0.25), '<')
	// 	.add(buildLetterEntry('#xalians-logo-s', delay + 0.3), '<')
	// 	.add(start)
	// 	.add(dnaTl)
	// 	;

	
		
	// }

	

	render() {
		return (
			<React.Fragment>
				<Button onClick={morph}>morph</Button>
				<GameContainer>
					<div style={{ backgroundColor: '#333333', height: '100%', width: '100%', display: 'flex' }}>
						{/* <XaliansDNALogoSVG id="dna_logo" style={{ width: '80%', height: '80%', margin: 'auto', display: 'flex' }} /> */}
						<XaliansLogoSVG id="dna_logo" style={{ width: '80%', height: '80%', margin: 'auto', display: 'flex' }} />
						{/* <XaliansLogoXSVG id="x_logo" style={{ width: '80%', height: '80%', margin: 'auto', display: 'flex' }} /> */}
					</div>
				</GameContainer>
			</React.Fragment>
		);
	}
}

function morph() {
	let delay = 0;
	// let start = gsap.timeline()
	// .to(animationUtil.getAllElements("xalians-logo-dna-line"), { duration: 1, drawSVG: "50% 50%", strokeWidth: '0' })
	// .to("#xalians-logo-dna-x-long", { duration: 1, morphSVG: "#xalians-logo-x-long" })
	// .to("#xalians-logo-dna-x-top", { duration: 1, morphSVG: "#xalians-logo-x-top" }, "<")
	// .to("#xalians-logo-dna-x-bottom", { duration: 1, morphSVG: "#xalians-logo-x-bottom" }, "<")
	// ;

	let start = gsap.timeline()
	// .to(animationUtil.getAllElements("xalians-logo-dna-line"), { duration: 1, drawSVG: "50% 50%", strokeWidth: '0' })
	.to("#xalians-logo-x-long", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-long" })
	.to("#xalians-logo-x-top", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-top" }, "<")
	.to("#xalians-logo-x-bottom", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-bottom" }, "<")
	.to("#xalians-logo", { duration: 1, opacity: 0, ease: 'none' }, "<")
	;

	let dnaTl = gsap.timeline();
	animationUtil.getAllElements("xalians-logo-dna-line").forEach(elem => {
		let r1 = getRandomScaledPercentage();
		let r2 = getRandomScaledPercentage();
		let r3 = getRandomScaledPercentage();
		let main = gsap.timeline();
		main.add(gsap.timeline().to(elem, { duration: 1, opacity: 1, strokeWidth: 6}));
		main.add(
			gsap.timeline({  repeat: -1, yoyo: true }, "<")
				.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r1}% ${getValSpacedAway(r1)}%`, ease: 'none'})
				.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r2}% ${getValSpacedAway(r2)}%`, ease: 'none'})
				.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r3}% ${getValSpacedAway(r3)}%`, ease: 'none'}),
				"<"
		);
		dnaTl.add(main, "<");

	});

	let main = gsap.timeline({ id: 'xalian-logo-timeline'
	});
	main
	.add(buildLetterEntry('#xalians-logo-x-long', delay + 0))
	.add(buildLetterEntry('#xalians-logo-x-top', delay + 0), '<')
	.add(buildLetterEntry('#xalians-logo-x-bottom', delay + 0), '<')
	.add(buildLetterEntry('#xalians-logo-a1', delay + 0.05), '<')
	.add(buildLetterEntry('#xalians-logo-l', delay + 0.1), '<')
	.add(buildLetterEntry('#xalians-logo-i', delay + 0.15), '<')
	.add(buildLetterEntry('#xalians-logo-a2', delay + 0.2), '<')
	.add(buildLetterEntry('#xalians-logo-n', delay + 0.25), '<')
	.add(buildLetterEntry('#xalians-logo-s', delay + 0.3), '<')
	.add(start)
	.add(dnaTl)
	;


	
}

function buildLetterEntry(id, d) {
	let main = gsap.timeline();


		var path = gsap.timeline();
		path.fromTo(id, {drawSVG: "50% 50%" }, { duration: 4, drawSVG: "100%", strokeWidth: '5px', opacity: 1 });


	// var flicker = gsap.timeline({ delay: 2, repeat: -1 });
	// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 8.3))});
	// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 3.1))});
	// flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 1.7))});

	// main.add(zoomIn).add(turnLightOn).add(path);
	main
	.add(path)
	// .add(zoomIn)
	;
	// .add(flicker, "<")
	return main;
}

function getValSpacedAway(val) {
	return val < 50 ? val + 50 : val - 50;
}

function getRandomScaledPercentage(perc = 100) {
	return (Math.random() * (perc*0.5)) + (perc*0.5);
}



export default Sandboxthree;
