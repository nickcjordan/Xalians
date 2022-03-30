import React from 'react';
import SmokeEmitter from '../../components/animations/smokeEmitter';
import { ReactComponent as GeneratorSVG } from '../../svg/animations/generator_animation.svg';
import * as animationUtil from '../../utils/animationUtil';
import { gsap, Linear } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);
gsap.registerPlugin(ScrollTrigger);


class GeneratorAnimation extends React.Component {
	state = {
        showing: true
	};

	componentWillUnmount() {
	}

	componentDidMount() {
		gsap.set('#generator-right-smoke', {overflow: 'visible', position: 'absolute'});
		gsap.set('#generator-left-smoke', {overflow: 'visible', position: 'absolute'});

		animationUtil.addGeneratorAnimation();
		let { rightSmokePos, rightStackPos, xDiffRight } = this.setSmokePositionToGeneratorStackRight();
		let { leftStackPos, leftSmokePos, xDiffLeft } = this.setSmokePositionToGeneratorStackLeft();
		
		this.setState({
			metrics: {
				rightSmokePos: rightSmokePos,
				rightStackPos: rightStackPos,
				leftStackPos: leftStackPos,
				leftSmokePos: leftSmokePos,
				xDiffRight: Math.floor(xDiffRight*100)/100,
				xDiffLeft: Math.floor(xDiffLeft*100)/100
			}
		});

		let tl = gsap.timeline({ repeat: -1, repeatDelay: 0 });
		tl.fromTo('#generator-xalian', { xPercent: 1 }, { xPercent: 250, duration: 3 })
		tl.fromTo('#generator-xalian', { autoAlpha: 1 }, { autoAlpha: 0, duration: 1, delay: 1 })
		;
	}

    setSmokePositionToGeneratorStackRight() {
        let rightStack = document.getElementById('generator-right-smoke-stack');
        let rightStackPos = rightStack.getBoundingClientRect();
        let rightSmoke = document.getElementById('generator-right-smoke');
        let rightSmokePos = rightSmoke.getBoundingClientRect();

        let stackCenterXRight = rightStackPos.x + (rightStackPos.width / 2);
        let smokeCenterXRight = rightSmokePos.x + (rightSmokePos.width / 2);
        rightSmokePos.centerX = Math.floor((smokeCenterXRight * 100)) / 100;
        rightStackPos.centerX = Math.floor((stackCenterXRight * 100)) / 100;
        let xDiffRight = stackCenterXRight - smokeCenterXRight;

        gsap.set('#generator-right-smoke', { x: xDiffRight, y: rightStackPos.y - (rightSmokePos.y + (rightSmokePos.height * 0.9)) });
        return { rightSmokePos, rightStackPos, xDiffRight };
    }

    setSmokePositionToGeneratorStackLeft(side = 'left') {
        let leftStack = document.getElementById(`generator-${side}-smoke-stack`);
        let leftStackPos = leftStack.getBoundingClientRect();
        let leftSmoke = document.getElementById(`generator-${side}-smoke`);
        let leftSmokePos = leftSmoke.getBoundingClientRect();


        let stackCenterXLeft = leftStackPos.x + (leftStackPos.width / 2);
        let smokeCenterXLeft = leftSmokePos.x + (leftSmokePos.width / 2);
        leftSmokePos.centerX = Math.floor((smokeCenterXLeft * 100)) / 100;
        leftStackPos.centerX = Math.floor((stackCenterXLeft * 100)) / 100;
        let xDiffLeft = stackCenterXLeft - smokeCenterXLeft;

        gsap.set(`#generator-${side}-smoke`, { x: xDiffLeft, y: leftStackPos.y - (leftSmokePos.y + (leftSmokePos.height * 0.9)) });
        return { leftStackPos, leftSmokePos, xDiffLeft };
    }

	render() {
		return (
			<React.Fragment >
						<div className="animated-xalian-svg" style={{ position: 'absolute', height: '40%', alignSelf: 'end', bottom: 0, marginBottom: '10%'}} >
							<GeneratorSVG id="generator-svg" style={{ position: 'absolute', overflow: 'visible', height: '100%', width: '100%' }} />
							<SmokeEmitter size={this.state.metrics && this.state.metrics.rightStackPos.width} id="generator-left-smoke" style={{ position: 'absolute'}} />
							<SmokeEmitter size={this.state.metrics && this.state.metrics.rightStackPos.width} id="generator-right-smoke" style={{ position: 'absolute'}} />
						</div>
			</React.Fragment>
		);
	}
}

export default GeneratorAnimation;
