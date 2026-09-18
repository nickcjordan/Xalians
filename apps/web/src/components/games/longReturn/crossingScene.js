// Authored scenes describe only the selected passage. Costs and discoveries are
// supplied by the resolved game state; prose must not create additional events.
const PASSAGES = {
  gantry: ['The far doorway is visible through the suspension frame, but whole sections of the walkway hang below it. Beneath the remaining spans, black water turns slowly around the fallen metal.', 'One by one, the crew reaches the far landing. Behind them, the old turbine bank remains asleep.'],
  intake: ['The current disappears beneath the broken gantry. Beyond the hanging wreckage there is a strip of open water, just wide enough to reach the steps on the other side.', 'The crew emerges together at the far steps. Their wake draws frozen debris out of a narrow opening in the wall. Water begins flowing through it: an old coolant bypass, a side channel built to carry cooling water around the machinery. As the blockage washes away, it clears frozen fill from the maintenance passage ahead.'],
  catwalk: ['The narrow walkway hangs above machines taller than the crew. Between their rounded casings, the sealed archive door comes in and out of view. There is little room to stop or turn back.', 'The crew steps off the catwalk beside the archive door. Underfoot, a sensor lights up. Its glow runs along a wire toward the door, where a locking ring draws tight with a heavy click. The crew has reached the other side, but alerted the lock ahead.'],
  underdeck: ['The repair passage runs beneath the great machines, close enough to hear metal shifting overhead. Pipes crowd the walls. Faded arrows lead through the frost toward the archive door.', 'The passage rises beside the archive door. Just before the exit, the crew finds a row of symbols beneath the frost and copies them. The same shapes appear on the door’s controls: instructions left for the workers who once came this way.'],
  decode: ['Metal arms unfold around the circular door, their lights moving over the waiting crew. Its overlapping plates remain shut. The old controls repeat a pattern, waiting for the right answer before they will let anyone through.', 'The door’s arms pause, and its plates slide apart. The opening reveals the broken gallery beyond. The crew slips through together while it holds.'],
  breach: ['A crack splits one of the door’s overlapping plates. A heavy ring holds the plates shut, but the damaged edge offers somewhere to work: a way through without answering the old controls.', 'The iris opens wide enough for the crew. They pass into the gallery, leaving its displaced segments behind.'],
  'outer-hull': ['The gallery opens onto the stars. Loose fragments hang beyond the broken centerline, and the archive-side seal waits across a stretch of exposed hull.', 'The crew gathers at the archive-side seal. Its battered airlock admits them one at a time, then closes the stars away. Beyond the inner door, wavering light spills from the archive.'],
  conduit: ['The conduit mouth offers shelter from the broken hull. Inside, braces divide the passage into cramped sections, with no room for the crew to turn around together.', 'The sheltered passage opens beside the archive. Wavering light spills across its threshold. The crew comes through in sequence, back together after the narrow passage.'],
  stabilize: ['Thin plates tremble inside a wavering field of light. Each time it flickers, they slip a little farther out of place. The crew must steady the failing machinery long enough to lift the record clear.', 'The last index plate comes free. Gathered together, the plates hold the Nemesis Index, the surviving record of the plague research done here. It is no longer something the crew must reach. It is something they must bring home.'],
  blackbox: ['A sealed box sits at the heart of the flickering archive: the backup holding its essential record. Metal catches clamp it to the cradle. Pulling it loose will save the record, but leave the failing chamber without its support.', 'The blackbox’s final catch releases. The crew draws the sealed backup away as the cradle gives behind it. The Nemesis Index is in their keeping now; bringing it home matters more than anything still left in this place.'],
  harvest: ['Light moves beneath the reservoir surface. Around its rim, collector valves offer a way to recover the stored charge a little at a time.', 'The collector valves fall still.'],
  dive: ['Beneath the charged liquid, an intact storage cell remains caught in its housing. Reaching it means working past the reservoir surface, not merely collecting from the rim.', 'The cell clears its housing and reaches the rim.'],
  align: ['Concentric rings turn around the control core. Their movement reveals a view of the white planet below, then hides it again behind the next passing assembly.', 'The complete control core is clear of the rings. With the prize secured, the crew turns toward the extraction lift at the end of the spine.'],
  closure: ['The exposed memory spindle passes through view between the moving rings. There is no need to recover the whole machine, only to reach the spindle and get clear of the closing gap.', 'The spindle is out. The crew regroups at the extraction lift, leaving the turning machinery and the last crossing behind.']
};

const NEXT_THRESHOLDS = {
  stabilize: ' Beyond the archive, a junction splits: the marked return route climbs toward the surface, while a service stair descends into the dark.',
  blackbox: ' They clear the chamber into a junction where the marked return route climbs toward the surface and a service stair descends into the dark.',
  harvest: ' A dry passage leads from the reservoir to a junction with the return route. Beyond it, the Generator Spine turns deeper inside the annex.',
  dive: ' The crew follows a dry passage to a junction with the return route. The Generator Spine lies beyond it.'
};

const HAZARDS = {
  'conductive-brine': ['A blue flash travels through the flood. The brine carries an electrical charge, and the crew is already in its path.', 'The crew watches for the charge moving through the brine and works around the danger the scout identified.', 'A surge races into submerged cabling. A shudder runs through the old intake wall.'],
  'servo-cycle': ['One of the apparently dormant turbines begins its silent turn. The safe interval is closing sooner than the crew expected.', 'The crew follows the rotation the scout marked, anticipating the turbine rather than discovering it in motion.', 'The unexpected rotation jolts its mountings and shakes the hall.'],
  countermeasure: ['The lock answers with an interrogation pattern instead of an opening signal. Its obsolete questions press into the crew’s thoughts while the arms continue their work.', 'The crew recognizes the lock’s interrogation pattern from the report and prepares for it before answering the rig.', 'The false response drives the arms against their frame, shaking the door’s old mountings.'],
  'void-shear': ['Loose fragments begin sliding toward the outer hull. The pull changes across the centerline, catching the crew where the crossing had seemed straight.', 'The drifting fragments reveal the changing pull the scout warned about. The crew adjusts its passage before reaching the shear.', 'The sliding debris strikes a hull seam, shifting the already exposed structure.'],
  'plague-dust': ['A sealed layer breaks open around the field. Fine contaminant dust lifts into the space where the crew is working.', 'The crew approaches the sealed contaminant layer with the scout’s warning in mind, keeping its disturbance under control.', 'The failing containment frame shudders as the dust escapes, pulling on the archive’s old supports.'],
  'charge-bloom': ['The disturbed reservoir releases a sudden bloom of charge. Light spreads across the surface toward the collection point.', 'The crew anticipates the surface discharge described in the report and works around its cycle.', 'The discharge kicks through the collector assembly, rattling its mountings.'],
  'ring-closure': ['The inner ring closes ahead of the outer assembly. The opening is disappearing in the wrong order.', 'The crew accounts for the inner ring closing early, using the timing the scout identified.', 'The uneven closure slams a new load into the spine’s old bearings.']
};

const MOTIONS = {
  climb: 'finds a line along the frame and begins climbing',
  leap: 'judges the gap, then commits to the leap',
  sprint: 'waits for the opening, then accelerates through it',
  swim: 'enters the liquid and works with the current',
  flight: 'takes flight along the broken centerline',
  burrow: 'opens a way into the frozen fill',
  phasing: 'passes through the barrier to open the way from beyond it',
  ward: 'extends protection over the work ahead',
  snare: 'takes hold at a distance and begins drawing the passage clear',
  beam: 'directs a controlled beam into position',
  crush: 'sets force against the mechanism holding the way shut',
  rake: 'cuts into the old fracture',
  mend: 'works to restore the failing stasis web',
  ambush: 'commits in a sudden burst before the interval closes',
  spray: 'displaces the charged surface to reach beneath it',
  anchored: 'braces against the turning machinery',
  resistant: 'holds position inside the contaminated rim',
  intelligence: 'studies the surviving sequence and begins putting it back together',
  manipulation: 'works the old controls into position'
};

const SPECIFIC_MOTIONS = {
  'intake:snare': 'takes hold of the crew and tows them beneath the wreckage',
  'decode:snare': 'moves the door’s control arms from a distance, putting them through the opening sequence',
  'blackbox:snare': 'takes hold of the blackbox and pulls against its catches',
  'conduit:snare': 'draws the crew through the narrow passage in sequence',
  'dive:snare': 'reaches for the submerged cell from the rim',
  'align:snare': 'holds the rings against one another until their openings line up',
  'decode:beam': 'feeds a controlled beam into the optical reader',
  'underdeck:phasing': 'passes through the solid partition to open the way for the others',
  'outer-hull:phasing': 'follows the intact inner skin across the broken gallery',
  'dive:swim': 'dives through the charged layer toward the submerged cell',
  'underdeck:intelligence': 'traces the faded wall diagram, choosing the passages that lead to the far door',
  'stabilize:intelligence': 'rebuilds the index cradle beneath the wavering field',
  'conduit:manipulation': 'disassembles the conduit braces to make room for the crew',
  'harvest:manipulation': 'bleeds the collector valves, waiting between releases',
  'align:manipulation': 'adjusts the machine’s controls until the turning rings line up',
  'blackbox:manipulation': 'releases the live catches around the blackbox'
};

const SHIFTS = {
  gantry: 'Behind them, the suspension bolts shift in their sockets. The crossing has left the old framework less secure.',
  intake: 'The flood tugs at the loosened wreckage. A shudder travels through the intake wall and into the structure beyond.',
  catwalk: 'The waking machinery sends a tremor through its aging supports.',
  underdeck: 'Working through the tight passage shifts the frozen fill against its aging supports.',
  decode: 'The awakened rig sends its demands deeper into the failing systems of the annex.',
  breach: 'The displaced iris grinds against its frame, carrying the force of the breach into the wall.',
  'outer-hull': 'The exposed structure shifts under the disturbance of their passage.',
  conduit: 'The long passage leaves its old braces under a new, uneven load.',
  stabilize: 'The faltering field sends another disturbance through the chamber’s failing systems.',
  blackbox: 'Without the blackbox in place, the cradle gives way and the chamber begins to fold behind them.',
  harvest: 'The collector assembly shudders as its stored charge is drawn away.',
  dive: 'The disturbed reservoir sends a tremor through the surrounding structure.',
  align: 'The changing alignment puts a fresh load through the spine’s aging supports.',
  closure: 'The rings close behind the passage, shaking the old assembly.'
};

const EFFORTS = {
  gantry: 'works across the gaps in short, demanding stages, stopping only when the last span is behind the crew',
  intake: 'fights the pull beneath the wreckage, holding the way toward the far steps until the others can follow',
  catwalk: 'pushes through the shrinking interval, keeping the far end of the catwalk in reach',
  underdeck: 'works through the narrowing service passage, making room where the old route no longer offers enough',
  decode: 'holds to the sequence through another pass of the authentication arms',
  breach: 'keeps working against the iris until the gap will admit the whole crew',
  'outer-hull': 'corrects the passage across the exposed hull, working to keep the far seal within reach',
  conduit: 'works past one constriction after another, with the rest of the crew following through the narrow space',
  stabilize: 'stays with the wavering field until the last readable plates can be brought clear',
  blackbox: 'works against the catches until the blackbox finally comes free',
  harvest: 'stays at the collector through its uneven releases, bringing each portion of charge under control',
  dive: 'works against the submerged housing until the cell can be drawn clear',
  align: 'holds the work together through the rings’ resistance, keeping the core accessible',
  closure: 'pushes through the narrowing interval until the spindle is beyond the rings'
};

function elementalExposure(route, name) {
  switch (route.environment.element) {
    case 'electric': return route.id === 'intake'
      ? `Charge snaps through the flooded wreckage, making it harder for ${name} to keep the crew's way open.`
      : route.id === 'dive'
        ? `Charge flickers around the submerged cell, forcing ${name} to work in short, careful reaches.`
        : `Charge flickers across the old machinery, forcing ${name} to break contact and find another hold.`;
    case 'psychic': return `The lock's repeating signal presses into ${name}'s thoughts, making the sequence harder to hold.`;
    case 'chemical': return `A sharp trace from the damaged archive catches ${name} each time it returns to the work.`;
    case 'metal': return `The old metal fights ${name} at each point of contact, slowing its work.`;
    case 'ice': return `Frost grips the passage under ${name}, turning each move into a careful effort.`;
    case 'dark': return `Beyond the broken hull, ${name} struggles to judge the next hold in the dark.`;
    case 'light': return `Light flashes through the turning rings, breaking ${name}'s view of the gap again and again.`;
    default: return '';
  }
}

export function crossingScene({ route, lead, support, method, result, companionHelp }) {
  const passage = PASSAGES[route.id];
  if (!passage) return null;
  const name = lead.species;
  const unseen = new Set(result.unseenHazards.map(hazard => hazard.id));
  const danger = (route.hazardIds || []).map(id => HAZARDS[id]?.[unseen.has(id) ? 0 : 1]).filter(Boolean).join(' ');
  const action = `${name} ${SPECIFIC_MOTIONS[`${route.id}:${method.key}`] || MOTIONS[method.key] || 'takes the lead through the passage'}, with ${support.species} backing the effort.`;
  const effort = result.leadStrain > 0
    ? `${name} ${EFFORTS[route.id]}.`
    : `${name} carries the movement through steadily, emerging with strength still in reserve.`;
  const alone = result.rawMethodScore - route.difficulty;
  const supportDifference = alone < 0 && result.margin >= 0
    ? ` With ${support.species} coordinating the others, ${name} can complete the passage instead of forcing a way through.`
    : alone < 14 && result.margin >= 14
      ? ` ${support.species} keeps the others moving with ${name}; the crossing itself no longer demands an exhausting push.` : '';
  const supportEffort = result.supportStrain > 0 ? ` ${support.species} has to take over part of the work to keep the passage moving. The effort has worn on ${support.species}, too.` : '';
  const exposure = result.leadStrain > 0 ? (result.environment?.notes || []).map(note => {
    if (note.includes('without breathing')) return `There is no breath to take along this part of the route; ${name} must keep going until it reaches air.`;
    if (note.includes('cannot safely remain')) return route.environment.medium === 'vacuum'
      ? `There is no air here, and ${name} cannot linger safely in the exposed space. Every moment spent bringing the others across wears it down.`
      : route.environment.medium === 'liquid' ? `${name} is out of its element beneath the surface. Holding on until the others follow takes more out of it than the crossing alone.`
        : `${name} struggles outside the surroundings it needs, pushing on until the crew is through.`;
    if (note.includes('temperature band')) return route.environment.temperatureC < 0
      ? `The cold stiffens ${name}'s movements; each new effort comes more slowly than the last.`
      : `The heat bears down on ${name}; each new effort comes more slowly than the last.`;
    if (note.includes('exposed to')) return elementalExposure(route, name);
    return '';
  }).filter(Boolean).join(' ') : '';
  const routeWear = route.pressure > 0 || result.reactionControlled === false
    ? route.id === 'breach' && method.key === 'phasing' ? 'The old release strains as it opens the iris. Its vibration travels through the failing wall.' : SHIFTS[route.id]
    : '';
  const hazardWear = result.unseenHazards.filter(hazard => hazard.pressure > 0).map(hazard => HAZARDS[hazard.id]?.[2]).filter(Boolean).join(' ');
  const wear = result.pressure > 0 ? [routeWear, hazardWear].filter(Boolean).join(' ') : '';
  const stability = wear ? ` ${wear}` : '';
  const salvage = result.salvage > 0
    ? (['harvest', 'dive', 'align', 'closure', 'stabilize', 'blackbox'].includes(route.id)
      ? ' The recovered material joins the haul they must carry out.'
      : ' Among the old service fittings, the crew recovers usable components and adds them to the haul.') : '';
  const arrival = route.id === 'breach' && method.key === 'phasing'
    ? 'From inside the iris, the release finally answers. The door opens for the rest of the crew, admitting them into the gallery.'
    : passage[1];
  return [passage[0], `${action}${danger ? ` ${danger}` : ''}${supportDifference}`, `${effort}${exposure ? ` ${exposure}` : ''}${supportEffort}${stability}${companionHelp ? ` ${companionHelp}` : ''}`, `${arrival}${salvage}${NEXT_THRESHOLDS[route.id] || ''}`];
}
