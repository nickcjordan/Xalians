import React from 'react';
import XalianImage from '../../xalianImage';
import { reunionStory } from './reunionStory';

// Older local checkpoints contain prose but no outcome identifiers.
const recallsEncounter = (entry, id, legacyPhrase) => entry.encounterId === undefined
  ? entry.encounter?.includes(legacyPhrase)
  : entry.encounterId === id;

export function expeditionMemories(journal, flags, companion) {
  const memories = [];
  if (journal.some(entry => ['lash-sleeve', 'lift-bearing'].includes(entry.encounterId))) memories.push({ id: 'service-line', text: 'The cable found while climbing the gantry stayed behind in the underdeck. The crew used it to release Xylum from the failing machinery, turning an earlier discovery into help.' });
  const reunion = journal.some(entry => entry.id === 'nemesis-index') && reunionStory({ id: 'nemesis-index' }, flags);
  if (reunion) memories.push({ id: reunion.id, text: reunion.hazardId ? 'The Hypnopet freed at the archive door met the crew again at the Index. Its warning revealed the contaminant layer before they opened the field.' : 'The Hypnopet escaped the forced authentication arms and found its own sheltered way out. At the Index, the crew saw it safe beyond the trap.' });
  if (companion?.creature) memories.push({ id: 'companion', creature: companion.creature, text: `${companion.creature.species} pauses beside the crew, clear of the annex, then takes a path of its own. The stranger they stopped to help became part of the journey.` });
  const reservoir = journal.find(entry => entry.id === 'core-reservoir');
  const usedConsole = reservoir?.methodMemoryId === 'surviving-console' || (reservoir?.methodMemoryId === undefined && reservoir?.story?.includes('dry console'));
  if (usedConsole) memories.push({ id: 'control-link', text: 'Preserving the archive kept its control link alive. Later, the crew used that same circuit to collect charge at the reservoir.' });
  else if (flags.includes('archive-controls-lost')) memories.push({ id: 'archive', text: 'The archive chamber was lost, but the crew brought its essential Index out in the blackbox.' });
  else if (flags.includes('archive-controls-preserved')) memories.push({ id: 'archive', text: 'The crew steadied the archive and brought its readable plates out together, preserving more than the sealed backup.' });
  const spine = journal.find(entry => entry.id === 'generator-spine');
  if (journal.some(entry => entry.methodMemoryId === 'depressurized-release')) memories.push({ id: 'coolant-release', text: 'Closing the underdeck valve did more than clear Xylum’s shelter. At the archive, the crew used the same isolated line to work the door’s service release.' });
  if (spine?.methodMemoryId === 'powered-ring-controls') memories.push({ id: 'service-cell', text: 'The cell recovered beneath the reservoir powered the final chamber. The crew used what it found to bring the rings into alignment and recover the complete core.' });
  else if (spine && flags.includes('reservoir-timing-diagram')) memories.push({ id: 'ring-diagram', text: 'Draining the reservoir uncovered the diagram that explained the final rings. The crew reached them already knowing the inner assembly would close first.' });
  if (journal.some(entry => recallsEncounter(entry, 'maintenance-release', 'two discoveries have come together'))) memories.push({ id: 'release', text: 'A signal at the flooded seal and markings beneath the turbines came together to open a trap without forcing the machinery.' });
  if (journal.some(entry => recallsEncounter(entry, 'redirect-beacon', 'turns the beacon'))) memories.push({ id: 'beacon', text: 'At the gallery, the crew changed a repeating light instead of challenging the creature following it. A small adjustment opened their way through.' });
  else if (journal.some(entry => recallsEncounter(entry, 'stop-beacon', 'holds the repeating mechanism still'))) memories.push({ id: 'beacon-stopped', text: 'The crew stopped the gallery’s worn beacon and let its light fade. In the quiet that followed, the native drifted away from the conduit entrance.' });
  else if (journal.some(entry => recallsEncounter(entry, 'signal-space', 'establishes a boundary'))) memories.push({ id: 'territory', text: 'The crew passed the gallery’s guardian by leaving it room to retreat. They crossed its shelter without taking it away.' });
  return memories;
}

export default function ExpeditionEpilogue({ journal, flags, companion }) {
  const memories = expeditionMemories(journal, flags, companion);
  if (!memories.length) return null;
  return <section className="lr-expedition-epilogue" aria-label="What made this expedition yours">
    <h2>What came back with you</h2>
    {memories.map(memory => <div key={memory.id}>
      {memory.creature && <XalianImage colored variant="token" speciesName={memory.creature.species} primaryType={memory.creature.element.primary} />}
      <p>{memory.text}</p>
    </div>)}
  </section>;
}
