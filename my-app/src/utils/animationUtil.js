import { gsap } from 'gsap';
import * as constants from '../constants/constants';

export function addShuffleSpeciesColorAnimation(id, delay=0) {
	let shuffledColors = constants.themeColors;
  // for (let step = 0; step < shuffles; step++) {
  //   shuffleArray(shuffledColors);
  // }
	// let first = shuffledColors[0];
	var t = gsap.timeline({ yoyo: true, repeat: -1, delay: delay });
  // t.to(id, { fill: first, duration: 1 });
	for (const item in shuffledColors) {
		// t.to(id, { fill: shuffledColors[item], duration: 1 });
    t.to(id, {filter: `drop-shadow(0px 0px 10px ${shuffledColors[item]})`, duration: 1});
    
	}
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
};

export function addMorph(fromSVG, toSVG) {
  gsap.to(fromSVG, {duration: 1, morphSVG:toSVG});
}