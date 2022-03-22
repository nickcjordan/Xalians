
import React from 'react';
import Image from 'react-bootstrap/Image'
import { ReactComponent as SVG } from '../species/voltish.svg'
import { gsap } from "gsap"
import * as animationUtil from '../../utils/animationUtil';

class SplashBackgroundAnimatedSVG extends React.Component {

    componentDidMount() {
        

        // animationUtil.addShuffleSpeciesColorAnimation("#voltish-body", 1);
        // animationUtil.addShuffleSpeciesColorAnimation("#figzy-body");
        // animationUtil.addShuffleSpeciesColorAnimation("#animation-hill-svg", 2);

        animationUtil.prepareVoltishAnimation();

        
        gsap.set("#animation-hill-svg", { fill: '#ffffff25' });
        gsap.set("#figzy-body", { fill: '#cccccc' });
        gsap.set("#voltish-body", { fill: '#cccccc' });
        
        let lightColor = "#e1b4ff";
        let darkColor = "#cd83ff";

        gsap.set("#figzy-inside-spinner", {filter: `drop-shadow(0px 0px 10px ${lightColor})`, opacity: "0.5"});
        gsap.set("#figzy-outside-spinner", {filter: `drop-shadow(0px 0px 10px ${darkColor})`, opacity: "0.5"});

        gsap.set("#figzy-inside-spinner", { fill: lightColor });
        gsap.set("#figzy-outside-spinner", { fill: darkColor });
        gsap.to("#figzy-inside-spinner", {duration: 2, rotation: 360, transformOrigin: "50% 50%", repeat: -1, ease: 'none', });
		gsap.to("#figzy-outside-spinner", {duration: 5, rotation: -360, transformOrigin: "50% 50%", repeat: -1, ease: 'none', });
        gsap.to("#figzy-inside-spinner", {duration: 0.4, scale: 1.25, transformOrigin: "50% 50%", repeat: -1, yoyo: true });
        gsap.to("#figzy-outside-spinner", {duration: 0.8, scale: 0.75, transformOrigin: "50% 50%", repeat: -1, yoyo: true });
    }

    

    
    render() {
        return <SVG {...this.props} className="animated-xalian-svg" ></SVG>
    }

    // buildLetterEntry = (id, d) => {
	// 	var logoLetter = gsap.timeline();
	// 	logoLetter.from(id, {duration: 1, x:"-=1000", delay:d});
	// 	logoLetter.from(id, {duration: 1, yPercent:100});
	// }


}



export default SplashBackgroundAnimatedSVG;