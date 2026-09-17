import React, { useEffect, useMemo, useRef, useState } from 'react';
import XalianImage from '../../xalianImage';
import { beatDuration } from './beatTiming';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import { sceneArtFor } from './sceneArt';
import { scoutPerformance } from './performanceVisuals';
import { playGameSound } from './gameAudio';
import BiIcon from './BiIcon';
import './scoutTransition.css';
import SequenceStory, { trapSequenceFocus } from './SequenceStory';

export function scoutBeats(action) {
  const energy = Math.max(0, action.energyBefore - action.energyAfter);
  const stability = Math.max(0, (action.stabilityBefore ?? 0) - (action.stabilityAfter ?? 0));
  const costs = [energy > 0 && { kind: 'energy', text: `−${energy} energy · ${action.energyAfter} left` }, stability > 0 && { kind: 'stability', text: `−${stability} stability · ${action.stabilityAfter} left` }].filter(Boolean);
  if (action.type === 'scout-return') return [
    { kind: 'return', title: 'Back to the crew', icon: 'bi-arrow-return-left', text: `${action.scout.species} retraces the route to deliver the report in person. ${energy ? 'The return trip consumes another energy.' : 'The scout is already spent.'} ${stability ? 'While the crew waits, the annex deteriorates.' : ''}`, costs },
    { kind: 'complete', title: 'Now you can plan', icon: 'bi-check-lg', text: 'Together again, the crew compares the scout’s findings. Review the report before choosing a crossing.' }
  ];
  const found = action.result.revealedIds.length;
  return [
    { kind: 'depart', title: 'Scouting begins', icon: 'bi-arrow-right', text: `${action.scout.species} moves ahead alone, spending energy to search for a way through.`, costs },
    { kind: 'observe', title: found ? 'Danger spotted' : 'Searching ahead', icon: 'bi-eye-fill', text: found ? `The scout picks out ${found === 1 ? 'a hidden danger' : `${found} hidden dangers`} along the crossing. Those findings can guide your route choice.` : 'The scout studies the crossing, but uncovers no hidden dangers. That does not mean the way is safe.' },
    { kind: action.result.relay ? 'signal' : 'silence', title: action.result.relay ? 'The crew receives the report' : 'Out of contact', icon: action.result.relay ? 'bi-broadcast-pin' : 'bi-broadcast', text: action.result.relay ? `${action.profile.channel === 'vibration' ? `${action.scout.species} sends vibrations through the structure, carrying its findings to the waiting crew.` : `${action.scout.species} uses ${action.profile.channel} to send its findings to the waiting crew.`} No return trip is needed to deliver them.` : 'The scout cannot send a message from here. Its findings stay out of reach until it returns to the crew.' },
    ...(action.encounter ? [{ kind: 'encounter', title: 'An unexpected meeting', icon: 'bi-exclamation-diamond-fill', text: `${action.encounter.species} intercepts the scout. Decide how to handle the encounter before moving on.` }] : [])
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
  const [paused, setPaused] = useState(false);
  const buttonRef = useRef(null);
  const beat = beats[index];
  const final = index === beats.length - 1;
  const art = sceneArtFor(action.scene);
  const returning = action.type === 'scout-return';
  const energyAt = 0;
  const stabilityAt = 0;
  const nativeAt = beats.findIndex((entry) => entry.kind === 'encounter');

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    buttonRef.current?.focus();
    return () => { document.documentElement.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    if (final || paused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setIndex(beats.length - 1); return undefined; }
    const timer = window.setTimeout(() => setIndex((value) => value + 1), beatDuration(beat.kind, beat.text));
    return () => window.clearTimeout(timer);
  }, [index, beat.kind, beats.length, final, paused]);
  useEffect(() => { playGameSound(beat.kind, soundEnabled); }, [beat.kind, soundEnabled]);
  useEffect(() => { if (final) buttonRef.current?.focus({ preventScroll: true }); }, [final]);

  const energyBefore = action.energyBefore;
  const energyAfter = action.energyAfter;
  const stabilityBefore = action.stabilityBefore ?? MAX_INSTABILITY;
  const stabilityAfter = action.stabilityAfter ?? stabilityBefore;
  const skip = () => final ? onComplete() : setIndex(beats.length - 1);
  const performance = scoutPerformance(action.profile);
  return <div className={`lr-scout-curtain has-story is-${beat.kind} is-${art.tone} performance-${performance.id}`} style={{ '--action-accent': art.accent }} role="dialog" aria-modal="true" aria-label={returning ? 'Scout returning' : 'Scouting in progress'} onKeyDown={trapSequenceFocus}>
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
    <SequenceStory events={beats} index={index} paused={paused} onPause={() => setPaused(!paused)} onNext={() => { setPaused(true); setIndex(Math.min(beats.length - 1, index + 1)); }} action={<button ref={buttonRef} type="button" onClick={skip}>{final ? action.encounter ? 'Respond to encounter' : !returning && !action.result.relay ? 'Check scout status' : 'Review scout report' : 'Skip to outcome'} <BiIcon cls="bi bi-arrow-right" /></button>} />
  </div>;
}
