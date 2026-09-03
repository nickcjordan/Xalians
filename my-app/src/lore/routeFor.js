// routeFor(kind, key) -> string. Shared by search.js and index.js so the
// route convention lives in exactly one place.
//
// entry     -> /encyclopedia/index/<key>
// world     -> /encyclopedia/worlds/<key>
// species   -> /encyclopedia/species/<key>
// era       -> /encyclopedia/chronicle/<key>
// paragraph -> /encyclopedia/worlds/<planet>#chapter-<index>   (key is "<planet>:<index>")
// tour      -> /encyclopedia/tour/<beatKey>
// event     -> /encyclopedia/chronicle/<era>#event-<eventKey>  (key is "<era>:<eventKey>")

export function routeFor(kind, key) {
	switch (kind) {
		case 'entry':
			return `/encyclopedia/index/${key}`;
		case 'world':
			return `/encyclopedia/worlds/${key}`;
		case 'species':
			return `/encyclopedia/species/${key}`;
		case 'era':
			return `/encyclopedia/chronicle/${key}`;
		case 'paragraph': {
			const [planet, index] = key.split(':');
			return `/encyclopedia/worlds/${planet}#chapter-${index}`;
		}
		case 'tour':
			return `/encyclopedia/tour/${key}`;
		case 'event': {
			const [era, eventKey] = key.split(':');
			return `/encyclopedia/chronicle/${era}#event-${eventKey}`;
		}
		default:
			throw new Error(`routeFor: unknown kind "${kind}"`);
	}
}
