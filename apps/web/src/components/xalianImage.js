import React from 'react';
import XalianSVG from '../svg/species/xalianSvg';

/**
 * A species' silhouette, drawn on its own element wash.
 *
 * `variant="portrait"` is the default for records, lore, and large cards.
 * Compact game pieces must opt into `variant="token"`; the choice is semantic
 * so a responsive layout cannot unexpectedly swap a creature's artwork.
 *
 * The runtime element wash remains inline because it is composed from type
 * token names. Legacy presentation props remain available to the immersive
 * games while their surrounding interfaces continue their staged migration.
 */
export default function XalianImage({
	id = undefined,
	speciesName,
	primaryType,
	secondaryType = '',
	variant = 'portrait',
	bordered = false,
	rounded = false,
	selected = false,
	shadowed = false,
	unPadded = false,
	colored = false,
	flat = false,
	moreClasses = '',
	className = '',
	padding = undefined,
	fill = undefined,
	stroke = undefined,
	strokeWidth = undefined,
	filter = undefined,
	opacity = undefined,
	alt = undefined,
}) {
	const wrapperClasses = [
		'flex aspect-square items-center justify-center overflow-hidden',
		bordered && 'border border-edge-strong',
		rounded && 'rounded-full',
		selected && 'outline outline-2 outline-offset-2 outline-viable-hi',
		shadowed && 'shadow-float',
		!unPadded && 'p-[6%]',
		moreClasses,
		className,
	].filter(Boolean).join(' ');

	const ink = fill ?? 'black';
	const artStyle = {
		padding: padding ?? '2%',
		color: ink,
		fill: ink,
		stroke: stroke ?? 'none',
		strokeWidth,
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
		filter,
		opacity: opacity ?? 1,
	};

	let wrapperStyle;
	if (colored) {
		const primaryVar = `var(--color-el-${primaryType.toLowerCase()})`;
		const grain = flat ? '' : "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\") 0 0 / 120px 120px, ";
		const edge = (value) => `color-mix(in srgb, ${value} 80%, black)`;

		if (secondaryType) {
			const secondaryVar = `var(--color-el-${secondaryType.toLowerCase()})`;
			wrapperStyle = { background: `${grain}radial-gradient(circle, transparent 55%, rgba(0, 0, 0, 0.2) 100%), linear-gradient(135deg, ${primaryVar} 15%, ${secondaryVar} 85%)` };
		} else {
			wrapperStyle = { background: `${grain}radial-gradient(circle, ${primaryVar} 50%, ${edge(primaryVar)} 100%)` };
		}
	}

	const accessibility = alt
		? { role: 'img', 'aria-label': alt }
		: { 'aria-hidden': true };

	return (
		<div id={id} className={wrapperClasses} style={wrapperStyle} {...accessibility}>
			<XalianSVG
				name={speciesName}
				variant={variant}
				className="block h-full w-full"
				style={artStyle}
			/>
		</div>
	);
}
