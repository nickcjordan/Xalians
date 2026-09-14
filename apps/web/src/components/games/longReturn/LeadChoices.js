import React from 'react';
import { Check, Zap, Building2 } from 'lucide-react';
import XalianImage from '../../xalianImage';
import { comparisonCosts } from './RouteComparison';
import './leadChoices.css';
import { methodIdentity } from './methodProvenance';

export default function LeadChoices({ plans, selectedId, onSelect, companion }) {
  return <details className="lr-lead-options"><summary>Try a different lead</summary>
    <div className="lr-lead-options-list" aria-label="Compare crossing leads">
      {plans.map(plan => { const cost = comparisonCosts(plan, companion); const identity = methodIdentity(plan.method); return <button key={plan.lead.id} type="button" aria-pressed={plan.lead.id === selectedId} onClick={event => { const picker=event.currentTarget.closest('details'); onSelect(plan.lead.id); picker.open=false; picker.querySelector('summary').focus(); }}>
        <span className="lr-lead-option-portrait"><XalianImage colored speciesName={plan.lead.species} primaryType={plan.lead.element.primary} /></span>
        <span className="lr-lead-option-method"><strong>{plan.lead.species}</strong><span>{identity.action}</span><small>{identity.source} · {identity.limited ? 'One use' : identity.strength}</small>{plan.leadEnergy <= Math.max(0, plan.knownLeadStrain - (companion?.ready ? 1 : 0)) && <em className="lr-lead-spent">No lead energy left afterward</em>}</span>
        <span className="lr-lead-option-cost" aria-label={`${cost.energy} known energy cost, ${cost.stability} known stability cost`}><span><Zap size={16} />{cost.energy} energy</span><span><Building2 size={16} />{cost.stability} stability</span><small>{cost.uncertain ? '+ unknown danger' : 'cost to cross'}</small></span>
        {plan.lead.id === selectedId && <Check size={18} aria-label="Selected lead" />}
      </button>; })}
    </div>
  </details>;
}
