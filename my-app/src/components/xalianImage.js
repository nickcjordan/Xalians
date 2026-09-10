import React from 'react';
import XalianSVG from '../svg/species/xalianSvg';

/**
 * A species' silhouette, drawn on its own element wash.
 *
 * Version 4 on the new stack: the wrapper is a plain div (no
 * react-bootstrap `Image`), always `aspect-square`, with the radial (one
 * type) or linear (two types) wash as an inline style — Tailwind utilities
 * can't express a gradient built from two runtime element colors, so the
 * wash stays inline, reading the `--color-el-*` tokens rather than a raw
 * hex. Every prop from the previous version is kept because the immersive
 * pages (duel board, Reclamation, the training games) and the encyclopedia
 * still pass the full set.
 */
class XalianImage extends React.Component {
	getWrapperClassName() {
		let x = this.props.bordered ? ' border border-edge-strong ' : '';
		x += this.props.rounded ? ' rounded-full ' : '';
		x += this.props.selected ? ' outline outline-2 outline-offset-2 outline-viable-hi ' : '';
		x += this.props.shadowed ? ' shadow-float ' : '';
		x += !this.props.unPadded ? ' p-[6%] ' : '';
		x += ' ' + (this.props.moreClasses || '');
		return x;
	}

	buildXalian = () => {
		return <XalianSVG
			name={this.props.speciesName.toLowerCase()} className={'block h-full w-full'}
			style={{
				padding: this.props.padding || '2%',
				fill: this.props.fill || 'black',
				stroke: this.props.stroke || '0',
				strokeWidth: this.props.strokeWidth,
				strokeLinecap: 'round',
				filter: this.props.filter,
				opacity: this.props.opacity || 1
			}}
		/>;
	}

	render() {
		let xalian = this.buildXalian();
		let builtClasses = this.getWrapperClassName();
		let wrapperStyle;

		if (this.props.colored) {
			let primaryVar = `var(--color-el-${this.props.primaryType.toLowerCase()})`;
			// The screen: a halftone in a deeper tone of the wash, so the black
			// silhouette sits on a printed field rather than a flat swatch
			// (depth round two, 2026-09-10 experiment). `flat` turns it off.
			let screen = this.props.flat ? '' : 'radial-gradient(circle, rgba(0, 0, 0, 0.16) 1px, transparent 1.45px) 0 0 / 7px 7px, ';
			if (this.props.secondaryType) {
				let secondaryVar = `var(--color-el-${this.props.secondaryType.toLowerCase()})`;
				wrapperStyle = { background: `${screen}linear-gradient(135deg, ${primaryVar} 15%, ${secondaryVar} 85%)` };
			} else {
				wrapperStyle = { background: `${screen}radial-gradient(circle, ${primaryVar} 65%, ${primaryVar} 100%)` };
			}
		}

		return (
			<div id={this.props.id} className={'flex aspect-square items-center justify-center overflow-hidden ' + builtClasses} style={wrapperStyle}>
				{xalian}
			</div>
		);
	}
}

export default XalianImage;
