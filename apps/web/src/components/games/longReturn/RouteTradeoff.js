import React from 'react';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';

function ResourceMeter({ kind, label, current, max, cost, uncertain }) {
  const remaining = Math.max(0, current - cost);
  const icon = kind === 'energy' ? 'bi-lightning-charge-fill' : 'bi-building';
  const summary = uncertain
    ? `${label}: ${current} available; outcome unknown`
    : `${label}: ${current} available; ${cost} spent; ${remaining} remains`;
  return <div className={`lr-hud-meter is-${kind}${uncertain ? ' is-unknown' : ''}`} aria-label={summary}>
    <div className="lr-hud-meter-label">
      <span><i className={`bi ${icon}`} aria-hidden="true" />{label}</span>
      {uncertain ? <b><i className="bi bi-question-diamond" /> outcome unknown</b> : <b>{cost ? `−${cost}` : 'safe'}</b>}
    </div>
    <div className="lr-hud-pips" aria-hidden="true">
      {Array.from({ length: max }, (_, index) => {
        const full = index < current;
        const threatened = !uncertain && full && index >= remaining;
        return <i className={`${full ? 'is-full' : 'is-empty'}${threatened ? ' is-threatened' : ''}`} key={index} />;
      })}
      {uncertain && <span className="lr-hud-unknown-signal"><i className="bi bi-question-lg" /></span>}
    </div>
  </div>;
}

// Unknown hazards deliberately use identical fogged meters. Never inspect hidden
// hazard amounts here: the preview may reveal uncertainty, not its secret payload.
export default function RouteTradeoff({ plan, stabilityCost = plan.knownPressure, reward = true, strain = {}, pressure = 0, companion = null }) {
  const uncertain = !!(plan.unresolvedHazards.length || plan.nativeRisk);
  const companionWillHelp = !!(companion && companion.ready && plan.knownLeadStrain > 0 && !uncertain);
  const leadCost = Math.max(0, plan.knownLeadStrain - (companionWillHelp ? 1 : 0));
  const supportCost = plan.baseSupportStrain;
  const leadEnergy = MAX_STRAIN - (strain[plan.lead.id] || 0);
  const supportEnergy = plan.support ? MAX_STRAIN - (strain[plan.support.id] || 0) : 0;
  const stability = MAX_INSTABILITY - pressure;
  const showLead = uncertain || leadCost > 0;
  const showSupport = plan.support && supportCost > 0;
  const noKnownDrain = !uncertain && !leadCost && !supportCost && !stabilityCost;
  return <div className={`lr-route-tradeoff${uncertain ? ' has-unknown-cost' : ''}`}>
    <div className={`lr-hud-certainty${uncertain ? ' is-unknown' : ''}`}>
      <i className={`bi ${uncertain ? 'bi-question-diamond' : 'bi-check-circle-fill'}`} aria-hidden="true" />
      <span>{uncertain ? 'Route beyond sensor range' : 'Route fully mapped'}</span>
    </div>
    {companionWillHelp && <div className="lr-companion-preview" aria-label={`${companion.creature.species} will preserve 1 ${plan.lead.species} energy`}>
      <span><i className="bi bi-person-check-fill" /><b>{companion.creature.species}</b></span><i className="bi bi-arrow-right" /><span><i className="bi bi-lightning-charge-fill" /><b>1 energy preserved</b></span>
    </div>}
    <div className="lr-hud-resources">
      {showLead && <ResourceMeter kind="energy" label={`${plan.lead.species} energy`} current={leadEnergy} max={MAX_STRAIN} cost={leadCost} uncertain={uncertain} />}
      {showSupport && <ResourceMeter kind="energy" label={`${plan.support.species} energy`} current={supportEnergy} max={MAX_STRAIN} cost={supportCost} uncertain={false} />}
      {(uncertain || stabilityCost > 0) && <ResourceMeter kind="stability" label="Annex stability" current={stability} max={MAX_INSTABILITY} cost={stabilityCost} uncertain={uncertain} />}
      {noKnownDrain && <div className="lr-hud-clean"><i className="bi bi-shield-check" /><strong>No resources at risk</strong></div>}
    </div>
    {reward && plan.route.salvage > 0 && <div className="lr-hud-salvage" aria-label={`${plan.route.salvage} salvage can be recovered`}>
      <span>Possible haul</span><strong>+{plan.route.salvage}</strong>
      <span aria-hidden="true">{Array.from({ length: Math.min(plan.route.salvage, 10) }, (_, index) => <i className="bi bi-box-seam" key={index} />)}</span>
    </div>}
  </div>;
}
