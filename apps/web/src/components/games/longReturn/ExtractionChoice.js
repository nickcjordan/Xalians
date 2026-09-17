import React from 'react';
import BiIcon from './BiIcon';
import { bankedSalvage } from './extractionOutcome';

export default function ExtractionChoice({ salvage, potential, nextScene, onExtract, onContinue }) {
  const retained = bankedSalvage('failed', true, salvage);
  const risk = salvage - retained;
  return <section className="lr-depth-decision lr-extraction-choice" aria-labelledby="lr-depth-title">
    <div className="lr-depth-heading"><span><BiIcon cls="bi-shield-check" /> Index secured either way</span><h4 id="lr-depth-title">Bank the haul—or venture deeper?</h4></div>
    <div className="lr-depth-options lr-result-actions">
      <button type="button" className="g-btn lr-depth-option is-extract" onClick={onExtract}>
        <strong>Extract now</strong><span className="lr-extraction-offer"><BiIcon cls="bi-box-seam" /><b>{salvage}</b><span>salvage banked</span></span><small>Keep your entire haul</small><em>Return with the Index <BiIcon cls="bi-arrow-right" /></em>
      </button>
      <button type="button" className="g-btn lr-depth-option is-deeper" onClick={onContinue}>
        <strong>Go deeper</strong><span className="lr-extraction-offer"><BiIcon cls="bi-box-seam" /><b>+{potential}</b><span>more salvage possible</span></span><small className="lr-haul-risk"><BiIcon cls="bi-shield-exclamation" /><b>{risk}</b> of your {salvage} carried salvage at risk</small><em>Enter {nextScene.title} <BiIcon cls="bi-arrow-right" /></em>
      </button>
    </div>
    <p className="lr-emergency-rule"><BiIcon cls="bi-arrow-return-left" /><span>Forced out? Keep the Index, lose half the haul you carry.<small>With your current haul: {retained} saved · {risk} lost.</small></span></p>
  </section>;
}
