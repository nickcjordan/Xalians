// Tier: immersive. Compare a secured haul with optional exploration, not two promised payouts.
import React from 'react';
import { ArrowRight, Package, ShieldCheck, Route } from 'lucide-react';
import { Button } from '../../ui/button';
import { bankedSalvage } from './extractionOutcome';

export default function ExtractionChoice({ salvage, potential, remaining = 1, nextScene, onExtract, onContinue }) {
  const retained = bankedSalvage('failed', true, salvage);
  const risk = salvage - retained;
  return <section data-tier="immersive" className="lr-depth-decision lr-extraction-choice font-body text-body" aria-labelledby="lr-depth-title">
    <div className="mb-4">
      <span className="flex items-center gap-2 text-small text-ink-2"><ShieldCheck className="size-4" />Index secured either way · {salvage} salvage carried</span>
      <h4 id="lr-depth-title" className="mt-2 mb-0 type-heading">Leave now or explore deeper?</h4>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <article data-depth-extract className="flex min-w-0 flex-col gap-3 border-t border-edge-strong pt-4">
        <h5 className="m-0 type-subhead normal-case tracking-normal">Return to the surface</h5>
        <div className="flex items-center gap-2"><Package className="size-5" /><strong data-banked-offer className="font-data text-heading tabular-nums">{salvage}</strong><span>salvage banked now</span></div>
        <p className="m-0 text-small text-ink-2">Keep the entire haul. No more crossings.</p>
        <Button variant="outline" className="lr-depth-option is-extract mt-auto w-full justify-between text-body normal-case tracking-normal" onClick={onExtract}>Extract now<ArrowRight className="size-4" /></Button>
      </article>
      <article data-depth-explore className="flex min-w-0 flex-col gap-3 border-t border-edge-strong pt-4">
        <h5 className="m-0 type-subhead normal-case tracking-normal">Continue into {nextScene.title}</h5>
        <div className="flex items-center gap-2"><Package className="size-5" /><span>Up to <strong data-depth-potential className="font-data text-heading tabular-nums">+{potential}</strong> more salvage</span></div>
        <p data-depth-distance className="m-0 flex items-center gap-2 text-small text-ink-2"><Route className="size-4" />Across {remaining} optional {remaining === 1 ? 'crossing' : 'crossings'}, not guaranteed.</p>
        <div className="lr-haul-risk text-small text-ink-2">
          <span>If forced out with your current haul: </span><span className="whitespace-nowrap">keep {retained}</span>{risk > 0 && <> · <span className="whitespace-nowrap text-caution">lose <b>{risk}</b></span></>}</div>
        <Button variant="outline" className="lr-depth-option is-deeper mt-auto h-auto min-h-11 w-full justify-between py-2 text-body normal-case tracking-normal whitespace-normal text-left" onClick={onContinue}>Go deeper<ArrowRight className="size-4" /></Button>
      </article>
    </div>
    <details className="mt-4 text-small text-ink-2"><summary className="min-h-11 cursor-pointer py-3">How extraction protects the haul</summary><p className="max-w-[62ch]">Leaving voluntarily banks everything carried. If fewer than two creatures can act or the annex loses all stability, emergency extraction keeps the Index and half the haul, rounded up. New finds and repairs change that haul. You can choose to leave again after the next crossing.</p></details>
  </section>;
}
