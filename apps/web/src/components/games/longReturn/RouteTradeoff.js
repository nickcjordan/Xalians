import React from 'react';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';

function ResourceMeter({ kind, label, current, max, cost }) {
  const remaining = Math.max(0, current - cost);
  const icon = kind === 'energy' ? 'bi-lightning-charge-fill' : 'bi-building';
  const summary = `${label}: ${current} available; ${cost} spent; ${remaining} remains`;
  return <div className={`lr-hud-meter is-${kind}`} aria-label={summary}>
    <div className="lr-hud-meter-label">
      <span><i className={`bi ${icon}`} aria-hidden="true" />{label}</span>
      <b>{cost ? `−${cost}` : 'safe'}</b>
    </div>
    <div className="lr-hud-pips" aria-hidden="true">
      {Array.from({ length: max }, (_, index) => {
        const full = index < current;
        const threatened = full && index >= remaining;
        return <i className={`${full ? 'is-full' : 'is-empty'}${threatened ? ' is-threatened' : ''}`} key={index} />;
      })}
    </div>
  </div>;
}

function HiddenRisk() {
  return <div className="lr-hidden-risk" aria-label="An unscouted hazard may consume crew energy, annex stability, or both">
    <span className="lr-hidden-risk__signal"><i className="bi bi-radar" /><b>?</b></span>
    <span><small>Unscouted hazard</small><strong>Cost can rise</strong></span>
    <span className="lr-hidden-risk__stakes" aria-hidden="true"><i className="bi bi-lightning-charge-fill" /><i className="bi bi-building" /><b>?</b></span>
  </div>;
}

// The preview names the reserves exposed by an unresolved hazard without
// revealing its identity or exact payload.
export default function RouteTradeoff({ plan, stabilityCost = plan.knownPressure, reward = true, rewardBaseline = 0, strain = {}, pressure = 0, companion = null }) {
  const uncertain = !!(plan.unresolvedHazards.length || plan.nativeRisk);
  const companionWillHelp = !!(companion && companion.ready && plan.knownLeadStrain > 0 && !uncertain);
  const leadCost = Math.max(0, plan.knownLeadStrain - (companionWillHelp ? 1 : 0));
  const supportCost = plan.baseSupportStrain;
  const leadEnergy = MAX_STRAIN - (strain[plan.lead.id] || 0);
  const supportEnergy = plan.support ? MAX_STRAIN - (strain[plan.support.id] || 0) : 0;
  const stability = MAX_INSTABILITY - pressure;
  const showLead = leadCost > 0;
  const showSupport = plan.support && supportCost > 0;
  const noKnownDrain = !uncertain && !leadCost && !supportCost && !stabilityCost;
  const extraReward = Math.max(0, plan.route.salvage - rewardBaseline);
  return <div className={`lr-route-tradeoff${uncertain ? ' has-unknown-cost' : ''}`}>
    {reward ? <div className={`lr-route-contract${uncertain ? ' is-gamble' : ' is-fixed'}`}>
      <span><small>{uncertain ? 'Risk' : 'Cost'}</small><strong><i className={`bi ${uncertain ? 'bi-dice-5-fill' : 'bi-shield-check'}`} />{uncertain ? 'Unscouted gamble' : 'Predictable crossing'}</strong></span>
      <i className="bi bi-arrow-right" aria-hidden="true" />
      <span className="is-reward lr-route-reward"><small>Haul</small><strong>+{plan.route.salvage} <i className="bi bi-box-seam" /></strong>{extraReward > 0 && <em>+{extraReward} more than safer route</em>}</span>
    </div> : <div className={`lr-hud-certainty${uncertain ? ' is-unknown' : ''}`}><i className={`bi ${uncertain ? 'bi-dice-5-fill' : 'bi-shield-check'}`} /><span>{uncertain ? 'Hidden hazard can still raise this cost' : 'Known crossing cost'}</span></div>}
    {companionWillHelp && <div className="lr-companion-preview" aria-label={`${companion.creature.species} will preserve 1 ${plan.lead.species} energy`}>
      <span><i className="bi bi-person-check-fill" /><b>{companion.creature.species}</b></span><i className="bi bi-arrow-right" /><span><i className="bi bi-lightning-charge-fill" /><b>1 energy preserved</b></span>
    </div>}
    <div className="lr-hud-resources">
      {showLead && <ResourceMeter kind="energy" label={`${plan.lead.species} energy`} current={leadEnergy} max={MAX_STRAIN} cost={leadCost} />}
      {showSupport && <ResourceMeter kind="energy" label={`${plan.support.species} energy`} current={supportEnergy} max={MAX_STRAIN} cost={supportCost} />}
      {stabilityCost > 0 && <ResourceMeter kind="stability" label="Annex stability" current={stability} max={MAX_INSTABILITY} cost={stabilityCost} />}
      {noKnownDrain && <div className="lr-hud-clean"><i className="bi bi-shield-check" /><strong>No resources at risk</strong></div>}
      {uncertain && <HiddenRisk />}
    </div>
  </div>;
}
