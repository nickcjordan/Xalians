import React from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import { ReactComponent as SpaceshipComputerScreenTitlePanelSVG } from '../../svg/animations/spaceship_computer_screen_title_panel.svg';
import { ReactComponent as SpaceshipComputerScreenInfoPanelSVG } from '../../svg/animations/spaceship_computer_screen_info_panel1.svg';
import { ReactComponent as SpaceshipComputerScreenImagePanelSVG } from '../../svg/animations/spaceship_computer_screen_image_panel.svg';
import { ReactComponent as SpaceshipComputerScreenNextArrowSVG } from '../../svg/animations/spaceship_computer_screen_next_arrow.svg';
import { ReactComponent as SpaceshipComputerScreenXSVG } from '../../svg/animations/spaceship_computer_screen_x.svg';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
gsap.registerPlugin(TextPlugin);
gsap.registerPlugin(ScrollTrigger);

class ComputerScreenContent extends React.Component {
	state = {};

    componentDidMount() {
        gsap.timeline({
        })
        .add(this.buildArrowAnimation('#computer-screen-arrow-inside', 0))
        .add(this.buildArrowAnimation('#computer-screen-arrow-middle', 0.15), "<")
        .add(this.buildArrowAnimation('#computer-screen-arrow-outside', 0.3), "<")
        .add(this.buildXAnimation(), "<")
        
        // .to('#' + this.props.sectionId + '-title-text', {duration: 0.5, text: this.props.title, ease: 'none'}, "<")
        // .to('#' + this.props.sectionId + '-text', {duration: 0.5, text: {
        //     value: this.props.text,
        //     // delimiter: " ",
        //     // ease: 'none',
        //     speed: 3
        // }}, "<")
        ;
        gsap.to('#' + this.props.sectionId + '-title-text', {duration: 0.5, text: this.props.title, ease: 'none'});
        gsap.to('#' + this.props.sectionId + '-text', {duration: 0.5, text: {
            value: this.props.text,
            // delimiter: " ",
            // ease: 'none',
            speed: 3
        }});

        this.buildPanelSquareShimmerAnimations();
        // this.buildPanelCircleAnimations();
        this.buildTitlePanelCircleAnimations();
    }

    buildTitlePanelCircleAnimations = () => {
        let circles = this.getAllElements('screen-title-circles');
        let delay = 0;
        circles.forEach((target) => {
			var zoomIn = gsap.timeline({ repeat: -1});
            
			zoomIn
				.to(target, { delay: delay, duration: 0.2, yPercent: -(Math.random()*100*delay), ease: 'elastic.in(1, 0.3)' })
				.to(target, { duration: 0.2, yPercent: 0, ease: 'power4.in' });
            delay += 0.05;
		}); 
    }

    buildPanelSquareShimmerAnimations = () => {
        this.getAllElements('screen-squares').forEach( target => {
            let from = Math.random()*0.3 + 0.1;
            let to = Math.random()*0.5 + 0.5;
            let d = Math.random();
            gsap.timeline({ repeat: -1 })
            .fromTo(target, {autoAlpha: from}, {autoAlpha: to, duration: d + 0.5})
            .to(target, {autoAlpha: from, duration: d + 0.5})
        }) 
    }

    // buildPanelCircleAnimations = () => {
        // this.getAllElements('screen-circles').forEach( target => {
        //     let from = Math.random()*0.3 + 0.1;
        //     let to = Math.random()*0.5 + 0.5;
        //     let duration = Math.random()*2 + 0.5;
        //     gsap.set(target, {height: 10, width: 10})
            // gsap.timeline({ repeat: -1, yoyo: true }).fromTo(target, {scale: from, ease: 'none'}, {transformOrigin: 'center', scale: to, duration: duration, ease: 'none'})
        // }) 
    // }

    getAllElements = (groupName, array = []) => {
        this.addElements(`*[data-name="${groupName}"] *`, array);
        this.addElements(`#${groupName} *`, array);
        return array;
    }

    addElements = (selector, array) => {
        gsap.utils.toArray(selector).forEach(t => {
            array.push(t);
        });
        return array;
    }

    buildXAnimation = () => {
        
        return gsap.timeline({ repeat: -1, ease: 'none', repeatDelay: 0 })
        .to('#x-ring-inside', {transformOrigin: 'center', rotate: 230, duration: 4, ease:'none', repeat: -1, yoyo: true})
        .to('#x-pointers', {transformOrigin: 'center', rotate: -60, scale: 0.75, duration: 8, ease:'none', repeat: -1, yoyo: true}, "<")
        .to('#x-ring-line-vertical', {transformOrigin: 'center', scaleY: 0.25, duration: 3, ease:'none', repeat: -1, yoyo: true}, "<")
        .to('#x-ring-line-horizontal', {transformOrigin: 'center', scaleX: 0.25, duration: 4, ease:'none', repeat: -1, yoyo: true}, "<")
        .add(gsap.timeline({ repeat: -1 })
            .fromTo('#x-ring-middle', {scale: 1}, {transformOrigin: 'center', scale: 1.2, duration: 5})
            .to('#x-ring-middle', {scale: 1, duration: 5}), 
        "<")
        .add(gsap.timeline({ repeat: -1 })
            .fromTo('#x-ring-outside', {scale: 1}, {transformOrigin: 'center', scale: 0.8, duration: 5})
            .to('#x-ring-outside', {scale: 1, duration: 5}), 
        "<")
        
    }

    buildArrowAnimation = (id, delay) => {
        return gsap.timeline({ duration: 1, delay: delay, repeat: -1 })
        .fromTo(id, {scale: 1, autoAlpha: 0.5}, {scale: 1.2, autoAlpha: 0.75})
        .to(id, {scale: 1, autoAlpha: 0.5})
    }

	render() {
		return (
			<section id={this.props.sectionId} class="splash-computer-section">
				<Container className="splash-computer-container">
					<Row className="splash-computer-container-row" style={{ height: '15%' }}>
                        {/* <Col className="debug-box vertically-center-contents splash-computer-col">
							<SpaceshipComputerScreenTitlePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
							<div className="screen-title-wrapper vertically-center-contents">
								<h1 id={this.props.sectionId + '-title-text'} className="screen-panel-title"></h1>
							</div>
						</Col> */}
						<Col className="debug-box vertically-center-contents splash-computer-col">
							<SpaceshipComputerScreenTitlePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
							<div className="screen-title-wrapper vertically-center-contents">
								<h1 id={this.props.sectionId + '-title-text'} className="screen-panel-title"></h1>
							</div>
						</Col>
					</Row>
					<Row className="splash-computer-container-row" style={{ height: '30%' }}>
						<Col className="debug-box vertically-center-contents splash-computer-col">
							<SpaceshipComputerScreenImagePanelSVG preserveAspectRatio="none" className="computer-screen-element" />
							<img id={this.props.sectionId + '-image'} src={this.props.imageLocation || 'assets/img/background/castle.jpg'} className="splash-computer-image" alt=""></img>
						</Col>
					</Row>
					<Row className="splash-computer-container-row" style={{ height: '40%' }}>
						<Col className="debug-box vertically-center-contents splash-computer-col">
							<SpaceshipComputerScreenInfoPanelSVG preserveAspectRatio="none" className="computer-screen-element" />
							<div className="screen-text-wrapper vertically-center-contents">
								<h2 className="computer-screen-font" id={this.props.sectionId + '-text'} ></h2>
							</div>
						</Col>
					</Row>
					<Row className="splash-computer-container-row" style={{ height: '15%' }}>
						<Col xs={4} lg={4} className="debug-box vertically-center-contents splash-computer-button-col">
							<div className="computer-screen-arrow-wrapper">
								<SpaceshipComputerScreenNextArrowSVG onClick={this.props.backArrowTappedCallback} className="computer-screen-next-arrow" />
							</div>
						</Col>
						<Col xs={true} lg={4} className="debug-box vertically-center-contents splash-computer-button-col">
							<div className="computer-screen-arrow-wrapper">
								<SpaceshipComputerScreenXSVG className="computer-screen-x" />
							</div>
						</Col>
						<Col xs={4} lg={4} className="debug-box vertically-center-contents splash-computer-button-col">
							<div className="computer-screen-arrow-wrapper">
								<SpaceshipComputerScreenNextArrowSVG onClick={this.props.nextArrowTappedCallback} className="flipped computer-screen-next-arrow" />
							</div>
						</Col>
					</Row>
				</Container>
			</section>
		);
	}
}

export default ComputerScreenContent;
