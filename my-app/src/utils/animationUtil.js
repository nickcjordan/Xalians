import { gsap } from 'gsap';
import * as constants from '../constants/constants';

export function addShuffleSpeciesColorAnimation(id, delay = 0) {
	let colors = constants.themeColors;
	gsap.set(id, { stroke: '#FFFFFF', strokeWidth: '2px', filter: 'drop-shadow(0px 0px 10px #FFFFFF)' });
	var t = gsap.timeline({ repeat: -1, delay: delay, repeatDelay: 0 });
  var keys = [];
  shuffleArray(colors);
  for (const item in colors) {
    keys.push(item);
  }
  for (var i = 0; i<10; i++) {
    let randomIndex = Math.floor(Math.random() * keys.length);
    let randomKey = keys[randomIndex];
    let c = colors[randomKey];
    t.to(id, {
      filter: `drop-shadow(0px 0px 10px ${c})`,
      duration: 1,
      stroke: `${c}`,
      strokeWidth: '2px',
      delay: 0.5
    });
  }
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

