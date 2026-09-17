import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SequenceStory from './SequenceStory';

test('reading back pauses playback, while reaching the bottom does not toggle it', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const onPause = vi.fn();
  const events = [0, 1, 2].map(n => ({ kind: 'move', text: `Event ${n}` }));
  const render = (paused = false, index = 1) => act(() => root.render(<SequenceStory events={events} index={index} paused={paused} onPause={onPause} onNext={() => {}} />));
  try {
    render();
    const scroller = container.querySelector('.lr-sequence-story-scroll');
    Object.defineProperties(scroller, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 } });
    scroller.scrollTop = 800;
    act(() => scroller.dispatchEvent(new Event('scroll', { bubbles: true })));
    expect(onPause).not.toHaveBeenCalled();
    scroller.scrollTop = 100;
    act(() => scroller.dispatchEvent(new Event('scroll', { bubbles: true })));
    expect(onPause).toHaveBeenCalledTimes(1);
    render(true);
    act(() => scroller.dispatchEvent(new Event('scroll', { bubbles: true })));
    expect(onPause).toHaveBeenCalledTimes(1);
    render(false, 2);
    act(() => scroller.dispatchEvent(new Event('scroll', { bubbles: true })));
    expect(onPause).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
