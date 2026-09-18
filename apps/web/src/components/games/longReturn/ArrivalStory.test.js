import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ArrivalStory, { arrivalRecap } from './ArrivalStory';

afterEach(cleanup);

test('arrival is the default and the complete crossing is readable on request', () => {
  const paragraphs = ['The water covers the old walkway.', 'Hippochamp guides the crew below it.', 'A flash runs through the water.', 'Together, they reach the far landing.'];
  const { container, rerender } = render(<ArrivalStory key="first" paragraphs={paragraphs} />);
  expect(container.querySelector('.lr-crossing-prose > p').textContent).toBe(paragraphs[3]);
  const account = container.querySelector('details');
  expect(account.open).toBe(false);
  expect([...account.querySelectorAll('p')].map(p=>p.textContent)).toEqual(paragraphs);
  fireEvent.click(screen.getByText('Read the crossing again'));
  expect(account.open).toBe(true);
  rerender(<ArrivalStory key="next" paragraphs={['Another approach.', 'The crew reaches the next room.']} />);
  expect(container.querySelector('details').open).toBe(false);
});

test('a legacy one-paragraph account remains visible without an empty disclosure', () => {
  const { container } = render(<ArrivalStory paragraphs={['The crew reaches the door.']} />);
  expect(screen.getByText('The crew reaches the door.')).toBeTruthy();
  expect(container.querySelector('details')).toBeNull();
});

test('result recap promotes the authored arrival and does not repeat its opening sentence', () => {
  const paragraphs = ['The crew enters the flood.', 'The crew reaches the far steps. The bypass opens ahead.'];
  expect(arrivalRecap(paragraphs)).toEqual({ headline: 'The crew reaches the far steps.', detail: 'The bypass opens ahead.' });
  const { container } = render(<ArrivalStory paragraphs={paragraphs} recap />);
  expect(container.querySelector('.lr-crossing-prose > p').textContent).toBe('The bypass opens ahead.');
  expect([...container.querySelectorAll('details p')].map(p => p.textContent)).toEqual(paragraphs);
});
