// Tier: featured component. The home splash's brand morph
// (docs/DESIGN_SYSTEM.md section 8): the wordmark arrives with its X drawn
// as an SVG path (Iceland's X, converted once in ../brand/wordmarkX.js);
// after 600ms it morphs into the DNA mark's long strand while the mark's
// other two strands and rungs fade in, then the lockup rests as the helix
// plus the word with a normal letter X. Reduced motion skips straight to
// the resting frame.
import React from 'react';
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { HelixMark } from '@/components/system/brand';

gsap.registerPlugin(MorphSVGPlugin);

// wordmarkX.js is a plain `module.exports = {...}` file (step 1 wrote it for
// a node-only extraction script) and is not in this agent's file list to
// fix; it also is not covered by vite/commonjsShim.js's CJS-to-named-export
// rewrite (that plugin's TARGETS only match src/constants, src/gameplay and
// textFit.js), so a static `import { XALIANS_X_PATH } from './wordmarkX'`
// fails Vite's module graph outright ("does not provide an export"), taking
// the whole page down with it. Loaded dynamically instead: if the shim gap
// is ever closed this starts working with no change here; until then the
// catch below does exactly what the brief calls for when the file "does not
// exist" — render the resting lockup.
function loadXaliansXPath() {
	return import('../brand/wordmarkX')
		.then((mod) => (mod && mod.XALIANS_X_PATH) || (mod && mod.default && mod.default.XALIANS_X_PATH) || null)
		.catch(() => null);
}

// Same geometry as helixMark.js: three strand paths (the letterform) and
// eight rung segments (the base pairs), drawn in --g-viable-hi via the
// .strand/.rung classes .g-brand already carries (system.css). Reproduced
// here rather than imported because the morph needs to address the long
// strand on its own, as the arriving X path's destination shape.
const GROUP_TRANSFORM = 'translate(758.03 -766.78)';
const STRAND_SHORT_1 = 'M-653.6,842.22c-1.65-1.59-12.81-6.83-17.46-9,23.9-17.4,17.56-64.41,17.56-64.41H-628C-628,807.81-640.29,829.71-653.6,842.22Z';
const STRAND_SHORT_2 = 'M-732.58,856.85a50.41,50.41,0,0,0,16.92,7.91C-731.89,883-730.5,926-730.5,926H-756S-750.6,883.43-732.58,856.85Z';
const STRAND_LONG = 'M-730.5,768.78C-741.25,880.57-643,790.18-628,926H-653.5c-9-115.36-102-19.15-102.53-157.22Z';

// Measures the rendered bounding box of a path drawn inside the mark's own
// group transform, off-screen, so the arriving X path can be pre-positioned
// to overlap the strand it becomes rather than jumping into place.
function measureGroupedBBox(d) {
	const svgNS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(svgNS, 'svg');
	svg.setAttribute('width', '0');
	svg.setAttribute('height', '0');
	svg.style.position = 'absolute';
	svg.style.visibility = 'hidden';
	const g = document.createElementNS(svgNS, 'g');
	g.setAttribute('transform', GROUP_TRANSFORM);
	const path = document.createElementNS(svgNS, 'path');
	path.setAttribute('d', d);
	g.appendChild(path);
	svg.appendChild(g);
	document.body.appendChild(svg);
	const box = path.getBBox();
	document.body.removeChild(svg);
	return box;
}

class XaliansLogoDnaAnimated extends React.Component {
	state = { resting: false, xPath: null };

	containerRef = React.createRef();
	morphRef = React.createRef();

	componentDidMount() {
		const reduced =
			typeof window !== 'undefined' &&
			window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reduced || typeof document === 'undefined') {
			this.setState({ resting: true });
			return;
		}

		loadXaliansXPath().then((xPath) => {
			if (!xPath) {
				this.setState({ resting: true });
				return;
			}
			this.setState({ xPath }, () => {
				// Let the arriving X path lay out before measuring it.
				requestAnimationFrame(() => this.playMorph());
			});
		});
	}

	componentWillUnmount() {
		if (this.timeline) {
			this.timeline.kill();
		}
	}

	playMorph = () => {
		const root = this.containerRef.current;
		const morphPath = this.morphRef.current;
		if (!root || !morphPath) {
			this.setState({ resting: true });
			return;
		}

		let sourceBox;
		let targetBox;
		try {
			sourceBox = morphPath.getBBox();
			targetBox = measureGroupedBBox(STRAND_LONG);
		} catch (e) {
			// getBBox can throw in non-rendering environments (SSR, some test
			// DOMs); fail straight to the resting frame rather than animate
			// from an unknown position.
			this.setState({ resting: true });
			return;
		}

		if (!sourceBox.width || !sourceBox.height || !targetBox.width || !targetBox.height) {
			this.setState({ resting: true });
			return;
		}

		const scaleX = targetBox.width / sourceBox.width;
		const scaleY = targetBox.height / sourceBox.height;
		const dx = targetBox.x - sourceBox.x * scaleX;
		const dy = targetBox.y - sourceBox.y * scaleY;

		gsap.set(morphPath, { transformOrigin: '0px 0px', scaleX, scaleY, x: dx, y: dy });

		const fadeEls = root.querySelectorAll('.xlda-fade');

		this.timeline = gsap.timeline({ delay: 0.6, onComplete: () => this.setState({ resting: true }) });
		this.timeline
			.to(morphPath, { duration: 0.5, morphSVG: STRAND_LONG, scaleX: 1, scaleY: 1, x: 0, y: 0, ease: 'power1.inOut' })
			.to(fadeEls, { duration: 0.5, opacity: 1, ease: 'power1.out' }, '<');
	};

	render() {
		const { resting, xPath } = this.state;
		return (
			<a
				className="mb-2 inline-flex items-center gap-3.5 font-brand uppercase leading-none text-viable-hi no-underline hover:text-viable-hi sm:gap-5 sm:text-[64px] text-[40px]"
				href="/"
				aria-label="Xalians"
				ref={this.containerRef}
			>
				{resting || !xPath ? (
					<HelixMark className="h-[52px] sm:h-[84px]" title="Xalians" />
				) : (
					<svg className="helix block h-[52px] w-auto overflow-visible sm:h-[84px]" viewBox="-6 -6 144 173" aria-hidden="true">
						<g transform={GROUP_TRANSFORM}>
							<path ref={this.morphRef} className="strand" d={xPath} />
							<path className="strand xlda-fade" d={STRAND_SHORT_1} style={{ opacity: 0 }} />
							<path className="strand xlda-fade" d={STRAND_SHORT_2} style={{ opacity: 0 }} />
							<path className="rung xlda-fade" d="M-722,777.85h38.87" style={{ opacity: 0 }} />
							<path className="rung xlda-fade" d="M-671,777.85h8.39" style={{ opacity: 0 }} />
						</g>
						<line className="rung xlda-fade" style={{ opacity: 0 }} x1="37.16" y1="29.9" x2="93.65" y2="29.9" />
						<line className="rung xlda-fade" style={{ opacity: 0 }} x1="45.18" y1="48.73" x2="86.61" y2="48.73" />
						<line className="rung xlda-fade" style={{ opacity: 0 }} x1="45.22" y1="115.28" x2="78.03" y2="115.28" />
						<g transform={GROUP_TRANSFORM}>
							<path className="rung xlda-fade" style={{ opacity: 0 }} d="M-716.83,900.89H-709" />
							<path className="rung xlda-fade" style={{ opacity: 0 }} d="M-697,900.89h26.41" />
						</g>
						<line className="rung xlda-fade" style={{ opacity: 0 }} x1="39.41" y1="152.87" x2="91.03" y2="153.01" />
					</svg>
				)}
				<span>
					<span className="transition-opacity duration-3 ease-out" style={{ opacity: resting || !xPath ? 1 : 0 }} aria-hidden="true">X</span>ALIANS
				</span>
			</a>
		);
	}
}

export default XaliansLogoDnaAnimated;
