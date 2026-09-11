import React, { Suspense, lazy } from 'react';

/**
 * Species art has two deliberately different jobs:
 *
 * - portrait: the authored, high-detail illustration for records and lore
 * - token: a simplified 64-unit silhouette for game pieces and compact UI
 *
 * Both formats are split by species. A surface downloads only the creature it
 * is rendering instead of paying for all 30 token silhouettes as a fallback.
 * Adding a same-named SVG to both directories is the complete artwork
 * registration step for a new species.
 */
const tokenModules = import.meta.glob('./token/*.svg', {
	import: 'ReactComponent',
});

const portraitModules = import.meta.glob('./*.svg', {
	import: 'ReactComponent',
});
const artComponents = new Map();
const warnedMissingSpecies = new Set();

function speciesNameFromPath(path) {
	return path.split('/').pop().replace('.svg', '');
}

export const tokenLoaderBySpecies = Object.freeze(Object.fromEntries(
	Object.entries(tokenModules).map(([path, loader]) => [speciesNameFromPath(path), loader]),
));

export const portraitLoaderBySpecies = Object.freeze(Object.fromEntries(
	Object.entries(portraitModules).map(([path, loader]) => [speciesNameFromPath(path), loader]),
));

export const speciesArtNames = Object.freeze(Object.keys(tokenLoaderBySpecies).sort());

function getArtComponent(speciesName, variant) {
	const cacheKey = `${variant}:${speciesName}`;
	if (artComponents.has(cacheKey)) return artComponents.get(cacheKey);

	const loader = variant === 'token'
		? tokenLoaderBySpecies[speciesName]
		: portraitLoaderBySpecies[speciesName];
	if (!loader) return null;

	const Component = lazy(() => loader().then((component) => ({ default: component })));
	artComponents.set(cacheKey, Component);
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

	if (!tokenLoaderBySpecies[speciesName] || !portraitLoaderBySpecies[speciesName]) {
		warnForMissingArt(speciesName || '(empty name)');
		return <MissingSpeciesArt {...props} />;
	}

	const Art = getArtComponent(speciesName, variant);
	return (
		<Suspense fallback={<MissingSpeciesArt {...props} />}>
			<Art aria-hidden="true" focusable="false" {...props} id={undefined} />
		</Suspense>
	);
}
