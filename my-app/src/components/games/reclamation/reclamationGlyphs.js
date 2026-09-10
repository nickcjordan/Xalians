import React from 'react';

/*
	Glyphs for the Reclamation intro and bench: stroke icons in the console's ink, so a
	phase, a rival's habit or a plinth control can be read without a caption. Every glyph
	takes currentColor and a 24 unit box; the caller sizes it.
*/

const box = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false };

// the four phases of a round
export function PhaseGlyph({ kind, className }) {
	const cls = `rec-glyph rec-glyph--${kind}${className ? ` ${className}` : ''}`;
	switch (kind) {
		case 'deploy': // a figure dropping onto a tray
			return (
				<svg className={cls} {...box}>
					<path d="M12 3v9" /><path d="M8.5 8.5 12 12l3.5-3.5" />
					<path d="M4 15h16" /><path d="M5 15v4h14v-4" />
				</svg>
			);
		case 'orders': // a sealed order: a card with a closed seal
			return (
				<svg className={cls} {...box}>
					<rect x="4" y="5" width="16" height="14" rx="1" />
					<path d="M4 8l8 5 8-5" />
					<circle cx="12" cy="14.5" r="2" fill="currentColor" stroke="none" />
				</svg>
			);
		case 'clash':
		case 'resolve': // two strikes crossing
			return (
				<svg className={cls} {...box}>
					<path d="M5 5l14 14" /><path d="M19 5 5 19" />
					<path d="M5 5h4M5 5v4" /><path d="M19 5h-4M19 5v4" />
				</svg>
			);
		case 'ruling':
		case 'judge': // the Court's stamp
			return (
				<svg className={cls} {...box}>
					<path d="M6 20h12" /><path d="M8 20v-3h8v3" />
					<path d="M10 17v-4h4v4" />
					<circle cx="12" cy="8" r="4" />
				</svg>
			);
		default:
			return null;
	}
}

// each rival handler's habit, in one picture
export function RivalGlyph({ id, className }) {
	const cls = `rec-glyph rec-glyph--rival${className ? ` ${className}` : ''}`;
	switch (id) {
		case 'envoy': // rations: an hourglass
			return (
				<svg className={cls} {...box}>
					<path d="M6 3h12" /><path d="M6 21h12" />
					<path d="M7 3c0 5 5 6 5 9s-5 4-5 9" /><path d="M17 3c0 5-5 6-5 9s5 4 5 9" />
					<path d="M9.5 19.5h5" fill="currentColor" />
				</svg>
			);
		case 'heir': // stacks a lead: bars piled on one place
			return (
				<svg className={cls} {...box}>
					<rect x="5" y="15" width="14" height="4" rx="0.5" />
					<rect x="7" y="10.5" width="10" height="4" rx="0.5" />
					<rect x="9" y="6" width="6" height="4" rx="0.5" />
				</svg>
			);
		case 'broker': // hides: an eye behind a hand
			return (
				<svg className={cls} {...box}>
					<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
					<circle cx="12" cy="12" r="2.5" />
					<path d="M4 20 20 4" />
				</svg>
			);
		case 'proctor': // by the book: the Court's scales
			return (
				<svg className={cls} {...box}>
					<path d="M12 4v16" /><path d="M8 20h8" /><path d="M4 8h16" />
					<path d="M4 8l-2.5 6h5z" /><path d="M20 8l-2.5 6h5z" />
				</svg>
			);
		case 'windsailor': // contests every world: three sails fanning out
			return (
				<svg className={cls} {...box}>
					<path d="M12 20V6" /><path d="M12 6 6 12" /><path d="M12 6l6 6" />
					<path d="M12 20 4 20" /><path d="M12 20h8" />
					<path d="M4 20 12 12" /><path d="M20 20 12 12" />
				</svg>
			);
		default:
			return null;
	}
}

// a plinth's dossier button
export function InfoGlyph({ className }) {
	return (
		<svg className={`rec-glyph rec-glyph--info${className ? ` ${className}` : ''}`} {...box}>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 11v6" /><circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
		</svg>
	);
}

// stealthy: may be sent hidden
export function HiddenGlyph({ className }) {
	return (
		<svg className={`rec-glyph rec-glyph--hidden${className ? ` ${className}` : ''}`} {...box}>
			<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
			<path d="M4 20 20 4" />
		</svg>
	);
}

/*
	The four roles of the base redesign (docs/design/reclamation-base-redesign.md,
	assumption 4 and "Interface consequences"): one glyph beside the hold bulb on the
	plinth, on the figure, in the dossier and in the report's world rows. 'none' draws
	nothing, since a creature with no role does nothing at Resolve.

	strike  a single point driven at one mark
	sweep   a burst thrown out in every direction
	bolster a hand lifting a bar
	shield  a plate over what stands behind it
*/
export function RoleGlyph({ role, className }) {
	const cls = `rec-glyph rec-glyph--role rec-glyph--role-${role}${className ? ` ${className}` : ''}`;
	switch (role) {
		case 'strike':
			return (
				<svg className={cls} {...box}>
					<path d="M4 20 17 7" /><path d="M13 4h7v7" /><path d="M14.5 9.5 20 4" />
				</svg>
			);
		case 'sweep':
			return (
				<svg className={cls} {...box}>
					<circle cx="12" cy="12" r="3" />
					<path d="M12 6.5V3" /><path d="M12 17.5V21" />
					<path d="M6.5 12H3" /><path d="M17.5 12H21" />
					<path d="m8.1 8.1-2.5-2.5" /><path d="m15.9 15.9 2.5 2.5" />
					<path d="m15.9 8.1 2.5-2.5" /><path d="m8.1 15.9-2.5 2.5" />
				</svg>
			);
		case 'bolster':
			return (
				<svg className={cls} {...box}>
					<path d="M4 20h16" /><path d="M12 16V5" /><path d="M7.5 9.5 12 5l4.5 4.5" />
					<path d="M6 16h12" />
				</svg>
			);
		case 'shield':
			return (
				<svg className={cls} {...box}>
					<path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6z" />
					<path d="M9 12l2 2 4-4" />
				</svg>
			);
		default:
			return null;
	}
}

/*
	The attribute lanes (docs/design/reclamation-base-redesign.md, "Pass 2: every attribute
	a job"). Small marks beside the speed number on a plinth, in the same stroke style as
	the roles, each with its lane sentence as its title.

	swift    a wing: agility and reflex high enough to move once a round
	willful  a plain upright bar: willpower that holds against the world
	instinct an eye, open when keen, half closed when dull
*/
export function SwiftGlyph({ className }) {
	return (
		<svg className={`rec-glyph rec-glyph--lane rec-glyph--swift${className ? ` ${className}` : ''}`} {...box}>
			<path d="M3 14c4.5 0 8-1.8 10.5-4.5C15.6 7.3 17.8 6 20.5 6c-.6 3.4-2.4 6-5.2 7.8C12.4 15.7 8.6 16.6 4 16.6" />
			<path d="M6.5 19.5c3.6-.4 6.6-1.6 9-3.6" />
		</svg>
	);
}

export function WillfulGlyph({ className }) {
	return (
		<svg className={`rec-glyph rec-glyph--lane rec-glyph--willful${className ? ` ${className}` : ''}`} {...box}>
			<path d="M12 3.5v17" strokeWidth="2.4" />
		</svg>
	);
}

export function InstinctGlyph({ lane, className }) {
	const keen = lane !== 'dull';
	return (
		<svg className={`rec-glyph rec-glyph--lane rec-glyph--instinct rec-glyph--instinct-${keen ? 'keen' : 'dull'}${className ? ` ${className}` : ''}`} {...box}>
			{keen ? (
				<>
					<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
					<circle cx="12" cy="12" r="2.5" />
				</>
			) : (
				<>
					<path d="M3 12s3.5-6 9-6 9 6 9 6" />
					<path d="M3 12h18" />
					<path d="M7 14.5 6 16.5M12 15v2.2M17 14.5l1 2" />
				</>
			)}
		</svg>
	);
}
