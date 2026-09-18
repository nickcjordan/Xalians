// Tier: immersive. A shared comparison keeps both paths beside the same cost axis.
import React, { useState } from 'react';
import { Zap, Building2, Package, Check, ArrowRight, HelpCircle, ShieldCheck, Hourglass, TriangleAlert } from 'lucide-react';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import './routeComparison.css';
import { routeSetting } from './sceneOrientation';
import { consequencePreview } from './routeVisuals';

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
function costCaption(plan, key, value, unknown, saved, companion) {
  if (key === 'salvage') return 'salvage';
  if (key === 'energy' && plan.route.sustainedWork) return 'Careful plate recovery';
  if (key === 'energy' && saved > 0) return `${companion.creature.species} saves 1 · uses its one help`;
  if (unknown) return value > 0 ? 'known cost + unknown extra' : 'total unknown';
  if (value === 0) return 'none spent';
  if (key === 'stability' && plan.route.id === 'stabilize') return 'Wavering field';
  if (key === 'stability' && plan.route.id === 'blackbox') return 'Cradle gives way';
  return null;
}
export default function RouteComparison({ scene, plans, crew = [], selectedId, onSelect, onPreview, companion, recommendation, map, stakes = [] }) {
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
    {scene && <caption className="lr-board-context"><span>{scene.title}</span><strong>{scene.goal}</strong>{map && <div className="lr-board-map">{map}</div>}</caption>}
    <colgroup><col className="w-20 md:w-28" />{plans.map(plan => <col key={plan.route.id} />)}</colgroup>
    <TableHeader className="top-14 z-20 bg-s0 [@media(min-height:40rem)]:sticky lg:static"><TableRow className={`${rowClass} lr-board-head`}>
      <TableHead className={axisClass} scope="col">Choose your crossing</TableHead>
      {plans.map((plan, index) => <TableHead key={plan.route.id} role="columnheader" scope="col" data-route-preview={plan.route.id} data-lowest-risk={plan.risk === lowestRisk ? 'true' : undefined} className={`${cellClass} ${selectedId === plan.route.id ? 'is-selected' : ''}${recommendation?.plan.route.id === plan.route.id ? ' is-recommended' : ''}`}>
        <Button variant="ghost" type="button" className="lr-board-pick h-auto min-h-11 w-full flex-col items-start justify-start gap-2 p-0 has-[>svg]:px-0 text-left font-body text-body normal-case tracking-normal whitespace-normal text-ink" aria-label={`Choose lead for: ${plan.route.title}. Preview: ${plan.lead.species} leads.`} aria-pressed={selectedId === plan.route.id} onClick={() => onSelect(plan.route.id)}>
          <span className="flex items-start gap-2"><b aria-hidden="true" className="lr-board-route-tag">{index ? 'B' : 'A'}</b><strong className="text-body md:text-subhead">{plan.route.title}</strong></span>
          <span className="lr-board-plan-lead">{crew.findIndex(member => member.id === plan.lead.id) >= 0 && <b aria-hidden="true">{crew.findIndex(member => member.id === plan.lead.id) + 1}</b>}{plan.lead.species} leads</span>
          <span className={`flex items-center gap-1 text-small ${values[index].uncertain ? 'text-caution' : 'text-ink-2'}`} title={values[index].uncertain ? 'Extra costs are unknown' : 'Costs are confirmed'}>{values[index].uncertain ? <HelpCircle /> : <ShieldCheck />}{values[index].uncertain ? 'Unknown' : 'Known'}</span>
          {recommendation?.plan.route.id === plan.route.id && <em className="text-small text-ink-2" title={recommendation.reason}>Recommended</em>}
          <span className="lr-board-next text-small font-bold text-viable">Pick lead <ArrowRight className="size-4" /></span>
        </Button>
      </TableHead>)}
    </TableRow></TableHeader>
    <TableBody>{rows.map(({ key, label, Icon }) => <TableRow className={`${rowClass} is-${key}`} key={key}>
      <TableHead className={axisClass} role="rowheader" scope="row"><Icon className="mb-1 size-5" /><strong>{label}</strong></TableHead>
      {plans.map((plan, index) => {
        const value = values[index][key];
        const unknown = key !== 'salvage' && values[index].uncertain;
        const caption = costCaption(plan, key, value, unknown, values[index].saved, companion);
        return <TableCell key={plan.route.id} role="cell" data-route-preview={plan.route.id} className={`${cellClass} lr-board-value ${selectedId === plan.route.id ? 'is-selected' : ''}`} aria-label={`${plan.route.title}: ${value} ${key}${unknown ? ' known, plus unknown extra cost' : ''}`}>
          <div className="lr-board-amount mb-1 flex flex-wrap items-center gap-2 text-heading">{(!unknown || value > 0) && <b>{value}</b>}{unknown && <span className="lr-board-unknown border border-dashed border-current px-2" title={`${value} known cost. The scout has not established the extra cost; it may affect energy, stability, or both.`}>{value > 0 ? '+ ?' : '?'}</span>}{value === 0 && !unknown && <Check className="size-4" aria-label="None spent" />}</div>
          {caption && <small className="block text-small text-ink-2">{caption}</small>}
          {stakes[index]?.kind === key
            ? <small className="lr-board-ending inline-flex items-start gap-1 text-small text-caution" title={stakes[index].detail}><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Forced extraction afterward</small>
            : key === 'energy' && values[index].exhaustsLead && <small className="lr-board-exhaustion block text-small text-caution">{plan.lead.species} has no energy left afterward{values[index].assisted ? ' · even with ally help' : ''}</small>}
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
