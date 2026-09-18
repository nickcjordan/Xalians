// Immersive play tier. Static atmosphere, a schematic, and a persistent account.
import React, { useEffect, useRef, useState } from 'react';
import { sceneArtFor } from './sceneArt';
import { trapSequenceFocus } from './SequenceStory';
import './fieldRecordMap.css';

function mapSnapshot(map) {
  const props = map?.props || {};
  const position = props.position || {};
  return {
    crew: position.crew,
    scout: position.scout,
    signal: !!position.signal,
    encounter: !!position.encounter,
    native: props.native?.id || props.native?.species || null,
    nativeState: props.nativeState,
    ally: props.allyWithScout || props.companion?.creature?.id || props.companion?.id || null,
    revealed: (props.revealedIds || []).join(','),
    flags: (props.runFlags || []).join(',')
  };
}

function changedTarget(before, after) {
  if (before?.native !== after.native || before?.nativeState !== after.nativeState) return 'native';
  if (before?.ally !== after.ally) return 'ally';
  if (before?.signal !== after.signal) return 'signal';
  if (before?.scout !== after.scout) return 'scout';
  return after.scout && !before ? 'scout' : 'crew';
}

export default function FieldRecord({ scene, title, label, map, mapFocusLabel, animateInitialTravel = false, resources, children }) {
  const art = sceneArtFor(scene);
  const slotRef = useRef(null);
  const previousMap = useRef(null);
  const [focus, setFocus] = useState(null);
  const snapshot = mapSnapshot(map);
  const signature = JSON.stringify(snapshot);
  useEffect(() => {
    const previous = previousMap.current;
    previousMap.current = snapshot;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const target = changedTarget(previous, snapshot);
    const height = slotRef.current?.getBoundingClientRect().height || 0;
    setFocus({ signature, target, height, initial: !previous });
    const timer = window.setTimeout(() => setFocus(null), 1750);
    return () => window.clearTimeout(timer);
  }, [signature]);
  return <div data-tier="immersive" data-field-record className="fixed inset-0 z-[1100] grid grid-rows-[auto_auto_auto] content-start gap-2 overflow-y-auto bg-room p-2 text-ink md:grid-cols-2 md:grid-rows-[auto_minmax(0,1fr)] md:content-normal md:gap-6 md:overflow-hidden md:p-6 md:pt-20" role="dialog" aria-modal="true" aria-label={label} onKeyDown={trapSequenceFocus}>
    <header className="min-w-0 md:col-span-2"><span className="type-legend text-ink-2">{scene.deck} · field record</span><h2 className="type-heading m-0">{title}</h2></header>
    <div ref={slotRef} style={focus?.height ? { minHeight: focus.height } : undefined} className="relative min-h-0 overflow-hidden [&_[data-site-overview]]:hidden md:[&_[data-site-overview]]:flex [&_[data-site-next]]:hidden md:col-start-2 md:row-start-2">
      <div aria-hidden="true" className="absolute inset-0 hidden bg-cover bg-center opacity-20 md:block" style={{ backgroundImage: `url(${art.src})` }} />
      <div data-map-focus={focus ? 'active' : undefined} className={`lr-field-map-panel ${focus ? 'is-focused' : ''}`}>
        {focus && <div className="lr-field-map-head"><span>Site position update</span><strong>{mapFocusLabel || title}</strong></div>}
        {React.cloneElement(map, { attentionTarget: focus?.target, attentionKey: focus?.signature, initialTravel: !!(focus?.initial && animateInitialTravel) })}
        <div className="lr-field-map-resources hidden flex-wrap gap-3 pt-4 md:flex">{resources}</div>
      </div>
    </div>
    <div className="grid min-h-0 grid-rows-[minmax(0,1fr)] md:col-start-1 md:row-start-2">{children}</div>
  </div>;
}
