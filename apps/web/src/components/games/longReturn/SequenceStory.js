import React, { useEffect, useRef } from 'react';
import './sequenceStory.css';
import BiIcon from './BiIcon';

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

// Reading back pauses playback, never the already-resolved gameplay action.
// Only the parent's Continue dismisses this persistent account.
export default function SequenceStory({ events, index, paused, onPause, onNext, action }) {
  const scrollRef = useRef(null);
  const follows = useRef(true);
  const final = index === events.length - 1;
  const followLatest = () => {
    follows.current = true;
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (el && follows.current) el.scrollTop = el.scrollHeight;
  }, [index]);
  return <section className="lr-sequence-story" aria-label="Action story">
    <header><span>{final ? 'What happened' : 'The scene unfolds'}</span><small>{index + 1} / {events.length}</small></header>
    <div className="lr-sequence-story-scroll" ref={scrollRef} tabIndex={0} aria-label="Read the action story" onScroll={event => {
      const el = event.currentTarget;
      follows.current = el.scrollHeight - el.scrollTop - el.clientHeight < 36;
      if (!follows.current && !paused && !final) onPause();
    }}>
      <ol aria-live="polite" aria-relevant="additions" aria-atomic="false">
        {events.slice(0, index + 1).map((entry, position) => <li key={`${position}-${entry.kind}`} className={`is-${entry.kind}`}>
          <span aria-hidden="true">{entry.title ? <BiIcon cls={`bi ${entry.icon}`} /> : String(position + 1).padStart(2, '0')}</span>
          {entry.title ? <div className="lr-story-beat"><h3>{entry.title}</h3><p>{entry.message || entry.text}</p>{entry.costs?.length > 0 && <div className="lr-story-costs">{entry.costs.map(cost => <span key={cost.kind} className={`is-${cost.kind}`}><BiIcon cls={`bi ${cost.kind === 'energy' ? 'bi-lightning-charge-fill' : 'bi-building'}`} /> {cost.text}</span>)}</div>}</div> : <p>{entry.message || entry.text}</p>}
        </li>)}
      </ol>
    </div>
    {(!final || action) && <footer>
      {!final && <><button type="button" aria-pressed={paused} onClick={() => { if (paused) followLatest(); onPause(); }}>{paused ? 'Resume story' : 'Pause story'}</button><button type="button" onClick={() => { followLatest(); onNext(); }}>Next event →</button></>}
      {action}
    </footer>}
  </section>;
}
