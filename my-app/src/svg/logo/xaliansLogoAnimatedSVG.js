
import React from 'react';
import Image from 'react-bootstrap/Image'
import { ReactComponent as SVG } from './xalians_logo.svg'
// import { gsap, Linear } from 'gsap';
import { gsap } from "gsap"
// import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
// gsap.registerPlugin(DrawSVGPlugin);
// import { DrawSVGPlugin } from "gsap/DrawSVGPlugin.js";

// gsap.registerPlugin(DrawSVGPlugin);

class XaliansLogoAnimatedSVG extends React.Component {

    componentDidMount() {
        
        
    }

    
    render() {
        return <SVG {...this.props} className="animated-xalian-svg xalian-logo" ></SVG>
    }

    

}

export default XaliansLogoAnimatedSVG;