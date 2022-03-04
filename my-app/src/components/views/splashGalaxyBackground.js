import React, { PureComponent } from 'react';
import { LabelList, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import XalianImage from '../xalianImage';
import XalianStatRatingChart from '../xalianStatRatingChart';
import XalianMoveSet from '../xalianMoveSet';
import * as valueTranslator from '../../utils/valueTranslator';
import XalianInfoBox from '../xalianInfoBox';
import { ReactComponent as SVG } from './xalian.svg';
import FigzyAnimatedSVG from '../../svg/figzyAnimatedSVG';
import { Linear, gsap, Sine } from 'gsap';
import { ExpoScaleEase, RoughEase, SlowMo } from 'gsap/EasePack';

import Particles from 'react-tsparticles';

class SplashGalaxyBackground extends React.Component {
	state = {};

	render() {
		const particlesInit = (main) => {
			console.log(main);

			// you can initialize the tsParticles instance (main) here, adding custom shapes or presets
		};

		const particlesLoaded = (container) => {
			console.log(container);
		};
		return (
            <Container className="splash-galaxy-animation-container">
			<Particles className="galaxy-splash-animation-bg"
				id="tsparticles"
				init={particlesInit}
				loaded={particlesLoaded}
				options={{
					background: {
						image: "url('assets/img/background/galaxy-splash-dark.png')",
                        position: "top center",
                        size: "cover"
					},
					fpsLimit: 60,
                    fullScreen: {
                        enable: true,
                        zIndex: -1
                    },

					particles: {
						color: {
							value: '#ffffff',
						},
						move: {
							direction: this.props.direction || 'left',
							enable: true,
							outMode: 'out',
							random: false,
							speed: this.props.speed || 0.2,
							straight: true,
						},
                        twinkle: {
                            particles: {
                              enable: true,
                              color: "#ffffff",
                              frequency: 0.0075,
                              opacity: 0.4
                            }
                          },
						number: {
							density: {
								enable: true,
								area: 400,
							},
							value: 100,
						},
						opacity: {
							value: 0.5,
							random: true,
							anim: {
								enable: true,
								speed: 0.1,
								opacity_min: 0.1,
								sync: false,
							},
						},
						shape: {
							type: 'star',
						},
						size: {
							random: true,
							value: 1,
						},
						rotate: {
							animation: {
								enable: true,
								speed: 5,
								sync: false
							}
						}
					},
					detectRetina: true,
				}}
			>
				<div style={{zIndex: 999}}>{this.props.children}</div>
			</Particles>

			
				{/* <SVG fill="rgba(0, 0, 0, 0.7)" className="section-top-scene" ></SVG> */}
				<div className="splash-galaxy-animation-children-wrapper">{this.props.children}</div>
			</Container>
		);
	}
}

export default SplashGalaxyBackground;
