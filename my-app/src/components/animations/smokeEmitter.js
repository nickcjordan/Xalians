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
import { Linear, gsap, Sine } from 'gsap';
import { ExpoScaleEase, RoughEase, SlowMo } from 'gsap/EasePack';

import Particles from 'react-tsparticles';

class SmokeEmitter extends React.Component {
	state = {};

	// componentDidMount() {
	// }

	loadHexagonShape = (main) => {
		main.addShape('smoke', (context, particle, radius) => {
			const angle = (2 * Math.PI) / 6;

			context.beginPath();
			for (let i = 0; i < 6; i++) {
				context.lineTo(radius * Math.cos(angle * i), radius * Math.sin(angle * i));
			}
			context.closePath();
			context.stroke();
		});
	};

	render() {
		const config = {
			fullScreen: false,
			fpsLimit: 60,
			detectRetina: true,
			particles: {
				number: {
					value: 0,
				},
				
				shape: {
                    type: "image",
                    image: {
                        // any path or url to your image that will be used as a particle
                        src: '/assets/img/elements/smoke_particle.png',
                        // the pixel width of the image, you can use any value, the image will be scaled
                        width: 10,
                        // the pixel height of the image, you can use any value, the image will be scaled
                        height: 10,
                        // if true and the image type is SVG, it will replace all the colors with the particle color
                        replaceColor: false,
                    }
                },
				opacity: {
                    value: 0.05,
                    random: false,
                    animation: {
                      enable: true,
                      speed: 0.1,
                      minimumValue: 0,
                      sync: false
                    }
                  },
				size: {
                    value: 40,
                    random: { enable: true, minimumValue: 20 },
                    animation: {
                      enable: false,
                      speed: 10,
                      minimumValue: 0.1,
                      sync: false
                    }
                  },
				links: {
					enable: false,
				},
				life: {
					duration: {
						value: 2,
					},
					count: 1,
				},
				move: {
					angle: {
						value: 10,
						offset: 0,
					},
					enable: true,
					gravity: {
                        enable: true,
                        acceleration: -0.5
                      },
					speed: 4,
					direction: "top",
					random: false,
					straight: false,
					outModes: {
						default: 'destroy',
					}
				},
			},
			emitters: {
                direction: "top",
                rate: {
                  quantity: 20,
                  delay: 0.1
                },
                size: {
                  width: 5,
                  height: 5
                },
                position: {
                  x: 50,
                  y: 50
                }
              },
		};

		const particlesInit = (main) => {
			console.log(main);

			// you can initialize the tsParticles instance (main) here, adding custom shapes or presets
			// let p = document.getElementById("tsparticles");
			// this.loadHexagonShape(main);
		};

		const particlesLoaded = (container) => {
			console.log(container);
		};

		return (
			<Container className="">
				<Particles id="tsparticles" options={config} init={particlesInit} loaded={particlesLoaded} />

				{/* <Particles className=""
				id="tsparticles"
				init={particlesInit}
				loaded={particlesLoaded}
				options={{
					background: {
						image: "url('assets/img/background/galaxy-splash-dark.png')",
                        position: "top center",
                        size: "cover"
					},
					fpsLimit: 120,
                    fullScreen: {
                        enable: true,
                        zIndex: -1
                    },

					particles: {
						color: {
							value: '#ffffff',
						},
						links: {
							color: '#ffffff',
							distance: 150,
							enable: false,
							opacity: 0.5,
							width: 1,
						},
						collisions: {
							enable: false,
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
                              frequency: 0.005,
                              opacity: 0.3
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
							type: 'circle',
						},
						size: {
							random: true,
							value: 1,
						},
					},
					detectRetina: true,
				}}
			> */}
				{/* <div style={{zIndex: 999}}>{this.props.children}</div> */}
				{/* <h1>TEST</h1> */}
				{/* </Particles> */}
			</Container>
		);
	}
}

export default SmokeEmitter;
