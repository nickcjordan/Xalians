import React, { useEffect, useRef } from 'react';
import './sequenceStory.css';

export function trapSequenceFocus(event) {
  if (event.key !== 'Tab') return;
  const targets = [...event.currentTarget.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
  const first = targets[0];
  const last = targets[targets.length - 1];
  if (event.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement))) {
    event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !targets.includes(document.activeElement))) {
    event.preventDefault(); first?.focus();
  }
}

// The scene can move on; the words never expire. Reading back pauses following,
// not the underlying resolved action. Only the parent's Continue dismisses it.
export default function SequenceStory({ events, index, paused, onPause, onNext }) {
  const scrollRef = useRef(null);
  const follows = useRef(true);
  const final = index === events.length - 1;
  useEffect(() => {
    const el = scrollRef.current;
    if (el && follows.current) el.scrollTop = el.scrollHeight;
  }, [index]);
  return <section className="lr-sequence-story" aria-label="Action story">
    <header><span>{final ? 'What happened' : 'The scene unfolds'}</span><small>{index + 1} / {events.length}</small></header>
    <div className="lr-sequence-story-scroll" ref={scrollRef} tabIndex={0} aria-label="Read the action story" onScroll={event => {
      const el = event.currentTarget;
      follows.current = el.scrollHeight - el.scrollTop - el.clientHeight < 36;
    }}>
      <ol aria-live="polite" aria-relevant="additions" aria-atomic="false">
        {events.slice(0, index + 1).map((entry, position) => <li key={`${position}-${entry.kind}`} className={`is-${entry.kind}`}>
          <span aria-hidden="true">{String(position + 1).padStart(2, '0')}</span><p>{entry.message || entry.text}</p>
        </li>)}
      </ol>
    </div>
    <footer>
      <button type="button" aria-pressed={paused} disabled={final} onClick={onPause}>{paused ? 'Resume story' : 'Pause story'}</button>
      <button type="button" disabled={final} onClick={onNext}>Next event →</button>
      <small>{final ? 'The whole account stays here until you continue.' : 'Earlier events stay here to read.'}</small>
    </footer>
  </section>;
}
