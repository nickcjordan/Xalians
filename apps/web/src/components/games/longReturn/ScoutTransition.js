import React, { useEffect, useMemo, useRef, useState } from 'react';
import XalianImage from '../../xalianImage';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import { sceneArtFor } from './sceneArt';
import { scoutPerformance } from './performanceVisuals';
import { playGameSound } from './gameAudio';
import BiIcon from './BiIcon';
import './scoutTransition.css';

function scoutBeats(action) {
  if (action.type === 'scout-return') return [
    { kind: 'return', icon: 'bi-arrow-return-left', text: `${action.scout.species} races back with the report.` },
    { kind: 'energy', icon: 'bi-lightning-charge-fill', text: 'The return trip consumes another energy.' },
    { kind: 'stability', icon: 'bi-building-fill-exclamation', text: 'Time passes. The annex loses stability.' },
    { kind: 'complete', icon: 'bi-check-lg', text: 'The report reaches the crew.' }
  ];
  const found = action.result.revealedIds.length;
  return [
    { kind: 'depart', icon: 'bi-arrow-right', text: `${action.scout.species} leaves the crew and moves ahead.` },
    { kind: 'observe', icon: 'bi-eye-fill', text: found ? `${found} danger signature${found === 1 ? '' : 's'} detected.` : 'The scout searches the route.' },
    { kind: action.result.relay ? 'signal' : 'silence', icon: action.result.relay ? 'bi-broadcast-pin' : 'bi-broadcast', text: action.result.relay ? `${action.profile.channel} carries the report back.` : 'No signal reaches the crew.' },
    { kind: 'energy', icon: 'bi-lightning-charge-fill', text: 'Scouting consumes one energy.' },
    action.encounter
      ? { kind: 'encounter', icon: 'bi-exclamation-diamond-fill', text: `${action.encounter.species} intercepts the scout.` }
      : { kind: 'complete', icon: action.result.relay ? 'bi-check-lg' : 'bi-hourglass-split', text: action.result.relay ? 'Actionable intelligence received.' : 'The scout must return physically.' }
  ];
}

function Meter({ kind, before, after, active }) {
  const max = kind === 'energy' ? MAX_STRAIN : MAX_INSTABILITY;
  return <div className={`lr-scout-meter is-${kind}`} aria-label={`${kind}: ${active ? after : before} of ${max}`}>
    <span><BiIcon cls={`bi ${kind === 'energy' ? 'bi-lightning-charge-fill' : 'bi-building'}`} />{kind}</span>
    <div aria-hidden="true">{Array.from({ length: max }, (_, index) => {
      const removed = index >= after && index < before;
      return <i className={`${index < after ? 'is-full' : removed && active ? 'is-draining' : index < before ? 'is-full' : 'is-empty'}`} key={index} />;
    })}</div>
  </div>;
}

export default function ScoutTransition({ action, onComplete, soundEnabled = true }) {
  const beats = useMemo(() => scoutBeats(action), [action]);
  const [index, setIndex] = useState(0);
  const buttonRef = useRef(null);
  const beat = beats[index];
  const final = index === beats.length - 1;
  const art = sceneArtFor(action.scene);
  const returning = action.type === 'scout-return';
  const energyAt = beats.findIndex((entry) => entry.kind === 'energy');
  const stabilityAt = beats.findIndex((entry) => entry.kind === 'stability');
  const nativeAt = beats.findIndex((entry) => entry.kind === 'encounter');

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    buttonRef.current?.focus();
    return () => { document.documentElement.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    if (final) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setIndex(beats.length - 1); return undefined; }
    const timer = window.setTimeout(() => setIndex((value) => value + 1), beat.kind === 'depart' || beat.kind === 'return' ? 1350 : 950);
    return () => window.clearTimeout(timer);
  }, [beat.kind, beats.length, final]);
  useEffect(() => { playGameSound(beat.kind, soundEnabled); }, [beat.kind, soundEnabled]);

  const energyBefore = action.energyBefore;
  const energyAfter = action.energyAfter;
  const stabilityBefore = action.stabilityBefore ?? MAX_INSTABILITY;
  const stabilityAfter = action.stabilityAfter ?? stabilityBefore;
  const skip = () => final ? onComplete() : setIndex(beats.length - 1);
  const performance = scoutPerformance(action.profile);
  return <div className={`lr-scout-curtain is-${beat.kind} is-${art.tone} performance-${performance.id}`} style={{ '--action-accent': art.accent }} role="dialog" aria-modal="true" aria-label={returning ? 'Scout returning' : 'Scouting in progress'} onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); buttonRef.current?.focus(); } }}>
    <div className="lr-scout-art" style={{ backgroundImage: `url(${art.src})` }} /><div className="lr-scout-vignette" />
    <header><small>{action.scene.deck} · field action</small><h2>{returning ? 'The scout returns' : 'Scouting ahead'}</h2></header>
    <div className="lr-scout-stage" aria-hidden="true">
      <div className="lr-scout-origin"><BiIcon cls="bi bi-people-fill" /></div>
      <div className="lr-scout-trail"><i /><i /><i /><i /></div>
      <div className="lr-scout-performer"><XalianImage variant="token" speciesName={action.scout.species} primaryType={action.scout.element.primary} fill="#070907" stroke="#cbf7dc" strokeWidth="1.2" unPadded /></div>
      {(beat.kind === 'observe' || beat.kind === 'signal' || beat.kind === 'silence') && <div className={`lr-scout-effect is-${beat.kind}`}><BiIcon cls={`bi ${beat.icon}`} /></div>}
      {(beat.kind === 'depart' || beat.kind === 'observe') && <div className={`lr-scout-role-effect is-${performance.id}`}><BiIcon cls={`bi ${performance.icon}`} /></div>}
      {action.encounter && index >= nativeAt && <div className="lr-scout-native"><XalianImage variant="token" speciesName={action.encounter.species} primaryType={action.encounter.element.primary} fill="#050705" stroke="#f2d25e" strokeWidth="1.3" unPadded /></div>}
    </div>
    <div className="lr-scout-hud">
      <strong>{action.scout.species}</strong>
      <Meter kind="energy" before={energyBefore} after={energyAfter} active={index >= energyAt} />
      {returning && <Meter kind="stability" before={stabilityBefore} after={stabilityAfter} active={index >= stabilityAt} />}
    </div>
    <section className="lr-scout-caption" key={`${index}-${beat.kind}`} aria-live="polite"><BiIcon cls={`bi ${beat.icon}`} /><div><small>{final ? action.encounter ? 'Contact' : 'Scout action complete' : 'Scout action'}</small><strong>{beat.text}</strong></div><span>{index + 1}/{beats.length}</span></section>
    <button ref={buttonRef} type="button" onClick={skip}>{final ? action.encounter ? 'Respond to encounter' : !returning && !action.result.relay ? 'Check scout status' : 'Review scout report' : 'Skip to outcome'} <BiIcon cls="bi bi-arrow-right" /></button>
  </div>;
}
