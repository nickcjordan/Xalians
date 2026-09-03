import React, { useEffect, useRef, useState } from 'react';
import './BackToTop.css';

/**
 * Phone-only "back to top" key. Appears once the reader has scrolled past
 * two viewport heights, fixed at the bottom right. Matte .g-btn, no glow,
 * no motion beyond the shared hover/focus snap. Contract: UX-BRIEF.md.
 */
export default function BackToTop() {
	const [visible, setVisible] = useState(false);
	const ticking = useRef(false);

	useEffect(() => {
		function evaluate() {
			ticking.current = false;
			const threshold = window.innerHeight * 2;
			setVisible(window.scrollY > threshold);
		}
		function onScroll() {
			if (ticking.current) return;
			ticking.current = true;
			window.requestAnimationFrame(evaluate);
		}
		evaluate();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	function onClick() {
		const reduceMotion = typeof window.matchMedia === 'function'
			&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
	}

	if (!visible) return null;

	return (
		<button type="button" className="g-btn enc-back-to-top" onClick={onClick} aria-label="Back to top">
			<span aria-hidden="true">&#8593;</span>
		</button>
	);
}
