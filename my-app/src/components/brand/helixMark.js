import React from 'react';

/**
 * The DNA mark, "the X" (docs/DESIGN_SYSTEM.md section 8). Paths taken from
 * src/svg/logo/xalians_dna_logo.svg: three "strand" paths (the letterform)
 * plus eight "rung" lines (the base pairs), drawn in --g-viable-hi via the
 * .strand/.rung classes in system.css. Used alone (a status icon, a loading
 * mark's still frame) or inside brandLockup.js.
 */
const HelixMark = ({ className, title }) => (
	<svg
		className={['g-helix', className].filter(Boolean).join(' ')}
		viewBox="-6 -6 144 173"
		aria-label={title || 'Xalians'}
		role="img"
	>
		{title ? <title>{title}</title> : null}
		<g transform="translate(758.03 -766.78)">
			<path className="strand" d="M-653.6,842.22c-1.65-1.59-12.81-6.83-17.46-9,23.9-17.4,17.56-64.41,17.56-64.41H-628C-628,807.81-640.29,829.71-653.6,842.22Z" />
			<path className="strand" d="M-732.58,856.85a50.41,50.41,0,0,0,16.92,7.91C-731.89,883-730.5,926-730.5,926H-756S-750.6,883.43-732.58,856.85Z" />
			<path className="strand" d="M-730.5,768.78C-741.25,880.57-643,790.18-628,926H-653.5c-9-115.36-102-19.15-102.53-157.22Z" />
			<path className="rung" d="M-722,777.85h38.87" />
			<path className="rung" d="M-671,777.85h8.39" />
		</g>
		<line className="rung" x1="37.16" y1="29.9" x2="93.65" y2="29.9" />
		<line className="rung" x1="45.18" y1="48.73" x2="86.61" y2="48.73" />
		<line className="rung" x1="45.22" y1="115.28" x2="78.03" y2="115.28" />
		<g transform="translate(758.03 -766.78)">
			<path className="rung" d="M-716.83,900.89H-709" />
			<path className="rung" d="M-697,900.89h26.41" />
		</g>
		<line className="rung" x1="39.41" y1="152.87" x2="91.03" y2="153.01" />
	</svg>
);

export default HelixMark;
