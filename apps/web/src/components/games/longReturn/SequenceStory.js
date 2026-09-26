import React, { useEffect, useRef, useState } from 'react';
import './sequenceStory.css';
import BiIcon from './BiIcon';

const costIcons = { energy: 'bi-lightning-charge-fill', stability: 'bi-building', salvage: 'bi-box-seam', ability: 'bi-hourglass-split' };

export function storyPages(message, compact) {
  if (!compact || !message || message.length <= 165) return [message];
  const sentences = message.match(/[^.!?]+[.!?]?(?:\s+|$)/g) || [message];
  const pages = [];
  let page = '';
  for (const sentence of sentences) {
    const next = sentence.trim();
    if (page && `${page} ${next}`.length > 165) { pages.push(page); page = next; }
    else page = page ? `${page} ${next}` : next;
  }
  if (page) pages.push(page);
  return pages.length ? pages : [message];
}

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

// Each event has its own reading surface. The map and the account stay in place.
export default function SequenceStory(props) {
  return props.accumulate ? <AccumulatingStory {...props} /> : <PagedStory {...props} />;
}

function AccumulatingStory({ events, index, onNext, action }) {
  const latest = useRef(null);
  useEffect(() => {
    if (index > 0) latest.current?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
  }, [index]);
  const final = index === events.length - 1;
  return <section className="lr-sequence-story lr-sequence-story--accumulating" aria-label="Action story">
    <header><span>Scouting account</span><small>{index + 1} / {events.length}</small></header>
    <div className="lr-story-account" role="log" aria-label="Scouting events" aria-live="polite" aria-relevant="additions" tabIndex={0}>
      {events.slice(0, index + 1).map((entry, position) => <article key={`${position}-${entry.kind}`} ref={position === index ? latest : null} data-story-event={position} className={`lr-story-entry is-${entry.kind}`}>
        <div className="lr-story-beat"><span aria-hidden="true"><BiIcon cls={`bi ${entry.icon || 'bi-compass'}`} /></span><div>
          <h3>{entry.title || `Event ${position + 1}`}</h3><p>{entry.message || entry.text}</p>
          {entry.costs?.length > 0 && <div className="lr-story-costs">{entry.costs.map(cost => <span key={`${cost.kind}-${cost.creatureId || ''}`} className={`is-${cost.kind}`}><BiIcon cls={`bi ${costIcons[cost.kind] || 'bi-info-circle'}`} /> {cost.text}</span>)}</div>}
        </div></div>
      </article>)}
    </div>
    <footer><button type="button" disabled={final} onClick={onNext}>{final ? 'Account complete' : 'Next event →'}</button>{action}</footer>
  </section>;
}

function PagedStory({ events, index, paused, onPause, onNext, action }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 360);
  const final = index === events.length - 1;
  const shownIndex = Math.min(selectedIndex ?? index, index);
  const entry = events[shownIndex];
  const pages = storyPages(entry.message || entry.text, compact);
  const currentPage = Math.min(pageIndex, pages.length - 1);
  const morePages = currentPage < pages.length - 1;
  const following = selectedIndex === null || selectedIndex === index;
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => setCompact(window.innerWidth <= 360);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => setPageIndex(0), [shownIndex]);
  useEffect(() => { if (pages.length > 1 && following && !paused) onPause(); }, [shownIndex, compact, paused, following, pages.length]);
  const selectEvent = position => {
    if (position < index && !paused && !final) onPause();
    setPageIndex(0);
    setSelectedIndex(position === index ? null : position);
  };
  const resume = () => {
    setSelectedIndex(null);
    if (paused) onPause();
  };
  return <section className="lr-sequence-story" aria-label="Action story">
    <header><span>What happened</span><small>{shownIndex + 1} / {events.length}</small></header>
    <nav className="lr-story-steps" aria-label="Story events">
      {events.slice(0, index + 1).map((event, position) => <button key={`${position}-${event.kind}`} type="button" aria-label={`Read event ${position + 1}: ${event.title || event.kind}`} aria-current={shownIndex === position ? 'step' : undefined} onClick={() => selectEvent(position)} title={event.title || event.kind}>{String(position + 1).padStart(2, '0')}</button>)}
    </nav>
    <article key={`${shownIndex}-${entry.kind}`} className={`lr-story-current is-${entry.kind}`} aria-live="polite" aria-atomic="true" data-story-event={shownIndex}>
      <div className="lr-story-beat"><span aria-hidden="true"><BiIcon cls={`bi ${entry.icon || 'bi-compass'}`} /></span><div><h3>{entry.title || `Event ${shownIndex + 1}`}</h3><p>{pages[currentPage]}</p>{pages.length > 1 && <small className="lr-story-page">Passage {currentPage + 1} of {pages.length}</small>}{!morePages && entry.costs?.length > 0 && <div className="lr-story-costs">{entry.costs.map(cost => <span key={`${cost.kind}-${cost.creatureId || ''}`} className={`is-${cost.kind} inline-flex items-center gap-1`}><BiIcon cls={`bi ${costIcons[cost.kind] || 'bi-info-circle'}`} className="shrink-0" /> {cost.text}</span>)}</div>}</div></div>
    </article>
    <footer>
      {!final && <>{pages.length === 1 && <button type="button" aria-pressed={paused} onClick={() => { if (paused) resume(); else onPause(); }}>{paused ? 'Resume story' : 'Pause story'}</button>}<button type="button" onClick={() => { if (morePages) setPageIndex(value => value + 1); else { setSelectedIndex(null); onNext(); } }}>{morePages ? 'Next passage →' : 'Next event →'}</button></>}
      {final && morePages && <button type="button" onClick={() => setPageIndex(value => value + 1)}>Next passage →</button>}
      {final && !following && <button type="button" onClick={() => setSelectedIndex(null)}>Latest event →</button>}
      {!morePages && action}
    </footer>
  </section>;
}
