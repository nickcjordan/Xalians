import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SequenceStory, { storyPages } from './SequenceStory';

test('the scouting account appends revealed events without replacing earlier text or exposing future events', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const events = [0, 1, 2].map(n => ({ kind: 'observe', title: `Step ${n}`, text: `Finding ${n}` }));
  const render = index => act(() => root.render(<SequenceStory accumulate events={events} index={index} onNext={() => {}} action={<button>Continue</button>} />));
  try {
    render(0);
    const first = container.querySelector('[data-story-event="0"]');
    expect(container.textContent).not.toContain('Finding 1');
    render(1);
    expect(container.querySelector('[data-story-event="0"]')).toBe(first);
    expect(container.querySelectorAll('[data-story-event]')).toHaveLength(2);
    expect(container.textContent).toContain('Finding 0');
    expect(container.textContent).toContain('Finding 1');
    expect(container.textContent).not.toContain('Finding 2');
    render(2);
    expect(container.querySelectorAll('[data-story-event]')).toHaveLength(3);
    expect(container.querySelector('.lr-story-steps')).toBeNull();
    expect(container.querySelector('[role="log"]').getAttribute('aria-relevant')).toBe('additions');
  } finally { act(() => root.unmount()); container.remove(); }
});

test('small stages divide long accounts into complete passages', () => {
  const account = 'The crew reaches the gate and finds it sealed. A pale light moves below the water while the scout checks the control panel. The others hold the line until a signal returns from the far side.';
  const pages = storyPages(account, true);
  expect(pages.length).toBeGreaterThan(1);
  expect(pages.join(' ')).toBe(account);
  expect(storyPages(account, false)).toEqual([account]);
});

test('story events occupy one reading surface and remain available after playback', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onPause = vi.fn();
  const onNext = vi.fn();
  const events = [0, 1, 2].map(n => ({ kind: 'move', title: `Beat ${n}`, text: `Event ${n}` }));
  const render = (paused = false, index = 1) => act(() => root.render(<SequenceStory events={events} index={index} paused={paused} onPause={onPause} onNext={onNext} />));
  try {
    render();
    expect(container.querySelectorAll('[data-story-event]')).toHaveLength(1);
    expect(container.querySelector('[data-story-event]').textContent).toContain('Event 1');
    act(() => container.querySelector('[aria-label="Read event 1: Beat 0"]').click());
    expect(container.querySelector('[data-story-event]').textContent).toContain('Event 0');
    expect(onPause).toHaveBeenCalledTimes(1);
    render(true);
    act(() => container.querySelector('footer button').click());
    expect(container.querySelector('[data-story-event]').textContent).toContain('Event 1');
    expect(onPause).toHaveBeenCalledTimes(2);
    act(() => container.querySelector('footer button:nth-child(2)').click());
    expect(onNext).toHaveBeenCalledTimes(1);
    render(false, 2);
    expect(container.querySelector('[data-story-event]').textContent).toContain('Event 2');
    act(() => container.querySelector('[aria-label="Read event 1: Beat 0"]').click());
    expect(container.querySelector('[data-story-event]').textContent).toContain('Event 0');
    act(() => container.querySelector('footer button').click());
    expect(container.querySelector('[data-story-event]').textContent).toContain('Event 2');
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
