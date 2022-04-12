import React from 'react';
import { ReactComponent as XaliansLogoSVG } from '../../svg/logo/xalians_logo_and_dna_logo.svg';

import * as animationUtil from '../../utils/animationUtil';
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin);

class XaliansLogoDnaAnimated extends React.Component {

	componentDidMount() {
		document.addEventListener('DOMContentLoaded', function () {
			morph();
		});
	}
	
	render() {
		return (
				<XaliansLogoSVG id="dna_logo" style={{ margin: 'auto', display: 'flex', paddingBottom: '10px' }} />
		);
	}
}

function morph() {
	let delay = 0;

	let start = gsap.timeline()
	.to("#xalians-logo-x-long", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-long" })
	.to("#xalians-logo-x-top", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-top" }, "<")
	.to("#xalians-logo-x-bottom", { duration: 0.5, morphSVG: "#xalians-logo-dna-x-bottom" }, "<")
	.to("#xalians-logo", { duration: 1, opacity: 0, ease: 'none' }, "<")
	;

	let dnaTl = gsap.timeline();
	animationUtil.getAllElements("xalians-logo-dna-line").forEach(elem => {
		// let r1 = getRandomScaledPercentage();
		// let r2 = getRandomScaledPercentage();
		// let r3 = getRandomScaledPercentage();
		let main = gsap.timeline();
		main.add(gsap.timeline().to(elem, { duration: 1, opacity: 1, strokeWidth: 6}));
		// main.add(
		// 	gsap.timeline({  repeat: -1, yoyo: true }, "<")
		// 		.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r1}% ${getValSpacedAway(r1)}%`, ease: 'none'})
		// 		.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r2}% ${getValSpacedAway(r2)}%`, ease: 'none'})
		// 		.to(elem, { duration: getRandomScaledPercentage()/100, drawSVG: `${r3}% ${getValSpacedAway(r3)}%`, ease: 'none'}),
		// 		"<"
		// );

	   

		dnaTl.add(main, "<");

	});

    // let r1 = getRandomScaledPercentage();
	// 	let r2 = getRandomScaledPercentage();
	// 	let r3 = getRandomScaledPercentage();

    // dnaTl.add(
    //     gsap.timeline({  repeat: -1, yoyo: true, repeatDelay: 0 }, "<")
    //         .fromTo("#xalians-logo-x-long", { drawSVG: '0% 10%' }, { duration: getRandomScaledPercentage()/100, drawSVG: '90% 100%', ease: 'none'})
    //         .fromTo("#xalians-logo-x-top", { drawSVG: '0% 99%' }, { duration: getRandomScaledPercentage()/100, drawSVG: '1% 100%', ease: 'none'}, "<")
    //         .fromTo("#xalians-logo-x-bottom", { drawSVG: '0% 99%' }, { duration: getRandomScaledPercentage()/100, drawSVG: '1% 100%', ease: 'none'}, "<"),
    //         "<"
    // );

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
	return gsap.timeline().fromTo(id, {drawSVG: "50% 50%" }, { duration: 4, drawSVG: "100%", strokeWidth: '5px', opacity: 1 });
}

function getValSpacedAway(val) {
	return val < 50 ? val + 50 : val - 50;
}

function getRandomScaledPercentage(perc = 100) {
	return (Math.random() * (perc*0.5)) + (perc*0.5);
}

export default XaliansLogoDnaAnimated;
