
import React from 'react';
import Image from 'react-bootstrap/Image'
import { ReactComponent as SVG } from './figzy.svg'
import { gsap } from 'gsap';
import * as constants from '../constants/constants'
import * as animationUtil from '../utils/animationUtil'

class FigzyAnimatedSVG extends React.Component {

    componentDidMount() {
        if (this.props.colored) {
            animationUtil.addShuffleSpeciesColorAnimation("#figzy-body");
        }
        
        // gsap.set("#figzy-body", { opacity: 0.5 });
        // gsap.set("#figzy-body", {filter: "drop-shadow(0px 0px 10px black)"});
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
        return <SVG opacity="0.85" {...this.props} className="animated-xalian-svg" ></SVG>
    }

}

export default FigzyAnimatedSVG;