import React from 'react';
import { Zap, Building2, Package, Check, ArrowRight, HelpCircle, ShieldCheck, Hourglass } from 'lucide-react';
import './routeComparison.css';
import { routeSetting } from './sceneOrientation';

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
export default function RouteComparison({ plans, selectedId, onSelect, onPreview, companion, recommendation }) {
  const values = plans.map(plan => comparisonCosts(plan, companion));
  const lowestRisk = Math.min(...plans.map(plan => plan.risk));
  const rows = [{ key: 'energy', label: 'Spend energy', Icon: Zap },
    { key: 'stability', label: 'Lose stability', Icon: Building2 },
    { key: 'salvage', label: 'Bring back', Icon: Package }];
  return <div className="lr-route-board" role="table" aria-label="Compare route costs and rewards">
    <div className="lr-board-row lr-board-head" role="row">
      <div className="lr-board-axis" role="columnheader">Choose your crossing</div>
      {plans.map((plan, index) => <div key={plan.route.id} role="columnheader" data-lowest-risk={plan.risk === lowestRisk ? 'true' : undefined} className={`${selectedId === plan.route.id ? 'is-selected' : ''}${recommendation?.plan.route.id === plan.route.id ? ' is-recommended' : ''}`}>
        <button type="button" className="lr-board-pick" aria-pressed={selectedId === plan.route.id} onClick={() => onSelect(plan.route.id)} onMouseEnter={() => onPreview(plan.route.id)} onFocus={() => onPreview(plan.route.id)}>
          <strong>{plan.route.title}</strong>
          <span className="lr-route-setting">{routeSetting[plan.route.id] || plan.route.description}</span>
          <span className={values[index].uncertain ? 'is-uncertain' : 'is-known'}>{values[index].uncertain ? <HelpCircle /> : <ShieldCheck />}{values[index].uncertain ? 'Extra costs unknown' : 'Costs confirmed'}</span>
          {recommendation?.plan.route.id === plan.route.id && <em title={recommendation.reason}>Recommended</em>}
        </button>
      </div>)}
    </div>
    {rows.map(({ key, label, Icon }) => <div className={`lr-board-row is-${key}`} role="row" key={key}>
      <div className="lr-board-axis" role="rowheader"><Icon /><strong>{label}</strong>{key === 'salvage' && <small>Salvage</small>}</div>
      {plans.map((plan, index) => {
        const value = values[index][key];
        const unknown = key !== 'salvage' && values[index].uncertain;
        return <div key={plan.route.id} role="cell" className={`lr-board-value${selectedId === plan.route.id ? ' is-selected' : ''}`} aria-label={`${plan.route.title}: ${value} ${key}${unknown ? ' known, plus unknown extra cost' : ''}`}>
          <div className="lr-board-amount">{(!unknown || value > 0) && <b>{value}</b>}<span className="lr-board-token-run" aria-hidden="true">{Array.from({ length: value }, (_, i) => <Icon key={i} />)}</span>{unknown && <span className="lr-board-unknown" title={`${value} known cost. The scout has not established the extra cost; it may affect energy, stability, or both.`}>{value > 0 ? '+ ?' : '?'}</span>}{value === 0 && !unknown && <Check aria-label="None spent" />}</div>
          <small>{key === 'energy' && values[index].saved > 0 ? `${companion.creature.species} saves 1 · uses its one help` : unknown ? value > 0 ? 'known cost + unknown extra' : 'total unknown' : key === 'salvage' ? 'salvage' : value === 0 ? 'none spent' : 'fixed cost'}</small>
          {key === 'energy' && values[index].exhaustsLead && <small className="lr-board-exhaustion">{plan.lead.species} has no energy left afterward{values[index].assisted ? ' · even with ally help' : ''}</small>}
        </div>;
      })}
    </div>)}
    {plans.some(plan => plan.method.abilityId) && <div className="lr-board-row lr-board-abilities" role="row">
      <div className="lr-board-axis" role="rowheader"><Hourglass /><strong>One-use tools</strong></div>
      {plans.map(plan => <div role="cell" key={plan.route.id} className={selectedId === plan.route.id ? 'is-selected' : ''}>{plan.method.abilityId ? <><strong>Uses {plan.method.ability?.name || 'ability'}</strong><small>Unavailable afterward</small></> : <><Check aria-hidden="true" /><strong>All kept</strong></>}</div>)}
    </div>}
    {plans.some(plan => plan.route.consequence) && <div className="lr-board-row lr-board-future" role="row">
      <div className="lr-board-axis" role="rowheader"><ArrowRight /><strong>Next sector</strong></div>
      {plans.map(plan => <div role="cell" key={plan.route.id} className={selectedId === plan.route.id ? 'is-selected' : ''}><strong>{plan.route.consequence?.label || 'No lasting change'}</strong><small>{plan.route.consequence?.future}</small></div>)}
    </div>}
    <div className="lr-board-row lr-board-footer" role="row">
      <div className="lr-board-axis" role="rowheader">Your route</div>
      {plans.map((plan, index) => <div role="cell" key={plan.route.id} className={selectedId === plan.route.id ? 'is-selected' : ''}>
        <button type="button" className="lr-board-select" aria-label={`Choose crew for: ${plan.route.title}`} aria-pressed={selectedId === plan.route.id} onClick={() => onSelect(plan.route.id)}>Choose who leads<ArrowRight /></button>
        <details className="lr-board-analysis"><summary>Why these costs?</summary><p>{plan.route.description}</p><p>{plan.lead.species} leads with {plan.method.label}; {plan.support.species} supports. Crew score {plan.teamScore} against target {plan.difficulty}.</p>{values[index].saved > 0 && <p>{companion.creature.species} preserves 1 lead energy.</p>}{values[index].requiredEnergy > values[index].energy && <p>The effort demands {values[index].requiredEnergy} energy, but only {values[index].energy} can be spent from the assigned creatures' reserves. The lead is exhausted, not prevented from crossing.</p>}<p>{values[index].uncertain ? 'The displayed cost is the known part. An unresolved hazard or native encounter can add energy or stability costs.' : 'These costs include the chosen crew, method, and known conditions.'}</p>{plan.route.consequence && <p><strong>{plan.route.consequence.label}:</strong> {plan.route.consequence.future}</p>}</details>
      </div>)}
    </div>
  </div>;
}
