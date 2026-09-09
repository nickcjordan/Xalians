import React from 'react';

const SIZE_CLASS = {
	sm: 'g-spinner--sm',
	lg: 'g-spinner--lg',
};

/**
 * The helix spinner (docs/DESIGN_SYSTEM.md section 6): the DNA mark with its
 * strands at low opacity and its rungs lighting in sequence, top to bottom.
 * Never a skeleton. Sizes: 20 (sm), 32 (default), 56 (lg) — set by
 * .g-spinner/.g-spinner--sm/.g-spinner--lg in system.css, which also carries
 * the @keyframes and the reduced-motion still frame.
 */
const HelixSpinner = ({ size, className }) => {
	const sizeClass = SIZE_CLASS[size] || '';
	const classes = ['g-spinner', sizeClass, className].filter(Boolean).join(' ');
	return (
		<svg className={classes} viewBox="-6 -6 144 173" role="status" aria-label="Loading">
			<g transform="translate(758.03 -766.78)">
				<path className="strand" d="M-653.6,842.22c-1.65-1.59-12.81-6.83-17.46-9,23.9-17.4,17.56-64.41,17.56-64.41H-628C-628,807.81-640.29,829.71-653.6,842.22Z" />
				<path className="strand" d="M-732.58,856.85a50.41,50.41,0,0,0,16.92,7.91C-731.89,883-730.5,926-730.5,926H-756S-750.6,883.43-732.58,856.85Z" />
				<path className="strand" d="M-730.5,768.78C-741.25,880.57-643,790.18-628,926H-653.5c-9-115.36-102-19.15-102.53-157.22Z" />
				<path className="rung" style={{ '--i': 0 }} d="M-722,777.85h38.87" />
				<path className="rung" style={{ '--i': 0 }} d="M-671,777.85h8.39" />
			</g>
			<line className="rung" style={{ '--i': 1 }} x1="37.16" y1="29.9" x2="93.65" y2="29.9" />
			<line className="rung" style={{ '--i': 2 }} x1="45.18" y1="48.73" x2="86.61" y2="48.73" />
			<line className="rung" style={{ '--i': 3 }} x1="45.22" y1="115.28" x2="78.03" y2="115.28" />
			<g transform="translate(758.03 -766.78)">
				<path className="rung" style={{ '--i': 4 }} d="M-716.83,900.89H-709" />
				<path className="rung" style={{ '--i': 4 }} d="M-697,900.89h26.41" />
			</g>
			<line className="rung" style={{ '--i': 5 }} x1="39.41" y1="152.87" x2="91.03" y2="153.01" />
		</svg>
	);
};

export default HelixSpinner;
