import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExpeditionSchematic from './ExpeditionSchematic';
import FieldRecord from './FieldRecord';
import { expeditionPosition } from './expeditionPosition';
import { beatDuration } from './beatTiming';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import { buildActionSequence, eventIndexFor } from './actionSequence';
import { playGameSound } from './gameAudio';
import BiIcon from './BiIcon';
import FieldReserve from './FieldReserve';
import SequenceStory from './SequenceStory';

function PipMeter({ kind, label, max, before, after, eventAt, index }) {
  return <FieldReserve kind={kind} label={label} max={max} before={before} after={after} active={index >= eventAt} />;
}

function CreatureStatus({ creature, change, events, index, strain = 0 }) {
  const eventAt = eventIndexFor(events, 'energy', creature.id);
  const before = MAX_STRAIN - (change ? change.before : strain);
  const after = MAX_STRAIN - (change ? change.after : strain);
  return <PipMeter kind="energy" label={`${creature.species} energy`} max={MAX_STRAIN} before={before} after={after} eventAt={eventAt} index={index} />;
}

export default function ActionTransition({ action, onComplete, soundEnabled = true }) {
  const events = useMemo(() => buildActionSequence(action), [action]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const closeButtonRef = useRef(null);
  const current = events[index];
  const final = index === events.length - 1;
  const encounter = action.type === 'encounter';
  const result = action.result;

  useEffect(() => {
    setIndex(0);
    setPaused(false);
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
    if (final || paused) return undefined;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setIndex(events.length - 1); return undefined; }
    const duration = beatDuration(current.kind, current.message);
    const timer = window.setTimeout(() => setIndex((value) => Math.min(events.length - 1, value + 1)), duration);
    return () => window.clearTimeout(timer);
  }, [index, current.kind, events.length, final, paused]);

  useEffect(() => { playGameSound(current.kind, soundEnabled); }, [current.kind, soundEnabled]);

  const stabilityAt = encounter ? -1 : eventIndexFor(events, 'stability');
  const salvageAt = encounter ? -1 : eventIndexFor(events, 'salvage');
  const encounterAt = eventIndexFor(events, 'encounter');
  const crewChanges = result ? result.crewChanges : [];
  const nativeVisible = encounter && index >= encounterAt;
  const skip = () => final ? onComplete() : setIndex(events.length - 1);
  return <FieldRecord scene={action.scene} title={encounter ? 'Something moves ahead' : action.route.title} label={encounter ? 'Encounter discovered' : 'Crossing in progress'} map={<ExpeditionSchematic scene={action.scene} crew={action.crew} companion={action.fieldCompanion || action.companion} routeId={action.route?.id} revealedIds={action.revealedIds} readingRecord position={expeditionPosition({ actionType: action.type, beat: current.kind })} native={nativeVisible ? action.encounter : action.knownNative} nativeState={action.knownNativeState} runFlags={final ? action.runFlags : action.runFlags?.filter(flag => flag !== action.route?.consequence?.id)} />} resources={!encounter && <>
    <PipMeter kind="stability" label="Annex stability" max={MAX_INSTABILITY} before={MAX_INSTABILITY - result.instabilityChange.before} after={MAX_INSTABILITY - result.instabilityChange.after} eventAt={stabilityAt} index={index} />
    <div className="basis-full text-body">Salvage carried: <strong>{index < salvageAt ? result.salvageAfter - result.salvage : result.salvageAfter}</strong></div>
    {action.crew?.map(creature => <CreatureStatus key={creature.id} creature={creature} change={crewChanges.find(change => change.creature.id === creature.id)} events={events} index={index} strain={action.crewStrain?.[creature.id]} />)}
  </>}>
    <SequenceStory events={events} index={index} paused={paused} onPause={() => setPaused(!paused)} onNext={() => { setPaused(true); setIndex(Math.min(events.length - 1, index + 1)); }} action={<button className="inline-flex min-h-11 items-center justify-center gap-1 px-2 whitespace-normal" ref={closeButtonRef} type="button" onClick={skip}>{final ? encounter ? 'Choose response' : 'Continue to result' : 'Skip to outcome'} <BiIcon cls="bi bi-arrow-right" /></button>} />
  </FieldRecord>;
}
