import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Image from 'react-bootstrap/Image';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
import glossary from '../json/glossary.json';
import { ReactComponent as SpeciesBlueprintSVG } from '../svg/animations/species_blueprint.svg';
import { ReactComponent as VoteSubmissionSVG } from '../svg/animations/vote_submission.svg';
import { ReactComponent as VoteSubmission2SVG } from '../svg/animations/vote_submission2.svg';

import SplashGalaxyBackground from '../components/views/splashGalaxyBackground';
import SmokeEmitter from '../components/animations/smokeEmitter';
import { ReactComponent as SpaceshipComputerScreenTitlePanelSVG } from '../svg/animations/spaceship_computer_screen_title_panel.svg';

import SpeciesBlueprintSubmissionAnimation from '../components/animations/sections/speciesBlueprintSubmissionAnimation';
import { ReactComponent as SpaceshipComputerScreenInfoPanelSVG } from '../svg/animations/spaceship_computer_screen_info_panel1.svg';
import { ReactComponent as SpaceshipComputerScreenImagePanelSVG } from '../svg/animations/spaceship_computer_screen_image_panel.svg';
import { ReactComponent as SpaceshipComputerScreenNextArrowSVG } from '../svg/animations/spaceship_computer_screen_next_arrow.svg';
import { ReactComponent as SpaceshipComputerScreenXSVG } from '../svg/animations/spaceship_computer_screen_x.svg';

import SpeciesDesignerSizeSelector from '../components/views/speciesDesignerSizeSelector';

import XalianSpeciesSizeComparisonView from '../components/views/xalianSpeciesSizeComparisonView';

import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(MotionPathPlugin, DrawSVGPlugin, ScrollTrigger);

class TestPage extends React.Component {
    getImageLocation() {
		return require('../svg/logo/xalians_logo.svg')?.default;
	}

    getClasses() {
		var x = 'xalian-image-bordered xalian-image-shadowed xalian-image-wrapper-padded ';
		x = x + this.props.moreClasses;
		return x;
	}

    componentDidMount() {
        var path = gsap.timeline();
			path
				.fromTo('#xalians-logo-x', {drawSVG: "50% 50%" }, { duration: 3, drawSVG: "100%" })
        // gsap.fromTo('.xalian-logo-letter-x', {drawSVG: "50% 50%" }, { duration: 3, drawSVG: "100%" });
        console.log("uhmm");
    }

	render() {
			let primaryColor = '#000000';
			let secondaryColor = '#1f1f1f';
            let builtClasses = this.getClasses();
            return (
                // <div id={this.props.id} className={'xalian-image-wrapper ' + builtClasses} style={{ background: `linear-gradient(135deg, ${primaryColor} 15%, ${secondaryColor} 85%)`, visibility: this.props.visibility }}>
                    <Image src={this.getImageLocation()} className='' />
                // </div>
            );
	}
}

export default TestPage;
