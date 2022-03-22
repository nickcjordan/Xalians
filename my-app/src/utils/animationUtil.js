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

export function prepareVoltishAnimation() {
  prepareBoltOne("#voltish-bolt-1");
  prepareBoltTwo("#voltish-bolt-2");
  prepareBoltThree("#voltish-bolt-3");
}

function prepareBoltOne(id) {
  gsap.set(id, {fill: "#ffffeb", filter: "drop-shadow(0px 0px 3px white)"})
  var tl = gsap.timeline({repeat: -1, repeatDelay: 1.33});
  tl.to(id, {opacity: 1, duration: 0.1});
  tl.to(id, {opacity: 0, duration: 1});
  tl.to(id, {opacity: 0.8, duration: 0.1, delay: 1});
  tl.to(id, {opacity: 0, duration: 0.4});
  tl.to(id, {opacity: 0.8, duration: 0.1});
  tl.to(id, {opacity: 0, duration: 1});
}

function prepareBoltTwo(id) {
  gsap.set(id, {fill: "#ffffeb", filter: "drop-shadow(0px 0px 3px white)"})
  var tl = gsap.timeline({repeat: -1, repeatDelay: 0.7});
  tl.to(id, {opacity: 1, duration: 0.1, delay: 0.4});
  tl.to(id, {opacity: 0, duration: 1});
  tl.to(id, {opacity: 0.8, duration: 0.1, delay: 1});
  tl.to(id, {opacity: 0, duration: 0.4});
  tl.to(id, {opacity: 0.8, duration: 0.1});
  tl.to(id, {opacity: 0, duration: 0.7});
  tl.to(id, {opacity: 0.4, duration: 0.1});
  tl.to(id, {opacity: 0, duration: 0.73});
}

function prepareBoltThree(id) {
  gsap.set(id, {fill: "#ffffeb", filter: "drop-shadow(0px 0px 3px white)"})
  var tl = gsap.timeline({repeat: -1, repeatDelay: 0.47});
  tl.to(id, {opacity: 1, duration: 0.1, delay: 0.8});
  tl.to(id, {opacity: 0, duration: 1});
  tl.to(id, {opacity: 0.8, duration: 0.1, delay: 1});
  tl.to(id, {opacity: 0, duration: 0.4});
  tl.to(id, {opacity: 0.8, duration: 0.1});
  tl.to(id, {opacity: 0, duration: 1});
}

