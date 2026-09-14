import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../components/system/status';

const WEB_ROOT = join(__dirname, '../..');
const REPO_ROOT = join(WEB_ROOT, '../..');

function sourceFiles(dir, found = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) sourceFiles(path, found);
		else if (/\.(?:js|jsx|ts|tsx)$/.test(name)) found.push(path);
	}
	return found;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('React runtime boundaries', () => {
	it('pins one current React and router runtime without an application Redux store', () => {
		const rootPackage = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
		const webPackage = JSON.parse(readFileSync(join(WEB_ROOT, 'package.json'), 'utf8'));

		expect(rootPackage.devDependencies.react).toBe('19.3.0');
		expect(rootPackage.devDependencies['react-dom']).toBe('19.3.0');
		expect(webPackage.dependencies.react).toBe('19.3.0');
		expect(webPackage.dependencies['react-dom']).toBe('19.3.0');
		expect(webPackage.dependencies['react-router']).toBe('8.3.1');
		expect(webPackage.dependencies).not.toHaveProperty('react-router-dom');
		expect(webPackage.dependencies).not.toHaveProperty('@reduxjs/toolkit');
		expect(webPackage.dependencies).not.toHaveProperty('react-redux');
	});

	it('keeps source on concurrent-root and current router APIs', () => {
		const files = sourceFiles(join(WEB_ROOT, 'src'));
		const combined = files.map((path) => `// ${relative(WEB_ROOT, path)}\n${readFileSync(path, 'utf8')}`).join('\n');
		const entry = readFileSync(join(WEB_ROOT, 'src/index.js'), 'utf8');

		expect(entry).toContain("from 'react-dom/client'");
		expect(entry).toContain('createRoot(');
		expect(entry).toContain('<React.StrictMode>');
		expect(combined).not.toMatch(/react-dom\/test-utils|ReactDOM\.(?:render|unmountComponentAtNode)/);
		expect(combined).not.toMatch(/from ['"]react-router-dom['"]/);
		expect(combined).not.toMatch(/from ['"](?:react-redux|@reduxjs\/toolkit)['"]/);
	});

	it('renders a recoverable error surface when a child throws', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		function BrokenSurface() {
			throw new Error('React 19 boundary probe');
		}

		render(
			<MemoryRouter>
				<ErrorBoundary>
					<BrokenSurface />
				</ErrorBoundary>
			</MemoryRouter>
		);

		expect(screen.getByRole('heading', { name: 'The page did not load' })).toBeInTheDocument();
		expect(screen.getByText('React 19 boundary probe')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
	});
});
