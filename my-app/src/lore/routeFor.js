// routeFor(kind, key) -> string. Shared by search.js and index.js so the
// route convention lives in exactly one place.
//
// entry     -> /encyclopedia/index/<key>
// world     -> /encyclopedia/worlds/<key>
// species   -> /encyclopedia/species/<key>
// era       -> /encyclopedia/chronicle/<key>
// paragraph -> /encyclopedia/worlds/<planet>#chapter-<index>   (key is "<planet>:<index>")

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
		default:
			throw new Error(`routeFor: unknown kind "${kind}"`);
	}
}
