import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import ExpeditionReserves from './ExpeditionReserves';
afterEach(cleanup);
const crew = [{ id: 'a', species: 'Graviclaw' }];
test.each([[0, null], [3, 'Weakened'], [5, "Can't scout"], [6, "Can't act"]])('energy load %i explains role limits without relying on color', (load, warning) => {
  const { container } = render(<ExpeditionReserves crew={crew} strain={{ a: load }} pressure={0} />);
  if (warning) expect(screen.getByText(warning)).toBeTruthy();
  else expect(container.querySelector('.lr-reserve-warning')).toBeNull();
  expect(screen.getByRole('group', { name: new RegExp(`Graviclaw: ${6 - load} of 6 energy`) })).toBeTruthy();
});
test('recovery removes the role warning and imminent instability is explicit', () => {
  const { rerender } = render(<ExpeditionReserves crew={crew} strain={{ a: 5 }} pressure={9} />);
  expect(screen.getByText('Collapse near')).toBeTruthy();
  rerender(<ExpeditionReserves crew={crew} strain={{ a: 2 }} pressure={0} />);
  expect(screen.queryByText("Can't scout")).toBeNull();
  expect(screen.queryByText('Collapse near')).toBeNull();
});
