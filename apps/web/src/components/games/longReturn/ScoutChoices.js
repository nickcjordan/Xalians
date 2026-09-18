// Immersive play tier: compact preparation choices, never immediate actions.
import React from 'react';
import { Button } from '../../ui/button';
import XalianImage from '../../xalianImage';
import * as svgUtil from '../../../utils/svgUtil';
import BiIcon from './BiIcon';

export default function ScoutChoices({ options, selectedId, onSelect, unavailable = [] }) {
  return <div data-tier="immersive" data-scout-options className="grid gap-2" role="group" aria-label="Choose a scout">
    {options.map((option, index) => {
      const { member, profile, preview, outlook } = option;
      const selected = selectedId === member.id;
      return <Button key={member.id} type="button" variant="outline" data-scout-choice={member.id} data-recommended={index === 0 || undefined} aria-pressed={selected} aria-label={`Select ${member.species} as scout`} onClick={() => onSelect(member.id)} className={`grid h-auto min-h-24 w-full grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-3 p-3 text-left font-body normal-case tracking-normal whitespace-normal ${selected ? 'border-viable bg-viable-tint' : 'border-edge-strong bg-s0'}`}>
        <span className="relative block size-16 overflow-hidden">
          <XalianImage colored variant="token" speciesName={member.species} primaryType={member.element.primary} className="size-16" />
          <span className="absolute bottom-0 left-0 bg-s1 p-0.5" aria-hidden="true">{svgUtil.getSpeciesTypeSymbol(member.element.primary, false, 14)}</span>
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="flex flex-wrap items-baseline gap-x-2"><strong className="font-body text-lead">{member.species}</strong>{index === 0 && <span className="text-small text-ink-2">Recommended</span>}</span>
          <span data-scout-summary className="grid gap-1 text-small font-normal text-ink-2 md:flex md:flex-wrap md:gap-x-5">
            <span className="inline-flex items-center gap-1"><BiIcon cls="bi-binoculars" className="size-3.5 shrink-0" /> {profile.detect >= 80 ? 'Excellent' : profile.detect >= 65 ? 'Strong' : 'Limited'} awareness</span>
            <span className="inline-flex flex-wrap items-center gap-x-1"><BiIcon cls={preview.relay ? 'bi-broadcast' : 'bi-arrow-return-left'} className="size-3.5 shrink-0" /><span>{preview.relay ? 'Reports remotely' : 'Must return'}</span><span aria-hidden="true">·</span><span className="font-bold text-ink">{preview.relay ? '1 energy' : '2 energy · 1 stability'}</span></span>
          </span>
          {outlook && <span className={`inline-flex items-start gap-1 text-small font-normal ${outlook.posture === 'native-first' ? 'text-caution' : 'text-ink-2'}`}><BiIcon cls="bi-exclamation-diamond" className="mt-0.5 size-3.5 shrink-0" />{outlook.label}</span>}
        </span>
        <BiIcon cls={selected ? 'bi-check-circle-fill' : 'bi-circle'} className={`size-4 ${selected ? 'text-viable' : 'text-ink-2'}`} />
      </Button>;
    })}
    {unavailable.length > 0 && <p data-scout-unavailable className="m-0 py-2 font-body text-small text-ink-2">
      {options.length > 0 ? <><strong>{unavailable.map(member => member.species).join(', ')}</strong> cannot scout. At least 2 energy is needed.</> : 'Everyone has less than the 2 energy needed to scout.'}
    </p>}
  </div>;
}
