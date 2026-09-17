import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExpeditionSchematic from './ExpeditionSchematic';
import FieldRecord from './FieldRecord';
import { expeditionPosition, nativeMapState } from './expeditionPosition';
import { beatDuration } from './beatTiming';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import { buildEncounterResolutionSequence, encounterEventIndex } from './encounterSequence';
import { playGameSound } from './gameAudio';
import BiIcon from './BiIcon';
import FieldReserve from './FieldReserve';
import SequenceStory from './SequenceStory';
const eventSounds = { response: 'commit', energy: 'energy', stability: 'stability', preserve: 'support', companion: 'companion', warning: 'hazard', detour: 'return', clear: 'complete' };

function ReserveMeter({ kind, label, max, before, after, eventAt, index }) {
  return <FieldReserve kind={kind} label={label} max={max} before={before} after={after} active={index >= eventAt} />;
}

export default function EncounterResolutionTransition({ action, onComplete, soundEnabled = true }) {
  const events = useMemo(() => buildEncounterResolutionSequence(action), [action]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const buttonRef = useRef(null);
  const current = events[index];
  const final = index === events.length - 1;
  const energyAt = encounterEventIndex(events, 'energy');
  const stabilityAt = encounterEventIndex(events, 'stability');
  const energyCost = action.option.scoutStrain || action.option.crewStrain || 0;
  const outcome = ['companion', 'warning', 'detour', 'clear'].includes(current.kind);

  useEffect(() => {
    setIndex(0);
    setPaused(false);
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
    if (final || paused) return undefined;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setIndex(events.length - 1); return undefined; }
    const timer = window.setTimeout(() => setIndex((value) => Math.min(events.length - 1, value + 1)), beatDuration(current.kind, current.message));
    return () => window.clearTimeout(timer);
  }, [index, current.kind, events.length, final, paused]);

  useEffect(() => { playGameSound(eventSounds[current.kind] || 'select', soundEnabled); }, [current.kind, soundEnabled]);

  const advance = () => final ? onComplete() : setIndex(events.length - 1);
  return <FieldRecord scene={action.scene} title={action.option.label} label="Encounter response in progress" map={<ExpeditionSchematic scene={action.scene} crew={action.crew} scout={action.scout} helperId={action.option.helperId} companion={action.fieldCompanion?.creature.id !== action.native.id ? action.fieldCompanion : null} allyWithScout={outcome && action.option.companion && action.encounterMode === 'scout'} position={expeditionPosition({ actionType: action.type, encounterMode: action.encounterMode, resolution: outcome ? action.option.resolution : null })} routeId={action.route?.id} native={outcome && !action.option.companion && !nativeMapState(action.option) ? null : action.native} nativeState={outcome ? action.option.companion ? 'ally' : nativeMapState(action.option) : 'contact'} runFlags={action.runFlags} />} resources={<>
      {action.affected && energyCost > 0 && <ReserveMeter kind="energy" label={`${action.affected.species} energy`} max={MAX_STRAIN} before={action.energyBefore} after={action.energyAfter} eventAt={energyAt} index={index} />}
      <ReserveMeter kind="stability" label="Annex stability" max={MAX_INSTABILITY} before={action.stabilityBefore} after={action.stabilityAfter} eventAt={stabilityAt} index={index} />
    </>}>
    <SequenceStory events={events} index={index} paused={paused} onPause={() => setPaused(!paused)} onNext={() => { setPaused(true); setIndex(Math.min(events.length - 1, index + 1)); }} action={<button className="inline-flex min-h-11 items-center justify-center gap-1 px-2 whitespace-normal" ref={buttonRef} type="button" onClick={advance}>{final ? 'See encounter result' : 'Skip to outcome'} <BiIcon cls="bi bi-arrow-right" /></button>} />
  </FieldRecord>;
}
