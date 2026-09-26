// Tier: immersive. Crew choices explain the approach and the condition affecting it.
import React from 'react';
import { Check, Zap, Building2, Hourglass } from 'lucide-react';
import XalianImage from '../../xalianImage';
import { comparisonCosts } from './RouteComparison';
import './leadChoices.css';
import { methodIdentity, planApproachExplanation } from './methodProvenance';

export default function LeadChoices({ plans, selectedId, onSelect, companion }) {
  const sharedAction = plans.length > 1 && plans.every(plan => methodIdentity(plan.method).action === methodIdentity(plans[0].method).action);
  const selectedPlan = plans.find(plan => plan.lead.id === selectedId);
  return <section data-tier="immersive" className="lr-lead-options" aria-label="Who leads?">
    <div className="lr-lead-options-list" aria-label="Compare crossing leads">
      {plans.map(plan => { const cost = comparisonCosts(plan, companion); const identity = methodIdentity(plan.method); const leadCost = cost.lead; return <button key={plan.lead.id} type="button" aria-pressed={plan.lead.id === selectedId} onClick={() => onSelect(plan.lead.id)}>
        <span className="lr-lead-option-portrait"><XalianImage colored speciesName={plan.lead.species} primaryType={plan.lead.element.primary} /></span>
        <span className="lr-lead-option-method"><strong>{plan.lead.species}</strong><span className={sharedAction ? 'lr-lead-shared-action' : ''}>{identity.action}</span><small>{planApproachExplanation(plan)}</small>{plan.readiness?.lead?.scorePenalty > 0 && <small data-lead-readiness className="inline-flex items-center gap-1"><Zap className="size-3.5 shrink-0" />Weakened by low energy</small>}{plan.leadEnergy <= leadCost && <em className="lr-lead-spent">No lead energy left afterward</em>}</span>
        <span className="lr-lead-option-cost" aria-label={`${cost.energy} known energy cost, ${cost.stability} known stability cost`}><span><Zap size={18} />{cost.energy === 0 ? 'No known energy cost' : `Spend ${cost.energy} energy`}</span>{cost.assisted && <small className="lr-lead-ally-saving">{companion.creature?.species || 'Ally'} {cost.saved > 0 ? 'saves 1 · uses its one help' : 'helps once · lead still exhausted'}</small>}{cost.stability > 0 && <span><Building2 size={18} />Lose {cost.stability} stability</span>}{identity.limited && <small className="lr-lead-one-use"><Hourglass size={16} />Ability spent</small>}</span>
        {plan.lead.id === selectedId && <Check size={18} aria-label="Selected lead" />}
      </button>; })}
    </div>
    {selectedPlan && <details className="lr-lead-analysis"><summary>Why this lead?</summary><p>{planApproachExplanation(selectedPlan)}</p>{selectedPlan.method.abilityId && <p>This method uses a one-use ability. It will not be available later in this expedition.</p>}</details>}
    {plans.some(plan => comparisonCosts(plan, companion).uncertain) && <p className="lr-lead-uncertainty">Unscouted route: costs may rise.</p>}
  </section>;
}
