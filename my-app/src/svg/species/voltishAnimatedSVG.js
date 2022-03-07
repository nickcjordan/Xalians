
import React from 'react';
import Image from 'react-bootstrap/Image'
import { ReactComponent as SVG } from './voltish.svg'
import { gsap } from 'gsap';
import * as constants from '../constants/constants'
import * as animationUtil from '../utils/animationUtil'

class VoltishAnimatedSVG extends React.Component {

    componentDidMount() {
        this.prepareBoltOne("#voltish-bolt-1");
        this.prepareBoltTwo("#voltish-bolt-2");
        this.prepareBoltThree("#voltish-bolt-3");
        animationUtil.addShuffleSpeciesColorAnimation("#voltish-body", 1);
        // gsap.set("#voltish-body", { opacity: 0.5 });
    }

    prepareBoltOne = (id) => {
        gsap.set(id, {fill: "#ffffeb", filter: "drop-shadow(0px 0px 3px white)"})
        var tl = gsap.timeline({repeat: -1, repeatDelay: 1.33});
        tl.to(id, {opacity: 1, duration: 0.1});
        tl.to(id, {opacity: 0, duration: 1});
        tl.to(id, {opacity: 0.8, duration: 0.1, delay: 1});
        tl.to(id, {opacity: 0, duration: 0.4});
        tl.to(id, {opacity: 0.8, duration: 0.1});
        tl.to(id, {opacity: 0, duration: 1});
    }

    prepareBoltTwo = (id) => {
        gsap.set(id, {fill: "#ffffeb", filter: "drop-shadow(0px 0px 3px white)"})
        var tl = gsap.timeline({repeat: -1, repeatDelay: 0.7});
        tl.to(id, {opacity: 1, duration: 0.1, delay: 0.4});
        tl.to(id, {opacity: 0, duration: 1});
        tl.to(id, {opacity: 0.8, duration: 0.1, delay: 1});
        tl.to(id, {opacity: 0, duration: 0.4});
        tl.to(id, {opacity: 0.8, duration: 0.1});
        tl.to(id, {opacity: 0, duration: 0.7});
        tl.to(id, {opacity: 0.4, duration: 0.1});
        tl.to(id, {opacity: 0, duration: 0.73});
    }

    prepareBoltThree = (id) => {
        gsap.set(id, {fill: "#ffffeb", filter: "drop-shadow(0px 0px 3px white)"})
        var tl = gsap.timeline({repeat: -1, repeatDelay: 0.47});
        tl.to(id, {opacity: 1, duration: 0.1, delay: 0.8});
        tl.to(id, {opacity: 0, duration: 1});
        tl.to(id, {opacity: 0.8, duration: 0.1, delay: 1});
        tl.to(id, {opacity: 0, duration: 0.4});
        tl.to(id, {opacity: 0.8, duration: 0.1});
        tl.to(id, {opacity: 0, duration: 1});
    }

    
    render() {
        return <SVG opacity="0.85" {...this.props} className="animated-xalian-svg" ></SVG>
    }

}

export default VoltishAnimatedSVG;