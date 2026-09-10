import React, { useEffect, useMemo, useRef, useState } from 'react';
import XalianImage from '../../xalianImage';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import { buildEncounterResolutionSequence, encounterEventIndex } from './encounterSequence';
import { sceneArtFor } from './sceneArt';
import { playGameSound } from './gameAudio';
import './encounterResolutionTransition.css';

const eventIcons = {
  response: 'bi-cursor-fill', energy: 'bi-lightning-charge-fill', stability: 'bi-building', preserve: 'bi-shield-check',
  companion: 'bi-person-plus-fill', warning: 'bi-exclamation-diamond-fill', detour: 'bi-signpost-split-fill', clear: 'bi-unlock-fill'
};
const eventSounds = { response: 'commit', energy: 'energy', stability: 'stability', preserve: 'support', companion: 'companion', warning: 'hazard', detour: 'return', clear: 'complete' };

function ReserveMeter({ kind, label, max, before, after, eventAt, index }) {
  return <div className={`lr-encounter-sequence-meter is-${kind}`} aria-label={`${label}: ${index < eventAt ? before : after} of ${max}`}>
    <span><i className={`bi ${kind === 'energy' ? 'bi-lightning-charge-fill' : 'bi-building'}`} /><strong>{label}</strong><b>{index < eventAt ? before : after}/{max}</b></span>
    <div aria-hidden="true">{Array.from({ length: max }, (_, pip) => {
      const lost = pip >= after && pip < before;
      const state = pip < after ? 'is-full' : lost && index < eventAt ? 'is-full' : lost && index === eventAt ? 'is-draining' : 'is-empty';
      return <i className={state} key={pip} />;
    })}</div>
  </div>;
}

export default function EncounterResolutionTransition({ action, onComplete, soundEnabled = true }) {
  const events = useMemo(() => buildEncounterResolutionSequence(action), [action]);
  const [index, setIndex] = useState(0);
  const buttonRef = useRef(null);
  const current = events[index];
  const final = index === events.length - 1;
  const art = sceneArtFor(action.scene);
  const energyAt = encounterEventIndex(events, 'energy');
  const stabilityAt = encounterEventIndex(events, 'stability');
  const energyCost = action.option.scoutStrain || action.option.crewStrain || 0;
  const outcome = ['companion', 'warning', 'detour', 'clear'].includes(current.kind);

  useEffect(() => {
    setIndex(0);
    const previousOverflow = document.documentElement.style.overflow;
    const previousFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    if (buttonRef.current) buttonRef.current.focus();
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };
  }, [action]);

  useEffect(() => {
    if (final) return undefined;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setIndex(events.length - 1); return undefined; }
    const timer = window.setTimeout(() => setIndex((value) => Math.min(events.length - 1, value + 1)), current.kind === 'response' ? 1350 : 1050);
    return () => window.clearTimeout(timer);
  }, [current.kind, events.length, final]);

  useEffect(() => { playGameSound(eventSounds[current.kind] || 'select', soundEnabled); }, [current.kind, soundEnabled]);

  const advance = () => final ? onComplete() : setIndex(events.length - 1);
  return <div className={`lr-encounter-curtain event-${current.kind} is-${art.tone}`} style={{ '--encounter-accent': art.accent }} role="dialog" aria-modal="true" aria-label="Encounter response in progress" onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); buttonRef.current?.focus(); } }}>
    <div className="lr-encounter-curtain__art" style={{ backgroundImage: `url(${art.src})` }} />
    <div className="lr-encounter-curtain__vignette" />
    <header><span>{action.scene.deck} · field response</span><h2>{action.option.label}</h2><p>{action.presentation.identity.label}</p></header>
    <aside className="lr-encounter-sequence-reserves">
      {action.affected && energyCost > 0 && <ReserveMeter kind="energy" label={`${action.affected.species} energy`} max={MAX_STRAIN} before={action.energyBefore} after={action.energyAfter} eventAt={energyAt} index={index} />}
      <ReserveMeter kind="stability" label="Annex stability" max={MAX_INSTABILITY} before={action.stabilityBefore} after={action.stabilityAfter} eventAt={stabilityAt} index={index} />
    </aside>
    <div className={`lr-encounter-sequence-stage${outcome ? ' is-outcome' : ''}`} aria-hidden="true">
      <div className={`lr-encounter-sequence-creature is-actor${current.kind === 'response' ? ' is-acting' : ''}`}><XalianImage speciesName={action.actor.species} primaryType={action.actor.element.primary} fill="#050705" stroke="#c9f6dc" strokeWidth="1.1" unPadded /></div>
      {action.witness && <div className="lr-encounter-sequence-creature is-witness"><XalianImage speciesName={action.witness.species} primaryType={action.witness.element.primary} fill="#050705" stroke="#91b9aa" strokeWidth="1" unPadded /></div>}
      <div className={`lr-encounter-sequence-creature is-native is-${action.option.resolution}${action.option.companion ? ' is-companion' : ''}`}><XalianImage speciesName={action.native.species} primaryType={action.native.element.primary} fill="#050705" stroke="#f2d25e" strokeWidth="1.35" unPadded /></div>
      <div className="lr-encounter-sequence-link"><i className={`bi ${action.presentation.identity.icon}`} /></div>
      {outcome && <div className={`lr-encounter-sequence-outcome is-${current.kind}`} key={current.kind}><i className={`bi ${eventIcons[current.kind]}`} /></div>}
    </div>
    <section className="lr-sequence-caption" key={`${index}-${current.kind}`} aria-live="polite"><i className={`bi ${eventIcons[current.kind]}`} /><div><small>{outcome ? 'Encounter outcome' : 'Response in progress'}</small><strong>{current.message}</strong></div><span>{index + 1} / {events.length}</span></section>
    <button ref={buttonRef} type="button" onClick={advance}>{final ? 'See encounter result' : 'Skip to outcome'} <i className="bi bi-arrow-right" /></button>
  </div>;
}
