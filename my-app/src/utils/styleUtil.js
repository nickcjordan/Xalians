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
