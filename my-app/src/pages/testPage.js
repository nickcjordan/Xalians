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
import { ReactComponent as FigzySVG } from '../svg/species/figzy.svg';
import { ReactComponent as FigzyRotateSixtySVG } from '../svg/games/figzy_rotate_60.svg';
import Form from "react-bootstrap/Form";
import PhysicsGamePage from './games/physicsGamePage';




import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';

gsap.registerPlugin(MotionPathPlugin, DrawSVGPlugin, ScrollTrigger, MorphSVGPlugin, InertiaPlugin, Draggable, Physics2DPlugin);


class TestPage extends React.Component {

    

    componentDidMount() {
        // MorphSVGPlugin.convertToPath("#figzy");
        // MorphSVGPlugin.convertToPath("#figzy_rotate_60");
        


    }

    

	render() {
            return (
                <Container fluid>
                    <PhysicsGamePage/>
                </Container>
				
			);
	}
}

export default TestPage;
