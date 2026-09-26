import React from 'react';
import XalianImage from '../../xalianImage';
import { comparisonCosts } from './RouteComparison';
import { planApproachExplanation } from './methodProvenance';
import './creatureActions.css';

// Keep the physical intention, actor, and commitment in the same scene.
export default function CreatureActions({ scene, plans, choices, selectedId, onSelect, onChange, onCommit, companion, stakes, map, knownHazards = [], nativeKnown = false, commands, useCommand, onCommand }) {
  return <section className="lr-creature-actions" aria-label="Choose a creature action">
    <header><h3>{scene.id === 'archive-vestibule' ? 'How will you open the door?' : scene.objective ? 'How will you recover the Index?' : scene.optional ? 'How will you recover what remains?' : 'How will the crew get through?'}</h3></header>
    {map}
    <div className="lr-creature-action-grid">{plans.map((plan, index) => {
      const cost = comparisonCosts(plan, companion);
      const selected = selectedId === plan.route.id;
      const alternatives = choices[plan.route.id] || [];
      const members = [...new Map(alternatives.map(entry => [entry.lead.id, entry.lead])).values()];
      const techniques = alternatives.filter(entry => entry.lead.id === plan.lead.id);
      return <article key={plan.route.id} data-route-preview={plan.route.id} className={selected ? 'is-selected' : ''}>
        <button type="button" className="lr-intention" aria-pressed={selected} onClick={() => onSelect(plan.route.id)}>
          <span>{plan.route.title}</span>
          <strong>{plan.lead.species}: {plan.method.label}</strong>
          <span>{plan.route.description}</span>
        </button>
        {knownHazards.filter(hazard => plan.route.hazardIds.includes(hazard.id) && !plan.method.bypassedHazardIds?.includes(hazard.id)).map(hazard => <p key={hazard.id}>Known danger: {hazard.detail}</p>)}
        {plan.changedSelection && <p className="lr-action-warning" role="status">{plan.changedSelection}</p>}
        {plan.nativeRisk && nativeKnown && <p className="lr-action-warning">Someone occupies this passage. The crew will need to respond before completing the work.</p>}
        {(selected || cost.energy >= 3) && (cost.energy > 0 || cost.stability > 0) && <p>{cost.energy >= 3 ? 'Demanding for the crew. ' : cost.energy > 0 ? 'Takes some crew energy. ' : ''}{cost.stability > 0 ? 'Strains the annex.' : ''}</p>}
        {plan.route.consequence && <p className="lr-action-consequence">{plan.route.consequence.preview || plan.route.consequence.detail}</p>}
        {cost.uncertain && <p className="lr-action-warning">The route has unresolved dangers. The crossing may take more out of the crew.</p>}
        {plan.method.abilityId && <p className="lr-action-warning">Uses {plan.method.ability?.name || plan.method.label} once. It will be unavailable afterward.</p>}
        {stakes[index] && <p className="lr-action-warning"><strong>{stakes[index].label}</strong> {stakes[index].detail}</p>}
        {!stakes[index] && cost.exhaustsLead && <p className="lr-action-warning">This uses {plan.lead.species}'s remaining energy.</p>}
        {selected && <><div className="lr-action-creatures" role="group" aria-label={`Who will ${plan.route.title.toLowerCase()}?`}>
          {members.map(member => <button type="button" key={member.id} aria-label={`Choose ${member.species} for ${plan.route.title}`} aria-pressed={member.id === plan.lead.id} onClick={() => {
            const available = alternatives.filter(entry => entry.lead.id === member.id);
            const next = available.find(entry => entry.method.id === plan.method.id) || [...available].sort((a, b) => a.risk - b.risk)[0];
            if (next) onChange(next);
          }}><XalianImage colored variant="token" speciesName={member.species} primaryType={member.element.primary} /><span>{member.species}</span></button>)}
        </div><div role="group" aria-label={`${plan.lead.species}'s technique`}>
          {techniques.map(entry => <button key={entry.method.id} type="button" className={`lr-technique-action${entry.method.memoryId ? ' lr-discovered-action' : ''}`} aria-pressed={plan.method.id === entry.method.id} onClick={() => onChange(entry)}>
            {entry.method.memoryId && <small>From an earlier discovery</small>}
            <strong>{entry.method.label}</strong>
            {entry.method.observation && <small>{entry.method.observation}</small>}
          </button>)}
        </div>
        <details><summary>Effort and crew details</summary>
          <p>{planApproachExplanation(plan)}</p>
          {plan.route.consequence && !plan.route.consequence.preview && <p>{plan.route.consequence.future}</p>}
          <p>{plan.support.species} supports; everyone crosses.</p>
          <p>Energy: {cost.energy}{cost.uncertain ? ' + unknown extra' : ''}. Stability: {cost.stability}{cost.uncertain ? ' + unknown extra' : ''}. Salvage: {cost.salvage}.</p>
          <p>Crew score {plan.teamScore} against target {plan.difficulty}.</p>
        </details></>}
        {selected && !plan.naturalReaction && commands > 0 && <label><span><input type="checkbox" checked={useCommand} onChange={event => onCommand(event.target.checked)} /> Guide the response</span><small>Use 1 command to preserve 1 annex stability.</small></label>}
        {selected && <button type="button" className="g-btn g-btn--primary" onClick={() => onCommit(plan)}>Go with {plan.lead.species}<span>{plan.method.label}</span></button>}
      </article>;
    })}</div>
  </section>;
}
