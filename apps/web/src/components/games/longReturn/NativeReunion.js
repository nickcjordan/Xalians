import React from 'react';
import XalianImage from '../../xalianImage';
import { reunionStory } from './reunionStory';

export default function NativeReunion({ scene, flags }) {
  const reunion = reunionStory(scene, flags);
  if (!reunion) return null;
  return <aside className="lr-native-reunion" aria-label={reunion.title}>
    <XalianImage colored variant="token" speciesName="Hypnopet" primaryType="psychic" />
    <div><h3>{reunion.title}</h3><p>{reunion.text}</p><p>{reunion.departure}</p></div>
  </aside>;
}
