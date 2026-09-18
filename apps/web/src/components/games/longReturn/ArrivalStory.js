// Immersive play: keep the decisive action, consequence, and arrival in the result.
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
  // The field record has already established the room. Keep the action and its
  // consequence in the settled result so the resource receipt has a cause.
  const visibleAction = recap && account.length >= 4 ? account.slice(1, -1) : [];
  return <div data-tier="immersive" className="lr-crossing-prose">
    {visibleAction.map((paragraph, index) => <p className="lr-simple-story" key={index}>{paragraph}</p>)}
    {(!recap || detail) && <p className="lr-simple-story">{recap ? detail : account.at(-1)}</p>}
    {account.length > 1 && <details className="lr-crossing-account mt-4 border-t border-edge pt-3">
      <summary className="cursor-pointer py-2 font-body text-body text-ink-2 focus-visible:outline-2 focus-visible:outline-viable">Read the crossing again</summary>
      <div className="max-w-[62ch] space-y-4 py-3">{account.map((paragraph, index) => <p className="lr-simple-story" key={index}>{paragraph}</p>)}</div>
    </details>}
  </div>;
}
