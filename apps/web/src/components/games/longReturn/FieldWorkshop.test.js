import React from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import FieldWorkshop from './FieldWorkshop';
import { CREATURES } from './longReturnData';
import { performFieldOperation } from './fieldOperations';

afterEach(cleanup);
const crew = CREATURES.slice(0, 3);
const initial = { crew, strain: { [crew[0].id]: 3 }, pressure: 5, salvage: 5, commands: 1 };

test('repair selection and cancellation are reversible; only spending commits', () => {
  const onChoose = vi.fn();
  const { container } = render(<FieldWorkshop {...initial} onChoose={onChoose} />);
  fireEvent.click(container.querySelector('summary'));
  fireEvent.click(screen.getByRole('button', { name: /Resupply Graviclaw/ }));
  expect(screen.getByRole('img', { name: 'Graviclaw energy: 3 to 5 of 6' })).toBeTruthy();
  expect(container.querySelector('.lr-field-payment small').textContent).toBe('5 → 3 carried');
  expect(onChoose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel repair' }));
  expect(container.querySelector('.lr-field-exchange')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Resupply Graviclaw/ }));
  fireEvent.click(screen.getByRole('button', { name: /Spend 2 salvage/ }));
  expect(onChoose).toHaveBeenCalledExactlyOnceWith(`recover-${crew[0].id}`);
});

test.each(['recover', 'brace', 'relay'])('%s preserves the preview exchange in its settled receipt', (kind) => {
  const state = { ...initial, strain: { [crew[0].id]: 1 } };
  const id = kind === 'relay' ? 'relay-' : `${kind}-`;
  const { container, rerender } = render(<FieldWorkshop {...state} onChoose={() => {}} />);
  fireEvent.click(container.querySelector('summary'));
  const button = [...container.querySelectorAll('.lr-workshop-options button')].find(el => el.textContent.includes(kind === 'recover' ? 'Resupply Graviclaw' : kind === 'brace' ? 'Brace the annex with Graviclaw' : 'Build a command relay'));
  fireEvent.click(button);
  const labels = [...container.querySelectorAll('[role="img"]')].map(el => el.getAttribute('aria-label'));
  // Resolve the same option that was selected, including the dynamically chosen engineer.
  const next = kind === 'relay'
    ? [crew[0], crew[1], crew[2]].map(c => performFieldOperation(state, `${id}${c.id}`)).find(Boolean)
    : performFieldOperation(state, `${id}${crew[0].id}`);
  rerender(<FieldWorkshop {...next} receipt={next.option} onChoose={() => {}} />);
  expect([...container.querySelectorAll('[role="img"]')].map(el => el.getAttribute('aria-label'))).toEqual(labels);
  expect(document.activeElement).toBe(container.querySelector('h4'));
  expect(container.querySelectorAll('.is-gained')).toHaveLength(next.option.after - next.option.before);
  expect(container.querySelectorAll('.is-spent')).toHaveLength(Math.max(0, next.option.energy));
});

test('unaffordable repairs cannot open a spend confirmation', () => {
  const { container } = render(<FieldWorkshop {...initial} salvage={1} onChoose={vi.fn()} />);
  fireEvent.click(container.querySelector('summary'));
  const buttons = [...container.querySelectorAll('.lr-workshop-options button')];
  expect(buttons.length).toBeGreaterThan(0);
  buttons.forEach(button => { expect(button.disabled).toBe(true); fireEvent.click(button); });
  expect(container.querySelector('.lr-workshop-confirm')).toBeNull();
});

test('a depth-choice request opens repair choices without selecting or spending', () => {
  const onChoose = vi.fn();
  const { container, rerender } = render(<FieldWorkshop {...initial} openRequest={0} onChoose={onChoose} />);
  expect(container.querySelector('.lr-workshop').open).toBe(false);
  rerender(<FieldWorkshop {...initial} openRequest={1} onChoose={onChoose} />);
  expect(container.querySelector('.lr-workshop').open).toBe(true);
  expect(container.querySelectorAll('.lr-workshop-options button:not([disabled])').length).toBeGreaterThan(0);
  expect(onChoose).not.toHaveBeenCalled();
});
