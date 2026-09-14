import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import EncounterAftermath from './EncounterAftermath';

afterEach(cleanup);
const native = { species: 'Xylum' };
test('shows only changed reserves and the single automatic companion assist', () => {
  const result = { companion: true, affected: { species: 'Graviclaw' }, resources: { energy: { before: 5, after: 5 }, stability: { before: 8, after: 7 } } };
  const { container } = render(<EncounterAftermath result={result} native={native} />);
  expect(screen.getAllByRole('img')).toHaveLength(1);
  expect(screen.getByRole('img', { name: 'Annex stability: 8 to 7 of 10' })).toBeTruthy();
  expect(container.querySelector('.lr-companion-charge b').textContent).toBe('1');
  expect(container.textContent).toContain('Automatic · once this expedition');
  expect(container.textContent).not.toContain('No energy spent');
});
test('displays spent energy to zero, without inventing companion help', () => {
  const result = { companion: false, affected: { species: 'Chromocat' }, resources: { energy: { before: 1, after: 0 }, stability: { before: 5, after: 5 } } };
  const { container } = render(<EncounterAftermath result={result} native={native} />);
  expect(screen.getByRole('img', { name: 'Chromocat energy: 1 to 0 of 6' })).toBeTruthy();
  expect(container.querySelector('.lr-companion-promise')).toBeNull();
});
test('a cost-free encounter gets one quiet acknowledgement', () => {
  const result = { companion: false, resources: { energy: null, stability: { before: 5, after: 5 } } };
  render(<EncounterAftermath result={result} native={native} />);
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByText('Energy and stability preserved')).toBeTruthy();
});
