import React, { useEffect, useRef, useState } from 'react';
import './sequenceStory.css';
import BiIcon from './BiIcon';

const costIcons = { energy: 'bi-lightning-charge-fill', stability: 'bi-building', salvage: 'bi-box-seam', ability: 'bi-hourglass-split' };

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
  const [canReadEarlier, setCanReadEarlier] = useState(false);
  const [canReadLater, setCanReadLater] = useState(false);
  const final = index === events.length - 1;
  const readingScroller = () => {
    const record = scrollRef.current?.closest('[data-field-record]');
    return record && window.matchMedia?.('(max-width: 767px)').matches ? record : scrollRef.current;
  };
  const handleScroll = el => {
    follows.current = el.scrollHeight - el.scrollTop - el.clientHeight < 36;
    setCanReadEarlier(el.scrollTop > 8);
    setCanReadLater(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    if (!follows.current && !paused && !final) onPause();
  };
  const followLatest = () => {
    follows.current = true;
    const el = readingScroller();
    if (el) el.scrollTop = el.scrollHeight;
    setCanReadEarlier((el?.scrollTop || 0) > 8);
  };
  const readNext = () => {
    const el = readingScroller();
    el.scrollTop += Math.max(100, el.clientHeight - 48);
    scrollRef.current.focus({ preventScroll: true });
    setCanReadEarlier(el.scrollTop > 8);
    setCanReadLater(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  };
  const readFromStart = () => {
    if (!paused && !final) onPause();
    follows.current = false;
    const el = readingScroller();
    el.scrollTop = 0;
    scrollRef.current.focus({ preventScroll: true });
    setCanReadEarlier(false);
    setCanReadLater(el.scrollHeight - el.clientHeight > 8);
  };
  useEffect(() => {
    const el = readingScroller();
    if (el && final) {
      el.scrollTop = 0;
      follows.current = false;
      setCanReadEarlier(false);
      setCanReadLater(el.scrollHeight - el.clientHeight > 8);
    } else if (el && follows.current) {
      el.scrollTop = el.scrollHeight;
      setCanReadEarlier(el.scrollTop > 8);
      setCanReadLater(false);
    }
  }, [index, final]);
  useEffect(() => {
    const record = scrollRef.current?.closest('[data-field-record]');
    if (!record || !window.matchMedia?.('(max-width: 767px)').matches) return undefined;
    const onRecordScroll = () => handleScroll(record);
    record.addEventListener('scroll', onRecordScroll, { passive: true });
    return () => record.removeEventListener('scroll', onRecordScroll);
  }, [paused, final, onPause]);
  return <section className="lr-sequence-story p-3 md:p-5" aria-label="Action story">
    <header>
      <span>{final ? 'What happened' : 'The scene unfolds'}</span>
      <div className="lr-story-navigation">
        {final && canReadLater && <button type="button" aria-label="Continue reading the action" onClick={readNext}><span className="lr-story-nav-long">Continue reading</span><span className="lr-story-nav-short">More</span> ↓</button>}
        {canReadEarlier && (!final || !canReadLater) && <button type="button" aria-label="Read from start" onClick={readFromStart}>↑ <span className="lr-story-nav-long">Read from start</span><span className="lr-story-nav-short">Start</span></button>}
        <small>{index + 1} / {events.length}</small>
      </div>
    </header>
    <div className="lr-sequence-story-scroll" ref={scrollRef} tabIndex={0} aria-label="Read the action story" onScroll={event => { if (readingScroller() === event.currentTarget) handleScroll(event.currentTarget); }}>
      <ol aria-live="polite" aria-relevant="additions" aria-atomic="false">
        {events.slice(0, index + 1).map((entry, position) => <li key={`${position}-${entry.kind}`} className={`is-${entry.kind}`}>
          <span aria-hidden="true">{entry.title ? <BiIcon cls={`bi ${entry.icon}`} /> : String(position + 1).padStart(2, '0')}</span>
          {entry.title ? <div className="lr-story-beat"><h3>{entry.title}</h3><p>{entry.message || entry.text}</p>{entry.costs?.length > 0 && <div className="lr-story-costs">{entry.costs.map(cost => <span key={`${cost.kind}-${cost.creatureId || ''}`} className={`is-${cost.kind} inline-flex items-center gap-1`}><BiIcon cls={`bi ${costIcons[cost.kind] || 'bi-info-circle'}`} className="shrink-0" /> {cost.text}</span>)}</div>}</div> : <p>{entry.message || entry.text}</p>}
        </li>)}
      </ol>
    </div>
    {(!final || action) && <footer className={`grid gap-2 ${final ? 'grid-cols-1' : 'grid-cols-3'}`}>
      {!final && <><button className="inline-flex min-h-11 items-center justify-center gap-1 px-2 whitespace-normal" type="button" aria-pressed={paused} onClick={() => { if (paused) followLatest(); onPause(); }}>{paused ? 'Resume story' : 'Pause story'}</button><button className="inline-flex min-h-11 items-center justify-center gap-1 px-2 whitespace-normal" type="button" onClick={() => { followLatest(); onNext(); }}>Next event →</button></>}
      {action}
    </footer>}
  </section>;
}
