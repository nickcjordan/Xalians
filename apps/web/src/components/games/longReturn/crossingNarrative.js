// Each account concerns only the chosen route. Resource consequences remain
// authoritative in the result, not inferred from dramatic prose.
const STORIES = {
  'outer-hull': {
    clean: 'The lead picks a line across the exposed hull. One by one, the crew reaches the archive-side seal with the stars beneath them.',
    costly: 'The crew advances across the exposed hull in short, deliberate stages. The archive-side seal closes behind the last arrival.',
    rough: 'The exposed crossing becomes a scramble for the far seal. The crew regroups inside, leaving the open gallery behind.'
  },
  conduit: {
    clean: 'The lead opens a path through the conduit braces. The crew emerges beside the archive, still sheltered from the broken hull.',
    costly: 'The conduit yields one cramped section at a time. The crew passes its recovered hardware forward and reaches the archive door.',
    rough: 'A brace jams across the narrow passage. The crew works it loose together and squeezes through to the archive.'
  },
  stabilize: {
    clean: 'The stasis field settles long enough for the crew to lift the index plates from their cradle. The Nemesis Index is in their hands.',
    costly: 'The field flickers around the open cradle. The crew gathers the readable plates before it closes again; the Nemesis Index is secured.',
    rough: 'The cradle will not hold steady. The crew catches the index plates as the field falters and carries the record clear.'
  },
  blackbox: {
    clean: 'The lead releases the blackbox. The crew carries the essential Index out as the abandoned chamber folds behind them.',
    costly: 'The blackbox catches in its cradle before breaking free. The crew takes the Index clear while the rest of the chamber gives way.',
    rough: 'The cradle tears apart around the blackbox. The crew pulls the essential Index from the wreckage and leaves the chamber behind.'
  },
  harvest: {
    clean: 'The collector valves release their charge into recovered containers. The crew closes the last valve and lifts its haul from the reservoir rim.',
    costly: 'The collector valves pulse unevenly. The crew gathers each release from the rim until its containers are ready to carry.',
    rough: 'A valve refuses to settle. The crew wrestles the collection gear into position and withdraws with the harvested charge.'
  },
  dive: {
    clean: 'The intact cell rises from beneath the charged surface. The crew secures it at the rim, turning a submerged prize into carried salvage.',
    costly: 'The cell drags against its submerged housing before coming loose. The crew brings it over the rim and secures the recovered charge.',
    rough: 'The submerged housing grips the cell fast. The crew forces it free, then draws the prize back to the reservoir rim.'
  },
  align: {
    clean: 'The concentric rings hold their alignment. The crew lifts the complete control core from the spine and turns toward the extraction lift.',
    costly: 'The rings resist the new alignment. The crew holds the gap long enough to release the control core, then heads for the lift.',
    rough: 'The alignment slips as the core comes loose. The crew drags the prize clear of the turning machinery and regroups at the lift.'
  },
  closure: {
    clean: 'The lead takes the interval between the rings. The exposed memory spindle is recovered, and the crew reaches the extraction lift.',
    costly: 'The gap narrows around the exposed spindle. The crew gets it clear before the rings meet and carries it to the lift.',
    rough: 'The closing interval becomes a last-second scramble. The crew pulls the memory spindle clear and reaches the extraction lift together.'
  }
};

export function crossingNarrative({ route, lead, support, method, result, companionHelp }) {
  const stories = route.outcomes || STORIES[route.id];
  const story = (stories && (stories[result.quality] || stories.rough) || `${lead.species} brings the crew through ${route.title.toLowerCase()}.`)
    .replace(/The lead/g, lead.species).replace(/the lead/g, lead.species);
  const alone = result.rawMethodScore - route.difficulty;
  const reactionStyles = { 'aggression:low': 'gentle', 'aggression:high': 'forceful', 'boldness:low': 'cautious', 'boldness:high': 'bold', 'sociability:low': 'independent', 'sociability:high': 'cooperative', 'energy:low': 'patient', 'energy:high': 'energetic', 'curiosity:low': 'disciplined', 'curiosity:high': 'curious' };
  const style = reactionStyles[`${route.reaction?.axis}:${route.reaction?.direction}`] || 'instinctive';
  const dangers = result.unseenHazards.filter(hazard => hazard.strain > 0 || hazard.pressure > 0);
  const supportHelp = alone < 0 && result.margin >= 0
    ? `${support.species}'s support made the difference: ${result.supportBonus == null ? '' : `${result.supportBonus} support points let `}${lead.species} clear the route instead of forcing passage.`
    : alone < 14 && result.margin >= 14
      ? `${support.species}'s support let ${lead.species} cross without spending energy on the crossing itself${result.supportBonus == null ? '.' : `, adding ${result.supportBonus} support points.`}`
      : null;
  let turningPoint;
  if (dangers.length) {
    const costs = [dangers.some(hazard => hazard.strain > 0) && result.leadStrain > 0 && 'energy', dangers.some(hazard => hazard.pressure > 0) && 'annex stability'].filter(Boolean).join(' and ');
    turningPoint = `${dangers.map(hazard => hazard.label).join(' and ')} went undetected. ${costs ? `That danger added a cost in ${costs}, even with the crew's chosen technique.` : 'The crew absorbed the extra effort without losing energy.'}`;
  }
  else if (companionHelp) turningPoint = companionHelp;
  else if (result.environment.strain > 0) turningPoint = `${lead.species} faced extra effort from the environment itself, beyond the work of crossing the route.`;
  else if (supportHelp) turningPoint = supportHelp;
  else if (result.naturalReaction && (result.margin < 14 || result.environment.strain > 0 || result.unseenHazards.some(hazard => hazard.strain > 0))) turningPoint = `${lead.species}'s ${style} approach suited the crossing, preserving 1 energy.`;
  else if (result.margin < 0) turningPoint = `${lead.species} and ${support.species} forced a passage. This method was a difficult fit for the route.`;
  else turningPoint = `${lead.species} put ${method.label.toLowerCase()} to work; ${support.species} backed up the crossing.`;
  return { story, turningPoint, supportHelp };
}
