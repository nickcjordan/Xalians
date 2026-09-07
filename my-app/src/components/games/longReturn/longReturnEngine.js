import effectiveness from '../../../json/typeEffectivenessMatrix.json';

const titleCase = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

export function readinessState(strain = 0) {
  if (strain >= 6) return { id: 'spent', label: 'Spent', detail: 'Cannot scout, lead, or support. Must be protected during extraction.', scorePenalty: 100, supportPenalty: 100 };
  if (strain >= 5) return { id: 'critical', label: 'Critical', detail: 'Cannot scout. Only 1 energy remains.', scorePenalty: 9, supportPenalty: 4 };
  if (strain >= 3) return { id: 'worn', label: 'Worn', detail: 'Reduced performance until the expedition ends.', scorePenalty: 4, supportPenalty: 2 };
  return { id: 'ready', label: 'Ready', detail: 'All expedition roles are available.', scorePenalty: 0, supportPenalty: 0 };
}

export function instabilityState(value = 0) {
  if (value >= 10) return { id: 'collapse', label: 'Collapse', detail: 'Forced extraction.' };
  if (value >= 9) return { id: 'imminent', label: 'Collapse imminent', detail: 'Only 1 stability remains.' };
  if (value >= 6) return { id: 'failing', label: 'Failing', detail: 'The annex is actively coming apart.' };
  if (value >= 3) return { id: 'shifting', label: 'Shifting', detail: 'Dormant systems are waking and routes are becoming less stable.' };
  return { id: 'stable', label: 'Stable', detail: 'The crew still controls the pace.' };
}

export function applyMissionMemory(scene, flags = []) {
  if (!scene) return scene;
  return {
    ...scene,
    routes: scene.routes.map((route) => {
      const activeEffects = (route.legacyAdjustments || []).filter((effect) => flags.includes(effect.flag));
      const difficultyChange = activeEffects.reduce((sum, effect) => sum + (effect.difficulty || 0), 0);
      return {
        ...route,
        originalDifficulty: route.difficulty,
        difficulty: Math.max(1, route.difficulty + difficultyChange),
        activeEffects
      };
    })
  };
}

export function scoutProfile(scene, creature) {
  const senses = creature.physiology.senses;
  const bestSense = Math.max(senses.sight || 0, senses.hearing || 0, senses.smell || 0);
  const weightPenalty = Math.min(18, Math.round((creature.physiology.weightKg || 0) / 30));
  const detect = Math.round(bestSense * .65 + creature.attributes.instinct * .35 + ((senses.special || []).length ? 8 : 0));
  const stealth = Math.round(creature.attributes.agility * .32 + creature.attributes.reflex * .24 + creature.physiology.capabilities.sprint * .2 + (creature.traits.includes('stealthy') ? 22 : 0) - weightPenalty);
  const hold = Math.round(creature.attributes.resilience * .32 + creature.attributes.vitality * .22 + creature.attributes.strength * .22 + (creature.traits.includes('armored') ? 12 : 0) + (creature.traits.includes('anchored') ? 10 : 0));
  const contact = Math.round(creature.attributes.charisma * .35 + creature.temperament.sociability * .25 + creature.attributes.instinct * .15 + (creature.traits.includes('healing') ? 15 : 0) + (creature.physiology.communication.includes('telepathic') ? 10 : 0));
  const channel = relayChannel(scene, creature);
  const strongest = [['stealth', stealth], ['hold', hold], ['contact', contact]].sort((a, b) => b[1] - a[1])[0][0];
  const roles = {
    stealth: { role: 'Quiet scout', strength: 'Best chance to observe and escape without contact.', risk: 'Vulnerable if concealment fails.' },
    hold: { role: 'Defensive scout', strength: 'Can hold position safely if confronted.', risk: 'More likely to be noticed.' },
    contact: { role: 'Contact scout', strength: 'Best chance to calm, communicate with, or aid a native.', risk: 'May lack the speed or protection to escape a charge.' }
  };
  return { detect, stealth, hold, contact, channel, ...roles[strongest] };
}

export function encounterOutlook(scene, creature) {
  if (!scene.encounter) return null;
  const profile = scoutProfile(scene, creature);
  const awareness = profile.detect - scene.encounter.concealment;
  const concealment = profile.stealth - scene.encounter.threat;
  const posture = awareness >= 8 && concealment >= -12
    ? 'scout-first'
    : concealment <= -28
      ? 'native-first'
      : 'mutual';
  return {
    ...profile,
    posture,
    label: posture === 'scout-first' ? 'Likely to notice it first' : posture === 'native-first' ? 'At risk of being cornered' : 'Contact could go either way',
    surpriseStrain: posture === 'native-first' ? 1 : 0
  };
}

export function encounterOptions(scene, scout, crew, mode = 'scout', informed = false) {
  if (!scene.encounter) return [];
  const outlook = scout ? encounterOutlook(scene, scout) : null;
  const medic = crew.find((member) => member.traits.includes('healing') || member.abilities.some((ability) => ability.action === 'mend'));
  const baseSurprise = mode === 'group' && !informed ? 1 : outlook ? outlook.surpriseStrain : 0;
  const archetype = scene.encounter.archetype || 'injured';

  if (archetype === 'territorial') {
    if (mode === 'group') return [
      { id: 'signal-space', label: 'Signal peaceful intent', summary: 'Use communication and patience to gain passage without challenging its shelter.', crewStrain: baseSurprise, instability: informed ? 0 : 1, companion: false, resolution: 'cleared', recommended: true },
      { id: 'distract', label: 'Draw it away from the conduit', summary: 'Create noise elsewhere. The route opens, but the annex becomes less stable.', crewStrain: baseSurprise, instability: 2, companion: false, resolution: 'cleared' },
      { id: 'detour', label: 'Yield the territory', summary: 'Back away and reconsider the exposed hull route.', crewStrain: baseSurprise, instability: informed ? 0 : 1, companion: false, resolution: 'detour' }
    ];
    const canSignal = outlook && (outlook.contact >= 62 || outlook.channel);
    return [
      ...(canSignal ? [{ id: 'signal-space', label: 'Signal peaceful intent', summary: 'Show that the scout wants passage, not its shelter.', scoutStrain: baseSurprise, instability: 0, companion: false, resolution: 'cleared', recommended: true }] : []),
      { id: 'withdraw', label: 'Withdraw and report', summary: 'Leave its boundary intact and return with a warning for the crew.', scoutStrain: baseSurprise + (outlook && outlook.stealth >= 62 ? 0 : 1), instability: 0, companion: false, resolution: 'unresolved', recommended: !canSignal },
      { id: 'challenge', label: 'Challenge its claim', summary: 'Force the native out alone. A defensive scout fares better than a quiet one.', scoutStrain: baseSurprise + (outlook && outlook.hold >= 62 ? 1 : 2), instability: 2, companion: false, resolution: 'cleared' }
    ];
  }

  if (archetype === 'trapped') {
    if (mode === 'group') return [
      { id: 'free-native', label: 'Stop and free it', summary: 'Take time to release the native and quiet the false commands entering the lock.', crewStrain: baseSurprise, instability: 1, companion: false, resolution: 'cleared', recommended: true },
      { id: 'pin-rig', label: 'Pin the arms and pass', summary: 'Protect the crew and leave the native trapped. Fast, but physically demanding.', crewStrain: baseSurprise + 1, instability: 0, companion: false, resolution: 'cleared' },
      { id: 'detour', label: 'Leave the rig alone', summary: 'Back away from the decode route and reconsider the pressure seam.', crewStrain: baseSurprise, instability: informed ? 0 : 1, companion: false, resolution: 'detour' }
    ];
    const precise = outlook && (outlook.contact >= 62 || outlook.detect >= 72);
    return [
      { id: 'release', label: 'Release it from the arms', summary: 'Use empathy or careful observation to stop its panic without calling the crew.', scoutStrain: baseSurprise + (precise ? 0 : 1), instability: precise ? 0 : 1, companion: false, resolution: 'cleared', recommended: precise },
      { id: 'mark', label: 'Mark the safe controls and return', summary: 'Do not intervene alone. Give the full crew what it needs to approach safely.', scoutStrain: baseSurprise, instability: 0, companion: false, resolution: 'unresolved', recommended: !precise },
      { id: 'force-arms', label: 'Force the arms apart', summary: 'Resolve the trap through strength. It works, but the rig records the intrusion.', scoutStrain: baseSurprise + (outlook && outlook.hold >= 62 ? 1 : 2), instability: 2, companion: false, resolution: 'cleared' }
    ];
  }

  if (mode === 'group') {
    const options = [];
    if (medic) options.push({ id: 'aid', label: `${medic.species} treats the injury`, summary: 'Help the native and attempt a temporary field bond.', crewStrain: baseSurprise, instability: informed ? 0 : 1, companion: true, resolution: 'befriended', recommended: true });
    options.push({ id: 'drive-off', label: 'Drive it out of the underdeck', summary: 'Open the route by force. The crew stays together, but the annex hears it.', crewStrain: baseSurprise + 1, instability: 2, companion: false, resolution: 'cleared' });
    options.push({ id: 'detour', label: 'Back out and take the catwalk', summary: 'Avoid contact and reconsider the other route.', crewStrain: baseSurprise, instability: informed ? 0 : 1, companion: false, resolution: 'detour' });
    return options;
  }

  const directMedic = scout && (scout.traits.includes('healing') || scout.abilities.some((ability) => ability.action === 'mend'));
  const options = [];
  if (directMedic) {
    options.push({ id: 'aid', label: 'Treat the injury', summary: 'Use the scout’s healing ability to establish trust without calling the crew.', scoutStrain: baseSurprise, instability: 0, companion: true, resolution: 'befriended', recommended: true });
  } else if (medic && outlook && outlook.channel) {
    options.push({ id: 'call-medic', label: `Call ${medic.species} to help`, summary: `Use ${outlook.channel} to summon help. The delay destabilizes the annex, but may earn an ally.`, scoutStrain: baseSurprise, instability: 1, companion: true, resolution: 'befriended', recommended: true });
  } else if (medic) {
    options.push({ id: 'return-for-medic', label: `Return for ${medic.species}`, summary: 'Leave and physically guide the medic back. Safe, but tiring and slow.', scoutStrain: baseSurprise + 1, instability: 1, companion: true, resolution: 'befriended', recommended: true });
  }
  const escapeCost = baseSurprise + (outlook && outlook.stealth >= 62 ? 0 : 1);
  options.push({ id: 'withdraw', label: 'Withdraw and report', summary: 'Preserve the encounter for the full crew. The route remains occupied.', scoutStrain: escapeCost, instability: 0, companion: false, resolution: 'unresolved' });
  const holdCost = baseSurprise + (outlook && outlook.hold >= 62 ? 1 : 2);
  options.push({ id: 'hold', label: 'Hold ground and drive it away', summary: 'Resolve the encounter alone through force and presence.', scoutStrain: holdCost, instability: outlook && outlook.hold >= 62 ? 1 : 2, companion: false, resolution: 'cleared' });
  return options;
}

export function getCreatureValue(creature, key) {
  if (key === 'manipulation') return creature.physiology.capabilities.manipulation;
  return creature.attributes[key] || 0;
}

export function canRelay(scene, creature) {
  return !!relayChannel(scene, creature);
}

export function relayChannel(scene, creature) {
  const channels = creature.physiology.communication || [];
  if (channels.includes('telepathic')) return 'telepathic';
  return channels.find((channel) => scene.relayChannels.includes(channel)) || null;
}

export function scanScene(scene, creature) {
  const relay = canRelay(scene, creature);
  const hazards = scene.hazards.map((hazard) => {
    const special = creature.physiology.senses.special || [];
    const sensed = (creature.physiology.senses[hazard.sense] || 0) >= hazard.threshold || special.includes(hazard.special);
    return { ...hazard, sensed, revealed: sensed && relay };
  });
  return {
    relay,
    hazards,
    revealedIds: hazards.filter((hazard) => hazard.revealed).map((hazard) => hazard.id),
    trappedCount: hazards.filter((hazard) => hazard.sensed && !hazard.revealed).length
  };
}

export function scanReport(scene, creature, scan) {
  if (scan.mode === 'blind') {
    return {
      outcome: 'blind',
      title: 'No field scan performed',
      narrative: `The crew held at the threshold of ${scene.title} and committed no scout to ${scene.surveyFocus}.`,
      finding: `${scene.hazards.length} possible signal${scene.hazards.length === 1 ? '' : 's'} ${scene.hazards.length === 1 ? 'remains' : 'remain'} unresolved. No energy was spent, but route intelligence is incomplete.`,
      decision: 'Every route remains available. An unresolved signal may consume extra crew energy and annex stability if its route is chosen.',
      strainCost: 0,
      channel: null,
      revealed: [],
      trapped: [],
      affectedRoutes: []
    };
  }

  if (scan.mode === 'debrief') {
    const revealed = scan.hazards.filter((hazard) => hazard.revealed);
    const affectedRoutes = scene.routes.filter((route) => revealed.some((hazard) => route.hazardIds.includes(hazard.id)));
    return {
      outcome: revealed.length ? 'revealed' : 'quiet',
      title: revealed.length ? 'Scout returned with actionable intelligence' : 'Scout returned—no danger identified',
      narrative: `${creature.species} could not report remotely, so it retraced the route and delivered its observations in person.`,
      finding: revealed.length ? `${revealed.length} hazard signature${revealed.length === 1 ? '' : 's'} became usable after the scout returned.` : 'The scout returned safely but found no danger its senses could identify.',
      decision: revealed.length ? `${affectedRoutes.map((route) => route.title).join(' and ')} ${affectedRoutes.length === 1 ? 'is now marked' : 'are now marked'} with known danger.` : 'Compare the routes normally. Unknown danger may still remain.',
      strainCost: 2,
      channel: 'physical return',
      revealed,
      trapped: [],
      affectedRoutes
    };
  }

  const revealed = scan.hazards.filter((hazard) => hazard.revealed);
  const trapped = scan.hazards.filter((hazard) => hazard.sensed && !hazard.revealed);
  const affectedRoutes = scene.routes.filter((route) => revealed.some((hazard) => route.hazardIds.includes(hazard.id)));
  const channel = relayChannel(scene, creature);

  if (revealed.length) {
    return {
      outcome: 'revealed',
      title: 'Actionable intelligence received',
      narrative: `${creature.species} entered the threshold and surveyed ${scene.surveyFocus}. Its senses found a danger the unaided crew could not confirm.`,
      finding: `${revealed.length} hazard signature${revealed.length === 1 ? '' : 's'} reached command over ${channel}.`,
      decision: `${affectedRoutes.map((route) => route.title).join(' and ')} ${affectedRoutes.length === 1 ? 'is now marked' : 'are now marked'} with the revealed hazard. You can avoid it or prepare the right lead for it.`,
      strainCost: 1,
      channel,
      revealed,
      trapped,
      affectedRoutes
    };
  }

  if (trapped.length) {
    return {
      outcome: 'trapped',
      title: 'Signal detected—report lost',
      narrative: `${creature.species} surveyed ${scene.surveyFocus} and reacted to something in the field, but its ${creature.physiology.communication.join(' / ') || 'lack of communication'} could not cross this chamber.`,
      finding: `${trapped.length} sensed signature${trapped.length === 1 ? ' stayed' : 's stayed'} with the scout. Command cannot use details it never received.`,
      decision: 'The affected route still shows an unresolved signal. Choosing it may expose the crew to surprise consequences.',
      strainCost: 1,
      channel: null,
      revealed,
      trapped,
      affectedRoutes
    };
  }

  if (!channel) {
    return {
      outcome: 'unrelayed',
      title: 'Scan complete—no command link',
      narrative: `${creature.species} surveyed ${scene.surveyFocus}, but none of its communication channels could carry a field report across ${scene.title}.`,
      finding: 'The scout showed no detectable reaction to a hazard, but command cannot treat silence as a reliable all-clear.',
      decision: 'Route intelligence remains incomplete. Any unresolved signal still carries surprise consequences if you choose its route.',
      strainCost: 1,
      channel: null,
      revealed,
      trapped,
      affectedRoutes
    };
  }

  return {
    outcome: 'quiet',
    title: 'Scan complete—no actionable signature',
    narrative: `${creature.species} surveyed ${scene.surveyFocus} and successfully checked back with command${channel ? ` over ${channel}` : ''}.`,
    finding: 'The scout found nothing its available senses could identify as an actionable hazard. That is a limited result, not proof that every route is safe.',
    decision: 'Compare the routes normally. Unresolved signals remain unresolved because the scout may not possess the sense needed to identify them.',
    strainCost: 1,
    channel,
    revealed,
    trapped,
    affectedRoutes
  };
}

export function methodOptions(creature, route, spentAbilities = []) {
  const options = [];
  route.methods.forEach((method, methodIndex) => {
    if (method.kind === 'capability') {
      const value = creature.physiology.capabilities[method.key] || 0;
      if (value > 0) options.push({ ...method, id: `${methodIndex}-${method.kind}-${method.key}`, sourceValue: value });
    } else if (method.kind === 'attribute') {
      options.push({ ...method, id: `${methodIndex}-${method.kind}-${method.key}`, sourceValue: getCreatureValue(creature, method.key) });
    } else if (method.kind === 'trait') {
      if (creature.traits.includes(method.key)) options.push({ ...method, id: `${methodIndex}-${method.kind}-${method.key}`, sourceValue: 100 });
    } else if (method.kind === 'action') {
      creature.abilities
        .filter((ability) => ability.action === method.key && !spentAbilities.includes(ability.id))
        .forEach((ability) => options.push({
          ...method,
          id: `${methodIndex}-${method.kind}-${ability.id}`,
          ability,
          abilityId: ability.id,
          sourceValue: ability.intensity,
          label: `${ability.name} — ${method.label}`
        }));
    }
  });

  if (!options.length) {
    options.push({
      id: 'fallback-careful-advance', kind: 'fallback', key: 'instinct', attribute: 'resilience',
      label: 'Careful advance', sourceValue: creature.attributes.instinct
    });
  }
  return options;
}

export function methodScore(creature, method) {
  const attribute = getCreatureValue(creature, method.attribute);
  if (method.kind === 'capability') return Math.round(method.sourceValue * 0.62 + attribute * 0.23 + creature.attributes.endurance * 0.15);
  if (method.kind === 'action') return Math.round(method.sourceValue * 0.68 + attribute * 0.2 + creature.physiology.capabilities.manipulation * 0.12);
  if (method.kind === 'trait') return Math.round(68 + attribute * 0.22);
  if (method.kind === 'attribute') return Math.round(method.sourceValue * 0.72 + getCreatureValue(creature, method.secondary) * 0.28);
  return Math.round(creature.attributes.instinct * 0.55 + creature.attributes.resilience * 0.45 - 12);
}

export function methodScoreInputs(creature, method) {
  if (method.kind === 'capability') {
    return [
      { label: titleCase(method.key), value: method.sourceValue, weight: 62 },
      { label: titleCase(method.attribute), value: getCreatureValue(creature, method.attribute), weight: 23 },
      { label: 'Endurance', value: creature.attributes.endurance, weight: 15 }
    ];
  }
  if (method.kind === 'action') {
    return [
      { label: 'Ability intensity', value: method.sourceValue, weight: 68 },
      { label: titleCase(method.attribute), value: getCreatureValue(creature, method.attribute), weight: 20 },
      { label: 'Manipulation', value: creature.physiology.capabilities.manipulation, weight: 12 }
    ];
  }
  if (method.kind === 'trait') {
    return [
      { label: 'Trait baseline', value: 68, weight: null },
      { label: titleCase(method.attribute), value: getCreatureValue(creature, method.attribute), weight: 22 }
    ];
  }
  if (method.kind === 'attribute') {
    return [
      { label: titleCase(method.key), value: method.sourceValue, weight: 72 },
      { label: titleCase(method.secondary), value: getCreatureValue(creature, method.secondary), weight: 28 }
    ];
  }
  return [
    { label: 'Instinct', value: creature.attributes.instinct, weight: 55 },
    { label: 'Resilience', value: creature.attributes.resilience, weight: 45 },
    { label: 'Fallback penalty', value: -12, weight: null }
  ];
}

export function outcomeForMargin(margin) {
  if (margin >= 14) return { quality: 'clean', label: 'Strong advantage', baseLeadStrain: 0, baseSupportStrain: 0, explanation: 'The team clears the target comfortably. Expect a clean passage before environmental or hidden consequences.' };
  if (margin >= 0) return { quality: 'costly', label: 'Narrow advantage', baseLeadStrain: 1, baseSupportStrain: 0, explanation: 'The team clears the target, but only narrowly. Expect the lead to spend 1 energy.' };
  if (margin >= -14) return { quality: 'rough', label: 'Disadvantaged', baseLeadStrain: 2, baseSupportStrain: margin < -8 ? 1 : 0, explanation: 'The team falls short of the target. The route remains passable, but support must intervene and more energy is spent.' };
  return { quality: 'critical', label: 'Severe mismatch', baseLeadStrain: 3, baseSupportStrain: 1, explanation: 'The method is far below the target. The crew can force passage, but the cost is severe.' };
}

export function decisionForecast({ route, lead, support, method, scan, leadLoad = 0, supportLoad = 0 }) {
  const leadReadiness = readinessState(leadLoad);
  const supportReadiness = readinessState(supportLoad);
  const leadScore = Math.max(0, methodScore(lead, method) - leadReadiness.scorePenalty);
  const supportBonus = support ? Math.max(0, supportScore(support, method) - supportReadiness.supportPenalty) : 0;
  const teamScore = leadScore + supportBonus;
  const margin = teamScore - route.difficulty;
  const outcome = outcomeForMargin(margin);
  const environment = environmentConsequences(lead, route.environment);
  const naturalReaction = reactionMatches(lead, route.reaction);
  const unresolvedHazards = scan
    ? route.hazardIds.filter((id) => !scan.revealedIds.includes(id))
    : [...route.hazardIds];
  return {
    leadScore,
    supportBonus,
    teamScore,
    difficulty: route.difficulty,
    margin,
    ...outcome,
    environment,
    naturalReaction,
    unresolvedHazards,
    readiness: { lead: leadReadiness, support: supportReadiness },
    inputs: methodScoreInputs(lead, method)
  };
}

export function supportScore(creature, method) {
  const values = [creature.attributes.intelligence, creature.attributes.instinct, creature.physiology.capabilities.manipulation];
  let score = Math.round(Math.max(...values) / 12);
  if (creature.traits.includes('protective') || creature.traits.includes('inspiring')) score += 1;
  if (method.kind === 'action' && method.key === 'mend' && creature.traits.includes('healing')) score += 2;
  return Math.min(10, score);
}

export function reactionMatches(creature, reaction) {
  const value = creature.temperament[reaction.axis];
  return reaction.direction === 'high' ? value >= 56 : value <= 44;
}

export function exposureMultiplier(creature, element) {
  if (!element) return 1;
  const row = effectiveness[titleCase(element)];
  if (!row) return 1;
  const entries = Object.entries(creature.element.affinities);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  return entries.reduce((sum, [key, weight]) => sum + (row[titleCase(key)] == null ? 1 : row[titleCase(key)]) * weight, 0) / totalWeight;
}

export function environmentConsequences(creature, environment) {
  let strain = 0;
  const notes = [];
  const physiology = creature.physiology;
  if (!physiology.ambientMedia.includes(environment.medium)) {
    strain += 2;
    notes.push(`cannot safely remain in ${environment.medium}`);
  } else if (environment.medium === 'liquid' && physiology.breathes.length > 0 && !physiology.breathes.includes('liquid')) {
    strain += 1;
    notes.push('must cross the liquid without breathing');
  }
  if (environment.temperatureC < physiology.temperatureC.min || environment.temperatureC > physiology.temperatureC.max) {
    strain += 1;
    notes.push('operates outside its normal temperature band');
  }
  const multiplier = exposureMultiplier(creature, environment.element);
  if (multiplier >= 1.75) {
    strain += 2;
    notes.push(`is highly exposed to ${titleCase(environment.element)}`);
  } else if (multiplier >= 1.35) {
    strain += 1;
    notes.push(`is vulnerable to ${titleCase(environment.element)}`);
  } else if (multiplier <= 0.5) {
    notes.push(`is naturally well-suited to ${titleCase(environment.element)} exposure`);
  }
  if (creature.traits.includes('resistant') && strain > 0) {
    strain -= 1;
    notes.push('resistance absorbs one exposure consequence');
  }
  return { strain, notes, multiplier };
}

export function resolveScene({ scene, route, lead, support, method, scan, useCommand, leadLoad = 0, supportLoad = 0 }) {
  const leadReadiness = readinessState(leadLoad);
  const supportReadiness = readinessState(supportLoad);
  const rawMethodScore = Math.max(0, methodScore(lead, method) - leadReadiness.scorePenalty);
  const supportBonus = Math.max(0, supportScore(support, method) - supportReadiness.supportPenalty);
  const totalScore = rawMethodScore + supportBonus;
  const margin = totalScore - route.difficulty;
  let leadStrain = margin >= 14 ? 0 : margin >= 0 ? 1 : margin >= -14 ? 2 : 3;
  let supportStrain = margin < -8 ? 1 : 0;
  let pressure = route.pressure;
  const unseenHazards = scene.hazards.filter((hazard) => route.hazardIds.includes(hazard.id) && !scan.revealedIds.includes(hazard.id));
  unseenHazards.forEach((hazard) => {
    leadStrain += hazard.strain;
    pressure += hazard.pressure;
  });

  const environment = environmentConsequences(lead, route.environment);
  leadStrain += environment.strain;

  const naturalReaction = reactionMatches(lead, route.reaction);
  const reactionControlled = naturalReaction || useCommand;
  if (!reactionControlled) pressure += 1;
  if (naturalReaction && leadStrain > 0) leadStrain -= 1;

  const quality = margin >= 14 ? 'clean' : margin >= 0 ? 'costly' : margin >= -14 ? 'rough' : 'critical';
  return {
    quality,
    rawMethodScore,
    supportBonus,
    totalScore,
    margin,
    leadStrain,
    supportStrain,
    pressure,
    salvage: route.salvage,
    abilityId: method.abilityId,
    unseenHazards,
    environment,
    naturalReaction,
    reactionControlled,
    readiness: { lead: leadReadiness, support: supportReadiness },
    summary: quality === 'clean'
      ? `${lead.species} executes the method cleanly and keeps the scene stable.`
      : quality === 'costly'
        ? `${lead.species} gets the crew through, but the work leaves a mark.`
        : quality === 'rough'
          ? `The method works only after ${support.species} intervenes. The annex notices.`
          : `The crew forces a way through as the scene collapses around them.`
  };
}

export function assignmentStatus({ route, lead, support, method }) {
  if (!route) return { ready: false, step: 'route', message: 'Choose a route to begin the assignment.' };
  if (!lead) return { ready: false, step: 'lead', message: 'Step 1 of 3 — choose a lead creature from the crew rail.' };
  if (!support) return { ready: false, step: 'support', message: 'Step 2 of 3 — choose a support creature. Support is required for every crossing.' };
  if (!method) return { ready: false, step: 'method', message: 'Step 3 of 3 — choose how the lead will cross.' };
  return { ready: true, step: 'ready', message: 'Assignment complete — review the score, then commit the crew.' };
}

export function highestCapabilities(creature, count = 3) {
  return Object.entries(creature.physiology.capabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);
}

export function temperamentPhrase(creature) {
  const axes = Object.entries(creature.temperament).sort((a, b) => b[1] - a[1]);
  const words = {
    boldness: 'bold', curiosity: 'curious', energy: 'energetic', aggression: 'confrontational', sociability: 'social'
  };
  const lowWords = {
    boldness: 'cautious', curiosity: 'focused', energy: 'patient', aggression: 'gentle', sociability: 'independent'
  };
  const highest = axes[0];
  const lowest = [...axes].sort((a, b) => a[1] - b[1])[0];
  return `${words[highest[0]]}; ${lowWords[lowest[0]]}`;
}
