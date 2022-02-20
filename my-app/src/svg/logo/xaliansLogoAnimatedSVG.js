
import React from 'react';
import Image from 'react-bootstrap/Image'
import { ReactComponent as SVG } from './xalians_logo.svg'
import { gsap } from "gsap"

class XaliansLogoAnimatedSVG extends React.Component {

    componentDidMount() {
        let delay = 1.5;
		this.buildLetterEntry("#xalians-logo-s", delay + 0);
		this.buildLetterEntry("#xalians-logo-n", delay + 0.05);
		this.buildLetterEntry("#xalians-logo-a2", delay + 0.1);
		this.buildLetterEntry("#xalians-logo-i", delay + 0.15);
		this.buildLetterEntry("#xalians-logo-l", delay + 0.2);
		this.buildLetterEntry("#xalians-logo-a1", delay + 0.25);
        this.buildLetterEntry("#xalians-logo-x", delay + 0.3);

       
    }

    
    render() {
        return <SVG {...this.props} className="animated-xalian-svg xalian-logo" ></SVG>
    }


    buildLetterEntry = (id, d) => {
		var turnLightOn = gsap.timeline({ delay: d });
        for (var i = 1; i < 6; i+=2) {
            turnLightOn.to(id, {duration: (Math.random()/2), opacity: i/10});
            turnLightOn.to(id, {duration: (Math.random()/2), opacity: i/20});
        }
		turnLightOn.to(id, {duration: 1, opacity: 1});

        var zoomIn = gsap.timeline();
		zoomIn.from(id, { duration: 0.6, x: '-=1000', delay: d });
		zoomIn.to(id, { duration: 0.6, yPercent: -100, ease: 'elastic.in(1, 0.3)' });
        zoomIn.to(id, { duration: 0.6, yPercent: 0, ease: 'power4.in' });

		var flicker = gsap.timeline({ delay: 2, repeat: -1 });
		flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 8.3))});
        flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 3.1))});
        flicker.to(id, { ease: 'none', yoyo: true, repeat: true, opacity:((Math.random()*0.5) + 0.5), duration: (Math.random()*0.5), delay: Math.floor(2 + (Math.random() * 1.7))});
	}

    

}



export default XaliansLogoAnimatedSVG;