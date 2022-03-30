import { gsap } from 'gsap';
import * as constants from '../constants/constants';
import SmokeEmitter from '../components/animations/smokeEmitter';
import { ReactDOM } from 'react';
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin';
import TextPlugin from 'gsap/TextPlugin';

gsap.registerPlugin(ScrambleTextPlugin, TextPlugin);


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

export function addGeneratorAnimation() {
  let knobsTl = gsap.timeline();
  getAllElements("generator-knob").forEach(knob => {
    gsap.set(knob, {transformOrigin: `50% 57%`})
    let oneKnobTl = gsap.timeline({ repeat: -1, yoyo: true})
    .to(knob, {rotation: Math.floor(Math.random()*360), duration: 1 + Math.floor(Math.random()*2)})
    .to(knob, {rotation: Math.floor(Math.random()*360), duration: 1 + Math.floor(Math.random()*2)})
    .to(knob, {rotation: Math.floor(Math.random()*360), duration: 1 + Math.floor(Math.random()*2)});
    knobsTl.add(oneKnobTl, "<");
  });

  let arrowsTl = gsap.timeline();
  getAllElements("generator-arrow").forEach(arrow => {
    gsap.set(arrow, {transformOrigin: '50% 100%'});
    let oneArrowTl = gsap.timeline({ repeat: -1, yoyo: true})
    .to(arrow, {rotation: Math.floor(Math.random()*360), duration: 1 + Math.floor(Math.random()*2)})
    .to(arrow, {rotation: Math.floor(Math.random()*360), duration: 1 + Math.floor(Math.random()*2)})
    .to(arrow, {rotation: Math.floor(Math.random()*360), duration: 1 + Math.floor(Math.random()*2)});
    arrowsTl.add(oneArrowTl, "<");
  });

  getAllElements("generator-conveyor-gear").forEach(gear => {
    gsap.set(gear, {transformOrigin: '50% 50%'});
    gsap.timeline({ repeat: -1, repeatDelay: 2 }).to(gear, {rotation: '1080_cw', duration: 3});
  });

  let buttonColors = Object.values(constants.themeColors);
  var ind = 0;
  getAllElements("generator-glowing-button").forEach(button => {
    let color = gsap.utils.wrap(buttonColors, ind);
    gsap.set(button, {fill: color});
    gsap.fromTo(button, {opacity: 0.25}, {opacity: 1, duration: 2, repeat: -1, yoyo: true, delay: Math.random(), repeatDelay: Math.random()});
    ind += 1;
  });

  gsap.set('#generator-small-gear, #generator-medium-gear, #generator-large-gear', { transformOrigin: 'center' });
  let gearsTl = gsap.timeline()
  .to("#generator-small-gear", { ease: 'none', rotation: '360_ccw', duration: 2.4, repeat: -1}, "<")
  .to("#generator-medium-gear", { ease: 'none', rotation: '360_ccw', duration: 2.4, repeat: -1}, "<")
  .to("#generator-large-gear", { ease: 'none', rotation: '360_cw', duration: 4, repeat: -1}, "<")
  ;

  gsap.timeline()
  .add(knobsTl)
  .add(arrowsTl, "<")
  .add(gearsTl, "<")
  ;

  getAllElements("generator-screen-text-line").forEach(line => {
    gsap.to(line, { scrambleText:{ chars: 'abcdefghijklmnopqrstuvwxyz ', text: "{original}", revealDelay: 0 }, duration: 2, delay: Math.random(), repeat: -1 });
  });
  
}

export function getAllElements(groupName, array = []) {
  addElements(`[data-name="${groupName}"]`, array);
  addElements(`#${groupName}`, array);
  return array;
}

function addElements(selector, array) {
  gsap.utils.toArray(selector).forEach(t => {
      array.push(t);
  });
  return array;
}

