import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

/**
 * Phone-only "back to top" key. Appears once the reader has scrolled past
 * two viewport heights, fixed at the bottom right. Matte button, no glow,
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
		<Button
			type="button"
			variant="secondary"
			size="icon"
			className="fixed bottom-4 right-4 z-40 hidden max-sm:flex"
			onClick={onClick}
			aria-label="Back to top"
		>
			<ArrowUp className="size-4" />
		</Button>
	);
}
