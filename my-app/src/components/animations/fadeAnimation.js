import { Reveal, Tween, ScrollTrigger } from 'react-gsap';

export const FadeInLeft = ({ children }) => (
	<Tween from={{ opacity: 0, transform: 'translate3d(-100vw, 0, 0)' }} ease="back.out(1.4)">
		{children}
	</Tween>
);

export const FadeIn = ({ children }) => (
	<Tween from={{ opacity: 0 }} to={{ opacity: 1 }}>
		{children}
	</Tween>
);
