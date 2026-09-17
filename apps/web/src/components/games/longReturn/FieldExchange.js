import React from 'react';
import BiIcon from './BiIcon';
import { MAX_STRAIN, MAX_INSTABILITY } from './longReturnData';

export function CapacityChange({ label, before, after, max, kind, settled }) {
  const gain = after > before;
  return <div className={`lr-field-capacity is-${kind}`} role="img" aria-label={`${label}: ${before} to ${after} of ${max}`}>
    <span><BiIcon cls={kind === 'energy' ? 'bi-lightning-charge-fill' : kind === 'stability' ? 'bi-building' : 'bi-broadcast-pin'} /><strong>{label}</strong><b>{before} → {after}<small> / {max}</small></b></span>
    <div className="lr-field-pips" aria-hidden="true">{Array.from({ length: max }, (_, index) => {
      const changed = index >= Math.min(before, after) && index < Math.max(before, after);
      return <i key={index} className={`${index < after ? 'is-filled' : ''}${changed ? gain ? ' is-gained' : ' is-spent' : ''}${settled ? ' is-settled' : ''}`} />;
    })}</div>
  </div>;
}

// Preview and receipt use the same exchange: the commit changes state, not the story.
export default function FieldExchange({ option, salvageBefore, energyBefore, settled = false }) {
  const kind = option.kind === 'recover' ? 'energy' : option.kind === 'brace' ? 'stability' : 'commands';
  return <div className={`lr-field-exchange${settled ? ' is-settled' : ''}`}>
    <div className="lr-field-payment"><span><BiIcon cls="bi-box-seam" /><strong>{option.cost} salvage {settled ? 'spent' : 'to spend'}</strong></span>
      <div aria-hidden="true">{Array.from({ length: option.cost }, (_, i) => <BiIcon key={i} cls="bi-box-seam" />)}</div>
      <small>{salvageBefore} → <b>{salvageBefore - option.cost}</b> carried</small>
    </div>
    <BiIcon cls="bi-arrow-right" />
    <div className="lr-field-restoration">
      <CapacityChange label={kind === 'energy' ? `${option.creature.species} energy` : kind === 'stability' ? 'Annex stability' : 'Command overrides'} before={option.before} after={option.after} max={kind === 'energy' ? MAX_STRAIN : kind === 'stability' ? MAX_INSTABILITY : 2} kind={kind} settled={settled} />
      {option.energy > 0 && <CapacityChange label={`${option.creature.species} · repair effort`} before={energyBefore} after={energyBefore - option.energy} max={MAX_STRAIN} kind="energy" settled={settled} />}
    </div>
  </div>;
}
