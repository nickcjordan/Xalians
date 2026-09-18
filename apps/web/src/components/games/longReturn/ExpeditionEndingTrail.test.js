import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import ExpeditionEndingTrail, { lastPassageMemory } from './ExpeditionEndingTrail';

afterEach(cleanup);

const crossings = [
  { id: 'service-throat', scene: 'Flooded Service Throat', route: 'Cross the hanging gantry', lead: 'Chromocat', story: 'The gantry shifts. The crew reaches the far door. Another route remained unseen.' },
  { id: 'turbine-hall', scene: 'Blind Turbine Hall', route: 'Enter the maintenance underdeck', lead: 'Hippochamp', story: 'The turbines loom above. The crew stays below them.' },
  { id: 'archive-vestibule', scene: 'Archive Vestibule', route: 'Wake the authentication rig', lead: 'Graviclaw', story: 'The iris opens. The crew crosses the seal.' },
  { id: 'null-gallery', scene: 'Null Gallery', route: 'Crawl the shielded conduit', lead: 'Chromocat', story: 'The conduit narrows. The crew emerges.' },
  { id: 'nemesis-index', scene: 'The Nemesis Index', route: 'Pull the archive blackbox', lead: 'Graviclaw', story: 'The last catch releases. The sealed backup comes free. A third sentence is for the full journal.' },
];

test('voluntary Index extraction recalls the actual last crossing and leaves optional sectors unvisited', () => {
  const { container } = render(<ExpeditionEndingTrail entries={crossings} objectiveReached />);
  expect(container.querySelectorAll('[data-ending-sector][data-visited="true"]')).toHaveLength(5);
  expect(container.querySelectorAll('[data-ending-sector][data-visited="false"]')).toHaveLength(2);
  expect(container.querySelector('[data-ending-memory]').textContent).toContain('The last catch releases. The sealed backup comes free.');
  expect(container.querySelector('[data-ending-memory]').textContent).toContain('Graviclaw led · Pull the archive blackbox');
  expect(container.querySelector('[data-ending-memory]').textContent).not.toContain('A third sentence');
  expect(container.querySelector('[data-ending-trail]').getAttribute('aria-label')).toContain('Index secured');
});

test('deep retrieval names the final chosen lead and marks all seven places crossed', () => {
  const deep = [...crossings, { id: 'core-reservoir', scene: 'Core Reservoir', route: 'Dive for the intact cell', lead: 'Hippochamp', story: 'The intact cell rises.' }, { id: 'generator-spine', scene: 'Generator Spine', route: 'Take the closing interval', lead: 'Chromocat', story: 'The rings close behind the crew.' }];
  const { container } = render(<ExpeditionEndingTrail entries={deep} objectiveReached />);
  expect(container.querySelectorAll('[data-ending-sector][data-visited="true"]')).toHaveLength(7);
  expect(container.querySelector('[data-ending-memory]').textContent).toContain('Chromocat led · Take the closing interval');
  expect(container.querySelector('[data-ending-memory]').textContent).not.toContain('The last catch releases');
});

test('a mission without a completed crossing has no fabricated last passage', () => {
  expect(lastPassageMemory([])).toBeNull();
  const { container } = render(<ExpeditionEndingTrail entries={[]} objectiveReached={false} />);
  expect(container.querySelector('[data-ending-memory]')).toBeNull();
  expect(container.querySelectorAll('[data-ending-sector][data-visited="true"]')).toHaveLength(0);
});

test('the visible memory recalls the arrival, not the opening description of the obstacle', () => {
  const entry = { ...crossings[4], story: 'Thin plates tremble. The crew approaches.\n\nThe last plate comes free. The Index is in their keeping. A final note belongs in the journal.' };
  expect(lastPassageMemory([entry]).memory).toBe('The last plate comes free. The Index is in their keeping.');
});
