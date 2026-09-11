import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowRightCircle, Binoculars, Building2, Check, ChevronRight,
  Circle, CircleCheck, CircleCheckBig, CircleDot, CircleHelp, ClipboardCheck, Cloud, Compass, CornerDownRight,
  EyeOff, Eye, HeartPulse, Info, Lock, MessageCircleHeart, MessageCircleQuestion, MessageSquareQuote, Network,
  OctagonAlert, Package, PackageCheck, PersonStanding, Plus, Radio, RadioTower, Shield, ShieldAlert, ShieldCheck,
  SignalZero, Signpost, SignpostBig, SlidersHorizontal, Sparkles, Thermometer, ThermometerSnowflake, TriangleAlert,
  Undo2, UserCheck, UserPlus, Users, Wrench, X, Zap,
} from 'lucide-react';
import XalianImage from '../../xalianImage';
import * as svgUtil from '../../../utils/svgUtil';
import { ATTRIBUTE_LABELS, CAPABILITY_LABELS, CREATURES, MAX_INSTABILITY, MAX_PRESSURE, MAX_STRAIN, MISSION } from './longReturnData';
import { applyMissionMemory, assignmentStatus, decisionForecast, encounterOptions, encounterOutlook, highestCapabilities, instabilityState, methodOptions, reactionMatches, readinessState, resolveScene, scanReport, scanScene, scoutProfile, temperamentPhrase } from './longReturnEngine';
import './longReturn.css';
import './fieldWorkshop.css';
import FieldWorkshop, { MissionJournal } from './FieldWorkshop';
import { performFieldOperation } from './fieldOperations';
import { readCheckpoint, writeCheckpoint, clearCheckpoint } from './expeditionSave';
import { crossingNarrative } from './crossingNarrative';
import RouteTradeoff from './RouteTradeoff';
import './routeTradeoff.css';
import ActionTransition from './ActionTransition';
import EncounterResolutionTransition from './EncounterResolutionTransition';
import ScoutTransition from './ScoutTransition';
import SceneStage from './SceneStage';
import RouteMap from './RouteMap';
import { BRIEFING_ART, sceneArtFor } from './sceneArt';
import { playGameSound, readSoundEnabled, writeSoundEnabled } from './gameAudio';
import { encounterChoicePresentation } from './encounterPresentation';
import SharedBiIcon from './BiIcon';

// Bootstrap Icons retired in the stack migration (docs/design/frontend-stack-migration.md);
// this maps the old `bi-*` glyph names this file used onto their lucide-react equivalents so
// every call site that built a `bi-*` class string (many of them dynamically, per-branch) can
// keep doing exactly that and hand it to <BiIcon cls={...} /> instead of <BiIcon cls={...} />.
const BI_ICON_MAP = {
  'bi-arrow-down-right-circle': ArrowDownRight,
  'bi-arrow-left-right': ArrowLeftRight,
  'bi-arrow-return-left': Undo2,
  'bi-arrow-right': ArrowRight,
  'bi-arrow-right-circle-fill': ArrowRightCircle,
  'bi-binoculars': Binoculars,
  'bi-binoculars-fill': Binoculars,
  'bi-box-seam': Package,
  'bi-box-seam-fill': PackageCheck,
  'bi-broadcast': Radio,
  'bi-broadcast-pin': RadioTower,
  'bi-buildings': Building2,
  'bi-buildings-fill': Building2,
  'bi-chat-heart-fill': MessageCircleHeart,
  'bi-chat-quote': MessageSquareQuote,
  'bi-check-circle': CircleCheck,
  'bi-check-circle-fill': CircleCheckBig,
  'bi-check-lg': Check,
  'bi-check2-circle': CircleCheck,
  'bi-chevron-right': ChevronRight,
  'bi-circle': Circle,
  'bi-clipboard-check': ClipboardCheck,
  'bi-cloud': Cloud,
  'bi-compass': Compass,
  'bi-compass-fill': Compass,
  'bi-diagram-3-fill': Network,
  'bi-exclamation-diamond': OctagonAlert,
  'bi-exclamation-octagon': OctagonAlert,
  'bi-exclamation-triangle': TriangleAlert,
  'bi-exclamation-triangle-fill': TriangleAlert,
  'bi-eye': Eye,
  'bi-eye-fill': Eye,
  'bi-eye-slash': EyeOff,
  'bi-eye-slash-fill': EyeOff,
  'bi-heart-pulse': HeartPulse,
  'bi-info-circle': Info,
  'bi-lightning': Zap,
  'bi-lightning-charge': Zap,
  'bi-lightning-charge-fill': Zap,
  'bi-lock-fill': Lock,
  'bi-people': Users,
  'bi-people-fill': Users,
  'bi-person-check-fill': UserCheck,
  'bi-person-plus-fill': UserPlus,
  'bi-person-walking': PersonStanding,
  'bi-plus': Plus,
  'bi-plus-lg': Plus,
  'bi-question-circle': CircleHelp,
  'bi-question-diamond': MessageCircleQuestion,
  'bi-reception-1': SignalZero,
  'bi-record-circle-fill': CircleDot,
  'bi-shield-check': ShieldCheck,
  'bi-shield-exclamation': ShieldAlert,
  'bi-shield-fill': Shield,
  'bi-sign-turn-right-fill': CornerDownRight,
  'bi-signpost-2-fill': SignpostBig,
  'bi-signpost-split': Signpost,
  'bi-sliders': SlidersHorizontal,
  'bi-stars': Sparkles,
  'bi-thermometer-half': Thermometer,
  'bi-thermometer-snow': ThermometerSnowflake,
  'bi-tools': Wrench,
  'bi-x-lg': X,
};

// Drop-in for the old `<BiIcon cls={`bi ${...}`} />` (or the static `<BiIcon cls="bi bi-x" />`)
// pattern: `cls` is that same string (icon token plus any modifier classes, e.g. 'bi-eye-fill
// is-filled'), so every call site could keep its existing icon-selection logic unchanged.
function BiIcon({ cls, className, ...rest }) {
  return <SharedBiIcon cls={cls} className={className} {...rest} />;
}

const initialCrew = ['graviclaw-213', 'chromocat-088', 'hippochamp-041'];

const GUIDANCE_LEVELS = [
  { id: 'simple', label: 'Simple', badge: 'Recommended', description: 'Shows only the current choice, our recommendation, and its likely cost.' },
  { id: 'guided', label: 'Guided', description: 'Explains the math, ranks known options, and recommends the safest available decision.' },
  { id: 'standard', label: 'Standard', description: 'Explains scores and expected outcomes, but leaves comparisons and choices to you.' },
  { id: 'expert', label: 'Expert', description: 'Shows raw operational data with minimal interpretation or recommendations.' }
];

const cap = (value) => Math.max(0, Math.min(MAX_STRAIN, value));
const labelCase = (value = '') => value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';

const missionOutcomePresentation = (status, objectiveReached, salvage) => {
  if (status === 'complete') return { tone: 'triumph', icon: 'bi-stars', label: 'Deep retrieval', title: 'Deep Retrieval Complete', copy: `The crew returns with the Nemesis Index and ${salvage} salvage from the annex's deepest machinery. They did not merely survive the archive—they exhausted its last opportunity.` };
  if (status === 'extracted') return { tone: 'secure', icon: 'bi-shield-check', label: 'Voluntary extraction', title: 'Crew Extracted', copy: `The commander calls the return while the route is still theirs. The Nemesis Index and ${salvage} salvage leave intact; the unopened depths remain a story for another expedition.` };
  if (status === 'aborted') return { tone: 'withdrawn', icon: 'bi-arrow-return-left', label: 'Voluntary withdrawal', title: 'Mission Aborted', copy: 'The crew turns back before the annex can trap them. Every creature returns, but the Nemesis Index remains below the ice and no salvage is banked.' };
  if (objectiveReached) return { tone: 'scarred', icon: 'bi-exclamation-octagon', label: 'Emergency extraction · Index retained', title: 'Forced Extraction', copy: `The annex takes control of the ending. Emergency systems pull the crew out with the Nemesis Index, but only half of the carried salvage survives the retreat.` };
  return { tone: 'failed', icon: 'bi-exclamation-octagon', label: 'Emergency extraction · Objective lost', title: 'Forced Extraction', copy: 'The annex becomes untenable before the Index is secured. Emergency extraction saves the remaining crew; the objective and carried salvage stay behind.' };
};

const creatureReaction = (creature, quality, route) => {
  if (quality === 'clean') {
    if (creature.temperament.sociability >= 70) return `${creature.species} checks every crew member before looking ahead.`;
    if (creature.temperament.energy >= 75) return `${creature.species} is already testing the next threshold.`;
    return `${creature.species} pauses at the far side and studies what changed.`;
  }
  if (creature.temperament.boldness >= 70) return `${creature.species} shakes off the crossing and refuses to yield the lead.`;
  if (creature.traits.includes('protective')) return `${creature.species} stays between the damaged route and the rest of the crew.`;
  return `${creature.species} keeps close to support after the effort of ${route.title.toLowerCase()}.`;
};

function Meter({ value, max, label, danger, depleted = false }) {
  const shownValue = depleted ? Math.max(0, max - value) : value;
  const percent = Math.min(100, Math.round((shownValue / max) * 100));
  return (
    <div className={`lr-meter${danger ? ' lr-meter--danger' : ''}`}>
      <div className="lr-meter-label"><span>{label}</span><strong>{shownValue} / {max}</strong></div>
      <div className="lr-meter-track"><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function GuidanceSelector({ value, onChange, compact = false }) {
  return (
    <div className={`lr-guidance-selector${compact ? ' lr-guidance-selector--compact' : ''}`}>
      {GUIDANCE_LEVELS.map((level) => (
        <button key={level.id} type="button" className={value === level.id ? 'is-selected' : ''} onClick={() => onChange(level.id)} aria-pressed={value === level.id}>
          <span>{level.label}{level.badge && <em>{level.badge}</em>}</span>
          {!compact && <small>{level.description}</small>}
        </button>
      ))}
    </div>
  );
}

function ThresholdTrack({ value, max, danger = false, label, kind = 'annex' }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <span className={`lr-threshold-track is-${kind}${danger ? ' is-danger' : ''}`} aria-label={`${label}: ${value} of ${max}`}>
      <i style={{ width: `${percent}%` }} />
      <b className="at-warning" aria-hidden="true" />
      <b className="at-danger" aria-hidden="true" />
      <b className="at-critical" aria-hidden="true" />
    </span>
  );
}

function ProjectionTrack({ value, added, max, label, kind }) {
  const current = Math.max(0, max - value);
  const after = Math.max(0, current - added);
  return (
    <span className={`lr-projection-track is-${kind}`} aria-label={`${label}: currently ${current} of ${max}, projected to ${after} of ${max}`}>
      {Array.from({ length: max }, (_, index) => {
        const filled = index < after;
        const projected = index >= after && index < current;
        const restored = added < 0 && index >= current && index < after;
        return <i key={index} className={restored ? 'is-current is-restored' : filled ? 'is-current' : projected ? 'is-projected' : ''} aria-hidden="true" />;
      })}
    </span>
  );
}

function SignalGauge({ value, label }) {
  const filled = Math.max(1, Math.min(5, Math.ceil(value / 20)));
  return (
    <span className="lr-signal-gauge" aria-label={`${label}: ${filled} of 5`}>
      {Array.from({ length: 5 }, (_, index) => <BiIcon key={index} cls={index < filled ? 'bi-eye-fill is-filled' : 'bi-eye'} aria-hidden="true" />)}
    </span>
  );
}

function SalvageGauge({ value, label = 'Salvage recovered' }) {
  const filled = Math.max(0, Math.min(10, value));
  return (
    <span className="lr-salvage-gauge" aria-label={`${label}: ${value}`}>
      {Array.from({ length: 10 }, (_, index) => <BiIcon key={index} cls={`bi ${index < filled ? 'bi-box-seam is-filled' : 'bi-box-seam'}`} aria-hidden="true" />)}
    </span>
  );
}

const scoutRoleIcon = (role) => role === 'Quiet scout' ? 'bi-eye-slash-fill' : role === 'Defensive scout' ? 'bi-shield-fill' : 'bi-chat-dots-fill';

function CurrentAction({ stage, title, hint, icon, resolved = false, onHelp }) {
  return (
    <section className={`lr-current-action${resolved ? ' is-resolved' : ''}`} aria-live="polite" tabIndex="-1" data-wizard-focus>
      <BiIcon cls={`bi ${icon}`} />
      <div><span>{stage}</span><strong>{title}</strong><small>{hint}</small></div>
      <button type="button" onClick={onHelp}><BiIcon cls="bi-info-circle" /> Game rules</button>
    </section>
  );
}

const signed = (value) => `${value >= 0 ? '+' : ''}${value}`;
const scorePosition = (value) => `${Math.max(0, Math.min(100, (value / 110) * 100))}%`;

function ForecastBar({ forecast }) {
  return (
    <div className="lr-forecast-bar-wrap" aria-label={`Team score ${forecast.teamScore}; route target ${forecast.difficulty}; margin ${signed(forecast.margin)}`}>
      <div className={`lr-forecast-bar is-${forecast.quality}`} aria-hidden="true">
        <span style={{ width: scorePosition(forecast.teamScore) }} />
        <i style={{ left: scorePosition(forecast.difficulty) }} />
      </div>
      <div className="lr-forecast-bar-labels"><span>Team {forecast.teamScore}</span><span>Target {forecast.difficulty}</span></div>
    </div>
  );
}

function CrossingEquation({ leadScore, supportBonus, teamScore, target, margin, compact = false }) {
  const resolved = Number.isFinite(teamScore) && Number.isFinite(margin);
  return (
    <div className={`lr-crossing-equation${compact ? ' lr-crossing-equation--compact' : ''}`} aria-label={resolved ? `Lead method ${leadScore} plus support ${supportBonus} equals team score ${teamScore}, against route target ${target}, margin ${signed(margin)}` : `Build a team score that meets or beats route target ${target}`}>
      <div><small>Lead method</small><strong>{Number.isFinite(leadScore) ? leadScore : '?'}</strong></div>
      <i>+</i>
      <div><small>Support</small><strong>{Number.isFinite(supportBonus) ? supportBonus : '?'}</strong></div>
      <i>=</i>
      <div className="is-team"><small>Team score</small><strong>{Number.isFinite(teamScore) ? teamScore : '?'}</strong></div>
      <i>vs</i>
      <div className="is-target"><small>Route target</small><strong>{target}</strong></div>
      <div className={`lr-crossing-result${resolved && margin < 0 ? ' is-behind' : ''}`}>
        {resolved ? <><small>Margin</small><strong>{signed(margin)}</strong><span>{margin >= 0 ? 'Target met' : 'Below target'}</span></> : <><small>Your objective</small><strong>Team ≥ {target}</strong><span>Build the score</span></>}
      </div>
    </div>
  );
}

function CrossingPrimer({ detailed = false }) {
  return (
    <section className={`lr-crossing-primer${detailed ? ' lr-crossing-primer--detailed' : ''}`}>
      <div className="lr-primer-head">
        <div><p className="g-kicker">The one crossing rule</p><h2>Make your crew score at least as high as the route target</h2></div>
        <span>Higher above target = less energy spent</span>
      </div>
      <p className="lr-primer-takeaway">Choose one lead method, then add one support creature. Together, they need to meet or beat the number printed on the route.</p>
      <div className="lr-primer-example" aria-label="Example: Chromocat's Leap score of 86 plus Ectoghoul's support of 7 makes a crew score of 93. That beats the route target of 63 by 30, producing a clean crossing.">
        <div className="lr-primer-build">
          <div><small>Lead method</small><span>Chromocat · Leap</span><strong>86</strong></div>
          <i>+</i>
          <div><small>Support creature</small><span>Ectoghoul</span><strong>7</strong></div>
          <i>=</i>
          <div className="is-crew"><small>Your crew score</small><span>Combined</span><strong>93</strong></div>
        </div>
        <div className="lr-primer-compare">
          <div><small>Your crew</small><strong>93</strong></div>
          <BiIcon cls="bi-chevron-right" />
          <div><small>Route target</small><strong>63</strong></div>
          <BiIcon cls="bi-arrow-right" />
          <div className="is-result"><small>30 points over</small><strong><BiIcon cls="bi-check-circle-fill" /> Clean crossing</strong><span>No base energy cost</span></div>
        </div>
      </div>
      {detailed ? <>
        <div className="lr-margin-scale" aria-label="Margin outcomes: plus 14 or more is clean; zero to plus 13 is narrow; minus 1 to minus 14 is rough; minus 15 or less is severe">
          <span className="is-clean"><b>+14↑</b><small>Clean · energy 0</small></span>
          <span className="is-costly"><b>0…+13</b><small>Narrow · energy −1</small></span>
          <span className="is-rough"><b>−1…−14</b><small>Rough · energy −2</small></span>
          <span className="is-critical"><b>−15↓</b><small>Severe · energy −3</small></span>
        </div>
        <div className="lr-primer-modifiers"><span>After the score check</span><b><BiIcon cls="bi-thermometer-half" /> Environment</b><b><BiIcon cls="bi-compass" /> Temperament</b><b><BiIcon cls="bi-question-diamond" /> Hidden hazards</b></div>
      </> : <div className="lr-primer-next"><strong>First: beat the target.</strong><span>Then review the visible energy, annex stability, and risk warnings before committing.</span></div>}
    </section>
  );
}

function SimplePrimer() {
  return (
    <section className="lr-simple-primer">
      <BiIcon cls="bi-signpost-2-fill" />
      <div><p className="g-kicker">Simple command view</p><h2>Make one choice at a time</h2><p>We will mark our recommendation and show its likely cost before you commit. Open details only when you want them.</p></div>
      <div className="lr-simple-primer-steps"><span><b>1</b> Scout</span><BiIcon cls="bi-arrow-right" /><span><b>2</b> Choose route</span><BiIcon cls="bi-arrow-right" /><span><b>3</b> Approve plan</span></div>
    </section>
  );
}

function conditionChange(current, added) {
  const before = readinessState(current);
  const afterValue = cap(current + added);
  const after = readinessState(afterValue);
  return { before, after, afterValue, changed: before.id !== after.id };
}

function instabilityChange(current, added) {
  const before = instabilityState(current);
  const afterValue = Math.min(MAX_INSTABILITY, current + added);
  const after = instabilityState(afterValue);
  return { before, after, afterValue, changed: before.id !== after.id };
}

function SimpleRunStatus({ crew, strain, pressure, objectiveReached, companion, motionCue }) {
  const annex = instabilityState(pressure);
  const stabilityLoss = motionCue ? motionCue.stability || 0 : 0;
  return (
    <section className="lr-simple-status" aria-label="Expedition status">
      <div className="lr-simple-status-crew">
        <span>CREW READINESS</span>
        <div>{crew.map((member) => {
          const value = strain[member.id] || 0;
          const state = readinessState(value);
          const recentLoss = motionCue && motionCue.energy ? motionCue.energy[member.id] || 0 : 0;
          return <span className={`is-${state.id}${recentLoss ? ' is-changing' : ''}`} key={member.id} title={state.detail}><b>{member.species}</b><em>{state.label} · {MAX_STRAIN - value}/{MAX_STRAIN} energy</em><ProjectionTrack value={Math.max(0, value - recentLoss)} added={recentLoss} max={MAX_STRAIN} label={`${member.species} energy`} kind="strain" />{recentLoss > 0 && <small className="lr-status-delta">−{recentLoss} energy</small>}</span>;
        })}</div>
      </div>
      <div className={`lr-simple-status-clock is-${annex.id}${stabilityLoss ? ' is-changing' : ''}`}>
        <span>ANNEX STABILITY</span><strong>{annex.label} · {MAX_INSTABILITY - pressure}/{MAX_INSTABILITY}</strong><ProjectionTrack value={Math.max(0, pressure - stabilityLoss)} added={stabilityLoss} max={MAX_INSTABILITY} label="Annex stability" kind="annex" /><small>{pressure >= MAX_INSTABILITY ? 'Forced extraction' : `${MAX_INSTABILITY - pressure} stability remaining`}</small>{stabilityLoss > 0 && <small className="lr-status-delta">−{stabilityLoss} stability</small>}
      </div>
      <div className={`lr-simple-status-objective${objectiveReached ? ' is-secured' : ''}`}>
        <span>MISSION</span><strong>{objectiveReached ? 'Index secured' : 'Index not secured'}</strong><small>{objectiveReached ? 'Extraction preserves the objective.' : 'Forced extraction now means failure.'}</small>
      </div>
      {companion && <div className="lr-simple-status-companion"><span>FIELD COMPANION</span><strong>{companion.creature.species}</strong><small>{companion.ready ? companion.benefit : 'Intervention used · remains with the crew'}</small></div>}
    </section>
  );
}

const WIZARD_STEPS = [
  { label: 'Scout', icon: 'bi-binoculars' },
  { label: 'Report', icon: 'bi-broadcast-pin' },
  { label: 'Route', icon: 'bi-signpost-split' },
  { label: 'Plan', icon: 'bi-people' },
  { label: 'Act', icon: 'bi-play-fill' },
  { label: 'Result', icon: 'bi-clipboard-check' }
];

function wizardIndexFor(phase, routeId) {
  if (phase === 'transition') return -1;
  if (phase === 'scout' || phase === 'encounter') return 0;
  if (phase === 'scan-result') return 1;
  if (phase === 'assign') return routeId ? 3 : 2;
  if (phase === 'result') return 5;
  return 0;
}

function SimpleWizardChrome({ scene, sceneIndex, crew, strain, pressure, salvage, phase, routeId, soundEnabled, journalCount, journalButtonRef, onToggleSound, onJournal, onHelp }) {
  const active = wizardIndexFor(phase, routeId);
  const art = sceneArtFor(scene);
  return <header className="lr-wizard-chrome" style={{ '--wizard-art': `url(${art.src})`, '--wizard-accent': art.accent }}>
    <div className="lr-wizard-topline">
      <div><small>Scene {sceneIndex + 1} of {MISSION.scenes.length} · {scene.deck}</small><h1>{scene.title}</h1></div>
      <div className="lr-wizard-tools">
        <span className="is-salvage" title="Salvage carried"><BiIcon cls="bi bi-box-seam" /><b>{salvage}</b></span>
        <button type="button" ref={journalButtonRef} onClick={onJournal} title="Review choices and lasting changes" aria-label={`Expedition log, ${journalCount} ${journalCount === 1 ? 'crossing' : 'crossings'} recorded`}><BiIcon cls="bi bi-journal-text" /><span>Log{journalCount ? ` · ${journalCount}` : ''}</span></button>
        <button type="button" aria-pressed={soundEnabled} title={soundEnabled ? 'Mute expedition sounds' : 'Enable expedition sounds'} onClick={onToggleSound}><BiIcon cls={`bi ${soundEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`} /><span>Sound</span></button>
        <button type="button" onClick={onHelp}><BiIcon cls="bi bi-question-circle" /><span>Rules</span></button>
      </div>
    </div>
    <div className="lr-wizard-objective"><BiIcon cls="bi bi-crosshair" /><span><small>Current objective</small><strong>{scene.goal}</strong></span></div>
    <div className="lr-wizard-resources" aria-label="Expedition resources">
      <span className="is-stability"><BiIcon cls="bi bi-building" /><b>{MAX_INSTABILITY - pressure}</b><small>Stability</small></span>
      {crew.map((member) => <span key={member.id} title={`${member.species}: ${MAX_STRAIN - (strain[member.id] || 0)} energy`}><BiIcon cls="bi bi-lightning-charge-fill" /><b>{MAX_STRAIN - (strain[member.id] || 0)}</b><small>{member.species}</small></span>)}
    </div>
    <ol className="lr-wizard-progress" aria-label="Expedition decision steps">
      {WIZARD_STEPS.map((step, index) => <li key={step.label} className={`${index === active ? 'is-current' : ''}${index < active ? ' is-complete' : ''}`} aria-current={index === active ? 'step' : undefined}><BiIcon cls={`bi ${index < active ? 'bi-check-lg' : step.icon}`} /><span>{step.label}</span></li>)}
    </ol>
  </header>;
}

function safestPlanForRoute(route, crew, strain, spentAbilities, scan) {
  const standing = crew.filter((member) => (strain[member.id] || 0) < MAX_STRAIN);
  const plans = [];
  standing.forEach((lead) => {
    standing.filter((member) => member.id !== lead.id).forEach((support) => {
      methodOptions(lead, route, spentAbilities).forEach((method) => {
        const forecast = decisionForecast({ route, lead, support, method, scan, leadLoad: strain[lead.id] || 0, supportLoad: strain[support.id] || 0 });
        const knownLeadStrain = Math.max(0, forecast.baseLeadStrain + forecast.environment.strain - (forecast.naturalReaction ? 1 : 0));
        const knownPressure = route.pressure + (forecast.naturalReaction ? 0 : 1);
        const risk = knownLeadStrain * 18 + forecast.baseSupportStrain * 12 + knownPressure * 8 + forecast.unresolvedHazards.length * 14 - Math.min(30, forecast.margin) * .15;
        plans.push({ ...forecast, route, lead, support, method, knownLeadStrain, knownPressure, risk });
      });
    });
  });
  return plans.sort((a, b) => a.risk - b.risk || b.margin - a.margin)[0] || null;
}

export function routeAdvantage(plan, plans) {
  const uncertainty = (entry) => entry.unresolvedHazards.length + (entry.nativeRisk ? 1 : 0);
  const currentUncertainty = uncertainty(plan);
  const uncertaintyCounts = plans.map(uncertainty);
  const leastUncertainty = Math.min(...uncertaintyCounts);
  const mostUncertainty = Math.max(...uncertaintyCounts);
  if (currentUncertainty === leastUncertainty && leastUncertainty < mostUncertainty) return 'Predictable route';
  if (currentUncertainty === mostUncertainty && leastUncertainty < mostUncertainty) return plan.nativeRisk ? 'Risk native contact' : 'Gamble for a larger haul';
  if (plan.route.activeEffects && plan.route.activeEffects.length) return plan.route.activeEffects[0].label;
  const crewCost = plan.knownLeadStrain + plan.baseSupportStrain;
  const lowestCrew = Math.min(...plans.map((entry) => entry.knownLeadStrain + entry.baseSupportStrain));
  const lowestInstability = Math.min(...plans.map((entry) => entry.knownPressure));
  const highestSalvage = Math.max(...plans.map((entry) => entry.route.salvage));
  const uniquelyLowestInstability = plan.knownPressure === lowestInstability && plans.filter((entry) => entry.knownPressure === lowestInstability).length === 1;
  const uniquelyHighestSalvage = plan.route.salvage === highestSalvage && plans.filter((entry) => entry.route.salvage === highestSalvage).length === 1;
  if (crewCost === lowestCrew && plans.filter((entry) => entry.knownLeadStrain + entry.baseSupportStrain === lowestCrew).length === 1) return 'Easier on the crew';
  if (uniquelyLowestInstability && uniquelyHighestSalvage) return 'Protects annex · more salvage';
  if (uniquelyLowestInstability) return 'Protects annex stability';
  if (uniquelyHighestSalvage) return 'More salvage';
  return plan.unresolvedHazards.length || plan.nativeRisk ? 'Uncertain route' : 'Balanced approach';
}

export function recommendationFor(plans) {
  if (plans.length < 2) return plans[0] ? { plan: plans[0], reason: 'This is the only viable route.' } : null;
  const ranked = [...plans].sort((a, b) => a.risk - b.risk);
  const [best, second] = ranked;
  const bestUncertainty = best.unresolvedHazards.length + (best.nativeRisk ? 1 : 0);
  const secondUncertainty = second.unresolvedHazards.length + (second.nativeRisk ? 1 : 0);
  const bestCrewCost = best.knownLeadStrain + best.baseSupportStrain;
  const secondCrewCost = second.knownLeadStrain + second.baseSupportStrain;
  // A recommendation means there is no meaningful sacrifice hidden behind the badge.
  // If the safer route asks for more of any visible resource or gives up salvage,
  // leave the decision to the player and let the route labels carry the trade-off.
  const clearlyDominates = bestCrewCost <= secondCrewCost
    && best.knownPressure <= second.knownPressure
    && bestUncertainty <= secondUncertainty
    && best.route.salvage >= second.route.salvage
    && (bestCrewCost < secondCrewCost
      || best.knownPressure < second.knownPressure
      || bestUncertainty < secondUncertainty
      || best.route.salvage > second.route.salvage);
  if (!clearlyDominates || best.margin < 0) return null;
  const crewDifference = secondCrewCost - bestCrewCost;
  const instabilityDifference = second.knownPressure - best.knownPressure;
  const salvageDifference = best.route.salvage - second.route.salvage;
  const reasons = [];
  if (crewDifference > 0) reasons.push(`${crewDifference} less projected energy use`);
  if (instabilityDifference > 0) reasons.push(`${instabilityDifference} less stability loss`);
  if (salvageDifference > 0) reasons.push(`${salvageDifference} more salvage`);
  if (best.unresolvedHazards.length < second.unresolvedHazards.length) reasons.push('fewer unresolved hazards');
  if (best.nativeRisk !== second.nativeRisk && !best.nativeRisk) reasons.push('avoids likely native contact');
  return { plan: best, reason: reasons.length ? reasons.join(' and ') : 'a substantially safer known crossing' };
}

function trapDialogTab(event) {
  if (event.key !== 'Tab') return;
  const focusable = Array.from(event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), summary, [tabindex]:not([tabindex="-1"])'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function supportRoleForPlan(plan) {
  if (plan.baseSupportStrain > 0) return `Intervenes · spends ${plan.baseSupportStrain} energy`;
  const alone = plan.rawMethodScore - plan.difficulty;
  if (alone < 0 && plan.margin >= 0) return 'Turns a failed attempt into a passage';
  if (alone < 14 && plan.margin >= 14) return 'Prevents the lead from losing 1 energy';
  return 'Backup role · no energy projected';
}

export function encounterNarrative({ archetype, option, nativeName, actorName, scoutName }) {
  const actor = actorName || 'The crew';
  if (option.companion) return `${nativeName} accepts the crew's help and follows at a cautious distance. It may intervene once during a later crossing.`;
  if (option.resolution === 'detour') return 'The crew backs away before the encounter escalates and returns to the route junction.';
  if (option.resolution === 'unresolved') return `${scoutName || actor} breaks contact and returns with a warning. The native still occupies the route.`;
  if (archetype === 'territorial') {
    if (option.id === 'distract' || option.id === 'challenge') return `${actor} draws ${nativeName} away from the passage. The crew slips through while it defends the decoy territory.`;
    return `${actor} establishes a boundary the ${nativeName} accepts. It withdraws into the hull and leaves the passage open.`;
  }
  if (archetype === 'trapped') {
    if (option.id === 'pin-rig' || option.id === 'force-arms') return `${actor} wrenches the authentication arms apart. ${nativeName} escapes as the damaged rig records the intrusion.`;
    return `${actor} stills the authentication arms. ${nativeName} escapes into a side duct and its panicked signal fades from the lock.`;
  }
  return `${actor} forces enough space to continue. The native retreats deeper into the machinery.`;
}

function MechanicsModal({ open, onClose }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="lr-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="lr-detail-modal lr-mechanics-modal" role="dialog" aria-modal="true" aria-labelledby="lr-mechanics-title" onKeyDown={trapDialogTab}>
        <button type="button" className="lr-modal-close" onClick={onClose} aria-label="Close crossing rules" autoFocus><BiIcon cls="bi bi-x-lg" /></button>
        <p className="g-kicker">How to play</p>
        <h2 id="lr-mechanics-title">How every crossing works</h2>
        <CrossingPrimer detailed />
        <div className="lr-mechanics-survival">
          <div><BiIcon cls="bi bi-heart-fill" /><span><strong>Readiness states</strong>At 3 energy a creature is Worn and contributes less; at 1 it is Critical and cannot scout; at 0 it is Spent and cannot act.</span></div>
          <div><BiIcon cls="bi bi-building" /><span><strong>Annex stability</strong>This is the mission’s external safety reserve. Failing structure and waking systems drain it. At 0, the crew must extract.</span></div>
          <div><BiIcon cls="bi bi-lightning-charge-fill" /><span><strong>Creature energy</strong>Actions consume energy. At 0, a creature is spent and cannot act. The run ends if fewer than two crew members can continue.</span></div>
          <div><BiIcon cls="bi bi-box-seam" /><span><strong>Salvage</strong>Keep it for extraction, or spend it between crossings: restore energy, brace stability, or rebuild a used command override. One field action per crossing. Spent creatures cannot be revived.</span></div>
        </div>
        <button type="button" className="g-btn g-btn--primary" onClick={onClose}>Return to mission</button>
      </section>
    </div>
  );
}

function MissionMemoryModal({ open, onClose, entries, runFlags, companion, salvage, pressure, objectiveReached }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;
  const consequences = MISSION.scenes.flatMap((missionScene) => missionScene.routes)
    .map((missionRoute) => missionRoute.consequence)
    .filter((consequence) => consequence && runFlags.includes(consequence.id));
  return (
    <div className="lr-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="lr-detail-modal lr-memory-modal" role="dialog" aria-modal="true" aria-labelledby="lr-memory-title" onKeyDown={trapDialogTab}>
        <button type="button" className="lr-modal-close" onClick={onClose} aria-label="Close expedition log" autoFocus><BiIcon cls="bi bi-x-lg" /></button>
        <p className="g-kicker">Mission memory</p>
        <h2 id="lr-memory-title">Your expedition so far</h2>
        <div className="lr-memory-summary" aria-label={`${entries.length} crossings, ${salvage} salvage, ${MAX_INSTABILITY - pressure} stability remaining`}>
          <span><BiIcon cls="bi bi-signpost-2-fill" /><b>{entries.length}</b><small>Crossings</small></span>
          <span><BiIcon cls="bi bi-box-seam" /><b>{salvage}</b><small>Salvage</small></span>
          <span><BiIcon cls="bi bi-building" /><b>{MAX_INSTABILITY - pressure}</b><small>Stability</small></span>
          <span className={objectiveReached ? 'is-secured' : ''}><BiIcon cls={`bi ${objectiveReached ? 'bi-check-circle-fill' : 'bi-bullseye'}`} /><b>{objectiveReached ? 'YES' : 'NO'}</b><small>Index</small></span>
        </div>
        {!entries.length ? <div className="lr-memory-empty"><BiIcon cls="bi bi-compass" /><strong>The first crossing will appear here.</strong><span>Your route, costs, haul, and lasting consequence will be recorded without interrupting play.</span></div> : <ol className="lr-memory-timeline">
          {entries.map((entry, index) => <li key={entry.id}>
            <span className="lr-memory-node"><BiIcon cls="bi bi-check-lg" /></span>
            <div className="lr-memory-choice"><small>{index + 1} · {entry.scene}</small><strong>{entry.route}</strong>{entry.fieldWork && <em><BiIcon cls="bi bi-tools" /> {entry.fieldWork}</em>}</div>
            <div className="lr-memory-deltas" aria-label={`${entry.energy || 0} energy spent, ${entry.stability || 0} stability lost, ${entry.salvage} salvage recovered`}>
              {entry.energy > 0 && <span className="is-energy"><BiIcon cls="bi bi-lightning-charge-fill" />−{entry.energy}</span>}
              {entry.stability > 0 && <span className="is-stability"><BiIcon cls="bi bi-building" />−{entry.stability}</span>}
              <span className="is-salvage"><BiIcon cls="bi bi-box-seam" />+{entry.salvage}</span>
            </div>
          </li>)}
        </ol>}
        {(consequences.length > 0 || companion) && <section className="lr-memory-lasting"><span>Still affecting the mission</span><div>
          {consequences.map((consequence) => <article key={consequence.id}><BiIcon cls="bi bi-diagram-3-fill" /><strong>{consequence.label}</strong><small>{consequence.future}</small></article>)}
          {companion && <article className={companion.ready ? 'is-ready' : 'is-spent'}><BiIcon cls="bi bi-person-check-fill" /><strong>{companion.creature.species} · field ally</strong><small>{companion.ready ? 'Ready for one intervention.' : 'Its intervention has been used.'}</small></article>}
        </div></section>}
        <button type="button" className="g-btn g-btn--primary" onClick={onClose}>Return to current decision</button>
      </section>
    </div>
  );
}

function MethodDetailModal({ forecast, lead, support, route, onClose }) {
  React.useEffect(() => {
    if (!forecast) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [forecast, onClose]);
  if (!forecast || !lead || !route) return null;
  return (
    <div className="lr-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="lr-detail-modal" role="dialog" aria-modal="true" aria-labelledby="lr-method-detail-title" onKeyDown={trapDialogTab}>
        <button type="button" className="lr-modal-close" onClick={onClose} aria-label="Close method details" autoFocus><BiIcon cls="bi bi-x-lg" /></button>
        <p className="g-kicker">Calculation details</p>
        <h2 id="lr-method-detail-title">{forecast.method.label}</h2>
        <div className="lr-detail-equation">
          <span><small>Lead</small><b>{forecast.leadScore}</b></span><i>+</i>
          <span><small>Support</small><b>{forecast.supportBonus}</b></span><i>=</i>
          <span><small>Team</small><b>{forecast.teamScore}</b></span><i>vs</i>
          <span><small>Target</small><b>{forecast.difficulty}</b></span>
        </div>
        <div className="lr-detail-section">
          <div className="lr-detail-heading"><span>{lead.species} · lead-score inputs</span><strong>{forecast.leadScore}</strong></div>
          {forecast.inputs.map((input) => (
            <div className="lr-detail-input" key={input.label}>
              <div><span>{input.label}</span><small>{input.weight == null ? 'fixed modifier' : `${input.weight}% weight`}</small><b>{input.value}</b></div>
              <div aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, input.value))}%` }} /></div>
            </div>
          ))}
        </div>
        <ul className="lr-detail-notes">
          <li><strong>Lead {forecast.leadScore}</strong> combines the creature stats above for this method.</li>
          <li><strong>Support +{forecast.supportBonus}</strong> comes from {support ? `${support.species}'s coordination stats` : 'the assigned support'} and is capped at 10.</li>
          {forecast.readiness.lead.scorePenalty > 0 && <li><strong>{forecast.readiness.lead.label} penalty −{forecast.readiness.lead.scorePenalty}</strong> is already included in the lead score.</li>}
          {forecast.readiness.support.supportPenalty > 0 && <li><strong>{forecast.readiness.support.label} support penalty −{forecast.readiness.support.supportPenalty}</strong> is already included in support.</li>}
          <li><strong>Target {forecast.difficulty}</strong> is the route requirement. The final margin is <strong>{signed(forecast.margin)}</strong>.</li>
          <li>Hidden hazards are not included until the crew encounters them.</li>
        </ul>
        <div className="lr-detail-flags">
          <span className={`is-${forecast.quality}`}>{forecast.label}</span>
          <span>Base lead energy −{forecast.baseLeadStrain}</span>
          <span>{forecast.unresolvedHazards.length} hidden risk{forecast.unresolvedHazards.length === 1 ? '' : 's'}</span>
        </div>
        <button type="button" className="g-btn g-btn--primary" onClick={onClose}>Return to decision</button>
      </section>
    </div>
  );
}

function CreaturePortrait({ creature, compact = false }) {
  return (
    <div className={`lr-portrait lr-portrait--${creature.species.toLowerCase()} g-el-${creature.element.primary}${compact ? ' lr-portrait--compact' : ''}`}>
      <XalianImage colored speciesName={creature.species} primaryType={creature.element.primary} moreClasses="lr-portrait-image" />
      <span className="lr-element-mark" title={`${creature.element.primary} element`} aria-label={`${creature.element.primary} element`}>{svgUtil.getSpeciesTypeSymbol(creature.element.primary, false, compact ? 18 : 23, 'lr-element-symbol')}</span>
    </div>
  );
}

function SetupCard({ creature, selected, onToggle, disabled, disabledReason }) {
  const capabilities = highestCapabilities(creature);
  return (
    <button
      type="button"
      className={`lr-crew-choice g-el-${creature.element.primary}${selected ? ' lr-crew-choice--selected' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      title={disabled ? disabledReason : selected ? `Remove ${creature.species} from the crew` : `Add ${creature.species} to the crew`}
    >
      <CreaturePortrait creature={creature} />
      <div className="lr-crew-choice-body">
        <span className="lr-choice-check"><BiIcon cls={selected ? 'bi-check-lg' : 'bi-plus-lg'} /></span>
        <p className="g-kicker">{creature.planet} / {creature.element.primary}</p>
        <h3>{creature.species}</h3>
        <p className="lr-role">{creature.role}</p>
        <div className="lr-chip-row">
          {capabilities.map(([key, value]) => <span key={key}>{CAPABILITY_LABELS[key]} {value}</span>)}
        </div>
        <div className="lr-choice-footer">
          <span><BiIcon cls="bi-broadcast" /> {creature.physiology.communication.join(' / ') || 'mute'}</span>
          <span><BiIcon cls="bi-compass" /> {temperamentPhrase(creature)}</span>
        </div>
        {disabled && <span className="lr-choice-disabled"><BiIcon cls="bi-lock-fill" /> {disabledReason}</span>}
      </div>
    </button>
  );
}

function CrewMember({ creature, strain, selected, role, onClick, disabled, spentAbilities }) {
  const remaining = creature.abilities.filter((ability) => !spentAbilities.includes(ability.id)).length;
  const readiness = readinessState(strain);
  return (
    <button
      type="button"
      className={`lr-crew-member g-el-${creature.element.primary}${selected ? ' lr-crew-member--selected' : ''}${strain >= MAX_STRAIN ? ' lr-crew-member--spent' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <CreaturePortrait creature={creature} compact />
      <div className="lr-crew-member-main">
        <span className="lr-member-role">{role || creature.role}</span>
        <strong>{creature.species}</strong>
        <span className="lr-member-detail">{readiness.label} · {temperamentPhrase(creature)} · {remaining}/{creature.abilities.length} tools</span>
        <Meter value={strain} max={MAX_STRAIN} label="Energy" danger={strain >= 4} depleted />
      </div>
    </button>
  );
}

function RouteCard({ route, selected, onSelect, onPreview, onPreviewEnd, scan }) {
  const hazards = route.hazardIds.map((id) => scan.hazards.find((hazard) => hazard.id === id)).filter(Boolean);
  const methodKeys = [...new Set(route.methods.map((method) => method.key))];
  return (
    <button type="button" className={`lr-route${selected ? ' lr-route--selected' : ''}`} onClick={onSelect} onMouseEnter={onPreview} onMouseLeave={onPreviewEnd} onFocus={onPreview} onBlur={onPreviewEnd} aria-pressed={selected}>
      <span className="lr-route-select"><BiIcon cls={`bi ${selected ? 'bi-record-circle-fill' : 'bi-circle'}`} /></span>
      <div className="lr-route-title-row">
        <h3>{route.title}</h3>
        <span className="lr-difficulty">Target {route.difficulty}</span>
      </div>
      <p>{route.description}</p>
      <div className="lr-env-row">
        <span><BiIcon cls="bi-cloud" /> {route.environment.medium}</span>
        <span><BiIcon cls="bi-thermometer-half" /> {route.environment.temperatureC}°C</span>
        <span className={`g-el-${route.environment.element}`}><BiIcon cls="bi-lightning" /> {route.environment.element}</span>
      </div>
      {hazards.map((hazard) => hazard.revealed ? (
        <div className="lr-hazard lr-hazard--revealed" key={hazard.id}>
          <BiIcon cls="bi-exclamation-triangle-fill" />
          <span><strong>{hazard.label}</strong>{hazard.detail}</span>
        </div>
      ) : (
        <div className="lr-hazard" key={hazard.id}>
          <BiIcon cls="bi-question-diamond" />
          <span><strong>Unresolved signal</strong>Scout data did not reach command.</span>
        </div>
      ))}
      <div className="lr-route-methods"><span>Best tools</span><div>{methodKeys.map((key) => <b key={key}>{key}</b>)}</div></div>
      <div className="lr-route-cost"><span><BiIcon cls="bi bi-building" /> Instability +{route.pressure}</span><span><BiIcon cls="bi bi-box-seam" /> Salvage {route.salvage}</span></div>
    </button>
  );
}

function MissionTrack({ sceneIndex, objectiveReached }) {
  const current = MISSION.scenes[sceneIndex];
  return (
    <div className="lr-track" aria-label="Mission progress">
      <div className="lr-track-summary">
        <div><span>Current position</span><strong>Scene {sceneIndex + 1} of {MISSION.scenes.length} · {current.title}</strong></div>
        <small>Primary objective at scene 5 · scenes 6–7 are optional depth</small>
      </div>
      <div className="lr-track-line">
        {MISSION.scenes.map((scene, index) => {
          const zone = scene.optional ? 'OPTIONAL' : scene.objective ? 'PRIMARY' : scene.deck.split(' ')[0];
          const active = index === sceneIndex;
          return (
            <div
              className={`lr-track-node${index < sceneIndex ? ' lr-track-node--done' : ''}${active ? ' lr-track-node--active' : ''}${scene.objective ? ' lr-track-node--objective' : ''}`}
              key={scene.id}
              aria-current={active ? 'step' : undefined}
              aria-label={`Scene ${index + 1}: ${scene.title}. ${zone}${active ? '. Current position' : ''}`}
            >
              <span>{index < sceneIndex || (scene.objective && objectiveReached) ? <BiIcon cls="bi-check-lg" /> : index + 1}</span>
              <div className="lr-track-copy"><strong>{scene.trackLabel}</strong><small>{zone}</small></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LongReturnGame() {
  const sceneRef = React.useRef(null);
  const memoryTriggerRef = React.useRef(null);
  const [savedCheckpoint, setSavedCheckpoint] = useState(() => readCheckpoint());
  const [saveStatus, setSaveStatus] = useState('idle');
  const [selectedCrew, setSelectedCrew] = useState(initialCrew);
  const [started, setStarted] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [phase, setPhase] = useState('scout');
  const [scoutId, setScoutId] = useState(null);
  const [scan, setScan] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [pendingRouteId, setPendingRouteId] = useState(null);
  const [routeVisualId, setRouteVisualId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => readSoundEnabled());
  const [wizardDirection, setWizardDirection] = useState('forward');
  const [leadId, setLeadId] = useState(null);
  const [supportId, setSupportId] = useState(null);
  const [methodId, setMethodId] = useState(null);
  const [useCommand, setUseCommand] = useState(false);
  const [strain, setStrain] = useState({});
  const [spentAbilities, setSpentAbilities] = useState([]);
  const [pressure, setPressure] = useState(0);
  const [salvage, setSalvage] = useState(0);
  const [commands, setCommands] = useState(2);
  const [objectiveReached, setObjectiveReached] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [status, setStatus] = useState('playing');
  const [log, setLog] = useState([]);
  const [guidanceLevel, setGuidanceLevel] = useState('simple');
  const [detailMethodId, setDetailMethodId] = useState(null);
  const [mechanicsOpen, setMechanicsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [simpleCustomizing, setSimpleCustomizing] = useState(false);
  const [encounterState, setEncounterState] = useState(null);
  const [encounterOptionId, setEncounterOptionId] = useState(null);
  const [encounterResolution, setEncounterResolution] = useState(null);
  const [companion, setCompanion] = useState(null);
  const [runFlags, setRunFlags] = useState([]);
  const [transition, setTransition] = useState(null);
  const [actionTransition, setActionTransition] = useState(null);
  const [motionCue, setMotionCue] = useState(null);
  const [journal, setJournal] = useState([]);
  const [fieldReceipt, setFieldReceipt] = useState(null);
  const motionTimerRef = React.useRef(null);

  React.useEffect(() => {
    if (!started) return;
    if (status !== 'playing') { clearCheckpoint(); setSavedCheckpoint(null); return; }
    // Checkpoint whole resource transactions, never half of a scout/encounter.
    if (phase !== 'result' && !(phase === 'scout' && sceneIndex === 0)) return;
    const checkpoint = { selectedCrew, sceneIndex, phase, scoutId, scan, routeId, leadId, supportId, methodId,
      strain, spentAbilities, pressure, salvage, commands, objectiveReached, lastResult, log, guidanceLevel,
      companion, runFlags, journal, fieldReceipt };
    const saved = writeCheckpoint(checkpoint);
    setSaveStatus(saved ? 'saved' : 'unavailable');
    if (saved) setSavedCheckpoint(checkpoint);
  }, [started, status, selectedCrew, sceneIndex, phase, scoutId, scan, routeId, leadId, supportId, methodId,
    strain, spentAbilities, pressure, salvage, commands, objectiveReached, lastResult, log, guidanceLevel,
    companion, runFlags, journal, fieldReceipt]);

  const resumeExpedition = () => {
    const saved = savedCheckpoint;
    if (!saved) return;
    setSelectedCrew(saved.selectedCrew); setSceneIndex(saved.sceneIndex); setPhase(saved.phase);
    setScoutId(saved.scoutId); setScan(saved.scan); setRouteId(saved.routeId); setPendingRouteId(null);
    setLeadId(saved.leadId); setSupportId(saved.supportId); setMethodId(saved.methodId);
    setStrain(saved.strain); setSpentAbilities(saved.spentAbilities); setPressure(saved.pressure);
    setSalvage(saved.salvage); setCommands(saved.commands); setObjectiveReached(saved.objectiveReached);
    setLastResult(saved.lastResult); setLog(saved.log); setGuidanceLevel(saved.guidanceLevel);
    setCompanion(saved.companion); setRunFlags(saved.runFlags); setJournal(saved.journal); setFieldReceipt(saved.fieldReceipt);
    setTransition(null); setActionTransition(null); setEncounterState(null); setEncounterOptionId(null); setEncounterResolution(null); setMotionCue(null);
    setUseCommand(false); setSimpleCustomizing(false); setStatus('playing'); setStarted(true);
  };

  const cueChanges = (changes) => {
    if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
    setMotionCue((current) => ({ id: (current ? current.id : 0) + 1, energy: {}, stability: 0, salvage: 0, ...changes }));
    motionTimerRef.current = setTimeout(() => setMotionCue(null), 3600);
  };

  React.useEffect(() => () => {
    if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
  }, []);

  const crew = useMemo(() => selectedCrew.map((id) => CREATURES.find((entry) => entry.id === id)).filter(Boolean), [selectedCrew]);
  const standingCrewCount = crew.filter((member) => (strain[member.id] || 0) < MAX_STRAIN).length;
  const missionCannotContinue = pressure >= MAX_PRESSURE || standingCrewCount < 2;
  const baseScene = MISSION.scenes[sceneIndex];
  const scene = useMemo(() => applyMissionMemory(baseScene, runFlags), [baseScene, runFlags]);
  const route = scene && scene.routes.find((entry) => entry.id === routeId);
  const lead = crew.find((entry) => entry.id === leadId);
  const support = crew.find((entry) => entry.id === supportId);
  const methods = useMemo(() => lead && route ? methodOptions(lead, route, spentAbilities) : [], [lead, route, spentAbilities]);
  const method = methods.find((entry) => entry.id === methodId);
  const reserve = leadId && supportId ? crew.find((entry) => entry.id !== leadId && entry.id !== supportId) : null;
  const scanScout = crew.find((entry) => entry.id === scoutId);
  const report = scene && scan ? scanReport(scene, scanScout, scan) : null;
  const encounterCreature = scene && scene.encounter ? CREATURES.find((entry) => entry.id === scene.encounter.creatureId) : null;
  const activeEncounterOptions = encounterState && !encounterState.result
    ? encounterOptions(scene, encounterState.scout, crew, encounterState.mode, encounterState.informed)
    : [];
  const currentAction = phase === 'transition'
    ? { stage: `Scene ${sceneIndex + 1} of ${MISSION.scenes.length} · Arrival`, title: 'See what your last choice changed', hint: 'This beat connects the previous result to the situation now in front of the crew.', icon: 'bi-arrow-down-right-circle', resolved: true }
    : phase === 'scout'
    ? { stage: 'Step 1 of 3 · Intelligence', title: 'Choose a scout—or keep the crew together', hint: 'Every large card is an available action. Compare clue finding, reporting, and energy cost.', icon: 'bi-binoculars' }
    : phase === 'encounter' && !encounterState.result
      ? { stage: 'Field event · Response required', title: 'Choose how the crew responds', hint: encounterOptionId ? 'Response selected. Confirm below to act.' : 'Select a response to preview it. Nothing happens until you confirm.', icon: 'bi-exclamation-diamond' }
      : phase === 'encounter'
        ? { stage: 'Field event · Resolved', title: 'Review the outcome, then continue', hint: 'The highlighted button advances to the report or crossing plan.', icon: 'bi-check-circle', resolved: true }
        : phase === 'scan-result'
          ? { stage: 'Step 1 complete · Scout report', title: 'Review what the scout learned', hint: scan && !scan.returned && scan.mode !== 'blind' ? 'The scout must return before the crew can use the report.' : 'Use the primary button to move to route selection.', icon: 'bi-broadcast-pin', resolved: true }
          : phase === 'assign' && !routeId
            ? { stage: 'Step 2 of 3 · Route', title: 'Choose one route', hint: 'Select a card to preview your choice. Command recommends a route only when the known advantage is clear.', icon: 'bi-signpost-split' }
            : phase === 'assign'
              ? { stage: 'Step 3 of 3 · Ready to act', title: 'Everyone crosses—review each role', hint: 'Lead acts, support can change the outcome, and reserve travels safely. “Cross now” performs the action.', icon: 'bi-people' }
              : { stage: 'Crossing resolved', title: objectiveReached ? 'Review the result, then continue or extract' : 'Review the result, then continue', hint: 'Read “What changed” before deciding how far to push the crew.', icon: 'bi-clipboard-check', resolved: true };

  React.useEffect(() => {
    if (!started || status !== 'playing' || !sceneRef.current || actionTransition) return;
    const root = sceneRef.current;
    let target = root;
    // The Simple workspace owns its context header. Always return to the top of
    // that workspace when a phase changes so the player sees both where they
    // are and what changed; advanced layouts retain their focused deep-link.
    if (guidanceLevel !== 'simple') {
      if (phase === 'assign') target = root.querySelector('.lr-crossing-flow') || root.querySelector('.lr-current-action') || root;
      else target = root.querySelector('.lr-scene-stage') || root.querySelector('.lr-current-action') || root;
    }
    // Align the new phase before its entrance animation. Smooth scrolling and
    // panel motion running together read as camera shake, especially at
    // fractional display scaling.
    if (typeof target.scrollIntoView === 'function') {
      const documentRoot = document.documentElement;
      const previousScrollBehavior = documentRoot.style.scrollBehavior;
      documentRoot.style.scrollBehavior = 'auto';
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
      documentRoot.style.scrollBehavior = previousScrollBehavior;
    }
    // A wizard transition is also a context transition for keyboard and screen
    // reader users. Move focus to the newly announced action after scrolling so
    // the next Tab lands on the first relevant control, not an old control that
    // has disappeared with the previous step.
    if (guidanceLevel === 'simple') {
      const focusTarget = root.querySelector('[data-wizard-focus]');
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus({ preventScroll: true });
      }
    }
  }, [started, status, guidanceLevel, phase, sceneIndex, routeId, encounterState && encounterState.result, actionTransition]);
  const methodForecasts = useMemo(() => lead && route ? methods.map((entry) => ({
    method: entry,
    ...decisionForecast({ route, lead, support, method: entry, scan, leadLoad: strain[lead.id] || 0, supportLoad: support ? strain[support.id] || 0 : 0 })
  })) : [], [lead, route, support, methods, scan, strain]);
  const selectedForecast = methodForecasts.find((entry) => entry.method.id === methodId);
  const detailForecast = methodForecasts.find((entry) => entry.method.id === detailMethodId);
  const recommendedForecast = methodForecasts.reduce((best, entry) => !best || entry.teamScore > best.teamScore ? entry : best, null);
  const simpleScoutOptions = useMemo(() => scene ? crew
    .filter((member) => (strain[member.id] || 0) < MAX_STRAIN - 1)
    .map((member) => {
      const preview = scanScene(scene, member);
      const profile = scoutProfile(scene, member);
      const outlook = encounterOutlook(scene, member);
      const encounterScore = outlook ? Math.max(outlook.stealth, outlook.hold, outlook.contact) + outlook.detect * .25 : 0;
      return { member, preview, profile, outlook, score: preview.revealedIds.length * 100 + (preview.relay ? 20 : 0) - preview.trappedCount * 10 + encounterScore };
    })
    .sort((a, b) => b.score - a.score) : [], [scene, crew, strain]);
  const selectedScoutOption = simpleScoutOptions.find((entry) => entry.member.id === scoutId) || null;
  const simpleRoutePlans = useMemo(() => scene && scan ? scene.routes.map((entry) => {
    const plan = safestPlanForRoute(entry, crew, strain, spentAbilities, scan);
    if (!plan) return null;
    const nativeRisk = scene.encounter && scene.encounter.routeId === entry.id && (!encounterResolution || encounterResolution.resolution === 'unresolved');
    return { ...plan, nativeRisk, risk: plan.risk + (nativeRisk ? encounterResolution ? 18 : 26 : 0) };
  }).filter(Boolean) : [], [scene, scan, crew, strain, spentAbilities, encounterResolution]);
  const routeRewardBaseline = simpleRoutePlans.length ? Math.min(...simpleRoutePlans.map((entry) => entry.route.salvage)) : 0;
  const routeRecommendation = useMemo(() => recommendationFor(simpleRoutePlans), [simpleRoutePlans]);
  const lowestRiskPlan = simpleRoutePlans.reduce((best, entry) => !best || entry.risk < best.risk ? entry : best, null);
  const pendingRoutePlan = simpleRoutePlans.find((entry) => entry.route.id === pendingRouteId) || null;
  const suggestedPlan = route ? simpleRoutePlans.find((entry) => entry.route.id === route.id) : null;

  const resetDecision = (nextPhase = 'scout') => {
    setWizardDirection('forward');
    setFieldReceipt(null);
    setPhase(nextPhase); setScoutId(null); setScan(null); setRouteId(null); setPendingRouteId(null); setRouteVisualId(null); setLeadId(null); setSupportId(null); setMethodId(null); setUseCommand(false); setLastResult(null); setSimpleCustomizing(false); setEncounterState(null); setEncounterOptionId(null); setEncounterResolution(null);
  };

  const startExpedition = () => {
    setJournal([]); setActionTransition(null);
    const initialStrain = {};
    selectedCrew.forEach((id) => { initialStrain[id] = 0; });
    setStrain(initialStrain); setSpentAbilities([]); setPressure(0); setSalvage(0); setCommands(2); setObjectiveReached(false); setCompanion(null); setRunFlags([]); setTransition(null); setMotionCue(null);
    setSceneIndex(0); setStatus('playing'); setLog([{ title: 'ANNEX ENTRY', text: 'Crew seal confirmed. The Black Archive mission has begun.' }]);
    resetDecision(); setStarted(true);
  };

  const toggleCrew = (id) => {
    setSelectedCrew((current) => current.includes(id) ? current.filter((entry) => entry !== id) : current.length < 3 ? [...current, id] : current);
  };

  const proceedBlind = () => {
    setWizardDirection('forward');
    setScoutId(null);
    setScan({ mode: 'blind', relay: false, returned: true, hazards: scene.hazards.map((hazard) => ({ ...hazard, revealed: false, sensed: false })), revealedIds: [], trappedCount: 0 });
    setPhase('scan-result');
    setLog((current) => [{ title: `${scene.deck} / NO SCAN`, text: `The crew preserved its strength and accepted incomplete intelligence at ${scene.title}.` }, ...current].slice(0, 8));
  };

  const performScanFor = (scout) => {
    if (!scout) return;
    playGameSound('commit', soundEnabled);
    setWizardDirection('forward');
    const scanned = scanScene(scene, scout);
    const result = { ...scanned, mode: 'scan', returned: !!scanned.relay };
    setScoutId(scout.id);
    setScan(result);
    setStrain((current) => ({ ...current, [scout.id]: cap((current[scout.id] || 0) + 1) }));
    cueChanges({ energy: { [scout.id]: 1 } });
    const scoutAction = { type: 'scout', scene, scout, result, profile: scoutProfile(scene, scout), energyBefore: MAX_STRAIN - (strain[scout.id] || 0), energyAfter: MAX_STRAIN - cap((strain[scout.id] || 0) + 1), stabilityBefore: MAX_INSTABILITY - pressure, stabilityAfter: MAX_INSTABILITY - pressure, encounter: scene.encounter && !encounterResolution ? encounterCreature : null };
    if (scene.encounter && !encounterResolution) {
      setActionTransition(scoutAction);
      setEncounterOptionId(null);
      setEncounterState({ mode: 'scout', scout, informed: true, postPhase: 'scan-result', outlook: encounterOutlook(scene, scout), result: null });
      setPhase('encounter');
    } else {
      setActionTransition(scoutAction);
      setPhase('scan-result');
    }
    setLog((current) => [{
      title: `${scene.deck} / SCAN`,
      text: result.revealedIds.length
        ? `${scout.species} relayed ${result.revealedIds.length} actionable hazard signature${result.revealedIds.length > 1 ? 's' : ''}.`
        : result.trappedCount
          ? `${scout.species} detected a signal, but ${scout.physiology.communication.join(' / ') || 'silence'} could not carry it back.`
          : `${scout.species} found no actionable signature. The scene is not necessarily safe.`
    }, ...current].slice(0, 8));
  };

  const performScan = () => performScanFor(crew.find((entry) => entry.id === scoutId));

  const recoverScout = () => {
    if (!scanScout || !scan || scan.returned) return;
    const hazards = scan.hazards.map((hazard) => hazard.sensed ? { ...hazard, revealed: true } : hazard);
    setScan({ ...scan, mode: 'debrief', returned: true, hazards, revealedIds: hazards.filter((hazard) => hazard.revealed).map((hazard) => hazard.id) });
    setStrain((current) => ({ ...current, [scanScout.id]: cap((current[scanScout.id] || 0) + 1) }));
    setPressure((current) => Math.min(MAX_INSTABILITY, current + 1));
    cueChanges({ energy: { [scanScout.id]: 1 }, stability: 1 });
    setActionTransition({ type: 'scout-return', scene, scout: scanScout, result: scan, profile: scoutProfile(scene, scanScout), energyBefore: MAX_STRAIN - (strain[scanScout.id] || 0), energyAfter: MAX_STRAIN - cap((strain[scanScout.id] || 0) + 1), stabilityBefore: MAX_INSTABILITY - pressure, stabilityAfter: MAX_INSTABILITY - Math.min(MAX_INSTABILITY, pressure + 1) });
    setLog((current) => [{ title: `${scene.deck} / SCOUT RETURN`, text: `${scanScout.species} returned physically to deliver its report. The delay consumed energy and annex stability.` }, ...current].slice(0, 8));
  };

  const resolveEncounter = (option) => {
    if (!encounterState || !option || !encounterCreature) return;
    let affected = encounterState.scout;
    if (encounterState.mode === 'scout') {
      const added = option.scoutStrain || 0;
      if (added && affected) setStrain((current) => ({ ...current, [affected.id]: cap((current[affected.id] || 0) + added) }));
    } else if (option.crewStrain) {
      affected = [...crew].sort((a, b) => scoutProfile(scene, b).hold - scoutProfile(scene, a).hold)[0];
      if (affected) setStrain((current) => ({ ...current, [affected.id]: cap((current[affected.id] || 0) + option.crewStrain) }));
    }
    if (option.instability) setPressure((current) => Math.min(MAX_INSTABILITY, current + option.instability));
    cueChanges({ energy: affected && (option.scoutStrain || option.crewStrain) ? { [affected.id]: option.scoutStrain || option.crewStrain } : {}, stability: option.instability || 0 });
    if (option.companion) setCompanion({ creature: encounterCreature, ready: true, benefit: scene.encounter.companionBenefit });
    const archetype = scene.encounter.archetype || 'injured';
    const narrative = encounterNarrative({
      archetype,
      option,
      nativeName: encounterCreature.species,
      actorName: affected ? affected.species : null,
      scoutName: encounterState.scout ? encounterState.scout.species : null
    });
    const result = { ...option, affected, narrative };
    const energyCost = option.scoutStrain || option.crewStrain || 0;
    const helper = option.companion ? crew.find((member) => option.label.includes(member.species)) : null;
    const actor = helper || affected || crew[0];
    playGameSound('commit', soundEnabled);
    setActionTransition({
      type: 'encounter-response', scene, native: encounterCreature, actor,
      witness: affected && actor && affected.id !== actor.id ? affected : null,
      affected, option, result, presentation: encounterChoicePresentation(option),
      energyBefore: affected ? MAX_STRAIN - (strain[affected.id] || 0) : MAX_STRAIN,
      energyAfter: affected ? MAX_STRAIN - cap((strain[affected.id] || 0) + energyCost) : MAX_STRAIN,
      stabilityBefore: MAX_INSTABILITY - pressure,
      stabilityAfter: MAX_INSTABILITY - Math.min(MAX_INSTABILITY, pressure + (option.instability || 0))
    });
    setEncounterResolution(result);
    setEncounterOptionId(null);
    setEncounterState((current) => ({ ...current, result }));
    setLog((current) => [{ title: `${scene.deck} / FIELD ENCOUNTER`, text: narrative }, ...current].slice(0, 8));
  };

  const continueEncounter = () => {
    if (!encounterState || !encounterState.result) return;
    if (encounterState.result.resolution === 'detour') { setRouteId(null); setPendingRouteId(null); }
    setWizardDirection('forward'); setPhase(encounterState.postPhase || 'assign');
    setEncounterState(null); setEncounterOptionId(null);
  };

  const chooseRoute = (id) => {
    playGameSound('select', soundEnabled);
    setWizardDirection('forward');
    setRouteId(id); setPendingRouteId(null); setRouteVisualId(id); setLeadId(null); setSupportId(null); setMethodId(null); setUseCommand(false); setSimpleCustomizing(false);
  };

  const changeRoute = () => {
    setWizardDirection('back');
    setRouteId(null); setPendingRouteId(routeId); setRouteVisualId(routeId); setLeadId(null); setSupportId(null); setMethodId(null); setUseCommand(false); setSimpleCustomizing(false);
  };

  const previewSimpleRoute = (id) => {
    playGameSound('select', soundEnabled); setPendingRouteId(id); setRouteVisualId(id);
  };

  const confirmSimpleRoute = () => {
    if (pendingRouteId) chooseRoute(pendingRouteId);
  };

  const chooseLead = (id) => {
    setLeadId(id); if (supportId === id) setSupportId(null); setMethodId(null); setUseCommand(false);
  };

  const commit = (plan) => {
    const actingLead = plan && plan.method ? plan.lead : lead;
    const actingSupport = plan && plan.method ? plan.support : support;
    const actingMethod = plan && plan.method ? plan.method : method;
    if (!scene || !route || !actingLead || !actingSupport || !actingMethod || !scan) return;
    playGameSound('commit', soundEnabled);
    setWizardDirection('forward');
    if (scene.encounter && scene.encounter.routeId === route.id && (!encounterResolution || encounterResolution.resolution === 'unresolved')) {
      setActionTransition({ type: 'encounter', scene, route, lead: actingLead, support: actingSupport, encounter: encounterCreature });
      setEncounterOptionId(null);
      setEncounterState({ mode: 'group', scout: null, informed: !!encounterResolution, postPhase: 'assign', result: null });
      setPhase('encounter');
      return;
    }
    let result = resolveScene({ scene, route, lead: actingLead, support: actingSupport, method: actingMethod, scan, useCommand, leadLoad: strain[actingLead.id] || 0, supportLoad: strain[actingSupport.id] || 0 });
    let companionHelp = null;
    if (companion && companion.ready && result.leadStrain > 0) {
      result = { ...result, leadStrain: result.leadStrain - 1 };
      companionHelp = `${companion.creature.species} braces the crossing and preserves 1 energy.`;
      setCompanion((current) => ({ ...current, ready: false }));
    }
    const nextPressure = Math.min(MAX_PRESSURE, pressure + result.pressure);
    const nextStrain = {
      ...strain,
      [actingLead.id]: cap((strain[actingLead.id] || 0) + result.leadStrain),
      [actingSupport.id]: cap((strain[actingSupport.id] || 0) + result.supportStrain)
    };
    const reached = objectiveReached || !!scene.objective;
    const totalStrain = result.leadStrain + result.supportStrain;
    const impactQuality = totalStrain === 0 && result.pressure === 0 ? 'clean' : totalStrain + result.pressure <= 3 ? 'costly' : 'dangerous';
    const causes = [
      `${actingLead.species} chose ${actingMethod.label} for the “${route.title}” route.`,
      result.margin >= 14 ? `The crew beat the route target by ${result.margin}, so the crossing itself consumed no base energy.` : result.margin >= 0 ? `The crew beat the route target by only ${result.margin}, so the lead spent extra energy.` : `The crew fell ${Math.abs(result.margin)} below the route target, forcing a costly passage.`,
      ...result.environment.notes.map((note) => `${actingLead.species} ${note}.`),
      ...result.unseenHazards.map((hazard) => `${hazard.label} was not identified before the crew entered the route.`),
      companionHelp
    ].filter(Boolean);
    const narrative = crossingNarrative({ route, lead: actingLead, support: actingSupport, method: actingMethod, result, companionHelp });
    result = {
      ...result,
      companionHelp,
      impactQuality,
      impactLabel: impactQuality === 'clean' ? 'Clean success' : impactQuality === 'costly' ? 'Costly success' : 'Dangerous success',
      ...narrative,
      reaction: creatureReaction(actingLead, result.quality, route),
      consequence: route.consequence || null,
      causes,
      crewChanges: [
        { creature: actingLead, added: result.leadStrain, before: strain[actingLead.id] || 0, after: nextStrain[actingLead.id], beforeState: readinessState(strain[actingLead.id] || 0), afterState: readinessState(nextStrain[actingLead.id]) },
        { creature: actingSupport, added: result.supportStrain, before: strain[actingSupport.id] || 0, after: nextStrain[actingSupport.id], beforeState: readinessState(strain[actingSupport.id] || 0), afterState: readinessState(nextStrain[actingSupport.id]) }
      ],
      instabilityChange: { added: result.pressure, before: pressure, after: nextPressure, beforeState: instabilityState(pressure), afterState: instabilityState(nextPressure) },
      salvageAfter: salvage + result.salvage
    };

    setActionTransition({ type: 'crossing', scene, route, lead: actingLead, support: actingSupport, reserve: crew.find((member) => member.id !== actingLead.id && member.id !== actingSupport.id), method: actingMethod, result, companion: companionHelp && companion ? companion.creature : null });

    setLeadId(actingLead.id); setSupportId(actingSupport.id); setMethodId(actingMethod.id);
    setPressure(nextPressure);
    setStrain(nextStrain);
    setSalvage((current) => current + result.salvage);
    cueChanges({ energy: { [actingLead.id]: result.leadStrain, [actingSupport.id]: result.supportStrain }, stability: result.pressure, salvage: result.salvage });
    setObjectiveReached(reached);
    if (result.abilityId) setSpentAbilities((current) => [...current, result.abilityId]);
    if (useCommand && !result.naturalReaction) setCommands((current) => Math.max(0, current - 1));
    if (route.consequence) setRunFlags((current) => current.includes(route.consequence.id) ? current : [...current, route.consequence.id]);
    setLastResult(result);
    setJournal(current => [...current, { id: scene.id, scene: scene.title, route: route.title, story: result.story, lead: actingLead.species, energy: totalStrain, stability: result.pressure, salvage: result.salvage }]);
    setPhase('result');
    setSimpleCustomizing(false);
    setLog((current) => [{ title: `${scene.deck} / ${route.title}`, text: `${result.impactLabel}: ${result.story}` }, ...current].slice(0, 8));

  };

  const continueRun = () => {
    if (missionCannotContinue) {
      setStatus('failed');
      return;
    }
    if (sceneIndex >= MISSION.scenes.length - 1) {
      setStatus('complete');
      return;
    }
    const nextIndex = sceneIndex + 1;
    setTransition({
      from: scene.title,
      to: MISSION.scenes[nextIndex].title,
      consequence: lastResult && lastResult.consequence,
      lead: lastResult && lastResult.crewChanges[0].creature,
      reaction: lastResult && lastResult.reaction
    });
    setSceneIndex(nextIndex);
    resetDecision('transition');
  };

  const doFieldWork = (optionId) => {
    if (phase !== 'result' || missionCannotContinue || sceneIndex === MISSION.scenes.length - 1) return;
    const next = performFieldOperation({ crew, strain, pressure, salvage, commands, used: !!fieldReceipt }, optionId);
    if (!next) return;
    playGameSound('recover', soundEnabled);
    setStrain(next.strain); setPressure(next.pressure); setSalvage(next.salvage); setCommands(next.commands);
    setFieldReceipt(next.option);
    setJournal(current => current.map(entry => entry.id === scene.id ? { ...entry, fieldWork: next.option.result } : entry));
    cueChanges({ energy: { [next.option.creature.id]: next.option.energy }, stability: next.option.stability, salvage: -next.option.cost });
  };

  const enterScene = () => {
    setTransition(null);
    setWizardDirection('forward');
    setPhase('scout');
  };

  const advanceToRoutes = () => { setWizardDirection('forward'); setPhase('assign'); };

  const extract = () => setStatus(objectiveReached ? 'extracted' : 'aborted');

  const returnToCrew = () => {
    setStarted(false); setStatus('playing');
  };

  if (!started) {
    return (
      <main className={`lr-shell lr-mode-${guidanceLevel}`}>
        {savedCheckpoint && <section className="lr-resume-card"><BiIcon cls="bi bi-bookmark-check" /><div><strong>Your expedition is waiting</strong><p>{savedCheckpoint.phase === 'result' ? `Checkpoint after crossing ${savedCheckpoint.sceneIndex + 1}: ${MISSION.scenes[savedCheckpoint.sceneIndex].title}` : 'Checkpoint at annex entry'}</p><small>Saved in this browser. Any unfinished crossing restarts from this checkpoint.</small></div><button type="button" className="g-btn g-btn--primary" onClick={resumeExpedition}>Resume expedition <BiIcon cls="bi bi-arrow-right" /></button></section>}
        <section className="lr-briefing g-panel g-panel--bolted" style={{ '--briefing-art': `url(${BRIEFING_ART})` }}>
          <div className="lr-briefing-hardware" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="lr-briefing-copy">
            <p className="g-kicker">Wayfinder Operations / Prototype Mission</p>
            <h1 className="g-title">The Long Return</h1>
            <p className="lr-lead">Bring three creatures into a dying End-Wars annex. Read what they can perceive. Trust what their bodies can do. Recover the index, then decide how much farther you dare to go.</p>
            <div className="lr-mission-stamp">
              <span>CONTRACT</span><strong>{MISSION.title}</strong><small>{MISSION.location}</small>
            </div>
          </div>
          <div className="g-screen lr-briefing-screen">
            <p className="g-screen-line">OBJECTIVE :: {MISSION.objective}</p>
            <p className="g-screen-line g-screen-line--dim">{MISSION.briefing}</p>
            <div className={`lr-howto${guidanceLevel === 'simple' ? ' lr-simple-hidden' : ''}`}>
              <span><b>1</b> Scout or move blind</span>
              <span><b>2</b> Choose a route target</span>
              <span><b>3</b> Build a team score</span>
              <span><b>4</b> Meet or beat the target</span>
              <span><b>5</b> Resolve energy / stability</span>
              <span><b>6</b> Push or extract</span>
            </div>
          </div>
        </section>

        <section className="lr-crew-select">
          <div className="lr-section-head">
            <div><p className="g-kicker">Crew manifest</p><h2 className="g-h2">Choose three Xalians</h2></div>
            <div className="lr-selection-count"><strong>{selectedCrew.length}</strong><span>/ 3 assigned</span></div>
          </div>
          {guidanceLevel === 'simple' ? <SimplePrimer /> : <CrossingPrimer />}
          <div className="lr-choice-grid">
            {CREATURES.map((creature) => (
              <SetupCard
                key={creature.id}
                creature={creature}
                selected={selectedCrew.includes(creature.id)}
                disabled={!selectedCrew.includes(creature.id) && selectedCrew.length >= 3}
                disabledReason="Crew full — deselect one creature first"
                onToggle={() => toggleCrew(creature.id)}
              />
            ))}
          </div>
          <div className="lr-guidance-setup g-panel g-panel--recessed">
            <div>
              <p className="g-kicker">Decision support</p>
              <h2>Choose how much command explains</h2>
              <p>Guidance changes the analysis shown to you, not the mission math, creature stats, rewards, or consequences. You can change it during crew assignment.</p>
            </div>
            <GuidanceSelector value={guidanceLevel} onChange={setGuidanceLevel} />
          </div>
          <div className="lr-launch-row">
            <p><BiIcon cls="bi-info-circle" /> Prototype records are authored for this mission from the ratified creature schema.</p>
            <button className="g-btn g-btn--primary lr-launch" type="button" disabled={selectedCrew.length !== 3} title={selectedCrew.length !== 3 ? `Choose ${3 - selectedCrew.length} more creature${3 - selectedCrew.length === 1 ? '' : 's'}` : 'Begin the expedition'} onClick={startExpedition}>
              {selectedCrew.length === 3 ? savedCheckpoint ? 'Replace checkpoint & start new expedition' : 'Seal Crew & Enter Annex' : `Choose ${3 - selectedCrew.length} More`} <BiIcon cls={`bi ${selectedCrew.length === 3 ? 'bi-arrow-right' : 'bi-lock-fill'}`} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (status !== 'playing') {
    const success = status === 'complete' || status === 'extracted';
    const banked = status === 'failed' ? (objectiveReached ? Math.ceil(salvage / 2) : 0) : salvage;
    const outcome = missionOutcomePresentation(status, objectiveReached, banked);
    return (
      <main className="lr-shell lr-end-shell">
        <section className={`g-panel g-panel--bolted lr-end-card lr-end-card--${outcome.tone}${success ? ' lr-end-card--success' : ''}`} style={{ '--end-art': `url(${sceneArtFor(scene).src})` }}>
          <p className="g-kicker">Mission report / {MISSION.id}</p>
          <div className="lr-end-seal"><BiIcon cls={`bi ${outcome.icon}`} /></div>
          <span className="lr-end-outcome">{outcome.label}</span>
          <h1 className="g-title">{outcome.title}</h1>
          <p className="lr-end-copy">{outcome.copy}</p>
          <div className="lr-end-stats">
            <div><span>Objective</span><strong>{objectiveReached ? 'SECURED' : 'LOST'}</strong></div>
            <div><span>Salvage banked</span><strong>{banked} · {banked >= 20 ? 'Exceptional haul' : banked >= 10 ? 'Strong haul' : banked > 0 ? 'Light haul' : 'None'}</strong></div>
            <div><span>Annex stability</span><strong>{MAX_INSTABILITY - pressure} / {MAX_INSTABILITY}</strong></div>
            <div><span>Scenes crossed</span><strong>{sceneIndex + (phase === 'result' ? 1 : 0)} / {MISSION.scenes.length}</strong></div>
          </div>
          <div className="lr-end-crew">
            {crew.map((member) => <CrewMember key={member.id} creature={member} strain={strain[member.id] || 0} spentAbilities={spentAbilities} disabled />)}
          </div>
          <MissionJournal entries={journal} />
          <div className="lr-end-actions">
            <button type="button" className="g-btn" onClick={returnToCrew}>Change Crew</button>
            <button type="button" className="g-btn g-btn--primary" onClick={startExpedition}>Run Contract Again</button>
          </div>
        </section>
      </main>
    );
  }

  const leadReactionMatch = lead && route ? reactionMatches(lead, route.reaction) : null;
  const assignment = assignmentStatus({ route, lead, support, method });
  const canCommit = assignment.ready;
  const fieldWorkshop = phase === 'result' && !missionCannotContinue && sceneIndex < MISSION.scenes.length - 1
    ? <FieldWorkshop key={scene.id} crew={crew} strain={strain} pressure={pressure} salvage={salvage} commands={commands} used={!!fieldReceipt} receipt={fieldReceipt} onChoose={doFieldWork} /> : null;
  const crossingsToIndex = Math.max(0, MISSION.scenes.findIndex(entry => entry.objective) - sceneIndex);
  const optionalScenesRemaining = MISSION.scenes.slice(sceneIndex + 1).filter((entry) => entry.optional);
  const optionalSalvagePotential = optionalScenesRemaining.reduce((total, entry) => total + Math.max(...entry.routes.map((entryRoute) => entryRoute.salvage)), 0);
  const wizardViewKey = `${scene.id}-${phase}-${phase === 'assign' ? routeId ? 'plan' : 'route' : 'view'}`;
  return (
    <main className={`lr-shell lr-play-shell lr-mode-${guidanceLevel}${simpleCustomizing ? ' lr-is-customizing' : ''}`}>
      {actionTransition && (actionTransition.type === 'scout' || actionTransition.type === 'scout-return'
        ? <ScoutTransition action={actionTransition} soundEnabled={soundEnabled} onComplete={() => setActionTransition(null)} />
        : actionTransition.type === 'encounter-response'
          ? <EncounterResolutionTransition action={actionTransition} soundEnabled={soundEnabled} onComplete={() => setActionTransition(null)} />
        : <ActionTransition action={actionTransition} soundEnabled={soundEnabled} onComplete={() => setActionTransition(null)} />)}
      <header className="lr-mission-head">
        <div><p className="g-kicker">{MISSION.location}</p><h1>{MISSION.title}</h1></div>
        <div className="lr-head-readouts">
          <button type="button" className="lr-sound-toggle" aria-pressed={soundEnabled} title={soundEnabled ? 'Mute expedition sounds' : 'Enable expedition sounds'} onClick={() => { const next = !soundEnabled; setSoundEnabled(next); writeSoundEnabled(next); playGameSound('select', next); }}><BiIcon cls={`bi ${soundEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`} /><span>{soundEnabled ? 'Sound on' : 'Sound off'}</span></button>
          <button type="button" className="lr-rules-button" onClick={() => setMechanicsOpen(true)}><BiIcon cls="bi bi-question-circle" /> How crossings work</button>
          <Meter value={pressure} max={MAX_INSTABILITY} label="Annex stability" danger={pressure >= 7} depleted />
          <div className={`lr-counter lr-salvage-counter${motionCue && motionCue.salvage ? ' is-changing' : ''}`} title="Spend salvage on recovery and field repairs between crossings, or bank it on extraction."><span>Salvage carried</span><strong>{salvage}</strong>{motionCue && !!motionCue.salvage && <em key={motionCue.id}>{signed(motionCue.salvage)}</em>}</div>
          <div className="lr-counter"><span>Commands</span><strong>{commands}</strong></div>
        </div>
      </header>

      <MissionTrack sceneIndex={sceneIndex} objectiveReached={objectiveReached} />
      <details className={`lr-checkpoint-indicator${saveStatus === 'unavailable' ? ' is-warning' : ''}`}><summary><BiIcon cls={`bi ${saveStatus === 'unavailable' ? 'bi-exclamation-triangle' : 'bi-bookmark-check'}`} /> {saveStatus === 'unavailable' ? 'Saving unavailable' : savedCheckpoint && savedCheckpoint.phase === 'result' ? `Checkpoint saved · crossing ${savedCheckpoint.sceneIndex + 1}` : 'Checkpoint saved · annex entry'}</summary><p>{saveStatus === 'unavailable' ? 'This browser could not save your expedition. Keep this tab open to continue the current run.' : 'Saved in this browser after crossings and field work. Reloading during a crossing returns to this checkpoint.'}</p></details>
      <MissionJournal entries={journal} />

      {guidanceLevel === 'simple' && <SimpleRunStatus crew={crew} strain={strain} pressure={pressure} objectiveReached={objectiveReached} companion={companion} motionCue={motionCue} />}

      <div className="lr-game-grid">
        <aside className="lr-crew-rail g-panel g-panel--recessed">
          <div className="lr-rail-title"><p className="g-kicker">Crew status</p><span>{phase === 'scout' ? 'SELECT SCOUT' : phase === 'scan-result' ? 'SCAN REPORT' : phase === 'assign' ? 'ASSIGN ROLES' : 'SCENE CLEAR'}</span></div>
          {crew.map((member) => {
            let selected = false;
            let role = null;
            let click = null;
            let disabled = (strain[member.id] || 0) >= MAX_STRAIN;
            if (phase === 'scout' && (strain[member.id] || 0) >= MAX_STRAIN - 1) disabled = true;
            if (phase === 'scout') { selected = scoutId === member.id; role = selected ? 'Scout assigned' : 'Select as scout'; click = () => setScoutId(member.id); }
            if (phase === 'assign' && route) { selected = leadId === member.id; role = selected ? 'Lead assigned' : supportId === member.id ? 'Support assigned' : reserve && reserve.id === member.id ? 'Reserve' : 'Select as lead'; click = () => chooseLead(member.id); }
            return <CrewMember key={member.id} creature={member} strain={strain[member.id] || 0} selected={selected} role={role} onClick={click} disabled={disabled || !click} spentAbilities={spentAbilities} />;
          })}
          <div className="lr-ability-ledger">
            <p className="g-label">Expedition tools</p>
            {crew.flatMap((member) => member.abilities.map((ability) => (
              <div key={ability.id} className={spentAbilities.includes(ability.id) ? 'is-spent' : ''}>
                <span className={`g-el-${ability.medium}`}>{ability.action}</span><strong>{ability.name}</strong><small>{spentAbilities.includes(ability.id) ? 'SPENT' : ability.intensity}</small>
              </div>
            )))}
          </div>
        </aside>

        <section key={guidanceLevel === 'simple' ? wizardViewKey : scene.id} className={`lr-scene g-panel g-panel--bolted lr-wizard-view is-${wizardDirection} lr-wizard-phase-${phase}${phase === 'assign' && routeId ? ' is-plan' : ''}`} ref={sceneRef}>
          {guidanceLevel === 'simple' && <SimpleWizardChrome scene={scene} sceneIndex={sceneIndex} crew={crew} strain={strain} pressure={pressure} salvage={salvage} phase={phase} routeId={routeId} soundEnabled={soundEnabled} journalCount={journal.length} journalButtonRef={memoryTriggerRef} onJournal={() => setMemoryOpen(true)} onToggleSound={() => { const next = !soundEnabled; setSoundEnabled(next); writeSoundEnabled(next); playGameSound('select', next); }} onHelp={() => setMechanicsOpen(true)} />}
          <div className="lr-scene-heading">
            <div><p className="g-kicker">{scene.deck} / Scene {sceneIndex + 1} of {MISSION.scenes.length}</p><h2 className="g-h2">{scene.title}</h2></div>
            {scene.objective && <span className="lr-objective-badge">PRIMARY OBJECTIVE</span>}
            {scene.optional && <span className="lr-optional-badge">OPTIONAL DEPTH</span>}
          </div>
          <SceneStage scene={scene} phase={phase} crew={crew} scout={scanScout} encounter={phase === 'encounter' ? encounterCreature : null} companion={companion} runFlags={runFlags} />
          {guidanceLevel === 'simple' && <CurrentAction key={`${phase}-${sceneIndex}-${encounterState && encounterState.result ? 'resolved' : 'active'}-${routeId || 'none'}`} {...currentAction} onHelp={() => setMechanicsOpen(true)} />}
          <p className="lr-scene-copy">{scene.description}</p>
          <div className="lr-scene-orientation">
            <div><span>Immediate objective</span><strong>{scene.goal}</strong></div>
            <div><span>All routes converge at</span><strong>{scene.destination}</strong></div>
          </div>

          {phase === 'transition' && transition && (
            <div className="lr-transition-beat">
              <div className="lr-transition-route"><span>{transition.from}</span><BiIcon cls="bi-arrow-right" /><strong>{transition.to}</strong></div>
              <p>{scene.arrival || scene.description}</p>
              {transition.reaction && <blockquote><BiIcon cls="bi-chat-quote" /> “{transition.reaction}”</blockquote>}
              {transition.consequence && <div className="lr-memory-card">
                <BiIcon cls="bi-diagram-3-fill" />
                <div><span>Your earlier route matters here</span><strong>{transition.consequence.label}</strong><p>{transition.consequence.detail}</p></div>
              </div>}
              {guidanceLevel !== 'simple' && scene.routes.some((entry) => entry.activeEffects && entry.activeEffects.length) && <div className="lr-memory-effects">
                <span>Changed in this scene</span>
                {scene.routes.flatMap((entry) => entry.activeEffects.map((effect) => <div key={`${entry.id}-${effect.flag}`}><strong>{entry.title}</strong><b>{effect.difficulty < 0 ? 'Easier' : 'Harder'} by {Math.abs(effect.difficulty)}</b><small>{effect.detail}</small></div>))}
              </div>}
              <button type="button" className="g-btn g-btn--primary" onClick={enterScene}>Enter {scene.title} <BiIcon cls="bi-arrow-right" /></button>
            </div>
          )}

          {phase === 'encounter' && encounterState && encounterCreature && (
            <div className={`lr-field-encounter${encounterState.result ? ' is-resolved' : ''}`}>
              {!encounterState.result ? <>
                <div className="lr-encounter-heading">
                  <CreaturePortrait creature={encounterCreature} compact />
                  <div><span>{encounterState.mode === 'scout' ? 'Scout encounter' : encounterState.informed ? 'Prepared crew encounter' : 'Unexpected crew encounter'}</span><h3>{scene.encounter.title}</h3><p>{scene.encounter.description}</p></div>
                </div>
                {encounterState.mode === 'scout' && encounterState.outlook && <div className={`lr-encounter-posture is-${encounterState.outlook.posture}`}>
                  <strong>{encounterState.outlook.label}</strong>
                  <span>{encounterState.outlook.posture === 'scout-first' ? `${encounterState.scout.species} sees the native before being cornered.` : encounterState.outlook.posture === 'native-first' ? `The native catches ${encounterState.scout.species} out of position. The surprise costs 1 extra energy.` : `${encounterState.scout.species} and the native notice one another at the same moment.`}</span>
                  <small>{encounterState.outlook.channel ? `Crew contact available through ${encounterState.outlook.channel}.` : 'No remote crew contact. Getting help requires a physical return.'}</small>
                </div>}
                {encounterState.mode === 'group' && <div className="lr-encounter-posture"><strong>{encounterState.informed ? 'The crew arrives prepared' : 'The native acts before the crew can organize'}</strong><span>{encounterState.informed ? 'The scout’s warning prevents a surprise energy cost.' : 'The most defensive crew member will absorb the first consequence.'}</span></div>}
                <div className="lr-encounter-options">
                  {activeEncounterOptions.map((option) => {
                    const affectedCreature = encounterState.scout || [...crew].sort((a, b) => scoutProfile(scene, b).hold - scoutProfile(scene, a).hold)[0];
                    const strainCost = option.scoutStrain || option.crewStrain || 0;
                    const instabilityCost = option.instability || 0;
                    const presentation = encounterChoicePresentation(option);
                    const selected = encounterOptionId === option.id;
                    return <button type="button" key={option.id} className={`${option.recommended ? 'is-recommended' : ''}${selected ? ' is-selected' : ''}`} aria-pressed={guidanceLevel === 'simple' ? selected : undefined} title={guidanceLevel === 'simple' ? option.summary : undefined} onClick={() => guidanceLevel === 'simple' ? setEncounterOptionId(option.id) : resolveEncounter(option)}>
                      <span className="lr-encounter-choice-head">
                        <BiIcon cls={`bi ${presentation.identity.icon}`} />
                        <span><small>{presentation.identity.label}</small><strong>{option.label}</strong></span>
                        {option.recommended && <em>Recommended</em>}
                      </span>
                      <span className="lr-encounter-choice-path">
                        <span className={`is-action is-${presentation.identity.tone}`}><BiIcon cls={`bi ${presentation.identity.icon}`} /><small>Response</small><strong>{presentation.identity.label}</strong></span>
                        <BiIcon cls="bi bi-chevron-right" />
                        <span className={`is-cost${!strainCost && !instabilityCost ? ' is-clear' : ''}`}>
                          {!strainCost && !instabilityCost ? <><BiIcon cls="bi bi-shield-check" /><small>Immediate cost</small><strong>None</strong></> : <>
                            <span className="lr-encounter-cost-icons">{strainCost > 0 && <b><BiIcon cls="bi bi-lightning-charge-fill" />−{strainCost}</b>}{instabilityCost > 0 && <b><BiIcon cls="bi bi-building" />−{instabilityCost}</b>}</span>
                            <small>Immediate cost</small><strong>{strainCost && instabilityCost ? 'Energy + stability' : strainCost ? `${affectedCreature ? affectedCreature.species : 'Crew'} energy` : 'Annex stability'}</strong>
                          </>}
                        </span>
                        <BiIcon cls="bi bi-chevron-right" />
                        <span className={`is-outcome is-${presentation.outcome.tone}`}><BiIcon cls={`bi ${presentation.outcome.icon}`} /><small>Afterward</small><strong>{presentation.outcome.label}</strong></span>
                      </span>
                      {guidanceLevel !== 'simple' && <p>{option.summary}</p>}
                      <span className="lr-encounter-choice-state"><BiIcon cls={`bi ${selected ? 'bi-check-circle-fill' : 'bi-circle'}`} /> {selected ? 'Selected' : 'Preview response'}</span>
                    </button>;
                  })}
                </div>
                {guidanceLevel === 'simple' && <div className="lr-encounter-commit-bar">
                  <span>{encounterOptionId ? <><BiIcon cls="bi bi-check-circle-fill" /><small>Selected response</small><strong>{activeEncounterOptions.find((option) => option.id === encounterOptionId)?.label}</strong></> : <><BiIcon cls="bi bi-cursor-fill" /><strong>Choose a response above</strong></>}</span>
                  <button type="button" className="g-btn g-btn--primary" disabled={!encounterOptionId} onClick={() => resolveEncounter(activeEncounterOptions.find((option) => option.id === encounterOptionId))}>{encounterOptionId ? 'Take this action' : 'Select a response'} <BiIcon cls="bi bi-arrow-right" /></button>
                </div>}
              </> : <>
                <div className="lr-encounter-result-head"><BiIcon cls={`bi ${encounterState.result.companion ? 'bi-person-check-fill' : encounterState.result.resolution === 'detour' ? 'bi-arrow-return-right' : 'bi-shield-check'}`} /><div><span>Encounter resolved</span><h3>{encounterState.result.companion ? 'The native chooses to follow' : encounterState.result.resolution === 'unresolved' ? 'The scout returns with a warning' : encounterState.result.resolution === 'detour' ? 'The crew avoids contact' : 'The route is clear'}</h3></div></div>
                <p className="lr-simple-story">{encounterState.result.narrative}</p>
                <div className="lr-encounter-impact">
                  {(encounterState.result.scoutStrain || encounterState.result.crewStrain) > 0 ? <span><BiIcon cls="bi bi-lightning-charge-fill" /><strong>Energy spent</strong> −{encounterState.result.scoutStrain || encounterState.result.crewStrain}</span> : <span className="is-good"><BiIcon cls="bi bi-check-circle" /><strong>No energy spent</strong></span>}
                  {encounterState.result.instability > 0 ? <span><BiIcon cls="bi bi-building" /><strong>Stability lost</strong> −{encounterState.result.instability}</span> : <span className="is-good"><BiIcon cls="bi bi-check-circle" /><strong>No stability lost</strong></span>}
                  {encounterState.result.companion && <span className="is-good"><BiIcon cls="bi bi-person-plus-fill" /><strong>Field companion</strong> {scene.encounter.companionBenefit}</span>}
                </div>
                <button type="button" className="g-btn g-btn--primary" onClick={continueEncounter}>{encounterState.result.resolution === 'detour' ? 'Compare routes again' : encounterState.mode === 'scout' ? 'Review scout report' : 'Plan the crossing'} <BiIcon cls="bi-arrow-right" /></button>
              </>}
            </div>
          )}

          {phase === 'scout' && (guidanceLevel === 'simple' ? (
            <div className="lr-simple-decision">
              <div className="lr-simple-question"><span>Decision now</span><h3>Who should scout—or should the crew stay together?</h3><p>Select a creature to preview its full trip.</p></div>
              {scene.encounterHint && <details className="lr-field-sign"><summary><BiIcon cls="bi bi-binoculars-fill" /><span>Native trace detected</span><small>Contact is possible</small><BiIcon cls="bi bi-chevron-down" /></summary><p>{scene.encounterHint}</p></details>}
              <div className="lr-simple-scouts">
                {simpleScoutOptions.map((option, index) => {
                  const selected = scoutId === option.member.id;
                  return <button type="button" key={option.member.id} className={`${index === 0 ? 'is-recommended' : ''}${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => { playGameSound('select', soundEnabled); setScoutId(option.member.id); }}>
                    <CreaturePortrait creature={option.member} compact />
                    <span className="lr-scout-card-copy">
                      <span className="lr-scout-card-head">
                        {index === 0 && <em>Recommended</em>}
                        <strong>{option.member.species}</strong>
                        <small><BiIcon cls={scoutRoleIcon(option.profile.role)} /> {option.profile.role}</small>
                        {option.outlook && <span className="lr-scout-contact"><BiIcon cls="bi-exclamation-diamond" /><span><small>If a native appears</small><strong>{option.outlook.label}</strong></span></span>}
                      </span>
                      <span className={`lr-scout-relay ${option.preview.relay ? 'is-good' : 'is-warning'}`} aria-label={`${option.member.species} has ${option.profile.detect >= 80 ? 'excellent' : option.profile.detect >= 65 ? 'strong' : 'limited'} awareness and spends 1 energy scouting; ${option.preview.relay ? `its ${option.profile.channel} communication reaches the crew and the report arrives without a return trip` : 'it has no compatible relay, so it returns physically and spends 1 additional energy while the annex loses 1 stability'}`}>
                        <small>Likely trip</small>
                        <span className="lr-scout-storyline">
                          <span className="lr-scout-story-step is-discovery">
                            <BiIcon cls="bi bi-binoculars-fill" />
                            <span><small>Scout for danger</small><b>{option.profile.detect >= 80 ? 'Excellent awareness' : option.profile.detect >= 65 ? 'Strong awareness' : 'Limited awareness'}</b></span>
                            <SignalGauge value={option.profile.detect} label={`${option.member.species} scouting awareness`} />
                            <em className="is-energy"><BiIcon cls="bi bi-lightning-charge-fill" /> Uses 1 energy</em>
                          </span>
                          <BiIcon cls="bi-chevron-right" aria-hidden="true" />
                          <span className="lr-scout-story-step is-communication">
                            <BiIcon cls={option.preview.relay ? 'bi-broadcast-pin' : 'bi-broadcast'} />
                            <span><small>Communication</small><b>{option.preview.relay ? `${labelCase(option.profile.channel)} connects` : 'No compatible relay'}</b></span>
                          </span>
                          <BiIcon cls="bi-chevron-right" aria-hidden="true" />
                          <span className="lr-scout-story-step is-followup">
                            <BiIcon cls={option.preview.relay ? 'bi-check-circle-fill' : 'bi-arrow-return-left'} />
                            <span><small>{option.preview.relay ? 'Follow-up' : 'Must return'}</small><b>{option.preview.relay ? 'Report reaches crew' : 'Returns to crew'}</b></span>
                            {option.preview.relay
                              ? <em className="is-safe"><BiIcon cls="bi bi-shield-check" /> No return needed</em>
                              : <span className="lr-return-cost"><em className="is-energy"><BiIcon cls="bi bi-lightning-charge-fill" /> Uses 1 more energy</em><em className="is-stability"><BiIcon cls="bi bi-building" /> Loses 1 stability</em></span>}
                          </span>
                        </span>
                      </span>
                      <b className="lr-scout-action">{selected ? <><BiIcon cls="bi bi-check-circle-fill" /> Selected</> : <>Select <BiIcon cls="bi bi-arrow-right" /></>}</b>
                    </span>
                  </button>;
                })}
              </div>
              <div className="lr-scout-commit-bar">
                <button type="button" className="lr-simple-secondary" onClick={proceedBlind}><BiIcon cls="bi bi-people-fill" /><span><strong>Stay together</strong><small>No energy spent · danger stays hidden</small></span></button>
                <button type="button" className="g-btn g-btn--primary" disabled={!selectedScoutOption} onClick={() => selectedScoutOption && performScanFor(selectedScoutOption.member)}>{selectedScoutOption ? <>Send {selectedScoutOption.member.species} <BiIcon cls="bi bi-arrow-right" /></> : <>Select a scout <BiIcon cls="bi bi-lock-fill" /></>}</button>
              </div>
            </div>
          ) : (
            <div className="lr-phase-panel">
              <div className="lr-phase-intro"><span className="lr-step-number">01</span><div><h3>Read the scene</h3><p>Scanning costs the scout 1 energy. A strong sense still needs a communication channel that can cross this chamber.</p></div></div>
              <div className="lr-signal-board">
                <div><span>Relay accepts</span><strong>{scene.relayChannels.join(' / ')}</strong></div>
                <div><span>Known facets</span><strong>{scene.routes.length} routes / {scene.hazards.length} concealed signal</strong></div>
              </div>
              {scoutId && (() => {
                const preview = scanScene(scene, crew.find((member) => member.id === scoutId));
                return <div className={`lr-scan-preview${preview.relay ? ' is-good' : ''}`}><BiIcon cls={preview.relay ? 'bi-broadcast-pin' : 'bi-broadcast'} /><span>{preview.relay ? 'Relay channel established.' : 'No compatible relay. Detected details may be trapped with the scout.'}</span></div>;
              })()}
              <div className="lr-action-row">
                <button type="button" className="g-btn" onClick={proceedBlind}>Proceed Blind</button>
                <button type="button" className="g-btn g-btn--primary" disabled={!scoutId} title={!scoutId ? 'Select a scout from the crew rail first' : `Send ${scanScout.species} to scout`} onClick={performScan}>{scoutId ? 'Run Field Scan' : 'Select Scout to Enable Scan'} <BiIcon cls={scoutId ? 'bi-arrow-right' : 'bi-lock-fill'} /></button>
              </div>
            </div>
          ))}

          {phase === 'scan-result' && report && (guidanceLevel === 'simple' ? (
            <div className={`lr-simple-decision lr-simple-report is-${report.outcome}`}>
              <div className="lr-simple-report-result"><BiIcon cls={report.revealed.length ? 'bi-shield-exclamation' : report.outcome === 'blind' ? 'bi-eye-slash' : 'bi-check-circle'} /><div><span>Scout result</span><h3>{report.title}</h3></div></div>
              <p className="lr-simple-story">{report.narrative}</p>
              <div className="lr-simple-finding">
                <span>What matters for your next choice</span>
                {report.revealed.length ? report.revealed.map((hazard) => <strong key={hazard.id}><BiIcon cls="bi-exclamation-triangle-fill" /> {hazard.label}</strong>) : <strong><BiIcon cls="bi-question-circle" /> No route danger was confirmed</strong>}
                <p>{report.decision}</p>
              </div>
              {!scan.returned && scan.mode !== 'blind' ? <button type="button" className="g-btn g-btn--primary" onClick={recoverScout}>Wait for {scanScout.species} to return <span>−1 energy · −1 stability</span> <BiIcon cls="bi bi-arrow-right" /></button> : <button type="button" className="g-btn g-btn--primary" onClick={advanceToRoutes}>Choose a route <BiIcon cls="bi bi-arrow-right" /></button>}
            </div>
          ) : (
            <div className={`lr-phase-panel lr-scan-report lr-scan-report--${report.outcome}`}>
              <div className="lr-report-head">
                <span className="lr-report-seal"><BiIcon cls={report.outcome === 'revealed' ? 'bi-broadcast-pin' : report.outcome === 'trapped' || report.outcome === 'unrelayed' ? 'bi-reception-1' : report.outcome === 'blind' ? 'bi-eye-slash' : 'bi-check2-circle'} /></span>
                <div><p className="g-kicker">Step 02 / Field report / {scene.deck}</p><h3>{report.title}</h3></div>
              </div>
              <p className="lr-report-narrative">{report.narrative}</p>
              <div className="lr-report-readouts">
                <div><span>Scout</span><strong>{scanScout ? scanScout.species : 'None committed'}</strong></div>
                <div><span>Energy spent</span><strong>−{report.strainCost}</strong></div>
                <div><span>Relay</span><strong>{report.channel || (report.outcome === 'blind' ? 'Not attempted' : 'Failed')}</strong></div>
                <div><span>Actionable hazards</span><strong>{report.revealed.length} / {scene.hazards.length}</strong></div>
              </div>
              {report.revealed.map((hazard) => (
                <div className="lr-intel-card" key={hazard.id}>
                  <BiIcon cls="bi-exclamation-triangle-fill" />
                  <div><span>Confirmed hazard</span><strong>{hazard.label}</strong><p>{hazard.detail}</p><small>Affects: {report.affectedRoutes.filter((entry) => entry.hazardIds.includes(hazard.id)).map((entry) => entry.title).join(' / ')}</small></div>
                </div>
              ))}
              {report.trapped.map((hazard) => (
                <div className="lr-intel-card lr-intel-card--trapped" key={hazard.id}>
                  <BiIcon cls="bi-broadcast" />
                  <div><span>Scout-only impression</span><strong>Unresolved in command view</strong><p>The scout sensed a field response, but no usable description reached the crew.</p></div>
                </div>
              ))}
              <div className="lr-report-analysis">
                <div><span>Finding</span><p>{report.finding}</p></div>
                <div><span>How this changes your decision</span><p>{report.decision}</p></div>
              </div>
              <div className="lr-action-row">
                {!scan.returned && scan.mode !== 'blind' ? <button type="button" className="g-btn g-btn--primary" onClick={recoverScout}>Wait for scout return · −1 energy / −1 stability</button> : <button type="button" className="g-btn g-btn--primary" onClick={advanceToRoutes}>
                  {report.outcome === 'blind' ? 'Accept Unknowns & Compare Routes' : 'Acknowledge Report & Compare Routes'} <BiIcon cls="bi bi-arrow-right" />
                </button>}
              </div>
            </div>
          ))}

          {phase === 'assign' && scan && (
            <div className="lr-phase-panel">
              {guidanceLevel === 'simple' ? <>
                {!route && <div className="lr-simple-question"><span>Choose a route</span><h3>Which way will you take?</h3><p>Select a route to preview it. Nothing happens until the Act step.</p></div>}
              </> : <>
                <div className="lr-phase-intro"><span className="lr-step-number">03</span><div><h3>Choose the way through</h3><p>Compare the two routes, then assign the crossing crew.</p></div></div>
                <div className="lr-decision-brief">
                  <BiIcon cls="bi-signpost-split" />
                  <div><span>Objective</span><strong className="lr-decision-destination">{scene.title} <BiIcon cls="bi-arrow-right" /> {scene.destination}</strong><div className="lr-decision-steps"><b>1 · Route</b><b>2 · Crew</b><b>3 · Method</b></div></div>
                </div>
                {scan.revealedIds.length > 0 && <div className="lr-scan-strip"><BiIcon cls="bi-broadcast-pin" /><span>{scan.revealedIds.length} hazard signature relayed to command.</span></div>}
              </>}
              {!route && <RouteMap scene={scene} activeRouteId={routeVisualId || pendingRouteId} runFlags={runFlags} encounterStatus={encounterResolution ? { ...encounterResolution, label: encounterResolution.companion ? `${encounterCreature.species} joined the crew` : encounterResolution.resolution === 'unresolved' ? `${encounterCreature.species} remains in the route` : encounterResolution.resolution === 'detour' ? 'Crew withdrew from contact' : 'Native passage cleared' } : null} />}
              {guidanceLevel === 'simple' && route ? null : guidanceLevel === 'simple' ? <>
                {routeRecommendation && <div className="lr-route-guidance has-recommendation">
                  <BiIcon cls="bi bi-stars" />
                  <div><span>Command recommendation</span><strong>{routeRecommendation.plan.route.title}</strong><p>{routeRecommendation.reason}</p></div>
                </div>}
                <div className="lr-simple-routes">
                  {simpleRoutePlans.map((plan) => {
                    const recommended = routeRecommendation && routeRecommendation.plan.route.id === plan.route.id;
                    const selected = pendingRouteId === plan.route.id;
                    const advantage = routeAdvantage(plan, simpleRoutePlans);
                    return <article key={plan.route.id} data-lowest-risk={lowestRiskPlan && lowestRiskPlan.route.id === plan.route.id ? 'true' : undefined} className={`${selected ? 'is-selected' : ''}${recommended ? ' is-recommended' : ''}`}>
                      <button type="button" className="lr-route-choice-main" onClick={() => previewSimpleRoute(plan.route.id)} onMouseEnter={() => setRouteVisualId(plan.route.id)} onMouseLeave={() => setRouteVisualId(pendingRouteId)} onFocus={() => setRouteVisualId(plan.route.id)} onBlur={() => setRouteVisualId(pendingRouteId)} aria-pressed={selected}>
                        <span className="lr-simple-route-head"><em>{recommended ? 'Recommended' : advantage}</em><b>{plan.route.title}</b></span>
                        <p>{plan.route.description}</p>
                        <div className="lr-route-memory-slot">{plan.route.activeEffects && plan.route.activeEffects.map((effect) => <span className="lr-route-memory" key={effect.flag}><BiIcon cls="bi bi-diagram-3-fill" /><b>{effect.label}:</b> {effect.difficulty < 0 ? `this route is easier by ${Math.abs(effect.difficulty)}` : `this route is harder by ${effect.difficulty}`}</span>)}</div>
                        <RouteTradeoff plan={plan} rewardBaseline={routeRewardBaseline} strain={strain} pressure={pressure} companion={companion} />
                        <b className="lr-simple-route-action">{selected ? <><BiIcon cls="bi bi-check-circle-fill" /> Selected</> : <>Select this route <BiIcon cls="bi bi-arrow-right" /></>}</b>
                      </button>
                      <details className="lr-route-analysis"><summary><BiIcon cls="bi-info-circle" /> See analysis</summary><p>Best available plan: {plan.lead.species} leads with {plan.method.label}, supported by {plan.support.species}. Crew score {plan.teamScore} against target {plan.difficulty}. {plan.unresolvedHazards.length ? 'Hidden danger may still change the final cost.' : 'All route hazards are accounted for.'}</p></details>
                    </article>;
                  })}
                </div>
                {pendingRoutePlan && <div className="lr-route-continue" role="status">
                  <span><BiIcon cls="bi bi-check-circle-fill" /><span><small>Selected route</small><strong>{pendingRoutePlan.route.title}</strong></span></span>
                  <button type="button" className="g-btn lr-prepare-next" onClick={confirmSimpleRoute}>Next: review crew <BiIcon cls="bi bi-arrow-right" /><small>No crossing yet</small></button>
                </div>}
              </> : <div className="lr-route-grid">
                {scene.routes.map((entry) => <RouteCard key={entry.id} route={entry} selected={routeId === entry.id} onSelect={() => chooseRoute(entry.id)} onPreview={() => setRouteVisualId(entry.id)} onPreviewEnd={() => setRouteVisualId(routeId)} scan={scan} />)}
              </div>}

              {route && guidanceLevel === 'simple' && !simpleCustomizing && suggestedPlan && (
                <div className="lr-simple-plan">
                  <div className="lr-simple-plan-head"><BiIcon cls="bi bi-check2-circle" /><div><span><BiIcon cls="bi bi-signpost-split" /> {route.title}</span><h3>Crew plan ready</h3></div></div>
                  <div className="lr-simple-plan-crew" aria-label="Every creature crosses; each has a different role">
                    <span className="is-lead"><BiIcon cls="bi bi-play-fill" /><small>Lead acts</small><strong>{suggestedPlan.lead.species}</strong><em>{suggestedPlan.method.label}</em></span>
                    <BiIcon cls="bi bi-arrow-right" />
                    <span className="is-support"><BiIcon cls="bi bi-shield-fill-check" /><small>Support changes the attempt</small><strong>{suggestedPlan.support.species}</strong><em>{supportRoleForPlan(suggestedPlan)}</em></span>
                    <BiIcon cls="bi bi-arrow-right" />
                    {(() => { const planReserve = crew.find((member) => member.id !== suggestedPlan.lead.id && member.id !== suggestedPlan.support.id); return <span className="is-reserve"><BiIcon cls="bi bi-people-fill" /><small>Reserve still crosses</small><strong>{planReserve ? planReserve.species : 'Remaining crew'}</strong><em>No crossing energy spent</em></span>; })()}
                  </div>
                  <div className={`lr-simple-plan-outlook lr-outcome-summary--${suggestedPlan.quality}`}><span>These roles produce</span><strong>{suggestedPlan.label}</strong></div>
                  <div className="lr-simple-plan-projections"><RouteTradeoff plan={suggestedPlan} stabilityCost={Math.max(0, suggestedPlan.knownPressure - (useCommand && !suggestedPlan.naturalReaction ? 1 : 0))} reward={false} strain={strain} pressure={pressure} companion={companion} /></div>
                  <details className="lr-plan-analysis"><summary><BiIcon cls="bi bi-info-circle" /> Why this crew?</summary><p>{suggestedPlan.lead.species} contributes the strongest available match for {suggestedPlan.method.label}. {suggestedPlan.support.species} adds {suggestedPlan.supportBonus} support, producing team score {suggestedPlan.teamScore} against target {suggestedPlan.difficulty}.</p></details>
                  {!suggestedPlan.naturalReaction && commands > 0 && <label className="lr-simple-override"><input type="checkbox" checked={useCommand} onChange={(event) => setUseCommand(event.target.checked)} /><span>Use 1 command to preserve 1 annex stability</span></label>}
                  <div className="lr-simple-plan-actions">
                    <button type="button" className="lr-simple-secondary lr-customize-plan" onClick={() => setSimpleCustomizing(true)}><BiIcon cls="bi bi-sliders" /> Advanced: customize crew plan</button>
                    <button type="button" className="lr-simple-secondary" onClick={changeRoute}><BiIcon cls="bi bi-arrow-left" /> Back to routes</button>
                    <button type="button" className="g-btn g-btn--primary lr-cross-now" onClick={() => commit(suggestedPlan)}><BiIcon cls="bi bi-play-fill" /> Cross now<small>Take action · costs apply</small></button>
                  </div>
                </div>
              )}

              {route && (guidanceLevel !== 'simple' || simpleCustomizing) && (
                <div className="lr-assignment-board">
                  <div className="lr-assignment-head">
                    <div><p className="g-label">Crew assignment</p><span title="The lead performs the method, support contributes up to 10, and reserve spends no crossing energy.">Pick a lead, support, and method <BiIcon cls="bi-info-circle" /></span></div>
                    <div className="lr-assignment-mode"><small>Decision support</small><GuidanceSelector value={guidanceLevel} onChange={setGuidanceLevel} compact /></div>
                  </div>
                  <CrossingEquation
                    compact
                    leadScore={selectedForecast ? selectedForecast.leadScore : null}
                    supportBonus={selectedForecast ? selectedForecast.supportBonus : null}
                    teamScore={selectedForecast ? selectedForecast.teamScore : null}
                    target={route.difficulty}
                    margin={selectedForecast ? selectedForecast.margin : null}
                  />
                  <div className={`lr-assignment-guidance${assignment.ready ? ' is-ready' : ''}`} role="status" aria-live="polite">
                    <BiIcon cls={assignment.ready ? 'bi-check-circle-fill' : 'bi-arrow-right-circle-fill'} />
                    <strong>{assignment.message}</strong>
                  </div>
                  <div className="lr-role-picker">
                    <div className={assignment.step === 'lead' ? 'is-current' : ''}><span>1 · Lead</span><strong>{lead ? lead.species : 'Select from crew rail'}</strong></div>
                    <div className={`lr-support-select${assignment.step === 'support' ? ' is-current' : ''}`}>
                      <span>2 · Support <b>Required</b></span>
                      <div>{crew.filter((member) => member.id !== leadId && (strain[member.id] || 0) < MAX_STRAIN).map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          className={supportId === member.id ? 'is-selected' : ''}
                          disabled={!lead}
                          title={!lead ? 'Choose a lead creature first' : `Assign ${member.species} as support`}
                          onClick={() => setSupportId(member.id)}
                          aria-pressed={supportId === member.id}
                          aria-label={`Assign ${member.species} as support`}
                        >
                          <BiIcon cls={supportId === member.id ? 'bi-check-lg' : 'bi-plus-lg'} />
                          <span><strong>{member.species}</strong><small>{supportId === member.id ? 'Assigned' : 'Assign as support'}</small></span>
                        </button>
                      ))}</div>
                    </div>
                    <div><span>Auto · Reserve</span><strong>{reserve ? reserve.species : 'Assigned last'}</strong></div>
                  </div>

                  {lead && (
                    <div className={`lr-methods${assignment.step === 'method' ? ' is-current' : ''}`}>
                      <div className="lr-methods-head"><p className="g-label">3 · Method <b>Required</b></p>{guidanceLevel !== 'expert' && <div className="lr-methods-key"><span><i className="is-score" /> Team score</span><span><i className="is-target" /> Route target</span></div>}</div>
                      {guidanceLevel === 'guided' && support && recommendedForecast && (
                        <div className="lr-method-recommendation">
                          <BiIcon cls="bi-compass-fill" />
                          <div><span>Best known method</span><strong>{recommendedForecast.method.label}</strong><div className="lr-signal-chips"><b>{signed(recommendedForecast.margin)} margin</b><b>{recommendedForecast.label}</b><b>Base energy −{recommendedForecast.baseLeadStrain}</b>{recommendedForecast.unresolvedHazards.length > 0 && <b className="is-unknown"><BiIcon cls="bi-question-diamond" /> Hidden risk</b>}</div></div>
                        </div>
                      )}
                      {methodForecasts.map((forecast) => {
                        const entry = forecast.method;
                        const recommended = guidanceLevel === 'guided' && recommendedForecast && recommendedForecast.method.id === entry.id;
                        return (
                          <div key={entry.id} className={`lr-method-option${methodId === entry.id ? ' is-selected' : ''}${recommended ? ' is-recommended' : ''}`}>
                            <button type="button" className="lr-method-select" disabled={!support} title={!support ? 'Assign support before choosing a method' : `Choose ${entry.label}`} onClick={() => setMethodId(entry.id)} aria-pressed={methodId === entry.id}>
                              <span className="lr-method-icon"><BiIcon cls={`bi ${entry.kind === 'action' ? 'bi-lightning-charge' : entry.kind === 'capability' ? 'bi-person-fill' : entry.kind === 'trait' ? 'bi-shield-check' : 'bi-tools'}`} /></span>
                              <span className="lr-method-copy">
                                <span className="lr-method-name"><strong>{entry.label}</strong>{recommended && <em>Recommended</em>}</span>
                                <small>{entry.kind} · {entry.attribute ? ATTRIBUTE_LABELS[entry.attribute] : ''}</small>
                                {guidanceLevel !== 'expert' && <ForecastBar forecast={forecast} />}
                              </span>
                              <span className="lr-method-score">{guidanceLevel !== 'expert' && <small>Margin</small>}<b>{guidanceLevel === 'expert' ? forecast.leadScore : signed(forecast.margin)}</b>{guidanceLevel === 'guided' && <em className={`is-${forecast.quality}`}>{forecast.label}</em>}</span>
                            </button>
                            <button type="button" className="lr-info-button" onClick={() => setDetailMethodId(entry.id)} aria-label={`See calculation details for ${entry.label}`} title="See calculation details"><BiIcon cls="bi-info-circle" /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {lead && support && method && selectedForecast && (
                    <div className="lr-commit-readout">
                      {guidanceLevel === 'expert' ? (
                        <div className="g-screen lr-score-screen">
                          <span>METHOD {selectedForecast.leadScore}</span><i>+</i><span>SUPPORT {selectedForecast.supportBonus}</span><i>vs</i><strong>DIFFICULTY {selectedForecast.difficulty}</strong>
                        </div>
                      ) : (
                        <div className={`lr-outcome-summary lr-outcome-summary--${selectedForecast.quality}`}>
                          <div className="lr-outcome-head"><span>Known forecast</span><strong>{selectedForecast.label}</strong><b>{signed(selectedForecast.margin)} margin</b></div>
                          <div className="lr-outcome-signals">
                            <div><BiIcon cls="bi bi-check2-circle" /><span>Passage</span><strong>{selectedForecast.margin >= 0 ? 'Clear' : 'Forced'}</strong></div>
                            <div><BiIcon cls="bi bi-lightning-charge-fill" /><span>Known energy cost</span><strong>−{Math.max(0, selectedForecast.baseLeadStrain + selectedForecast.baseSupportStrain + selectedForecast.environment.strain - (selectedForecast.naturalReaction ? 1 : 0))}</strong></div>
                            <div><BiIcon cls="bi bi-building" /><span>Stability cost</span><strong>−{route.pressure + (!selectedForecast.naturalReaction && !useCommand ? 1 : 0)}</strong></div>
                            <div className={selectedForecast.unresolvedHazards.length ? 'is-unknown' : ''}><BiIcon cls="bi bi-question-diamond" /><span>Hidden risks</span><strong>{selectedForecast.unresolvedHazards.length || 'None'}</strong></div>
                          </div>
                          <div className="lr-outcome-flags">{selectedForecast.environment.notes.map((note) => <span key={note}><BiIcon cls="bi-exclamation-triangle" /> {note}</span>)}{!selectedForecast.environment.notes.length && <span className="is-good"><BiIcon cls="bi-check-lg" /> Environment compatible</span>}</div>
                          <button type="button" className="lr-calculation-link" onClick={() => setDetailMethodId(method.id)}><BiIcon cls="bi-info-circle" /> How this was calculated</button>
                        </div>
                      )}
                      <div className={`lr-reaction${leadReactionMatch ? ' is-match' : ''}`}>
                        <div><span>Temperament · {route.reaction.axis}</span><strong>{route.reaction.label}</strong></div>
                        <em>{leadReactionMatch ? <><BiIcon cls="bi-check-lg" /> Natural fit</> : <><BiIcon cls="bi-exclamation-triangle" /> Mismatch · stability −1</>}</em>
                        {guidanceLevel === 'guided' && !leadReactionMatch && <p className="lr-guided-tip"><BiIcon cls="bi-compass" /> Override preserves 1 annex stability</p>}
                        {!leadReactionMatch && commands > 0 && <label className="lr-command-toggle"><input type="checkbox" checked={useCommand} onChange={(event) => setUseCommand(event.target.checked)} /><span>Spend 1 command override</span></label>}
                      </div>
                    </div>
                  )}

                  <div className="lr-action-row">
                    <button type="button" className="g-btn" onClick={() => { setRouteId(null); setLeadId(null); setSupportId(null); setMethodId(null); }}>Clear Assignment</button>
                    <button type="button" className="g-btn g-btn--primary" disabled={!canCommit} onClick={commit}>
                      {!lead ? 'Choose Lead to Continue' : !support ? 'Choose Support to Continue' : !method ? 'Choose Method to Continue' : 'Cross now · take action'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <MethodDetailModal forecast={detailForecast} lead={lead} support={support} route={route} onClose={() => setDetailMethodId(null)} />
          <MechanicsModal open={mechanicsOpen} onClose={() => setMechanicsOpen(false)} />
          <MissionMemoryModal open={memoryOpen} onClose={() => { setMemoryOpen(false); requestAnimationFrame(() => memoryTriggerRef.current && memoryTriggerRef.current.focus()); }} entries={journal} runFlags={runFlags} companion={companion} salvage={salvage} pressure={pressure} objectiveReached={objectiveReached} />

          {phase === 'result' && lastResult && (guidanceLevel === 'simple' ? (
            <div className={`lr-simple-decision lr-simple-result${objectiveReached && !missionCannotContinue && sceneIndex < MISSION.scenes.length - 1 ? ' has-depth-decision' : ''}`}>
              <div className={`lr-simple-result-head is-${lastResult.impactQuality}`}><BiIcon cls={`bi ${lastResult.impactQuality === 'clean' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} /><div><span>Crossing complete · {lastResult.impactLabel}</span><h3>{lastResult.impactQuality === 'clean' ? 'The plan worked without a cost' : lastResult.impactQuality === 'costly' ? 'The crew crossed, but paid for it' : 'A hard-won crossing'}</h3></div></div>
              <p className="lr-simple-story">{lastResult.story}</p>
              <p className="lr-creature-reaction lr-turning-point"><BiIcon cls="bi bi-people-fill" /> {lastResult.turningPoint || lastResult.reaction}</p>
              <details className="lr-result-explanation"><summary>Why this happened · {lastResult.crewChanges[0].creature.species}'s crossing</summary><ul>{lastResult.causes.map((cause) => <li key={cause}>{cause}</li>)}</ul></details>
              <section className="lr-result-changes"><span>What changed</span><div>
                {lastResult.crewChanges.filter((change) => change.added > 0).map((change) => <article key={change.creature.id} className="is-warning"><span><BiIcon cls="bi bi-lightning-charge-fill" /><strong>{change.creature.species} energy</strong><b>−{change.added}</b></span><ProjectionTrack value={change.before} added={change.added} max={MAX_STRAIN} label={`${change.creature.species} energy`} kind="strain" /></article>)}
                {lastResult.instabilityChange.added > 0 && <article className="is-warning"><span><BiIcon cls="bi bi-building" /><strong>Annex stability</strong><b>−{lastResult.instabilityChange.added}</b></span><ProjectionTrack value={lastResult.instabilityChange.before} added={lastResult.instabilityChange.added} max={MAX_INSTABILITY} label="Annex stability" kind="annex" /></article>}
                {!lastResult.crewChanges.some((change) => change.added > 0) && !lastResult.instabilityChange.added && <article className="is-good lr-result-no-cost"><BiIcon cls="bi bi-check-circle-fill" /><strong>No energy or stability cost</strong></article>}
                <article className="lr-result-salvage"><span><BiIcon cls="bi bi-box-seam" /><strong>Salvage recovered</strong><b>+{lastResult.salvage}</b></span><SalvageGauge value={lastResult.salvage} /><small>{salvage} carried · bank on extraction</small></article>
              </div></section>
              {lastResult.companionHelp && lastResult.turningPoint !== lastResult.companionHelp && <div className="lr-simple-surprise is-good"><BiIcon cls="bi bi-person-check-fill" /><span><strong>Field companion intervened:</strong> {lastResult.companionHelp}</span></div>}
              {lastResult.unseenHazards.length > 0 && <div className="lr-simple-surprise"><BiIcon cls="bi bi-exclamation-triangle-fill" /><span><strong>Unexpected danger:</strong> {lastResult.unseenHazards.map((hazard) => hazard.label).join(', ')}</span></div>}
              {lastResult.consequence && <div className="lr-consequence-preview"><BiIcon cls="bi bi-diagram-3-fill" /><div><span>This choice carries forward</span><strong>{lastResult.consequence.label}</strong><p>{lastResult.consequence.future}</p></div></div>}
              {fieldWorkshop}
              <div className={`lr-next-stakes${missionCannotContinue ? ' is-critical' : ''}`}>
                <BiIcon cls={`bi ${objectiveReached ? 'bi-check-circle' : 'bi-compass'}`} />
                <div><strong>{missionCannotContinue ? 'The expedition cannot continue' : sceneIndex === MISSION.scenes.length - 1 ? 'The final crossing is behind you.' : objectiveReached ? 'The Index is yours. Everything deeper is optional.' : `${crossingsToIndex} ${crossingsToIndex === 1 ? 'crossing' : 'crossings'} to the Index`}</strong>
                  <span>{missionCannotContinue ? 'Forced extraction ends this run. Field repairs are no longer possible.' : sceneIndex === MISSION.scenes.length - 1 ? `Leave the annex to bank ${salvage} salvage and complete the deep retrieval.` : objectiveReached ? `Extract to bank ${salvage} salvage, or risk the remaining crew energy and ${MAX_INSTABILITY - pressure} stability for more.` : `${MAX_INSTABILITY - pressure} stability remains. Recover if needed, then press toward the archive.`}</span></div>
              </div>
              {!missionCannotContinue && objectiveReached && sceneIndex < MISSION.scenes.length - 1 ? <section className="lr-depth-decision" aria-labelledby="lr-depth-title">
                <div className="lr-depth-heading"><span>Mission fork</span><h4 id="lr-depth-title">Leave with the Index—or risk the optional depths</h4></div>
                <div className="lr-depth-options lr-result-actions">
                  <button type="button" className="g-btn lr-depth-option is-extract" onClick={extract}><BiIcon cls="bi bi-shield-check" /><span><small>Secure outcome</small><strong>Extract now</strong><em><b>{salvage}</b> salvage banked · Index secured</em></span><BiIcon cls="bi bi-arrow-right" /></button>
                  <button type="button" className="g-btn g-btn--primary lr-depth-option is-deeper" onClick={continueRun}><BiIcon cls="bi bi-arrow-down-right-circle" /><span><small>Optional risk</small><strong>Enter {MISSION.scenes[sceneIndex + 1].title}</strong><em>Up to <b>+{optionalSalvagePotential}</b> more salvage · {optionalScenesRemaining.length} {optionalScenesRemaining.length === 1 ? 'sector' : 'sectors'}</em></span><BiIcon cls="bi bi-arrow-right" /></button>
                </div>
                <div className="lr-depth-reserve"><span><BiIcon cls="bi bi-building" /><b>{MAX_INSTABILITY - pressure}</b> stability left</span>{crew.map((member) => <span key={member.id}><BiIcon cls="bi bi-lightning-charge-fill" /><b>{MAX_STRAIN - (strain[member.id] || 0)}</b> {member.species}</span>)}</div>
              </section> : <div className="lr-action-row lr-result-actions">
                {!missionCannotContinue && !objectiveReached && <button type="button" className="g-btn g-btn--danger" onClick={extract}>Abort mission</button>}
                <button type="button" className="g-btn g-btn--primary" onClick={continueRun}>{missionCannotContinue ? 'View mission report' : sceneIndex === MISSION.scenes.length - 1 ? 'Leave with full salvage' : 'Continue mission'} <BiIcon cls="bi bi-arrow-right" /></button>
              </div>}
            </div>
          ) : (
            <div className="lr-phase-panel lr-result-panel">
              <div className={`lr-result-banner lr-result-banner--${lastResult.quality}`}>
                <span>{lastResult.quality.toUpperCase()} PASSAGE</span>
                <strong>{lastResult.totalScore} <i>vs</i> {route.difficulty}</strong>
              </div>
              <h3>{lastResult.summary}</h3>
              <p className="lr-creature-reaction"><BiIcon cls="bi-chat-quote" /> {lastResult.reaction}</p>
              <div className="lr-result-grid">
                <div><span>Lead energy</span><strong>−{lastResult.leadStrain}</strong><small>{lead.species}</small></div>
                <div><span>Support energy</span><strong>−{lastResult.supportStrain}</strong><small>{support.species}</small></div>
                <div><span>Annex stability</span><strong>−{lastResult.pressure}</strong><small>external safety reserve</small></div>
                <div><span>Salvage</span><strong>+{lastResult.salvage}</strong><small>bank on extraction</small></div>
              </div>
              {lastResult.unseenHazards.length > 0 && <div className="lr-result-note lr-result-note--danger"><BiIcon cls="bi bi-exclamation-triangle-fill" /><span><strong>Unseen fallout:</strong> {lastResult.unseenHazards.map((hazard) => hazard.label).join(', ')}.</span></div>}
              {lastResult.environment.notes.length > 0 && <div className="lr-result-note"><BiIcon cls="bi bi-thermometer-snow" /><span>{lastResult.environment.notes.join('; ')}.</span></div>}
              <div className="lr-result-note"><BiIcon cls="bi bi-compass" /><span>{lastResult.naturalReaction ? 'The lead followed its natural response and preserved 1 energy.' : useCommand ? 'Command override kept the lead on plan.' : 'The lead followed its own nature; annex stability fell.'}</span></div>
              {lastResult.consequence && <div className="lr-result-note"><BiIcon cls="bi bi-diagram-3-fill" /><span><strong>{lastResult.consequence.label}:</strong> {lastResult.consequence.future}</span></div>}
              {fieldWorkshop}

              <div className="lr-action-row lr-result-actions">
                {!missionCannotContinue && (objectiveReached ? <button type="button" className="g-btn" onClick={extract}>Extract With {salvage} Salvage</button> : <button type="button" className="g-btn g-btn--danger" onClick={extract}>Abort Mission</button>)}
                <button type="button" className="g-btn g-btn--primary" onClick={continueRun}>{missionCannotContinue ? 'View Mission Report' : sceneIndex === MISSION.scenes.length - 1 ? 'Leave With Full Salvage' : objectiveReached ? 'Push Deeper' : 'Advance'}</button>
              </div>
            </div>
          ))}
        </section>

        <aside className="lr-log g-panel g-panel--recessed">
          <div className="lr-rail-title"><p className="g-kicker">Field printer</p><span>LIVE</span></div>
          <div className="g-screen lr-log-screen">
            {log.map((entry, index) => <div key={`${entry.title}-${index}`}><span>{entry.title}</span><p>{entry.text}</p></div>)}
          </div>
          <div className="lr-rules-note">
            <p className="g-label">Run contract</p>
            <ul>
              <li>Abilities work once per mission.</li>
              <li>At 3 energy a creature becomes worn and less effective.</li>
              <li>At 1 energy it is critical and cannot scout; at 0 it is spent.</li>
              <li>At 0 annex stability, forced extraction begins.</li>
              <li>Fewer than two active crew members also forces extraction.</li>
              <li>The objective survives a post-retrieval collapse.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default LongReturnGame;
