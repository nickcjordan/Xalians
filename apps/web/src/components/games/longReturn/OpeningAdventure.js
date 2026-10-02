import React, { useEffect, useMemo, useRef, useState } from 'react';
import FieldRecord from './FieldRecord';
import FloodedCorridorScene from './FloodedCorridorScene';
import ScoutChoices from './ScoutChoices';
import CreatureActions from './CreatureActions';
import ExpeditionReserves from './ExpeditionReserves';
import { scoutBeats } from './ScoutTransition';
import { buildActionSequence } from './actionSequence';
import { beatDuration } from './beatTiming';
import { expeditionPosition } from './expeditionPosition';
import { playGameSound } from './gameAudio';
import { SIGNAL_AVAILABLE, SIGNAL_READ, discoveryAccount } from './fieldDiscovery';
import { MAX_STRAIN } from './longReturnData';
import './openingAdventure.css';

export default function OpeningAdventure({ scene, phase, crew, scout, scoutOptions, unavailableScouts, scoutId, onScoutSelect, onScout, onStayTogether,
  scan, action, onPlaybackComplete, plans, choices, selectedId, onSelect, onChange, onCommit, stakes, commands, useCommand, onCommand,
  strain, pressure, flags, lastResult, missionCannotContinue, onReturn, onContinue, onAbort, onSignal, workshop,
  soundEnabled, onSound, onHelp, onJournal, onCompare }) {
  const [playback, setPlayback] = useState({ action: null, index: 0, paused: false });
  const [history, setHistory] = useState(() => lastResult ? (lastResult.paragraphs || [lastResult.story]).map((text, i) => ({ kind: 'complete', title: i === 0 ? 'Across the flood' : '', text })) : []);
  const accountRef = useRef(null);
  const latestRef = useRef(null);
  const decisionRef = useRef(null);
  const completeRef = useRef(onPlaybackComplete);
  completeRef.current = onPlaybackComplete;
  const events = useMemo(() => action ? action.type === 'crossing' ? buildActionSequence(action) : scoutBeats(action) : [], [action]);
  const index = playback.action === action ? Math.min(playback.index, events.length - 1) : 0;
  const paused = playback.action === action && playback.paused;
  const current = events[index];
  const finish = () => {
    if (!action) return;
    setHistory(entries => [...entries, ...events]);
    completeRef.current();
  };
  useEffect(() => {
    if (!action || paused) return undefined;
    // This account advances past its final passage, so long entries need their full allowance.
    const timer = window.setTimeout(() => {
      if (index === events.length - 1) finish();
      else setPlayback({ action, index: index + 1, paused: false });
    }, beatDuration(current.kind, current.message || current.text, Infinity));
    return () => window.clearTimeout(timer);
  }, [action, index, paused, events]);
  useEffect(() => { if (current) playGameSound(current.kind, soundEnabled); }, [current, soundEnabled]);
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    latestRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' });
  }, [history.length, action, index]);
  useEffect(() => {
    if (action) return;
    if (document.activeElement === document.body || document.activeElement?.closest('.lr-opening-account footer')) decisionRef.current?.focus({ preventScroll: true });
    // Bring the next decision into the account without moving the scene or controls.
    if (!accountRef.current?.contains(document.activeElement) || document.activeElement === decisionRef.current) {
      decisionRef.current?.scrollIntoView?.({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }, [phase, !!action]);
  const entries = action ? [...history, ...events.slice(0, index + 1)] : history;
  const position = action ? expeditionPosition({ actionType: action.type, beat: current.kind, scan: action.result, scoutNeedsRescue: action.type === 'scout-return' && action.energyBefore === 0 })
    : expeditionPosition({ phase, scout, scan });
  if (!action && scan?.returned && !scan.relay) position.scout = null;
  const routeId = action?.route?.id || selectedId;
  const delivered = action?.type === 'scout' ? action.result.relay && index >= 2 : action?.type === 'scout-return' ? current.kind === 'complete' : true;
  const brineKnown = delivered && !!scan?.revealedIds?.includes('conductive-brine')
    || action?.type === 'crossing' && index >= 1 && !!action.result.unseenHazards.find(h => h.id === 'conductive-brine');
  const settled = !action || action.type !== 'crossing' || current.kind === 'complete';
  const visibleFlags = settled ? flags : flags.filter(flag => !['quiet-entry', 'coolant-bypass', 'gantry-service-line', 'gantry-line-broken'].includes(flag));
  const visibleStrain = { ...strain };
  let visiblePressure = pressure;
  if (action?.type === 'crossing' && index < 2) {
    action.result.crewChanges.forEach(change => { visibleStrain[change.creature.id] = change.before; });
    visiblePressure = action.result.instabilityChange.before;
  }
  const plan = plans.find(p => p.route.id === selectedId);
  const waiting = !action && phase === 'scan-result' && !scan?.returned;
  const ready = !action && phase === 'assign';
  const landed = !action && phase === 'result';
  const selectedScout = scoutOptions.find(option => option.member.id === scoutId)?.member;
  return <div className="lr-opening-adventure" data-opening-adventure>
    <FieldRecord stableLayout alwaysShowResources scene={scene} title={scene.title} label="Flooded corridor adventure" map={<FloodedCorridorScene crew={crew} scout={scout} position={position} routeId={routeId} beat={current?.kind} actor={action?.lead} brineKnown={brineKnown} flags={visibleFlags} find={settled ? lastResult?.find : null} />}
      resources={<ExpeditionReserves compact crew={crew} strain={visibleStrain} pressure={visiblePressure} />}>
      <section className="lr-opening-account" aria-label="Opening adventure">
        <header><strong>{action ? action.type === 'crossing' ? 'The crew makes its crossing' : action.type === 'scout-return' ? 'The scout returns' : 'Scouting ahead' : landed ? 'At the far landing' : waiting ? 'The scout is out of contact' : ready ? 'Make a way through' : 'At the outer seal'}</strong>
          <div className="lr-opening-tools"><button type="button" onClick={onJournal}>Log</button><button type="button" onClick={onHelp}>Rules</button><button type="button" aria-pressed={soundEnabled} onClick={onSound}>Sound</button></div>
        </header>
        <div className="lr-opening-scroll" ref={accountRef}>
          <p className="lr-opening-orientation">Get everyone across the flood. The gantry hangs above the water; the intake runs beneath it.</p>
          <div role="log" aria-label="Adventure account" aria-live="polite" aria-relevant="additions" tabIndex={0}>
            {entries.map((entry, i) => <article key={i} data-story-event={i} ref={i === entries.length - 1 ? latestRef : null}>
              {entry.title && <h3>{entry.title}</h3>}<p>{entry.message || entry.text}</p>
              {entry.costs?.length > 0 && <div className="lr-story-costs">{entry.costs.map((cost, j) => <span key={j}>{cost.text}</span>)}</div>}
            </article>)}
          </div>
          {!action && <div ref={decisionRef} tabIndex={-1} data-opening-decision>
            {phase === 'scout' && <><h3>{scoutOptions.length ? 'Who scouts ahead?' : 'No scout available'}</h3><ScoutChoices storyFirst options={scoutOptions} unavailable={unavailableScouts} selectedId={scoutId} onSelect={onScoutSelect} /><details><summary>Scouting effort</summary><p>Sending a scout costs 1 energy. A physical return costs another energy and 1 stability. A remote report avoids that return trip.</p></details></>}
            {waiting && <p>{strain[scout?.id] >= MAX_STRAIN ? `${scout?.species} is out of energy. Retrieving it costs 1 stability.` : `The crew has no report yet. Waiting for ${scout?.species} to return costs 1 energy and 1 stability.`}</p>}
            {ready && <CreatureActions hideCommit scene={scene} plans={plans} choices={choices} selectedId={selectedId} onSelect={onSelect} onChange={onChange} onCommit={onCommit} stakes={stakes} commands={commands} useCommand={useCommand} onCommand={onCommand} knownHazards={scene.hazards.filter(h => scan.revealedIds.includes(h.id))} />}
            {landed && <>
              {flags.includes(SIGNAL_AVAILABLE) && !missionCannotContinue && <section aria-label="A signal beyond the seal"><h3>A signal beyond the seal</h3>{flags.includes(SIGNAL_READ) ? <p>{discoveryAccount(flags)}</p> : <><p>A service indicator flickers beside the far seal. Waiting for its next cycle costs 1 stability.</p><button type="button" onClick={onSignal}>Wait and read the signal</button>{pressure === 9 && <p role="status">Waiting uses the last stability and forces extraction.</p>}</>}</section>}
              {workshop && React.cloneElement(workshop, { hideAdvance: true })}
              {missionCannotContinue && <p role="alert">The expedition cannot continue. The crew must withdraw.</p>}
            </>}
          </div>}
          {!action && <details className="lr-opening-comparison"><summary>Compare the previous presentation</summary><button type="button" onClick={onCompare}>Compare previous opening</button></details>}
        </div>
        <footer>
          {action ? <><button type="button" aria-pressed={paused} onClick={() => setPlayback({ action, index, paused: !paused })}>{paused ? 'Resume story' : 'Pause story'}</button><button type="button" onClick={finish}>Show outcome now</button></>
            : phase === 'scout' ? <><button type="button" onClick={onStayTogether}>Stay together</button><button type="button" disabled={!selectedScout} onClick={onScout}>{selectedScout ? `Send ${selectedScout.species}` : 'Select a scout'}</button></>
              : waiting ? <button type="button" onClick={onReturn}>Wait for {scout?.species} to return</button>
                : ready ? <button type="button" disabled={!plan} onClick={() => onCommit(plan)}>{plan ? `Go with ${plan.lead.species}` : 'Choose an approach'}</button>
                  : landed ? <><button type="button" onClick={onAbort}>Abort mission</button><button type="button" onClick={onContinue}>{missionCannotContinue ? 'View mission report' : 'Continue mission'}</button></> : null}
        </footer>
      </section>
    </FieldRecord>
  </div>;
}
