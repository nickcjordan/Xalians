import * as constants from '../constants/colorConstants';
import gsap from 'gsap';

export const getBorder = (type, thickness, blur) => {
	let color = constants.themeColors[type];
	return textBorder(color, thickness, blur);
};

export const textBorder = (color = 'white', thickness = 1, blur = 0) => {
	return `-${thickness}px -${thickness}px ${blur}px ${color}, ${thickness}px -${thickness}px ${blur}px ${color}, -${thickness}px ${thickness}px ${blur}px ${color}, ${thickness}px ${thickness}px ${blur}px ${color}`;
};

export const getTypeColor = (type) => {
	return constants.themeColors[type.toLowerCase()];
};

export const getInsideGlowThemeColor = (type) => {
	let color = constants.themeColors[type.toLowerCase()];
	let split = gsap.utils.splitColor(color);
	let darker = [];
	split.forEach(num => {
		darker.push(Math.floor(num*0.5));
	})
	let darkerColor = `rgba(${darker[0]}, ${darker[1]}, ${darker[2]}, 0.2)`;
	return { border: `solid 2px ${color}90`, boxShadow: `inset 0px 0px 30px ${color}`, backgroundColor: darkerColor };
}