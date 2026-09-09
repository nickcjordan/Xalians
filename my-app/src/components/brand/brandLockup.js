import React from 'react';
import HelixMark from './helixMark';

/**
 * The brand lockup (docs/DESIGN_SYSTEM.md section 8): the helix at left,
 * then the word "Xalians" in --g-font-brand (Iceland), both in
 * --g-viable-hi. Navbar size by default (helix 28px, word 22px); `big`
 * scales to the home-splash size (helix 84px, word 64px) via .g-brand--big.
 */
const BrandLockup = ({ big, href = '/', className }) => {
	const classes = ['g-brand', big ? 'g-brand--big' : '', className].filter(Boolean).join(' ');
	return (
		<a className={classes} href={href}>
			<HelixMark className="g-brand-mark" title="Xalians" />
			<span>Xalians</span>
		</a>
	);
};

export default BrandLockup;
