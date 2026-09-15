import React from 'react';
import { Check, Zap, Building2, Hourglass } from 'lucide-react';
import XalianImage from '../../xalianImage';
import { comparisonCosts } from './RouteComparison';
import './leadChoices.css';
import { methodIdentity, approachExplanation } from './methodProvenance';

export default function LeadChoices({ plans, selectedId, onSelect, companion }) {
  return <section className="lr-lead-options" aria-label="Who leads?">
    <div className="lr-lead-options-list" aria-label="Compare crossing leads">
      {plans.map(plan => { const cost = comparisonCosts(plan, companion); const identity = methodIdentity(plan.method); const leadCost = Math.max(0, cost.energy - plan.baseSupportStrain); return <button key={plan.lead.id} type="button" aria-pressed={plan.lead.id === selectedId} onClick={() => onSelect(plan.lead.id)}>
        <span className="lr-lead-option-portrait"><XalianImage colored speciesName={plan.lead.species} primaryType={plan.lead.element.primary} /></span>
        <span className="lr-lead-option-method"><strong>{plan.lead.species}</strong><span>{identity.action}</span><small>{approachExplanation(plan.method)}</small>{plan.leadEnergy <= leadCost && <em className="lr-lead-spent">No lead energy left afterward</em>}</span>
        <span className="lr-lead-option-cost" aria-label={`${cost.energy} known energy cost, ${cost.stability} known stability cost`}><span><Zap size={18} />{cost.energy === 0 ? 'No known energy cost' : `Spend ${cost.energy} energy`}</span>{cost.stability > 0 && <span><Building2 size={18} />Lose {cost.stability} stability</span>}<small><Hourglass size={16} />{identity.limited ? 'Ability unavailable after crossing' : 'Keep one-use abilities'}</small></span>
        {plan.lead.id === selectedId && <Check size={18} aria-label="Selected lead" />}
        {plan.baseSupportStrain > 0 && <span className="lr-lead-shared-cost">Energy shared: {plan.lead.species} {leadCost} · {plan.support.species} {plan.baseSupportStrain}</span>}
      </button>; })}
    </div>
    {plans.some(plan => comparisonCosts(plan, companion).uncertain) && <p className="lr-lead-uncertainty">Unscouted danger can add costs to any of these approaches.</p>}
  </section>;
}
