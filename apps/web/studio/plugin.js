// The Creature Studio dev-server plugin.
//
// `apply: 'serve'` keeps it out of `vite build` entirely: the production build
// never loads this plugin, so no studio code or route can reach the site bundle
// (the client route is separately gated on import.meta.env.DEV in App.js).
import path from 'node:path';
import { createStudioApi, studioMiddleware } from './api.js';

export function studioPlugin({ repoRoot }) {
	return {
		name: 'creature-studio',
		apply: 'serve',
		configureServer(server) {
			const api = createStudioApi({ repoRoot: path.resolve(repoRoot) });
			server.middlewares.use(studioMiddleware(api));
		},
	};
}
