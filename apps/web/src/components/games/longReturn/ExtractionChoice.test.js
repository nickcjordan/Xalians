import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import ExtractionChoice from './ExtractionChoice';
import { bankedSalvage, companionFarewell } from './extractionOutcome';
afterEach(cleanup);

test('the temporary ally gets a farewell without inventing an unused intervention', () => {
  expect(companionFarewell(null)).toBe('');
  const companion = { creature: { species: 'Xylum' }, ready: true };
  expect(companionFarewell(companion)).toContain('Xylum pauses beside the crew');
  expect(companionFarewell(companion)).not.toContain('crossing it helped');
  expect(companionFarewell({ ...companion, ready: false })).toContain('crossing it helped');
  expect(companionFarewell(companion)).toContain('takes a path of its own');
});

test.each([0, 1, 2, 5, 18])('depth preview matches the actual forced-extraction settlement for %i salvage', salvage => {
  const { container } = render(<ExtractionChoice salvage={salvage} potential={9} nextScene={{ title: 'Core Reservoir' }} />);
  const retained = bankedSalvage('failed', true, salvage);
  expect(container.querySelector('.lr-haul-risk b').textContent).toBe(String(salvage - retained));
  expect(container.querySelector('.lr-emergency-rule small').textContent).toBe(`With your current haul: ${retained} saved · ${salvage - retained} lost.`);
  expect(container.querySelector('.is-extract .lr-extraction-offer b').textContent).toBe(String(bankedSalvage('extracted', true, salvage)));
});

test('extract and enter are direct distinct commitments with no default recommendation', () => {
  const onExtract = vi.fn(), onContinue = vi.fn();
  const { container } = render(<ExtractionChoice salvage={5} potential={9} nextScene={{ title: 'Core Reservoir' }} onExtract={onExtract} onContinue={onContinue} />);
  fireEvent.click(screen.getByRole('button', { name: /Extract now/ }));
  expect(onExtract).toHaveBeenCalledTimes(1);
  expect(onContinue).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Enter Core Reservoir/ }));
  expect(onContinue).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.g-btn--primary')).toBeNull();
});

test('pre-Index abort and forced extraction still bank no salvage', () => {
  expect(bankedSalvage('aborted', false, 9)).toBe(0);
  expect(bankedSalvage('failed', false, 9)).toBe(0);
});
