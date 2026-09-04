// Turns prose into segments with entry links. Matches entry titles and
// aliases (species entries included, since they live in encyclopedia.json
// too) longest-first, whole-word, case-insensitive, one link per distinct
// title/alias per call. Titles and aliases that are substrings of longer
// ones never double-link (e.g. "Vallerii Empire" claims its match before
// "Vallerii" can eat part of it).

import { allEntries } from './loaders';

// Every linkable string (title, then each alias) paired with the entry key it
// resolves to, longest-first so a longer alias or title claims its match
// before a shorter one (title or alias) can eat part of it.
const titlesLongestFirst = allEntries
	.flatMap((e) => [
		{ key: e.key, title: e.title },
		...(e.aliases || []).map((alias) => ({ key: e.key, title: alias })),
	])
	.sort((a, b) => b.title.length - a.title.length);

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function linkify(text, { except } = {}) {
	if (!text) return [];

	// Track byte ranges already claimed by a link so a shorter title can't
	// match inside a longer title's span, and track which titles have
	// already produced a link (one link per distinct title per call).
	const claimed = []; // [start, end)
	const linked = []; // { start, end, key, title }
	const usedTitles = new Set();

	for (const { key, title } of titlesLongestFirst) {
		if (key === except) continue;
		if (usedTitles.has(title.toLowerCase())) continue;

		const re = new RegExp(`\\b${escapeRegExp(title)}\\b`, 'i');
		const match = re.exec(text);
		if (!match) continue;

		const start = match.index;
		const end = start + match[0].length;

		const overlaps = claimed.some(([cStart, cEnd]) => start < cEnd && end > cStart);
		if (overlaps) continue;

		claimed.push([start, end]);
		linked.push({ start, end, key, title: match[0] });
		usedTitles.add(title.toLowerCase());
	}

	linked.sort((a, b) => a.start - b.start);

	const segments = [];
	let cursor = 0;
	for (const link of linked) {
		if (link.start > cursor) {
			segments.push({ text: text.slice(cursor, link.start) });
		}
		segments.push({ text: link.title, key: link.key, title: link.title });
		cursor = link.end;
	}
	if (cursor < text.length) {
		segments.push({ text: text.slice(cursor) });
	}
	if (segments.length === 0) {
		segments.push({ text });
	}

	return segments;
}
