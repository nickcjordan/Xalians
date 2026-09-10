import { CREATURES, MISSION } from './longReturnData';
import { applyMissionMemory, assignmentStatus, canRelay, decisionForecast, encounterOptions, encounterOutlook, environmentConsequences, instabilityState, methodOptions, outcomeForMargin, readinessState, resolveScene, scanReport, scanScene, scoutProfile } from './longReturnEngine';

const creature = (species) => CREATURES.find((entry) => entry.species === species);

describe('Long Return prototype engine', () => {
  test.each([
    [14, 'clean', 0],
    [13, 'costly', 1],
    [0, 'costly', 1],
    [-1, 'rough', 2],
    [-14, 'rough', 2],
    [-15, 'critical', 3]
  ])('maps a margin of %i to the tutorial outcome bands', (margin, quality, baseLeadStrain) => {
    expect(outcomeForMargin(margin)).toMatchObject({ quality, baseLeadStrain });
  });

  test('forecasts every available first-scene crew plan for Simple mode', () => {
    const scene = MISSION.scenes[0];
    const scan = scanScene(scene, creature('Graviclaw'));
    scene.routes.forEach((route) => {
      CREATURES.forEach((lead) => {
        CREATURES.filter((support) => support.id !== lead.id).forEach((support) => {
          methodOptions(lead, route, []).forEach((method) => {
            expect(decisionForecast({ route, lead, support, method, scan })).toEqual(expect.objectContaining({
              teamScore: expect.any(Number),
              margin: expect.any(Number)
            }));
          });
        });
      });
    });
  });

  test('special senses reveal a hazard when the scout can relay it', () => {
    const scene = MISSION.scenes[0];
    const result = scanScene(scene, creature('Xylum'));
    expect(result.revealedIds).toContain('conductive-brine');
  });

  test('a sensed hazard stays trapped when communication cannot cross the scene', () => {
    const scene = MISSION.scenes[1];
    const ectoghoul = creature('Ectoghoul');
    expect(canRelay(scene, ectoghoul)).toBe(false);
    const result = scanScene(scene, ectoghoul);
    expect(result.trappedCount).toBe(1);
    expect(result.revealedIds).toHaveLength(0);
  });

  test('non-breathers do not drown in liquid', () => {
    const result = environmentConsequences(creature('Ectoghoul'), { medium: 'liquid', temperatureC: 10, element: 'ghost' });
    expect(result.notes.join(' ')).not.toMatch(/without breathing/);
  });

  test('spent abilities are removed from method choices', () => {
    const route = MISSION.scenes[0].routes[0];
    const chromocat = creature('Chromocat');
    const before = methodOptions(chromocat, route, []);
    const after = methodOptions(chromocat, route, ['chroma-beam']);
    expect(before.some((method) => method.abilityId === 'chroma-beam')).toBe(true);
    expect(after.some((method) => method.abilityId === 'chroma-beam')).toBe(false);
  });

  test('revealed hazards do not add their surprise pressure', () => {
    const scene = MISSION.scenes[0];
    const route = scene.routes[1];
    const lead = creature('Hippochamp');
    const support = creature('Graviclaw');
    const method = methodOptions(lead, route, [])[0];
    const hidden = resolveScene({ scene, route, lead, support, method, scan: { revealedIds: [] }, useCommand: true });
    const revealed = resolveScene({ scene, route, lead, support, method, scan: { revealedIds: ['conductive-brine'] }, useCommand: true });
    expect(hidden.pressure).toBe(revealed.pressure + 1);
    expect(hidden.leadStrain).toBeGreaterThan(revealed.leadStrain);
  });

  test('assignment status explains each required choice, including support', () => {
    const route = MISSION.scenes[0].routes[0];
    const lead = creature('Hippochamp');
    const support = creature('Chromocat');
    const method = methodOptions(lead, route, [])[0];

    expect(assignmentStatus({ route }).step).toBe('lead');
    expect(assignmentStatus({ route, lead }).step).toBe('support');
    expect(assignmentStatus({ route, lead }).message).toMatch(/support is required/i);
    expect(assignmentStatus({ route, lead, support }).step).toBe('method');
    expect(assignmentStatus({ route, lead, support, method }).ready).toBe(true);
  });

  test('every scene, route, creature, support, scan, and command combination resolves safely', () => {
    const qualities = ['clean', 'costly', 'rough', 'critical'];
    let resolutions = 0;

    MISSION.scenes.forEach((scene) => {
      const hazardIds = scene.hazards.map((hazard) => hazard.id);
      scene.routes.forEach((route) => {
        expect(route.hazardIds.every((id) => hazardIds.includes(id))).toBe(true);

        CREATURES.forEach((lead) => {
          const methods = methodOptions(lead, route, []);
          const spentIds = lead.abilities.map((ability) => ability.id);
          const methodsAfterSpendingEveryAbility = methodOptions(lead, route, spentIds);
          expect(methods.length).toBeGreaterThan(0);
          expect(methodsAfterSpendingEveryAbility.length).toBeGreaterThan(0);
          expect(methodsAfterSpendingEveryAbility.some((method) => spentIds.includes(method.abilityId))).toBe(false);

          CREATURES.filter((support) => support.id !== lead.id).forEach((support) => {
            methods.forEach((method) => {
              [[], hazardIds].forEach((revealedIds) => {
                [false, true].forEach((useCommand) => {
                  const result = resolveScene({
                    scene,
                    route,
                    lead,
                    support,
                    method,
                    scan: { revealedIds },
                    useCommand
                  });
                  expect(qualities).toContain(result.quality);
                  expect(Number.isFinite(result.totalScore)).toBe(true);
                  expect(result.leadStrain).toBeGreaterThanOrEqual(0);
                  expect(result.supportStrain).toBeGreaterThanOrEqual(0);
                  expect(result.pressure).toBeGreaterThanOrEqual(0);
                  expect(result.salvage).toBeGreaterThanOrEqual(0);
                  resolutions += 1;
                });
              });
            });
          });
        });
      });
    });

    expect(resolutions).toBeGreaterThan(2000);
  });

  test('every concealed hazard can be revealed by at least one registry creature', () => {
    MISSION.scenes.forEach((scene) => {
      scene.hazards.forEach((hazard) => {
        const scouts = CREATURES.filter((candidate) => scanScene(scene, candidate).revealedIds.includes(hazard.id));
        expect(scouts.map((candidate) => candidate.species)).not.toHaveLength(0);
      });
    });
  });

  test('scan reports explain revealed, trapped, quiet, and blind outcomes', () => {
    const firstScene = MISSION.scenes[0];
    const revealedScan = { ...scanScene(firstScene, creature('Xylum')), mode: 'scan' };
    const revealed = scanReport(firstScene, creature('Xylum'), revealedScan);
    expect(revealed.outcome).toBe('revealed');
    expect(revealed.revealed[0].label).toBe('Conductive brine');
    expect(revealed.affectedRoutes.map((route) => route.id)).toEqual(['intake']);
    expect(revealed.decision).toMatch(/Ride the intake current/);

    const trappedScene = MISSION.scenes[1];
    const trappedScan = { ...scanScene(trappedScene, creature('Ectoghoul')), mode: 'scan' };
    expect(scanReport(trappedScene, creature('Ectoghoul'), trappedScan).outcome).toBe('trapped');

    const quietScan = { ...scanScene(firstScene, creature('Graviclaw')), mode: 'scan' };
    expect(scanReport(firstScene, creature('Graviclaw'), quietScan).outcome).toBe('quiet');

    const unrelayedScan = { ...scanScene(firstScene, creature('Ectoghoul')), mode: 'scan' };
    expect(scanReport(firstScene, creature('Ectoghoul'), unrelayedScan).outcome).toBe('unrelayed');

    const blind = scanReport(firstScene, null, {
      mode: 'blind',
      hazards: firstScene.hazards.map((hazard) => ({ ...hazard, revealed: false, sensed: false })),
      revealedIds: []
    });
    expect(blind.outcome).toBe('blind');
    expect(blind.strainCost).toBe(0);
    expect(blind.decision).toMatch(/crew energy and annex stability/i);
  });

  test('readiness creates visible degradation before a creature becomes spent', () => {
    expect(readinessState(0).label).toBe('Ready');
    expect(readinessState(3)).toMatchObject({ label: 'Worn', scorePenalty: 4 });
    expect(readinessState(5)).toMatchObject({ label: 'Critical', scorePenalty: 9 });
    expect(readinessState(6).label).toBe('Spent');
    expect(instabilityState(0).label).toBe('Stable');
    expect(instabilityState(9).label).toBe('Collapse imminent');
    expect(instabilityState(10).label).toBe('Collapse');
  });

  test('worn leads and support contribute less to the same crossing', () => {
    const scene = MISSION.scenes[0];
    const route = scene.routes[0];
    const lead = creature('Chromocat');
    const support = creature('Ectoghoul');
    const method = methodOptions(lead, route, []).find((entry) => entry.key === 'leap');
    const ready = decisionForecast({ route, lead, support, method, scan: { revealedIds: [] } });
    const worn = decisionForecast({ route, lead, support, method, scan: { revealedIds: [] }, leadLoad: 3, supportLoad: 3 });
    expect(worn.leadScore).toBe(ready.leadScore - 4);
    expect(worn.supportBonus).toBe(ready.supportBonus - 2);
    expect(worn.margin).toBe(ready.margin - 6);
  });

  test('creature details produce distinct scout roles and encounter tradeoffs', () => {
    const scene = MISSION.scenes[1];
    const profiles = ['Chromocat', 'Graviclaw', 'Hippochamp'].map((name) => scoutProfile(scene, creature(name)));
    expect(new Set(profiles.map((profile) => profile.role)).size).toBeGreaterThan(1);
    expect(encounterOutlook(scene, creature('Chromocat'))).toEqual(expect.objectContaining({ posture: expect.any(String), surpriseStrain: expect.any(Number) }));
    const options = encounterOptions(scene, creature('Ectoghoul'), CREATURES, 'scout');
    expect(options.some((option) => option.companion)).toBe(true);
    expect(options.some((option) => option.resolution === 'unresolved')).toBe(true);
    expect(options.some((option) => option.resolution === 'cleared')).toBe(true);
  });

  test('earlier routes change later targets without mutating mission data', () => {
    const turbine = MISSION.scenes[1];
    const remembered = applyMissionMemory(turbine, ['quiet-entry']);
    expect(remembered.routes.find((route) => route.id === 'catwalk')).toMatchObject({ difficulty: 63, originalDifficulty: 68 });
    expect(remembered.routes.find((route) => route.id === 'underdeck').difficulty).toBe(61);
    expect(turbine.routes.find((route) => route.id === 'catwalk').difficulty).toBe(68);

    const vestibule = applyMissionMemory(MISSION.scenes[2], ['maintenance-codes']);
    expect(vestibule.routes.find((route) => route.id === 'decode').difficulty).toBe(65);
    expect(vestibule.routes.find((route) => route.id === 'decode').activeEffects[0].label).toBe('Recovered codes');
  });

  test('trapped and territorial encounters offer distinct non-combat responses', () => {
    const trapped = encounterOptions(MISSION.scenes[2], creature('Hypnopet'), CREATURES, 'scout');
    const territorial = encounterOptions(MISSION.scenes[3], creature('Chromocat'), CREATURES, 'scout');
    expect(trapped.map((option) => option.id)).toEqual(expect.arrayContaining(['release', 'mark', 'force-arms']));
    expect(territorial.map((option) => option.id)).toEqual(expect.arrayContaining(['withdraw', 'challenge']));
    expect([...trapped, ...territorial].every((option) => option.summary.length > 35)).toBe(true);
  });

  test('a physical scout debrief converts sensed details into usable route intelligence', () => {
    const scene = MISSION.scenes[1];
    const scout = creature('Ectoghoul');
    const initial = scanScene(scene, scout);
    expect(initial.trappedCount).toBeGreaterThan(0);
    const returned = { ...initial, mode: 'debrief', returned: true, hazards: initial.hazards.map((hazard) => ({ ...hazard, revealed: hazard.sensed })), revealedIds: initial.hazards.filter((hazard) => hazard.sensed).map((hazard) => hazard.id) };
    const report = scanReport(scene, scout, returned);
    expect(report.outcome).toBe('revealed');
    expect(report.channel).toBe('physical return');
    expect(report.strainCost).toBe(2);
  });

  test('every scene explains the immediate objective, survey focus, and route destination', () => {
    const trackLabels = new Set();
    MISSION.scenes.forEach((scene) => {
      expect(scene.goal.length).toBeGreaterThan(30);
      expect(scene.destination.length).toBeGreaterThan(20);
      expect(scene.surveyFocus.length).toBeGreaterThan(20);
      expect(scene.trackLabel.length).toBeGreaterThan(5);
      trackLabels.add(scene.trackLabel);
    });
    expect(trackLabels.size).toBe(MISSION.scenes.length);
  });

  test('decision forecasts translate the visible method equation into an outcome', () => {
    const route = MISSION.scenes[0].routes[0];
    const lead = creature('Chromocat');
    const support = creature('Ectoghoul');
    const methods = methodOptions(lead, route, []);
    const climb = methods.find((entry) => entry.key === 'climb');
    const leap = methods.find((entry) => entry.key === 'leap');
    const beam = methods.find((entry) => entry.key === 'beam');
    const scan = { revealedIds: [] };

    const climbForecast = decisionForecast({ route, lead, support, method: climb, scan });
    const leapForecast = decisionForecast({ route, lead, support, method: leap, scan });
    const beamForecast = decisionForecast({ route, lead, support, method: beam, scan });

    expect([climbForecast.leadScore, leapForecast.leadScore, beamForecast.leadScore]).toEqual([73, 86, 59]);
    expect(beamForecast.supportBonus).toBe(7);
    expect(beamForecast.teamScore).toBe(66);
    expect(beamForecast.difficulty).toBe(63);
    expect(beamForecast.margin).toBe(3);
    expect(beamForecast.quality).toBe('costly');
    expect(beamForecast.label).toBe('Narrow advantage');
    expect(leapForecast.quality).toBe('clean');
  });
});
