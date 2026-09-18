// Immersive play tier. Static atmosphere, a schematic, and a persistent account.
import React from 'react';
import { sceneArtFor } from './sceneArt';
import { trapSequenceFocus } from './SequenceStory';

export default function FieldRecord({ scene, title, label, map, resources, children }) {
  const art = sceneArtFor(scene);
  return <div data-tier="immersive" data-field-record className="fixed inset-0 z-[1100] grid grid-rows-[auto_auto_auto] content-start gap-2 overflow-y-auto bg-room p-2 text-ink md:grid-cols-2 md:grid-rows-[auto_minmax(0,1fr)] md:content-normal md:gap-6 md:overflow-hidden md:p-6 md:pt-20" role="dialog" aria-modal="true" aria-label={label} onKeyDown={trapSequenceFocus}>
    <header className="min-w-0 md:col-span-2"><span className="type-legend text-ink-2">{scene.deck} · field record</span><h2 className="type-heading m-0">{title}</h2></header>
    <div className="relative min-h-0 overflow-hidden [&_[data-site-overview]]:hidden md:[&_[data-site-overview]]:flex [&_[data-site-next]]:hidden md:col-start-2 md:row-start-2">
      <div aria-hidden="true" className="absolute inset-0 hidden bg-cover bg-center opacity-20 md:block" style={{ backgroundImage: `url(${art.src})` }} />
      <div className="relative">{map}<div className="hidden flex-wrap gap-3 pt-4 md:flex">{resources}</div></div>
    </div>
    <div className="grid min-h-0 grid-rows-[minmax(0,1fr)] md:col-start-1 md:row-start-2">{children}</div>
  </div>;
}
