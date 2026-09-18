import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import ScoutChoices from './ScoutChoices';

afterEach(cleanup);
const options = [
  { member: { id: 'a', species: 'Graviclaw', element: { primary: 'dark' } }, profile: { detect: 70 }, preview: { relay: true } },
  { member: { id: 'b', species: 'Chromocat', element: { primary: 'light' } }, profile: { detect: 85 }, preview: { relay: false } },
];

test('unavailable scouts are explained at the choice without fake disabled selection controls', () => {
  const {rerender} = render(<ScoutChoices options={[options[0]]} unavailable={[options[1].member]} onSelect={() => {}} />);
  expect(screen.getByText(/cannot scout/).textContent).toContain('Chromocat cannot scout. At least 2 energy is needed.');
  expect(screen.queryByRole('button', {name:/Select Chromocat/})).toBeNull();
  rerender(<ScoutChoices options={[]} unavailable={options.map(option => option.member)} onSelect={() => {}} />);
  expect(screen.getByText('Everyone has less than the 2 energy needed to scout.')).toBeTruthy();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

test('recommendation does not imply selection and selection only prepares an action', () => {
  const select = vi.fn();
  const { rerender, container } = render(<ScoutChoices options={options} selectedId={null} onSelect={select} />);
  const recommended = screen.getByRole('button', { name: 'Select Graviclaw as scout' });
  expect(recommended.getAttribute('aria-pressed')).toBe('false');
  expect(container.querySelector('[data-recommended]')).toBe(recommended);
  const before = screen.getAllByRole('button').map(button => button.textContent);
  fireEvent.click(screen.getByRole('button', { name: 'Select Chromocat as scout' }));
  expect(select).toHaveBeenCalledWith('b');
  rerender(<ScoutChoices options={options} selectedId="b" onSelect={select} />);
  expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(before);
  expect(screen.getByRole('button', { name: 'Select Chromocat as scout' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('button', { name: /Send/ })).toBeNull();
});

test('reporting and its trip cost stay together; contact risk appears only when relevant', () => {
  const { rerender } = render(<ScoutChoices options={options} onSelect={() => {}} />);
  expect(screen.getByRole('button', { name: /Graviclaw/ }).textContent).toMatch(/Strong awareness.*Reports remotely.*1 energy/);
  expect(screen.getByRole('button', { name: /Chromocat/ }).textContent).toMatch(/Excellent awareness.*Must return.*2 energy · 1 stability/);
  expect(screen.queryByText('At risk of being cornered')).toBeNull();
  rerender(<ScoutChoices options={[{ ...options[1], outlook: { posture: 'native-first', label: 'At risk of being cornered' } }]} onSelect={() => {}} />);
  expect(screen.getByText('At risk of being cornered')).toBeTruthy();
});
