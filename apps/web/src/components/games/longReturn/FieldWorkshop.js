import React, { useEffect, useRef, useState } from 'react';
import { fieldOptions, fieldWorkStory } from './fieldOperations';
import { MAX_STRAIN } from './longReturnData';
import BiIcon from './BiIcon';
import FieldExchange from './FieldExchange';

export default function FieldWorkshop({ crew, strain, pressure, salvage, commands, used, receipt, onChoose }) {
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [reviewingCrossing, setReviewingCrossing] = useState(false);
  const summaryRef = useRef(null);
  const showRepairs = value => {
    setExpanded(value);
    requestAnimationFrame(() => {
      summaryRef.current?.focus();
      summaryRef.current?.closest('.lr-simple-result')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  };
  const receiptRef = useRef(null);
  useEffect(() => { if (receipt) { receiptRef.current?.focus(); receiptRef.current?.closest('.lr-simple-result')?.scrollIntoView?.({ block:'start', behavior:'instant' }); } }, [receipt]);
  const options = fieldOptions({ crew, strain, pressure, salvage, commands, used });
  const choice = options.find(option => option.id === selected);
  const renderOption = option => <button type="button" key={option.id} disabled={!!option.disabled} aria-pressed={selected === option.id} title={option.reason} onClick={() => setSelected(option.id)}>
    <BiIcon cls={option.kind === 'recover' ? 'bi-lightning-charge-fill' : option.kind === 'brace' ? 'bi-shield-check' : 'bi-broadcast-pin'} />
    <strong>{option.title}</strong>
    <span className="lr-workshop-flow"><b className="is-cost"><BiIcon cls="bi-box-seam" />{option.cost} salvage</b><BiIcon cls="bi-arrow-right" /><b className="is-gain">+{option.after - option.before} {option.kind === 'recover' ? 'energy' : option.kind === 'brace' ? 'stability' : 'override'}</b></span>
    {option.energy > 0 && <small>Repair effort: {option.creature.species} spends {option.energy} energy</small>}
    {option.disabled && <small>{option.disabled}</small>}
  </button>;
  const unavailable = options.filter(option => option.disabled);
  if (receipt) return <section className={`lr-field-receipt${reviewingCrossing ? ' is-reviewing-crossing' : ''}`} aria-label="Field work complete">
    <button type="button" className="lr-lead-back" aria-expanded={reviewingCrossing} onClick={() => setReviewingCrossing(!reviewingCrossing)}>{reviewingCrossing ? 'Back to repair result' : '← Review crossing'}</button>
    <h4 ref={receiptRef} tabIndex={-1}><BiIcon cls="bi-check-circle" />{receipt.title} · complete</h4>
    <p className="lr-field-work-story">{fieldWorkStory(receipt)}</p>
    <FieldExchange option={receipt} salvageBefore={salvage + receipt.cost} energyBefore={MAX_STRAIN - (strain[receipt.creature.id] || 0) + receipt.energy} settled />
    <details><summary>How the repair worked</summary><p>{receipt.result}</p></details>
  </section>;
  if (!options.length) return null;
  return <details className="lr-workshop" open={expanded}>
    <summary ref={summaryRef} onClick={event => {
      event.preventDefault();
      showRepairs(!expanded);
    }}><BiIcon cls={expanded ? 'bi-arrow-left' : 'bi-tools'} /><span><strong>{expanded ? 'Back to crossing result' : 'Repair now—or bank the haul'}</strong><small>Trade final salvage for energy or stability</small></span><b>{salvage} carried <BiIcon cls="bi bi-chevron-down" /></b></summary>
    <div className="lr-workshop-body">
      <h4 className="lr-workshop-title">Put the haul to work</h4>
      <button type="button" className="lr-workshop-bank" aria-label={`Keep all ${salvage} salvage and return to crossing result`} onClick={() => showRepairs(false)}>
        <BiIcon cls="bi bi-box-seam" />
        <span><small>Keep the haul</small><strong>{salvage} salvage stays carried</strong></span>
        <em>Back to result <BiIcon cls="bi-arrow-right" /></em>
      </button>
      <p>Or spend salvage on one field repair before continuing.</p>
      <div className="lr-workshop-options">{options.filter(option => !option.disabled).map(renderOption)}</div>
      {choice && !choice.disabled && <div className="lr-workshop-preview">
        <FieldExchange option={choice} salvageBefore={salvage} energyBefore={MAX_STRAIN - (strain[choice.creature.id] || 0)} />
        <div className="lr-workshop-confirm"><button type="button" className="g-btn" onClick={() => setSelected(null)}>Cancel repair</button><button type="button" className="g-btn g-btn--primary" onClick={() => onChoose(choice.id)}>Spend {choice.cost} salvage & repair <BiIcon cls="bi bi-arrow-right" /></button></div>
      </div>}
      {unavailable.length > 0 && <details className="lr-workshop-unavailable"><summary>{unavailable.length} {unavailable.length === 1 ? 'repair needs' : 'repairs need'} more salvage</summary><div className="lr-workshop-options">{unavailable.map(renderOption)}</div></details>}
    </div>
  </details>;
}

export function MissionJournal({ entries }) {
  if (!entries.length) return null;
  return <details className="lr-mission-journal"><summary><BiIcon cls="bi bi-journal-text" /> Your expedition · {entries.length} {entries.length === 1 ? 'crossing' : 'crossings'} <BiIcon cls="bi bi-chevron-down" /></summary>
    <ol>{entries.map((entry, index) => <li key={entry.id}><span className="lr-journal-number">{index + 1}</span><div><small>{entry.scene}</small><strong>{entry.route}</strong><p>{entry.story}</p><span>{entry.lead} led · {entry.energy ? `${entry.energy} energy spent` : 'No energy spent'} · {entry.stability ? `${entry.stability} stability lost` : 'No stability lost'} · {entry.salvage} salvage recovered</span>{entry.fieldWork && <p className="lr-journal-field"><BiIcon cls="bi bi-tools" /> {entry.fieldWork}</p>}</div></li>)}</ol>
  </details>;
}
