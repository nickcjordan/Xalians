const fs = require('fs');
const path = require('path');

const WORKFLOW_DIR = path.resolve(__dirname, '../../../../.github/workflows');

const SUPPORTED_ACTIONS = {
	'actions/checkout': 'v7',
	'actions/setup-node': 'v7',
	'aws-actions/configure-aws-credentials': 'v6',
	'hashicorp/setup-terraform': 'v4',
};

function workflowSources() {
	return fs.readdirSync(WORKFLOW_DIR)
		.filter((file) => /\.ya?ml$/.test(file))
		.map((file) => ({ file, source: fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8') }));
}

describe('GitHub Actions runtimes', () => {
	it('keeps JavaScript actions on their Node 24 majors', () => {
		const sources = workflowSources();
		expect(sources.length).toBeGreaterThan(0);

		for (const [action, major] of Object.entries(SUPPORTED_ACTIONS)) {
			const references = sources.flatMap(({ file, source }) =>
				[...source.matchAll(new RegExp(`uses:\\s*${action.replace('/', '\\/')}@([^\\s#]+)`, 'g'))]
					.map((match) => ({ file, version: match[1] }))
			);

			expect(references.length, `${action} should remain represented in the workflows`).toBeGreaterThan(0);
			expect(references, `${action} must use its Node 24 runtime major`).toEqual(
				references.map(({ file }) => ({ file, version: major }))
			);
		}
	});

	it('keeps the application build on the independently selected Node version', () => {
		const versions = workflowSources().flatMap(({ source }) =>
			[...source.matchAll(/node-version:\s*(["']?)(\d+)\1/g)].map((match) => match[2])
		);

		expect(versions).toEqual(['22', '22', '22', '22']);
	});
});
