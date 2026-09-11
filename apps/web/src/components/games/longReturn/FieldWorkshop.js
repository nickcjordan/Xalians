import React, { useState } from 'react';
import { fieldOptions } from './fieldOperations';
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
import BiIcon from './BiIcon';

export default function FieldWorkshop({ crew, strain, pressure, salvage, commands, used, receipt, onChoose }) {
  const [selected, setSelected] = useState(null);
  const options = fieldOptions({ crew, strain, pressure, salvage, commands, used });
  const choice = options.find(option => option.id === selected);
  if (receipt) return <section className="lr-field-receipt" role="status"><BiIcon cls="bi bi-check-circle" /><div><strong>Field work complete</strong><p>{receipt.result}</p><small>{receipt.cost} salvage spent · {salvage} still carried</small></div></section>;
  if (!options.length) return null;
  return <details className="lr-workshop">
    <summary><BiIcon cls="bi bi-tools" /><span><strong>Repair now—or bank the haul</strong><small>Trade final salvage for energy or stability</small></span><b>{salvage} carried <BiIcon cls="bi bi-chevron-down" /></b></summary>
    <div className="lr-workshop-body">
      <div className="lr-workshop-bank" aria-label={`Keep all ${salvage} salvage for extraction`}>
        <BiIcon cls="bi bi-box-seam" />
        <span><small>Keep the haul</small><strong>Bank +{salvage} at extraction</strong></span>
        <em>No repair now</em>
      </div>
      <p>Or spend salvage on one field repair before continuing.</p>
      <div className="lr-workshop-options">{options.map(option => <button type="button" key={option.id} disabled={!!option.disabled} aria-pressed={selected === option.id} title={option.reason} onClick={() => setSelected(option.id)}>
        <BiIcon cls={`bi ${option.kind === 'recover' ? 'bi-lightning-charge-fill' : option.kind === 'brace' ? 'bi-shield-check' : 'bi-broadcast-pin'}`} />
        <strong>{option.title}</strong>
        <span className="lr-workshop-flow"><b className="is-cost"><BiIcon cls="bi bi-box-seam" />−{option.cost}</b><BiIcon cls="bi bi-arrow-right" /><b className="is-gain"><BiIcon cls={`bi ${option.kind === 'recover' ? 'bi-lightning-charge-fill' : option.kind === 'brace' ? 'bi-building' : 'bi-broadcast-pin'}`} />+{option.after - option.before}</b>{option.kind !== 'recover' && <b className="is-worker"><BiIcon cls="bi bi-lightning-charge-fill" />−1 {option.creature.species}</b>}</span>
        <small>{option.disabled || (option.kind === 'recover' ? `${option.after}/${MAX_STRAIN} energy after` : option.kind === 'brace' ? `${option.after}/${MAX_INSTABILITY} stability after` : `${option.after}/2 overrides after`)}</small>
      </button>)}</div>
      {choice && !choice.disabled && <div className="lr-workshop-confirm"><span><BiIcon cls="bi bi-check-circle-fill" /><small>Selected field work</small><strong>{choice.title}</strong></span><button type="button" className="g-btn g-btn--primary" onClick={() => onChoose(choice.id)}>Spend {choice.cost} salvage <BiIcon cls="bi bi-arrow-right" /></button></div>}
    </div>
  </details>;
}

export function MissionJournal({ entries }) {
  if (!entries.length) return null;
  return <details className="lr-mission-journal"><summary><BiIcon cls="bi bi-journal-text" /> Your expedition · {entries.length} {entries.length === 1 ? 'crossing' : 'crossings'} <BiIcon cls="bi bi-chevron-down" /></summary>
    <ol>{entries.map((entry, index) => <li key={entry.id}><span className="lr-journal-number">{index + 1}</span><div><small>{entry.scene}</small><strong>{entry.route}</strong><p>{entry.story}</p><span>{entry.lead} led · {entry.energy ? `${entry.energy} energy spent` : 'No energy spent'} · {entry.stability ? `${entry.stability} stability lost` : 'No stability lost'} · {entry.salvage} salvage recovered</span>{entry.fieldWork && <p className="lr-journal-field"><BiIcon cls="bi bi-tools" /> {entry.fieldWork}</p>}</div></li>)}</ol>
  </details>;
}
