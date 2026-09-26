// Immersive play: the field record tells the action; the result keeps its arrival in view.
import React from 'react';

export function arrivalRecap(paragraphs = []) {
  const arrival = paragraphs.filter(Boolean).at(-1) || '';
  const sentenceEnd = arrival.indexOf('. ');
  return sentenceEnd < 0
    ? { headline: arrival, detail: '' }
    : { headline: arrival.slice(0, sentenceEnd + 1), detail: arrival.slice(sentenceEnd + 2) };
}

export default function ArrivalStory({ paragraphs = [], recap = false }) {
  const account = paragraphs.filter(Boolean);
  const { detail } = arrivalRecap(account);
  const closingBeat = recap ? detail.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ') : account.at(-1);
  // The field record told the full action. The arrival view keeps one closing
  // thought in sight, with the complete account available on request.
  return <div data-tier="immersive" className="lr-crossing-prose">
    {closingBeat && <p className="lr-simple-story">{closingBeat}</p>}
    {account.length > 1 && <details className="lr-crossing-account mt-4 border-t border-edge pt-3">
      <summary className="cursor-pointer py-2 font-body text-body text-ink-2 focus-visible:outline-2 focus-visible:outline-viable">Read the crossing again</summary>
      <div className="max-w-[62ch] space-y-4 py-3">{account.map((paragraph, index) => <p className="lr-simple-story" key={index}>{paragraph}</p>)}</div>
    </details>}
  </div>;
}
