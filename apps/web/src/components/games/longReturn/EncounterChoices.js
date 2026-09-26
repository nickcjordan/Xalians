import React from 'react';
import { Check, Circle, Zap, Building2 } from 'lucide-react';
import BiIcon from './BiIcon';
import { encounterChoicePresentation } from './encounterPresentation';
import './encounterChoices.css';
import { MAX_STRAIN } from './longReturnData';

export default function EncounterChoices({ options, actor, crew = [], strain = {}, selectedId, onSelect, description, storyFirst = false, energyRemaining = Infinity, stabilityRemaining = Infinity }) {
  if (storyFirst) return <section className="lr-story-responses" aria-label="Choose how to respond">
    {options.map(option => {
      const energy = option.scoutStrain || option.crewStrain || 0;
      const stability = option.instability || 0;
      const responder = crew.find(member => member.id === option.actorId) || actor;
      const remaining = option.actorId && responder ? MAX_STRAIN - (strain[responder.id] || 0) : energyRemaining;
      return <article key={option.id}>
        <button type="button" aria-pressed={selectedId === option.id} onClick={() => onSelect(option.id)}>
          <strong>{option.label}</strong><span>{option.summary}</span>
        </button>
        {energy >= remaining && energy > 0 && <p role="status">This uses {responder?.species}'s remaining energy.</p>}
        {stability >= stabilityRemaining && stability > 0 && <p role="status">The delay or disturbance uses the last stability and forces extraction.</p>}
        {selectedId === option.id && <details><summary>Effort involved</summary><p>{responder?.species}: {energy} energy. Annex: {stability} stability.</p></details>}
      </article>;
    })}
  </section>;
  return <section className="lr-encounter-choice-board" aria-label="Compare encounter responses">
    <div className="lr-encounter-column-labels" aria-hidden="true"><span>Your response</span><span>Spend now</span><span>What it offers</span></div>
    <div className="lr-encounter-options">{options.map(option => {
      const selected = selectedId === option.id;
      const energy = option.scoutStrain || option.crewStrain || 0;
      const stability = option.instability || 0;
      const presentation = encounterChoicePresentation(option);
      const responder = crew.find(member => member.id === option.actorId) || actor;
      return <button type="button" key={option.id} className={`${selected ? 'is-selected' : ''} ${option.recommended ? 'is-recommended' : ''}`} aria-pressed={selected} onClick={() => onSelect(option.id)}>
        <span className="lr-response-name">{selected ? <Check /> : <Circle />}<span><strong>{option.label}</strong>{option.recommended && <small>Recommended</small>}</span></span>
        <span className="lr-response-cost">{energy > 0 && <span><Zap />{energy} energy<small>{responder?.species}</small></span>}{stability > 0 && <span><Building2 />{stability} stability</span>}{!energy && !stability && <span>No cost</span>}</span>
        <span className="lr-response-outcome"><BiIcon cls={`bi ${presentation.outcome.icon}`} /><strong>{presentation.outcome.label}</strong></span>
      </button>;
    })}</div>
    <details className="lr-response-details"><summary>Read encounter and response details</summary>{description && <p>{description}</p>}{options.map(option => <p key={option.id}><strong>{option.label}:</strong> {option.summary}</p>)}</details>
  </section>;
}
