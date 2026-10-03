import React from "react";
import { ScrollText } from "lucide-react";
import { KeyCard } from "./keys";
import { ThreatTag, MarkChips, MatchupMark, ElementBadge, HealthBar, NextActRow } from "./plate";
import { TurnRail } from "./rail";
import { DeltaChip } from "./banner";
import type { ActLine, Cell, KeyView, NextAct, PlatePreview, RailSlot, Threat } from "./view";

/**
  The Guide as a legend: every mark a player meets, drawn by the same component the play screen uses,
  beside one plain sentence. The samples are inert (no focus, no pointer) and use plain numbers only to
  show the form; the sentence says what the form means.
*/

const previewCell = (letter: string): Cell => ({ target: letter, letter: letter as Cell["letter"], n: 0, step: 1, immune: false, finishes: false, absorbed: 0 });

const sampleKey = (over: Partial<KeyView> & { acts: ActLine[] }): KeyView => ({
  index: 0,
  name: "A move",
  signature: false,
  rests: 0,
  state: "ready",
  restLeft: 0,
  kind: "attack",
  area: false,
  aim: "enemy",
  cells: [],
  supports: [],
  power: 12,
  ...over,
});

const sampleNext = (over: Partial<NextAct>): NextAct => ({ from: "A", kind: "attack", n: 14, parts: [], toLetters: [], self: false, ...over });

/** A sample plaque: the plate's own rows (name, health, next act, marks) drawn by the play screen's components, inert. */
function PlaqueSample({ name, hp, max, health, next, marks, shield, matchup }: { name: string; hp: number; max: number; health?: PlatePreview["health"]; next?: NextAct | null; marks?: { shield: number; boost: number; hinder: number }; shield?: PlatePreview["shield"]; matchup?: number }) {
  return (
    <span className="pwt-legend-plaque pwt-plaque">
      {matchup !== undefined && <MatchupMark step={matchup} lit />}
      <span className="pwt-name">{name}</span>
      <HealthBar hp={hp} max={max} plain preview={health} />
      {next !== undefined && <NextActRow next={next} />}
      {(marks || shield) && (
        <div className="pwt-marks">
          <MarkChips marks={marks ?? { shield: 0, boost: 0, hinder: 0 }} preview={shield ? { shield } : null} />
        </div>
      )}
    </span>
  );
}

const sampleThreat = (over: Partial<Threat>): Threat => ({
  from: "A",
  fromId: "a",
  fromName: "Enemy",
  on: "c",
  onName: "the companion",
  kind: "attack",
  move: "A move",
  n: 14,
  step: 1,
  parts: [],
  order: 0,
  ...over,
});

/** Wraps a sample so it cannot be focused or pressed. */
function Sample({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`pwt-legend-sample ${wide ? "wide" : ""}`} aria-hidden="true" {...({ inert: "" } as object)}>
      {children}
    </div>
  );
}

const noop = () => {};

function Row({ sample, children, wide }: { sample: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <li className="pwt-legend-row">
      <Sample wide={wide}>{sample}</Sample>
      <p>{children}</p>
    </li>
  );
}

/**
  The turn in one picture, for the briefing: a move that is a verb and a number and, beside it, the enemy's health row
  changing in place once the move is chosen. Inert, drawn by the play screen's own components.
*/
export function TurnLesson({ phone = false }: { phone?: boolean }) {
  return (
    <div className="pwt-lesson" data-lesson="">
      <Sample>
        <div className="pwt-lesson-key">
          <KeyCard keyView={sampleKey({ name: "Peck", acts: [{ verb: "strike", n: 3 }] })} armed selected={false} onPress={noop} />
        </div>
        <span className="pwt-lesson-then" aria-hidden="true">
          then
        </span>
        <PlaqueSample name="A · Crawler" hp={34} max={34} health={{ from: 34, to: 29 }} />
      </Sample>
      {phone ? (
        <p>A key is a verb and a number. Choose one: each enemy shows its health before and after.</p>
      ) : (
        <p>Each move is a verb and a number, in a row above the companion whose turn it is. Choose one: each enemy it could hit shows its health before and after.</p>
      )}
    </div>
  );
}

export function GuidePanel({
  onClose,
  touch = false,
  phone = false,
  squadArt,
  enemyArt,
}: {
  onClose: () => void;
  /** The phone layout: its moves are a column of keys on the right, not a row above the companion. */
  phone?: boolean;
  /** A touch screen: the sentences that mention hover say tap instead. */
  touch?: boolean;
  squadArt?: { art: string; element: string };
  enemyArt?: { art: string; element: string };
}) {
  const me = squadArt ?? { art: "shield", element: "metal" };
  const foe = enemyArt ?? { art: "shield", element: "metal" };
  const rail: RailSlot[] = [
    { id: "g1", enemy: false, name: "Your companion", art: me.art, element: me.element, state: "now" },
    { id: "g2", enemy: true, letter: "A", name: "Enemy", art: foe.art, element: foe.element, state: "next" },
    { id: "g3", enemy: true, letter: "B", name: "Enemy", art: foe.art, element: foe.element, state: "later" },
    { id: "g4", enemy: false, name: "Your companion", art: me.art, element: me.element, state: "later", roundStart: 3 },
  ];
  return (
    <div className="pwt-overlay" onClick={onClose}>
      <div className="pwt-panel pwt-guide" role="dialog" aria-label="Guide" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Guide</p>
        <h2>What the marks mean</h2>
        <div className="pwt-guide-cols">
          <div className="pwt-guide-col">
          <section className="pwt-legend-section">
            <h3>{phone ? "Keys and targets" : "Moves and targets"}</h3>
            <ul className="pwt-legend">
          <Row
            wide
            sample={
              <span className="pwt-legend-keys">
                <KeyCard keyView={sampleKey({ name: "Peck", acts: [{ verb: "strike", n: 3 }] })} armed selected={false} onPress={noop} />
                <KeyCard keyView={sampleKey({ name: "Sweep", area: true, acts: [{ verb: "sweep", n: 6, all: true }, { verb: "weaken", n: 6 }] })} armed selected={false} onPress={noop} />
              </span>
            }
          >
            {phone ? "A key" : "A move"} is what you do and its number: Strike hits one enemy, Sweep hits all of them (ALL), Weaken cuts an enemy&apos;s next hit, Mend and Guard help a companion, Boost raises a companion&apos;s next attack, Slow delays a turn. What follows the dot is a rider. Below, its rest.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PlaqueSample name="A · Crawler" hp={34} max={34} health={{ from: 34, to: 29 }} matchup={1.5} />
              </span>
            }
          >
            {touch ? (phone ? "Tap a key" : "Tap a move") : phone ? "Hover or choose a key" : "Hover or choose a move"} and each plate it would change shows the change in the row that already carries that number: before, then after. A Strike of 3 on a strong matchup takes 5: the lit part of the bar is what goes, and the lit tab (x1.5) is why.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PlaqueSample name="A · Crawler" hp={1} max={34} health={{ from: 1, to: 0, skull: true }} />
              </span>
            }
          >
            A skull after the number: the move knocks that enemy out, and its next act is crossed out. The matchup tab reads NO EFFECT when the element chart gives 0.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PlaqueSample name="A · Crawler" hp={34} max={34} next={sampleNext({ n: 0, before: 14 })} />
              </span>
            }
          >
            Weaken changes the enemy&apos;s next-act row: its next hit before, then after (14 to 0). The tag on the companion it was aimed at reads the same way when you point at that enemy.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PlaqueSample name="Companion" hp={72} max={126} health={{ from: 72, to: 81 }} shield={{ from: 0, to: 6 }} />
              </span>
            }
          >
            Mend adds to a companion&apos;s health, shown as the lit part of its bar; Guard puts a shield chip in its marks row. A guarded companion&apos;s threat tags read again after the shield.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-keys">
                <KeyCard keyView={sampleKey({ name: "Choose", acts: [{ verb: "strike", n: 3 }], cells: [previewCell("A"), previewCell("B")] })} armed selected onPress={noop} />
              </span>
            }
          >
            {phone
              ? touch
                ? "Acting takes two taps: a key, then an enemy. A move with no target to choose acts on the key alone (a second tap)."
                : "Acting takes two presses: a key, then an enemy. A move with no target to choose acts on the key alone."
              : touch
                ? "Acting takes two taps: a move from the row above your companion, then an enemy. A move with no target to choose acts on the move alone (a second tap)."
                : "Acting takes two presses: a move from the row above your companion, then an enemy. A move with no target to choose acts on the move alone."}
          </Row>
            </ul>
          </section>
          </div>
          <div className="pwt-guide-col">
          <section className="pwt-legend-section">
            <h3>Reading plates</h3>
            <ul className="pwt-legend">
          <Row
            sample={
              <span className="pwt-legend-chips">
                <MarkChips marks={{ shield: 10, boost: 12, hinder: 14 }} side="enemy" />
                <MarkChips marks={{ shield: 0, boost: 0, hinder: 14 }} />
              </span>
            }
          >
            Shield absorbs damage; boost adds to a next attack. Swords on an enemy: its next hit is cut (good for you). Falling line on yours: its next attack is cut (bad for you).
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PlaqueSample name="A · Crawler" hp={34} max={34} next={sampleNext({ n: 14 })} />
              </span>
            }
          >
            The row under an enemy&apos;s health is its next act: the hit and the number it would land, ALL when it hits every companion, a heart and a letter when it heals that ally.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <ThreatTag t={sampleThreat({ n: 14 })} />
                <ThreatTag t={sampleThreat({ from: "B", n: 18, lethal: true })} />
              </span>
            }
          >
            The same hit, on the companion it will land on, with the letter of the enemy that throws it. A skull and a red edge: that knocks it out. Hover a tag to see which enemy it comes from.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <MatchupMark step={1.5} />
                <MatchupMark step={0.5} />
                <MatchupMark step={0} />
              </span>
            }
          >
            The mark on an enemy is the matchup for the companion acting now: its multiplier, green when strong, raspberry when weak.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <ElementBadge element={foe.element} className="pwt-el-static" />
                <span className="pwt-float-tag good">Strong</span>
                <span className="pwt-float-tag bad">Weak</span>
                <span className="pwt-float-tag neutral">KO</span>
              </span>
            }
          >
            The tag names an element. STRONG or WEAK by a landing number is the matchup; KO a knockout; BLOCKED a hit cut to 0.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-delta">
                <span className="pwt-legend-delta-anchor">
                  <DeltaChip n={-7} />
                </span>
                <span className="pwt-legend-delta-anchor">
                  <DeltaChip n={20} />
                </span>
              </span>
            }
          >
            Squad health: raspberry is lost, green gained. Numbers on an enemy are plain. A chip is the change since your last turn.
          </Row>
            </ul>
          </section>
          <section className="pwt-legend-section">
            <h3>Turn and tools</h3>
            <ul className="pwt-legend">
          <Row
            wide
            sample={
              <div className="pwt-legend-rail">
                <TurnRail rail={rail} round={2} />
              </div>
            }
          >
            The turn rail, along the top: one row in time order. NOW acts, NEXT follows. Enemies ride above the line, your squad below.
          </Row>
          <Row
            wide
            sample={
              <span className="pwt-legend-playing">
                <span className="pwt-legend-playing-kicker">Enemy turn</span>
                <span className="pwt-legend-playing-next">Your next turn</span>
              </span>
            }
          >
            {phone ? "While moves play, the key bar shows whose turn it is and your next one, with Speed and Skip." : "While moves play, the top bar shows whose turn it is and your next one, with Speed and Skip."}
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <span className="pwt-legend-pass">Pass</span>
                <span className="pwt-down-tag">Down</span>
                <ScrollText size={16} />
              </span>
            }
          >
            Pass ends a turn without acting. Down: out of the fight. The Record (top right) lists every beat, newest first.
          </Row>
            </ul>
          </section>
          </div>
        </div>
        <div className="pwt-guide-foot">
        <p className="pwt-panel-note">
            {touch
              ? "Touch: tap a key to see what it would land on each enemy, then tap an enemy to use it. Tap Pass to end a turn without acting."
              : "Keyboard: 1 to 4 picks a move, then A to F an enemy (1 to 4 for a squadmate), Escape backs out, P passes."}
          </p>
          <div className="pwt-panel-actions">
            <button type="button" className="pwt-secondary" onClick={onClose} autoFocus>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
