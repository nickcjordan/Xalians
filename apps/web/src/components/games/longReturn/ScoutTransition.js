import React, { useEffect, useMemo, useRef, useState } from 'react';
import ExpeditionSchematic from './ExpeditionSchematic';
import FieldRecord from './FieldRecord';
import { expeditionPosition } from './expeditionPosition';
import { beatDuration } from './beatTiming';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import { playGameSound } from './gameAudio';
import BiIcon from './BiIcon';
import FieldReserve from './FieldReserve';
import SequenceStory from './SequenceStory';
import { scoutCommunication } from './scoutCommunication';

export function scoutBeats(action) {
  const energy = Math.max(0, action.energyBefore - action.energyAfter);
  const stability = Math.max(0, (action.stabilityBefore ?? 0) - (action.stabilityAfter ?? 0));
  const costs = [energy > 0 && { kind: 'energy', text: `−${energy} energy · ${action.energyAfter} left` }, stability > 0 && { kind: 'stability', text: `−${stability} stability · ${action.stabilityAfter} left` }].filter(Boolean);
  const reported = action.result?.hazards?.filter(hazard => hazard.sensed && (action.result.relay || action.type === 'scout-return')) || [];
  const clues = reported.map(hazard => hazard.detail || `${hazard.label} lies ahead.`).join(' ');
  const routeGuidance = reported.map(hazard => {
    const routes = action.scene?.routes?.filter(route => route.hazardIds.includes(hazard.id)) || [];
    return routes.length ? `That warning matters if the crew chooses to ${routes.map(route => route.title.toLowerCase()).join(' or ')}.` : '';
  }).filter(Boolean).join(' ');
  const warning = `${clues}${routeGuidance ? ` ${routeGuidance}` : ''}`;
  if (action.type === 'scout-return') return [
    { kind: 'return', title: action.energyBefore === 0 ? 'Bring the scout back' : 'Back to the crew', icon: 'bi-arrow-return-left', text: action.energyBefore === 0
      ? `The scout is spent and cannot make the return trip alone. The crew follows ${action.scout.species}'s trail through the passage and brings it back with the report.${stability ? ' While they search and return together, the annex loses another stability.' : ''}`
      : `${action.scout.species} retraces the route to deliver the report in person. ${energy ? 'The return trip consumes another energy.' : ''} ${stability ? 'While the crew waits, the annex deteriorates.' : ''}`, costs },
    { kind: 'complete', title: reported.length ? 'The warning reaches the crew' : 'Now you can plan', icon: 'bi-check-lg', text: warning || 'Together again, the crew compares the scout’s findings. Their findings can guide the next crossing.' }
  ];
  const freshFindings = action.result.hazards?.filter(hazard => hazard.sensed && !action.scene?.knownHazardIds?.includes(hazard.id));
  const found = freshFindings?.length ?? ((action.result.trappedCount || 0) + action.result.revealedIds.length);
  const followingWarning = !found && action.scene?.knownHazardIds?.length > 0;
  return [
    { kind: 'depart', title: 'Scouting begins', icon: 'bi-arrow-right', text: action.scene?.surveyOpening ? `${action.scout.species} ${action.scene.surveyOpening}.` : `${action.scout.species} moves ahead alone, spending energy to search for a way through.`, costs },
    { kind: 'observe', title: followingWarning ? 'Following an earlier warning' : found ? action.result.relay ? 'The scout finds a clue' : 'Something ahead' : 'Searching ahead', icon: 'bi-eye-fill', text: followingWarning ? `${action.scout.species} uses the warning the crew already carries to approach the machinery. The search reveals no additional hazard warning.` : found ? action.result.relay ? clues || `The scout picks out ${found === 1 ? 'a hidden danger' : `${found} hidden dangers`} along the crossing.` : `Something catches ${action.scout.species}'s attention along the crossing. The waiting crew has not heard what it found.` : `Nothing gives ${action.scout.species} a clear warning. The way may still hold danger.` },
    { kind: action.result.relay ? 'signal' : 'silence', title: action.result.relay ? 'The crew receives the report' : 'Out of contact', icon: action.result.relay ? 'bi-broadcast-pin' : 'bi-broadcast', text: action.result.relay ? `${action.scout.species} ${scoutCommunication(action.profile.channel).action}. ${reported.length ? routeGuidance || 'The clue reaches the crew.' : 'There is no specific warning to pass back.'} The crew has the findings without waiting for the scout to return.` : 'The scout cannot send a message from here. Its findings stay out of reach until it returns to the crew.' },
    ...(action.encounter ? [{ kind: 'encounter', title: 'Someone in the passage', icon: 'bi-exclamation-diamond-fill', text: action.scene?.encounter?.firstContact || `${action.encounter.species} comes into view ahead of the scout.` }] : [])
  ];
}

export default function ScoutTransition({ action, onComplete, soundEnabled = true, completeLabel }) {
  const beats = useMemo(() => scoutBeats(action), [action]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const buttonRef = useRef(null);
  const beat = beats[index];
  const final = index === beats.length - 1;
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
  const revealedIds = returning ? final ? action.result?.hazards?.filter(hazard => hazard.sensed).map(hazard => hazard.id) : [] : action.result?.relay && index >= 2 ? action.result.revealedIds : [];
  return <FieldRecord scene={action.scene} title={returning ? action.energyBefore === 0 ? 'Retrieve the scout' : 'The scout returns' : 'Scouting ahead'} label={returning ? action.energyBefore === 0 ? 'Crew retrieving scout' : 'Scout returning' : 'Scouting in progress'} mapFocusLabel={beat.title} animateInitialTravel={!returning} map={<ExpeditionSchematic scene={action.scene} crew={action.crew} scout={action.scout} helperId={action.helperId} companion={action.fieldCompanion} allyWithScout={action.allyWithScout} readingRecord position={expeditionPosition({ actionType: action.type, beat: beat.kind, scan: action.result, encounterMode: action.encounterMode, scoutNeedsRescue: returning && action.energyBefore === 0 })} revealedIds={revealedIds} native={action.encounter && index >= nativeAt ? action.encounter : action.knownNative} nativeState={action.knownNativeState} runFlags={action.runFlags} />} resources={<>
      <FieldReserve kind="energy" label={`${action.scout.species} energy`} max={MAX_STRAIN} before={energyBefore} after={energyAfter} active={index >= energyAt} />
      {returning && <FieldReserve kind="stability" label="Annex stability" max={MAX_INSTABILITY} before={stabilityBefore} after={stabilityAfter} active={index >= stabilityAt} />}
    </>}>
    <SequenceStory events={beats} index={index} paused={paused} onPause={() => setPaused(!paused)} onNext={() => { setPaused(true); setIndex(Math.min(beats.length - 1, index + 1)); }} action={<button className="inline-flex min-h-11 items-center justify-center gap-1 px-2 whitespace-normal" ref={buttonRef} type="button" onClick={skip}>{final ? completeLabel || (action.encounter ? 'Respond to encounter' : !returning && !action.result.relay ? 'Check scout status' : 'Review scout report') : 'Skip to outcome'} <BiIcon cls="bi bi-arrow-right" /></button>} />
  </FieldRecord>;
}
