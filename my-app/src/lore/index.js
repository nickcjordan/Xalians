// Public API for the Encyclopedia Xalia data layer. UI components import
// only from here -- never from ../json/* or the other lore/* modules
// directly. All functions are synchronous and pure after first module load.

export { getMasthead, getCategories, getEntry, getEntries, getRelated, getAppearances, getPowers } from './entries';

export { getWorlds, getWorld } from './worlds';

export { getSpeciesList, getSpecies } from './species';

export {
	getEras,
	getEra,
	getOverview,
	getEraFootprint,
	getEraStory,
	getWorldTimeline,
	getEventsForEntry,
	getEraForEntry,
} from './chronicle';

export { getTour } from './tour';

export { getRandomRecord } from './random';

export { search } from './search';

export { linkify } from './linkify';

export { routeFor } from './routeFor';

export { getConnections } from './connections';

export { getReader, getReaderPart } from './reader';
