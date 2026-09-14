import React from 'react';
import { Check, Circle, Zap, Building2 } from 'lucide-react';
import BiIcon from './BiIcon';
import { encounterChoicePresentation } from './encounterPresentation';
import './encounterChoices.css';

export default function EncounterChoices({ options, actor, selectedId, onSelect }) {
  return <section className="lr-encounter-choice-board" aria-label="Compare encounter responses">
    <div className="lr-encounter-column-labels" aria-hidden="true"><span>Your response</span><span>Spend now</span><span>What it offers</span></div>
    <div className="lr-encounter-options">{options.map(option => {
      const selected = selectedId === option.id;
      const energy = option.scoutStrain || option.crewStrain || 0;
      const stability = option.instability || 0;
      const presentation = encounterChoicePresentation(option);
      return <button type="button" key={option.id} className={`${selected ? 'is-selected' : ''} ${option.recommended ? 'is-recommended' : ''}`} aria-pressed={selected} onClick={() => onSelect(option.id)}>
        <span className="lr-response-name">{selected ? <Check /> : <Circle />}<span><strong>{option.label}</strong>{option.recommended && <small>Recommended</small>}</span></span>
        <span className="lr-response-cost">{energy > 0 && <span><Zap />{energy} energy<small>{actor?.species}</small></span>}{stability > 0 && <span><Building2 />{stability} stability</span>}{!energy && !stability && <span>No cost</span>}</span>
        <span className="lr-response-outcome"><BiIcon cls={`bi ${presentation.outcome.icon}`} /><strong>{presentation.outcome.label}</strong></span>
      </button>;
    })}</div>
    <details className="lr-response-details"><summary>Why choose these responses?</summary>{options.map(option => <p key={option.id}><strong>{option.label}:</strong> {option.summary}</p>)}</details>
  </section>;
}
