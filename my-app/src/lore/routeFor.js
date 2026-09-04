// routeFor(kind, key) -> string. Shared by search.js and index.js so the
// route convention lives in exactly one place.
//
// entry     -> /encyclopedia/index/<key>
// world     -> /encyclopedia/worlds/<key>
// species   -> /encyclopedia/species/<key>
// era       -> /encyclopedia/story/<key>
// paragraph -> /encyclopedia/worlds/<planet>#chapter-<index>     (key is "<planet>:<index>")
// tour      -> /encyclopedia/story/<era>#beat-<beatKey>          (key is the beat key; era resolved via tour data)
// event     -> /encyclopedia/story/<era>#event-<eventKey>        (key is "<era>:<eventKey>")
// story     -> /encyclopedia/story                                (no key)

import { getEraForBeat } from './story';

export function routeFor(kind, key) {
	switch (kind) {
		case 'entry':
			return `/encyclopedia/index/${key}`;
		case 'world':
			return `/encyclopedia/worlds/${key}`;
		case 'species':
			return `/encyclopedia/species/${key}`;
		case 'era':
			return `/encyclopedia/story/${key}`;
		case 'paragraph': {
			const [planet, index] = key.split(':');
			return `/encyclopedia/worlds/${planet}#chapter-${index}`;
		}
		case 'tour': {
			const eraKey = getEraForBeat(key);
			if (!eraKey) throw new Error(`routeFor: unknown tour beat "${key}"`);
			return `/encyclopedia/story/${eraKey}#beat-${key}`;
		}
		case 'event': {
			const [era, eventKey] = key.split(':');
			return `/encyclopedia/story/${era}#event-${eventKey}`;
		}
		case 'story':
			return `/encyclopedia/story`;
		default:
			throw new Error(`routeFor: unknown kind "${kind}"`);
	}
}
