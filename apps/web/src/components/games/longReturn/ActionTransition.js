import React, { useEffect, useMemo, useRef, useState } from 'react';
import XalianImage from '../../xalianImage';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import { buildActionSequence, eventIndexFor } from './actionSequence';
import { sceneArtFor } from './sceneArt';
import { methodPerformance } from './performanceVisuals';
import { playGameSound } from './gameAudio';
import './actionTransition.css';
const icons = { move: 'bi-arrow-right', hazard: 'bi-lightning-charge-fill', support: 'bi-people-fill', companion: 'bi-person-check-fill', energy: 'bi-lightning-charge-fill', stability: 'bi-building-fill-exclamation', salvage: 'bi-box-seam', complete: 'bi-check-lg', encounter: 'bi-exclamation-diamond-fill', decision: 'bi-signpost-split-fill' };

function PipMeter({ kind, label, max, before, after, eventAt, index }) {
  return <div className={`lr-sequence-meter is-${kind}`} aria-label={`${label}: ${index < eventAt ? before : after} of ${max}`}>
    <span><i className={`bi ${kind === 'energy' ? 'bi-lightning-charge-fill' : 'bi-building'}`} /> {label}</span>
    <div aria-hidden="true">{Array.from({ length: max }, (_, pip) => {
      const lost = pip >= after && pip < before;
      const state = !lost ? pip < after ? 'is-full' : 'is-empty' : index < eventAt ? 'is-full' : index === eventAt ? 'is-draining' : 'is-empty';
      return <i className={state} key={pip} />;
    })}</div>
  </div>;
}

function CreatureStatus({ creature, change, events, index, role }) {
  const eventAt = eventIndexFor(events, 'energy', creature.id);
  const before = MAX_STRAIN - (change ? change.before : 0);
  const after = MAX_STRAIN - (change ? change.after : 0);
  return <div className={`lr-sequence-creature-status is-${role}${eventAt === index ? ' is-losing-energy' : ''}`}>
    <strong>{creature.species}</strong><small>{role}</small>
    <PipMeter kind="energy" label="Energy" max={MAX_STRAIN} before={before} after={after} eventAt={eventAt} index={index} />
  </div>;
}

export default function ActionTransition({ action, onComplete, soundEnabled = true }) {
  const events = useMemo(() => buildActionSequence(action), [action]);
  const [index, setIndex] = useState(0);
  const closeButtonRef = useRef(null);
  const current = events[index];
  const final = index === events.length - 1;
  const encounter = action.type === 'encounter';
  const result = action.result;

  useEffect(() => {
    setIndex(0);
    const previousOverflow = document.documentElement.style.overflow;
    const previousFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    if (closeButtonRef.current) closeButtonRef.current.focus();
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };
  }, [action]);

  useEffect(() => {
    if (final) return undefined;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setIndex(events.length - 1); return undefined; }
    const duration = current.kind === 'move' ? 1500 : current.kind === 'hazard' || current.kind === 'encounter' ? 1250 : 950;
    const timer = window.setTimeout(() => setIndex((value) => Math.min(events.length - 1, value + 1)), duration);
    return () => window.clearTimeout(timer);
  }, [current.kind, events.length, final]);

  useEffect(() => { playGameSound(current.kind, soundEnabled); }, [current.kind, soundEnabled]);

  const stabilityAt = encounter ? -1 : eventIndexFor(events, 'stability');
  const salvageAt = encounter ? -1 : eventIndexFor(events, 'salvage');
  const encounterAt = eventIndexFor(events, 'encounter');
  const crewChanges = result ? result.crewChanges : [];
  const nativeVisible = encounter && index >= encounterAt;
  const skip = () => final ? onComplete() : setIndex(events.length - 1);
  const art = sceneArtFor(action.scene);
  const performance = methodPerformance(action.method);

  return <div className={`lr-action-curtain event-${current.kind} is-${art.tone} performance-${performance.id}`} style={{ '--action-accent': art.accent }} role="dialog" aria-modal="true" aria-label={encounter ? 'Encounter discovered' : 'Crossing in progress'} onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); closeButtonRef.current?.focus(); } }}>
    <div className="lr-action-art" style={{ backgroundImage: `url(${art.src})` }} />
    <div className="lr-action-vignette" />
    {encounter
      ? <p className="lr-sequence-a11y">{action.encounter.species} emerges from the annex. Choose the crew’s response next.</p>
      : <div className="lr-action-resources lr-sequence-a11y">Crew energy {result.leadStrain + result.supportStrain}. Stability {result.pressure}. Salvage {result.salvage}.</div>}
    <header className="lr-sequence-title"><span>{action.scene.deck}</span><h2>{encounter ? 'Something moves ahead' : action.route.title}</h2><p>{encounter ? action.route ? 'The crossing is interrupted' : `${action.lead.species} scouts alone` : action.method.label}</p></header>

    {!encounter && <aside className={`lr-sequence-annex${stabilityAt === index ? ' is-taking-hit' : ''}`}><PipMeter kind="stability" label="Annex stability" max={MAX_INSTABILITY} before={MAX_INSTABILITY - result.instabilityChange.before} after={MAX_INSTABILITY - result.instabilityChange.after} eventAt={stabilityAt} index={index} /></aside>}
    {!encounter && <div className={`lr-sequence-salvage${salvageAt === index ? ' is-collecting' : ''}`} aria-label={`${index < salvageAt ? result.salvageAfter - result.salvage : result.salvageAfter} salvage carried`}><i className="bi bi-box-seam" /><strong>{index < salvageAt ? result.salvageAfter - result.salvage : result.salvageAfter}</strong></div>}

    <div className="lr-action-stage" aria-hidden="true">
      <div className="lr-action-path"><i /><i /><i /><i /><i /></div>
      <div className={`lr-action-creature is-lead${current.actorId === action.lead.id ? ' is-performing' : ''}${current.kind === 'hazard' ? ' is-hit' : ''}`}><XalianImage speciesName={action.lead.species} primaryType={action.lead.element.primary} fill="#080a08" stroke="#cbf7dc" strokeWidth="1" unPadded moreClasses="lr-action-silhouette" /></div>
      {action.support && <div className={`lr-action-creature is-support${current.kind === 'support' ? ' is-performing' : ''}`}><XalianImage speciesName={action.support.species} primaryType={action.support.element.primary} fill="#080a08" stroke="#c6d8d1" strokeWidth="1" unPadded moreClasses="lr-action-silhouette" /></div>}
      {action.companion && <div className={`lr-action-creature is-companion${current.kind === 'companion' ? ' is-performing' : ''}`}><XalianImage speciesName={action.companion.species} primaryType={action.companion.element.primary} fill="#060806" stroke="#74ffb0" strokeWidth="1.2" unPadded moreClasses="lr-action-silhouette" /></div>}
      {encounter && <div className={`lr-action-creature is-native${nativeVisible ? ' is-visible' : ''}`}><XalianImage speciesName={action.encounter.species} primaryType={action.encounter.element.primary} fill="#050705" stroke="#f2d25e" strokeWidth="1.4" unPadded moreClasses="lr-action-silhouette" /></div>}
      {(current.kind === 'hazard' || current.kind === 'encounter' || current.kind === 'complete') && <div className="lr-action-impact" key={`${index}-${current.kind}`}><i className={`bi ${icons[current.kind]}`} /></div>}
      {!encounter && current.kind === 'move' && <div className={`lr-performance-effect is-${performance.id}`} key={performance.id}><i className={`bi ${performance.icon}`} /></div>}
    </div>

    {!encounter && <div className="lr-sequence-crew"><CreatureStatus creature={action.lead} change={crewChanges.find((change) => change.creature.id === action.lead.id)} events={events} index={index} role="lead" />{action.support && <CreatureStatus creature={action.support} change={crewChanges.find((change) => change.creature.id === action.support.id)} events={events} index={index} role="support" />}</div>}

    <section className="lr-sequence-caption" key={`${index}-${current.kind}`} aria-live="polite"><i className={`bi ${icons[current.kind]}`} /><div><small>{current.kind === 'complete' ? 'Crossing complete' : current.kind === 'decision' ? 'Contact established' : 'In progress'}</small><strong>{current.message}</strong></div><span>{index + 1} / {events.length}</span></section>
    <button ref={closeButtonRef} type="button" onClick={skip}>{final ? encounter ? 'Choose response' : 'Continue to result' : 'Skip to outcome'} <i className="bi bi-arrow-right" /></button>
  </div>;
}
