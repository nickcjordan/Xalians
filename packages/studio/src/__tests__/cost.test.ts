import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectBuildCost, uncoveredText } from '../cost.ts';
import { run } from '../cli.ts';
import { planBuild } from '../engine.ts';
import { SCHEMAS } from '../schema.ts';
import { initCreature, openCreature } from '../store.ts';

const projectsDir = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'projects');
const wide = { since: '2026-01-01T00:00:00Z', until: '2027-01-01T00:00:00Z', projectsDir };
const window = { since: '2026-10-01T10:00:00Z', until: '2026-10-01T11:00:00Z', projectsDir, orchestratorSession: 'sess1' };

describe('collectBuildCost', () => {
	it('matches by description and by first user message, and ignores other tags and non-Xalians slugs', () => {
		const c = collectBuildCost({ buildTag: 'B-k3f9', ...wide });
		expect(c.agents.map((a) => a.file.split('/').pop())).toEqual(['agent-aaa.jsonl', 'agent-bbb.jsonl']);
		expect(c.agents[0]!.description).toBe('[B-k3f9] eye socket build');
		expect(c.agents[0]!.model).toBe('sonnet');
		expect(c.agents[1]!.model).toBe('claude-sonnet-5');
	});

	it('de-duplicates by message id and sums each category', () => {
		const c = collectBuildCost({ buildTag: 'B-k3f9', ...wide });
		// m1 appears three times (largest output kept: 7), m2 once; agent-bbb adds n1.
		expect(c.agents[0]!.tokens).toEqual({ input: 11, output: 9, cacheRead: 103, cacheWrite: 54 });
		expect(c.tokens).toEqual({ input: 31, output: 19, cacheRead: 103, cacheWrite: 54 });
	});

	it('reports wall minutes from first to last timestamp', () => {
		const c = collectBuildCost({ buildTag: 'B-k3f9', ...wide });
		expect(c.agents[0]!.minutes).toBe(6);
		expect(c.agents[1]!.minutes).toBe(2.5);
		expect(c.agentMinutes).toBe(8.5);
	});

	it('does not match the bare tag without brackets unless asked', () => {
		expect(collectBuildCost({ buildTag: 'k3f9', ...wide }).agents).toHaveLength(0);
		expect(collectBuildCost({ buildTag: 'k3f9', match: 'substring', ...wide }).agents).toHaveLength(2);
	});

	it('sums the orchestrator share only inside the window, skipping sidechain lines and other projects', () => {
		const c = collectBuildCost({ buildTag: 'B-k3f9', ...window });
		expect(c.orchestrator!.approximate).toBe(true);
		expect(c.orchestrator!.messages).toBe(2);
		expect(c.orchestrator!.tokens).toEqual({ input: 150, output: 15, cacheRead: 1500, cacheWrite: 300 });
		// The orchestrator share is never folded into the subagent total.
		expect(c.tokens.input).toBe(31);
	});

	it('widening the window picks up the earlier and later messages', () => {
		const c = collectBuildCost({ buildTag: 'B-k3f9', ...wide, orchestratorSession: 'sess1' });
		expect(c.orchestrator!.tokens.input).toBe(2150);
	});

	it('reads only the named session and omits the share when none is recorded', () => {
		// sess9 sits in a non-Xalians slug and sess1 is the only Xalians session in the fixtures.
		expect(collectBuildCost({ buildTag: 'B-k3f9', ...wide, orchestratorSession: 'sess9' }).orchestrator!.messages).toBe(0);
		expect(collectBuildCost({ buildTag: 'B-k3f9', ...wide, orchestratorSession: 'nope' }).orchestrator!.messages).toBe(0);
		const none = collectBuildCost({ buildTag: 'B-k3f9', since: wide.since, until: wide.until, projectsDir });
		expect(none.orchestrator).toBeNull();
		expect(uncoveredText(none)).toContain('no orchestrator session recorded');
	});

	it('counts messages with no usage instead of treating them as zero silently', () => {
		const c = collectBuildCost({ buildTag: 'B-k3f9', ...window });
		expect(c.uncovered).toEqual({ subagentMessages: 1, orchestratorMessages: 1 });
		expect(uncoveredText(c)).toContain('1 subagent message(s) had no usage');
		expect(uncoveredText(collectBuildCost({ buildTag: 'B-zzzz', ...window }))).toContain('1 orchestrator');
	});

	it('returns empty, uncovered-free results for a tag nobody used when nothing is missing', () => {
		const c = collectBuildCost({ buildTag: 'B-nope', since: '2026-10-01T12:30:00Z', until: '2026-10-01T12:40:00Z', projectsDir, orchestratorSession: 'sess1' });
		expect(c.agents).toEqual([]);
		expect(uncoveredText(c)).toBeUndefined();
	});

	it('tolerates a missing projects folder', () => {
		expect(collectBuildCost({ buildTag: 'B-k3f9', ...wide, projectsDir: join(projectsDir, 'nope') }).agents).toEqual([]);
	});
});

describe('build cost schema', () => {
	it('accepts the new optional fields and still accepts the old shape', () => {
		const cost = SCHEMAS.build.shape.cost;
		expect(cost.safeParse({}).success).toBe(true);
		const t = { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 };
		expect(cost.safeParse({ tokens: t, orchestratorTokens: t, agents: [{ file: 'a/b', description: 'd', tokens: t, minutes: 1 }], uncovered: 'x' }).success).toBe(true);
		expect(cost.safeParse({ agents: [{ file: 'a', description: 'd', tokens: t, minutes: 1, extra: 1 }] }).success).toBe(false);
	});
});

describe('studio cost CLI', () => {
	it('collect writes the build cost and show totals it', () => {
		const root = mkdtempSync(join(tmpdir(), 'studio-cost-'));
		const store = initCreature(root, { key: 'akinza', name: 'Akinza', speciesTemplate: 'docs/x.json', silhouette: 'x.svg' });
		store.acquireLock('t');
		const part = store.create('part', { key: 'skull', name: 'skull', includes: [], why: 'w', scope: {}, dependsOn: [], order: 1, status: 'not-started', budget: { builds: 4, wallMinutes: 100 } }, 'orchestrator', { session: 't' });
		const b = store.create('build', planBuild(store.load(), { part: part.key, kind: 'preview', goal: 'g', method: 'm' }), 'orchestrator', { session: 't' });
		store.update<'build'>(b.id, (x) => { x.startedAt = '2026-10-01T10:00:00.000Z'; x.endedAt = '2026-10-01T11:00:00.000Z'; x.orchestratorSession = 's1'; }, { actor: 'orchestrator', session: 't' });

		const dir = join(mkdtempSync(join(tmpdir(), 'studio-projects-')), 'C--dev-src-xalians-x', 's1', 'subagents');
		mkdirSync(dir, { recursive: true });
		const line = (o: object) => JSON.stringify(o);
		writeFileSync(join(dir, 'agent-1.jsonl'), line({ type: 'assistant', timestamp: '2026-10-01T10:01:00.000Z', message: { id: 'a', usage: { input_tokens: 3, output_tokens: 4, cache_read_input_tokens: 5, cache_creation_input_tokens: 6 } } }) + '\n');
		writeFileSync(join(dir, 'agent-1.meta.json'), JSON.stringify({ description: `[${b.alias}] skull preview` }));
		const projects = join(dir, '..', '..', '..');

		const out: string[] = [];
		const base = ['--root', root, '--session', 't'];
		expect(run(['cost', 'collect', 'akinza', b.alias, '--projects', projects, ...base], { out: (l) => out.push(l) })).toBe(0);
		expect(out.join('\n')).toContain('subagents total: in 3, out 4, cache read 5, cache write 6');
		const saved = openCreature(root, 'akinza').load().builds[0]!;
		expect(saved.cost.tokens).toEqual({ input: 3, output: 4, cacheRead: 5, cacheWrite: 6 });
		expect(saved.cost.orchestratorTokens).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
		expect(saved.cost.agents).toHaveLength(1);

		const shown: string[] = [];
		expect(run(['cost', 'show', 'akinza', 'skull', '--root', root], { out: (l) => shown.push(l) })).toBe(0);
		expect(shown.join('\n')).toContain('creature akinza');
		expect(shown.join('\n')).toContain('in 3, out 4');
	});
});
