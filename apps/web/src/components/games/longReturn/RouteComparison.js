// Tier: immersive. A shared comparison keeps both paths beside the same cost axis.
import React, { useState } from 'react';
import { Zap, Building2, Package, Check, ArrowRight, HelpCircle, ShieldCheck, Hourglass } from 'lucide-react';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import './routeComparison.css';
import { routeSetting } from './sceneOrientation';
import { consequencePreview } from './routeVisuals';
import { SHARED_PASSAGES } from './mapPlaces';

// The room map is above the phone comparison. Keep its two physical paths
// recognizable in the headings without pinning a second full map over costs.
function RoutePathCue({ scene, routeId, index }) {
  if (!scene || SHARED_PASSAGES[scene.id]) return null;
  const upper = 'M5 10 H20 V3 H75 V10 H95';
  const lower = 'M5 10 H20 V17 H75 V10 H95';
  return <svg data-route-path-cue={routeId} aria-hidden="true" viewBox="0 0 100 20" className="lr-board-path-cue block size-auto h-5 w-full max-w-28" fill="none">
    <path d={upper} stroke="var(--color-edge-strong)" strokeWidth="2" />
    <path d={lower} stroke="var(--color-edge-strong)" strokeWidth="2" />
    <path d={index === 0 ? upper : lower} stroke="var(--color-viable)" strokeWidth="2.5" />
    <circle cx="5" cy="10" r="3" fill="var(--color-ink)" />
    <circle cx="95" cy="10" r="3" fill="var(--color-ink)" />
  </svg>;
}

export function comparisonCosts(plan, companion) {
  const uncertain = !!(plan.unresolvedHazards.length || plan.nativeRisk);
  const assisted = !!(companion?.ready && !uncertain && plan.knownLeadStrain > 0);
  const requiredLead = Math.max(0, plan.knownLeadStrain - (assisted ? 1 : 0));
  const lead = Math.min(plan.leadEnergy ?? Infinity, requiredLead);
  const support = Math.min(plan.supportEnergy ?? Infinity, plan.baseSupportStrain);
  const saved = Math.min(plan.leadEnergy ?? Infinity, plan.knownLeadStrain) - lead;
  return { energy: lead + support, lead, support, requiredEnergy: requiredLead + plan.baseSupportStrain,
    stability: plan.knownPressure, salvage: plan.route.salvage, uncertain, saved, assisted,
    exhaustsLead: plan.leadEnergy !== undefined && requiredLead >= plan.leadEnergy };
}

// A single table makes the row labels, token sizes and uncertainty grammar shared.
// Unknown tokens have no numeric width: they must never imply a damage range.
const cellClass = 'border-l border-edge-strong p-2 md:p-3 whitespace-normal align-top [&.is-selected]:bg-caution-tint';
const axisClass = 'lr-board-axis p-2 md:p-3 text-left text-small font-normal text-ink-2 whitespace-normal';
const rowClass = 'lr-board-row border-edge-strong hover:bg-transparent';
export default function RouteComparison({ scene, plans, selectedId, onSelect, onPreview, companion, recommendation }) {
  const [analysisId, setAnalysisId] = useState(null);
  const focusedRoute = board => board.querySelector(':focus')?.closest('[data-route-preview]')?.dataset.routePreview;
  const previewColumn = event => onPreview?.(event.target.closest('[data-route-preview]')?.dataset.routePreview || focusedRoute(event.currentTarget) || selectedId || null);
  const restorePreview = event => onPreview?.(focusedRoute(event.currentTarget) || selectedId || null);
  const values = plans.map(plan => comparisonCosts(plan, companion));
  const lowestRisk = Math.min(...plans.map(plan => plan.risk));
  const rows = [{ key: 'energy', label: 'Spend energy', Icon: Zap },
    { key: 'stability', label: 'Lose stability', Icon: Building2 },
    { key: 'salvage', label: 'Bring back', Icon: Package }];
  return <Table data-tier="immersive" className="lr-route-board scroll-mt-14 table-fixed border border-edge-strong bg-s0 font-body text-small" role="table" tabIndex={-1} aria-label="Compare route costs and rewards" onPointerMove={previewColumn} onPointerLeave={restorePreview} onFocus={previewColumn} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onPreview?.(selectedId || null); }}>
    {scene && <caption className="lr-board-context"><span>{scene.title}</span><strong>{scene.goal}</strong></caption>}
    <colgroup><col className="w-20 md:w-28" />{plans.map(plan => <col key={plan.route.id} />)}</colgroup>
    <TableHeader className="top-14 z-20 bg-s0 [@media(min-height:40rem)]:sticky lg:static"><TableRow className={`${rowClass} lr-board-head`}>
      <TableHead className={axisClass} scope="col">Choose your crossing</TableHead>
      {plans.map((plan, index) => <TableHead key={plan.route.id} role="columnheader" scope="col" data-route-preview={plan.route.id} data-lowest-risk={plan.risk === lowestRisk ? 'true' : undefined} className={`${cellClass} ${selectedId === plan.route.id ? 'is-selected' : ''}${recommendation?.plan.route.id === plan.route.id ? ' is-recommended' : ''}`}>
        <Button variant="ghost" type="button" className="lr-board-pick h-auto min-h-11 w-full flex-col items-start justify-start gap-2 p-0 has-[>svg]:px-0 text-left font-body text-body normal-case tracking-normal whitespace-normal text-ink" aria-label={`Choose crew for: ${plan.route.title}`} aria-pressed={selectedId === plan.route.id} onClick={() => onSelect(plan.route.id)}>
          <strong className="text-body md:text-subhead">{plan.route.title}</strong>
          <RoutePathCue scene={scene} routeId={plan.route.id} index={index} />
          <span className={`flex items-center gap-1 text-small ${values[index].uncertain ? 'text-caution' : 'text-ink-2'}`}>{values[index].uncertain ? <HelpCircle /> : <ShieldCheck />}{values[index].uncertain ? 'Extra costs unknown' : 'Costs confirmed'}</span>
          {recommendation?.plan.route.id === plan.route.id && <em className="text-small text-ink-2" title={recommendation.reason}>Recommended</em>}
          <span className="lr-board-next text-small font-bold text-viable">Choose lead <ArrowRight className="size-4" /></span>
        </Button>
      </TableHead>)}
    </TableRow></TableHeader>
    <TableBody>{rows.map(({ key, label, Icon }) => <TableRow className={`${rowClass} is-${key}`} key={key}>
      <TableHead className={axisClass} role="rowheader" scope="row"><Icon className="mb-1 size-5" /><strong>{label}</strong></TableHead>
      {plans.map((plan, index) => {
        const value = values[index][key];
        const unknown = key !== 'salvage' && values[index].uncertain;
        return <TableCell key={plan.route.id} role="cell" data-route-preview={plan.route.id} className={`${cellClass} lr-board-value ${selectedId === plan.route.id ? 'is-selected' : ''}`} aria-label={`${plan.route.title}: ${value} ${key}${unknown ? ' known, plus unknown extra cost' : ''}`}>
          <div className="lr-board-amount mb-1 flex flex-wrap items-center gap-2 text-heading">{(!unknown || value > 0) && <b>{value}</b>}{unknown && <span className="lr-board-unknown border border-dashed border-current px-2" title={`${value} known cost. The scout has not established the extra cost; it may affect energy, stability, or both.`}>{value > 0 ? '+ ?' : '?'}</span>}{value === 0 && !unknown && <Check className="size-4" aria-label="None spent" />}</div>
          <small className="block text-small text-ink-2">{key === 'energy' && values[index].saved > 0 ? `${companion.creature.species} saves 1 · uses its one help` : unknown ? value > 0 ? 'known cost + unknown extra' : 'total unknown' : key === 'salvage' ? 'salvage' : value === 0 ? 'none spent' : 'fixed cost'}</small>
          {key === 'energy' && values[index].exhaustsLead && <small className="lr-board-exhaustion block text-small text-caution">{plan.lead.species} has no energy left afterward{values[index].assisted ? ' · even with ally help' : ''}</small>}
        </TableCell>;
      })}
    </TableRow>)}
    {plans.some(plan => plan.method.abilityId) && <TableRow className={`${rowClass} lr-board-abilities`}>
      <TableHead className={axisClass} role="rowheader" scope="row"><Hourglass className="mb-1 size-5" /><strong>One-use tools</strong></TableHead>
      {plans.map(plan => <TableCell role="cell" key={plan.route.id} data-route-preview={plan.route.id} className={`${cellClass} ${selectedId === plan.route.id ? 'is-selected' : ''}`}>{plan.method.abilityId ? <><strong>Uses {plan.method.ability?.name || 'ability'}</strong><small className="block text-small text-ink-2">Unavailable afterward</small></> : <strong>All kept</strong>}</TableCell>)}
    </TableRow>}
    {plans.some(plan => plan.route.consequence) && <TableRow className={`${rowClass} lr-board-future`}>
      <TableHead className={axisClass} role="rowheader" scope="row"><ArrowRight className="mb-1 size-5" /><strong>Next room</strong></TableHead>
      {plans.map(plan => <TableCell role="cell" key={plan.route.id} data-route-preview={plan.route.id} className={`${cellClass} ${selectedId === plan.route.id ? 'is-selected' : ''}`}><strong>{consequencePreview(plan.route)}</strong></TableCell>)}
    </TableRow>}
    <TableRow className={`${rowClass} lr-board-footer`}>
      <TableHead className={axisClass} role="rowheader" scope="row">More detail</TableHead>
      {plans.map((plan, index) => <TableCell role="cell" key={plan.route.id} data-route-preview={plan.route.id} className={`${cellClass} ${selectedId === plan.route.id ? 'is-selected' : ''}`}>
        <Button variant="ghost" type="button" className="lr-board-analysis h-auto min-h-11 w-full px-0 py-2 has-[>svg]:px-0 font-body text-body normal-case tracking-normal whitespace-normal" aria-label={`Why these costs: ${plan.route.title}`} aria-expanded={analysisId === plan.route.id} aria-controls={`route-analysis-${plan.route.id}`} onClick={() => setAnalysisId(analysisId === plan.route.id ? null : plan.route.id)}>Why these costs?<ArrowRight className={analysisId === plan.route.id ? 'rotate-90' : ''} /></Button>
      </TableCell>)}
    </TableRow>
    {plans.map((plan, index) => <TableRow key={plan.route.id} hidden={analysisId !== plan.route.id} className={rowClass}>
      <TableCell colSpan={plans.length + 1} className="p-4 whitespace-normal" data-route-preview={plan.route.id}>
        <section id={`route-analysis-${plan.route.id}`} aria-label={`${plan.route.title}: cost analysis`} className="max-w-[62ch] space-y-3 font-body text-body text-ink-2">
          <h3 className="m-0 text-body font-bold text-ink">{plan.route.title}</h3>
          <p className="lr-route-setting">{routeSetting[plan.route.id] || plan.route.description}</p><p>{plan.lead.species} leads with {plan.method.label}; {plan.support.species} supports. Crew score {plan.teamScore} against target {plan.difficulty}.</p>{values[index].saved > 0 && <p>{companion.creature.species} preserves 1 lead energy.</p>}{values[index].requiredEnergy > values[index].energy && <p>The effort demands {values[index].requiredEnergy} energy, but only {values[index].energy} can be spent from the assigned creatures' reserves. The lead is exhausted, not prevented from crossing.</p>}<p>{values[index].uncertain ? 'The displayed cost is the known part. An unresolved hazard or native encounter can add energy or stability costs.' : 'These costs include the chosen crew, method, and known conditions.'}</p>{plan.route.consequence && <p><strong>{plan.route.consequence.label}:</strong> {plan.route.consequence.future}</p>}
        </section>
      </TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}
