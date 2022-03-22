import * as constants from '../constants/constants';

export const getBorder = (type, thickness, blur) => {
	let color = constants.themeColors[type];
	return textBorder(color, thickness, blur);
};

export const textBorder = (color = 'white', thickness = 1, blur = 0) => {
	return `-${thickness}px -${thickness}px ${blur}px ${color}, ${thickness}px -${thickness}px ${blur}px ${color}, -${thickness}px ${thickness}px ${blur}px ${color}, ${thickness}px ${thickness}px ${blur}px ${color}`;
};

export const getTypeColor = (type) => {
	return constants.themeColors[type];
};

export const getInsideGlowThemeColor = (type) => {
	let color = constants.themeColors[type.toLowerCase()];
	return { border: `solid 2px ${color}90`, boxShadow: `inset 0px 0px 30px ${color}`, backgroundColor: color + "11" };
}