import React from 'react';
import Image from 'react-bootstrap/Image';
import {gsap} from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ReactComponent as XaliansLogoSVG } from '../../../svg/logo/xalians_logo_x.svg';

gsap.registerPlugin(DrawSVGPlugin);

class MatchGameFlippedCard extends React.Component {

	getImageLocation() {
		return require('../../../svg/logo/xalians_logo_x.svg')?.default;
	}

    getClasses() {
		var x = 'xalian-image-bordered xalian-image-shadowed xalian-image-wrapper-padded ';
		x = x + this.props.moreClasses;
		return x;
	}

    componentDidMount() {
        gsap.timeline({ repeat: -1, yoyo: true, delay: this.props.delay, repeatDelay: 0 })
        .fromTo('#'+this.props.id+'-svg>path', {drawSVG: "0% 25%" }, { duration: 6, drawSVG: "65% 90%", ease: 'none' })
        ;
    }

	render() {
			let primaryColor = '#000000';
			let secondaryColor = '#1f1f1f';
            let builtClasses = this.getClasses();
            return (
                <div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses} style={{ background: `linear-gradient(135deg, ${primaryColor} 15%, ${secondaryColor} 85%)`, visibility: this.props.visibility }}>
                    <XaliansLogoSVG id={this.props.id+'-svg'} className='xalian-image' />
                </div>
            );
	}
}

export default MatchGameFlippedCard;
