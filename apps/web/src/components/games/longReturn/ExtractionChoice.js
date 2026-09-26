// Tier: immersive. Compare a secured haul with optional exploration, not two promised payouts.
import React from 'react';
import { ArrowRight, Building2, Package, Route, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { Button } from '../../ui/button';
import { bankedSalvage } from './extractionOutcome';

export default function ExtractionChoice({ salvage, potential, remaining = 1, nextScene, stability, readyCrew, canRepair = false, onRepair, onExtract, onContinue, runFlags = [], recovery }) {
  const retained = bankedSalvage('failed', true, salvage);
  const risk = salvage - retained;
  return <section data-tier="immersive" className="lr-depth-decision lr-extraction-choice font-body text-body" aria-labelledby="lr-depth-title">
    {recovery}
    <div className="lr-extraction-heading mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-small text-ink-2"><ShieldCheck className="size-4" />Index secured either way · {salvage} salvage carried</span>{canRepair && <button type="button" className="inline-flex min-h-11 items-center gap-1 text-small text-viable underline underline-offset-4" onClick={onRepair}><Wrench className="size-4" />Repair with salvage</button>}</div>
      <h4 id="lr-depth-title" className="mt-2 mb-0 type-heading">Leave now or explore deeper?</h4>
    </div>
    <div className="lr-extraction-options grid gap-4 md:grid-cols-2">
      <article data-depth-extract className="flex min-w-0 flex-col gap-3 border-t border-edge-strong pt-4">
        <h5 className="m-0 type-subhead normal-case tracking-normal">Return to the surface</h5>
        <div className="flex items-center gap-2"><Package className="size-5" /><strong data-banked-offer className="font-data text-heading tabular-nums">{salvage}</strong><span>salvage banked now</span></div>
        <span className="lr-depth-mini-safe"><ShieldCheck className="size-4" />No further risk</span>
        <p className="m-0 text-small text-ink-2">Keep the entire haul. No more crossings.</p>
        <Button variant="outline" className="lr-depth-option is-extract mt-auto w-full justify-between text-body normal-case tracking-normal" onClick={onExtract}>Extract now<ArrowRight className="size-4" /></Button>
      </article>
      <article data-depth-explore className="flex min-w-0 flex-col gap-3 border-t border-edge-strong pt-4">
        <h5 className="m-0 type-subhead normal-case tracking-normal">Continue into {nextScene.title}</h5>
        <p className="lr-depth-invitation">{nextScene.id === 'core-reservoir'
          ? `Below the service stairs, light moves beneath a charged pool. Its collectors and a submerged cell offer two ways to explore.${runFlags.includes('archive-controls-preserved') ? ' The archive circuit you preserved still reaches its control console.' : runFlags.includes('archive-controls-lost') ? ' The collapsed archive has cut off its control console; the crew will work at the pool itself.' : ''}`
          : `Beyond the reservoir, huge rings turn around a view of the white planet. A complete control core sits inside them; a smaller memory spindle passes through the gaps.${runFlags.includes('reservoir-cell-recovered') ? ' The cell you recovered can power their service controls.' : runFlags.includes('reservoir-timing-diagram') ? ' The diagram you uncovered shows when the inner ring closes.' : ''} The extraction lift waits on the far side.`}</p>
        <div className="lr-depth-full-gain items-center gap-2"><Package className="size-5" /><span>Up to <strong data-depth-potential className="font-data text-heading tabular-nums">+{potential}</strong> more salvage</span></div>
        <span className="lr-depth-mini-gain"><Package className="size-4" />+{potential} possible</span>
        <span className="lr-depth-mini-distance">{remaining} more {remaining === 1 ? 'crossing' : 'crossings'}</span>
        <p data-depth-distance className="m-0 items-center gap-2 text-small text-ink-2"><Route className="size-4" />Across {remaining} optional {remaining === 1 ? 'crossing' : 'crossings'}, not guaranteed.</p>
        {(stability <= remaining * 2 || readyCrew <= 2) && <div data-depth-reserves className="flex-wrap gap-x-4 gap-y-1 text-small text-caution" aria-label="Reserves for the optional crossings">
          {stability <= remaining * 2 && <span className="inline-flex items-center gap-1"><Building2 className="size-4" /><strong>{stability}</strong> stability left</span>}
          {readyCrew <= 2 && <span className="inline-flex items-center gap-1"><Zap className="size-4" /><strong>{readyCrew}</strong> crew able to act</span>}
        </div>}
        <div className="lr-haul-risk text-small text-ink-2">
          <span>If forced out with your current haul: </span><span className="whitespace-nowrap">keep {retained}</span>{risk > 0 && <> · <span className="whitespace-nowrap text-caution">lose <b>{risk}</b></span></>}</div>
        <span className="lr-depth-mini-risk">{risk > 0 ? `Risk losing ${risk} carried salvage` : 'No carried salvage at risk'}</span>
        <Button variant="outline" className="lr-depth-option is-deeper mt-auto h-auto min-h-11 w-full justify-between py-2 text-body normal-case tracking-normal whitespace-normal text-left" onClick={onContinue}>Go deeper<ArrowRight className="size-4" /></Button>
      </article>
    </div>
    <details className="mt-4 text-small text-ink-2"><summary className="min-h-11 cursor-pointer py-3">How extraction protects the haul</summary><p className="max-w-[62ch]">Leaving voluntarily banks everything carried. If fewer than two creatures can act or the annex loses all stability, emergency extraction keeps the Index and half the haul, rounded up. New finds and repairs change that haul. You can choose to leave again after the next crossing.</p></details>
  </section>;
}
