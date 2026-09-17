// Immersive play: arrival leads into the next decision; the full account remains available.
import React from 'react';

export default function ArrivalStory({ paragraphs = [] }) {
  const account = paragraphs.filter(Boolean);
  return <div data-tier="immersive" className="lr-crossing-prose">
    <p className="lr-simple-story">{account.at(-1)}</p>
    {account.length > 1 && <details className="lr-crossing-account mt-4 border-t border-edge pt-3">
      <summary className="cursor-pointer py-2 font-body text-body text-ink-2 focus-visible:outline-2 focus-visible:outline-viable">Read the crossing again</summary>
      <div className="max-w-[62ch] space-y-4 py-3">{account.map((paragraph, index) => <p className="lr-simple-story" key={index}>{paragraph}</p>)}</div>
    </details>}
  </div>;
}
