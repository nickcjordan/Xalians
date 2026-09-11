import React, { Suspense, lazy } from 'react';

/**
 * Species art has two deliberately different jobs:
 *
 * - portrait: the authored, high-detail illustration for records and lore
 * - token: a simplified 64-unit silhouette for game pieces and compact UI
 *
 * Token art is eager because game boards need it on their first frame. Portrait
 * art is split by species so opening one record no longer downloads the whole
 * fleet. Adding a same-named SVG to both directories is the complete artwork
 * registration step for a new species.
 */
const tokenModules = import.meta.glob('./token/*.svg', {
	eager: true,
	import: 'ReactComponent',
});

const portraitLoaders = import.meta.glob('./*.svg');
const portraitComponents = new Map();
const warnedMissingSpecies = new Set();

function speciesNameFromPath(path) {
	return path.split('/').pop().replace('.svg', '');
}

export const tokenArtBySpecies = Object.freeze(Object.fromEntries(
	Object.entries(tokenModules).map(([path, Component]) => [speciesNameFromPath(path), Component]),
));

export const portraitLoaderBySpecies = Object.freeze(Object.fromEntries(
	Object.entries(portraitLoaders).map(([path, loader]) => [speciesNameFromPath(path), loader]),
));

export const speciesArtNames = Object.freeze(Object.keys(tokenArtBySpecies).sort());

function getPortraitComponent(speciesName) {
	if (portraitComponents.has(speciesName)) return portraitComponents.get(speciesName);

	const loader = portraitLoaderBySpecies[speciesName];
	if (!loader) return null;

	const Component = lazy(() => loader().then((module) => ({ default: module.ReactComponent })));
	portraitComponents.set(speciesName, Component);
	return Component;
}

function MissingSpeciesArt(props) {
	return (
		<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
			<path d="M32 5a27 27 0 1 0 0 54 27 27 0 0 0 0-54Zm0 42.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm4.8-9.8c-1.8 1.3-2.3 2.1-2.3 4.8h-6c0-5.7 1.9-7.7 4.9-9.9 2.5-1.8 4.1-3.1 4.1-6.2 0-3.3-2-5.4-5.4-5.4-3.5 0-5.8 2.3-6 6.2h-6c.3-7.4 5-12.1 12-12.1 7.1 0 11.4 4.3 11.4 11.1 0 6.2-3.5 8.8-6.7 11.5Z" />
		</svg>
	);
}

function warnForMissingArt(speciesName) {
	if (warnedMissingSpecies.has(speciesName)) return;
	warnedMissingSpecies.add(speciesName);
	console.warn(`No complete species art set found for "${speciesName}".`);
}

export default function XalianSVG({ name, variant = 'portrait', ...props }) {
	const speciesName = String(name || '').trim().toLowerCase();
	const Token = tokenArtBySpecies[speciesName];

	if (!Token || !portraitLoaderBySpecies[speciesName]) {
		warnForMissingArt(speciesName || '(empty name)');
		return <MissingSpeciesArt {...props} />;
	}

	if (variant === 'token') {
		return <Token aria-hidden="true" focusable="false" {...props} id={undefined} />;
	}

	const Portrait = getPortraitComponent(speciesName);
	return (
		<Suspense fallback={<Token aria-hidden="true" focusable="false" {...props} id={undefined} />}>
			<Portrait aria-hidden="true" focusable="false" {...props} id={undefined} />
		</Suspense>
	);
}
