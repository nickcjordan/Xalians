import React from 'react';
import { Link } from 'react-router-dom';
import { routeFor } from '../lore/routeFor';
import './encyclopediaLink.css';

/**
 * A pointer out to the Encyclopedia's archive record for a species, world, or
 * lore entry. The Encyclopedia is an island -- this is the one component that
 * throws a line to it from the rest of the site, so every outbound link reads
 * the same way: a chip, an inline term, or a small stencil tab.
 *
 * `name` is the display name; the archive key is its lowercase form unless
 * `keyOverride` is given (the route convention lives in lore/routeFor.js).
 */
function EncyclopediaLink({ kind, name, variant = 'inline', keyOverride, className = '', newTab = false }) {
	if (!name) return null;

	let key = keyOverride || name.toLowerCase();
	let to = routeFor(kind, key);
	let label = `Open the archive record for ${name}`;
	let newTabProps = newTab ? { target: '_blank', rel: 'noopener' } : {};

	if (variant === 'chip') {
		const chipLabel = kind === 'species' ? 'Species record' : kind === 'world' ? 'World record' : 'Archive entry';
		return (
			<Link to={to} className={`g-chip g-chip--outline enc-link enc-link--chip ${className}`} aria-label={label} {...newTabProps}>
				{chipLabel}
			</Link>
		);
	}

	if (variant === 'icon') {
		return (
			<Link to={to} className={`enc-link enc-link--icon ${className}`} aria-label={label} title="Archive record" {...newTabProps}>
				<span className="enc-link-icon-tab">Archive</span>
			</Link>
		);
	}

	return (
		<Link to={to} className={`g-link enc-link enc-link--inline ${className}`} aria-label={label} {...newTabProps}>
			{name}
		</Link>
	);
}

export default EncyclopediaLink;
