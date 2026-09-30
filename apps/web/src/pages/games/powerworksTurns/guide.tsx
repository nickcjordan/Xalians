import React from "react";
import { ScrollText } from "lucide-react";
import { KeyCard } from "./keys";
import { IntentChip, MarkChips, MatchupMark, ElementBadge, KoMark, PreviewBadge } from "./plate";
import { TurnRail } from "./rail";
import { DeltaChip } from "./banner";
import type { Cell, IntentView, KeyView, Preview, RailSlot } from "./view";

/**
  The Guide as a legend: every mark a player meets, drawn by the same component the play screen uses,
  beside one plain sentence. The samples are inert (no focus, no pointer) and use plain numbers only to
  show the form; the sentence says what the form means.
*/

const preview = (over: Partial<Preview>): Preview => ({
  target: "sample",
  kind: "hit",
  n: 14,
  step: 1,
  immune: false,
  finishes: false,
  absorbed: 0,
  ...over,
});

const previewCell = (letter: string): Cell => ({ target: letter, letter: letter as Cell["letter"], n: 0, step: 1, immune: false, finishes: false, absorbed: 0 });

const sampleKey = (over: Partial<KeyView>): KeyView => ({
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

const sampleIntent = (over: Partial<IntentView>): IntentView => ({
  move: "A move",
  kind: "attack",
  area: false,
  target: { id: "t", name: "Companion", art: "shield", element: "metal", ally: false, self: false },
  n: 14,
  step: 1,
  supports: [],
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

/** A preview drawn where it sits on a plate: on a small dark stage tile, the same badge the plates carry. */
function PreviewTile({ p }: { p: Preview }) {
  return (
    <span className="pwt-legend-tile">
      <PreviewBadge p={p} keyName="Move" />
    </span>
  );
}

/**
  The turn in one picture, for the briefing: a key that shows one power number and, beside it, the
  number that lands on an enemy once the key is chosen. Inert, drawn by the play screen's own components.
*/
export function TurnLesson({ phone = false }: { phone?: boolean }) {
  return (
    <div className="pwt-lesson" data-lesson="">
      <Sample>
        <div className="pwt-lesson-key">
          <KeyCard keyView={sampleKey({})} armed selected={false} onPress={noop} />
        </div>
        <span className="pwt-lesson-then" aria-hidden="true">
          then
        </span>
        <PreviewTile p={preview({ n: 14, step: 1.5 })} />
      </Sample>
      {phone ? (
        <p>Each key shows its power. Choose a key, then an enemy: each enemy shows what it would take, and whom it will hit next.</p>
      ) : (
        <p>Each move shows its power, in a row above the companion whose turn it is. Choose a move, then an enemy: each enemy shows what it would take, and whom it will hit next.</p>
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
                <KeyCard keyView={sampleKey({ name: "Sweep", power: 7, area: true, supports: [{ kind: "hinder", n: 6, aim: "enemy", all: true }] })} armed selected={false} onPress={noop} />
              </span>
            }
          >
            {phone ? "A move key" : "A move"} shows its power once: the damage before the element matchup. ALL hits every enemy. Tags are what else it does; below, its rest. Hindered: power before and after.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PreviewTile p={preview({ n: 14, step: 1.5 })} />
                <PreviewTile p={preview({ n: 7, step: 0.5, absorbed: 4 })} />
              </span>
            }
          >
            {touch ? (phone ? "Tap a key" : "Tap a move") : phone ? "Hover or choose a key" : "Hover or choose a move"} and each enemy shows what that move would take from it. Up chevron: strong matchup; down: weak; green favors you, raspberry the enemy. Shield mark: what its shield absorbs first.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PreviewTile p={preview({ n: 20, finishes: true })} />
                <PreviewTile p={preview({ immune: true, n: 0 })} />
              </span>
            }
          >
            A gold number with a skull: this move knocks that enemy out. No effect: the element chart gives 0.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PreviewTile p={preview({ kind: "hinder", before: 14, n: 0, saves: true, hitOn: "Companion" })} />
                <PreviewTile p={preview({ kind: "hinder", before: 30, n: 20, knocks: true, hitOn: "Companion" })} />
              </span>
            }
          >
            A hinder: that enemy&apos;s committed hit falls by that much (14 to 0). A grey skull: it would have knocked a companion out, and now does not. A red skull: it still does.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-tiles">
                <PreviewTile p={preview({ kind: "heal", n: 9 })} />
                <PreviewTile p={preview({ kind: "shield", n: 10 })} />
              </span>
            }
          >
            A move for your squad shows its number on each squadmate it can reach.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-keys">
                <KeyCard keyView={sampleKey({ name: "Choose", power: 12, cells: [previewCell("A"), previewCell("B")] })} armed selected onPress={noop} />
              </span>
            }
          >
            {phone
              ? touch
                ? "Acting takes two taps: a key, then an enemy. A move with no target to choose acts on the key alone (a second tap)."
                : "Acting takes two presses: a key, then an enemy. A move with no target to choose acts on the key alone."
              : touch
                ? "Acting takes two taps: a move from the row above your companion, then an enemy. A move with no target to choose acts on the move alone (a second tap)."
                : "Acting takes two presses: a move from the row above your companion, then an enemy. A move with no target to choose acts on the move alone. Hover a move for its detail."}
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
              <span className="pwt-legend-chips">
                <IntentChip intent={sampleIntent({ n: 18, step: 0.5, lethal: true })} />
              </span>
            }
          >
            An enemy&apos;s chip is its committed move: the target, what it does (hits, heals, shields, weakens, boosts) and the number it would land now. A skull: that knocks the companion out.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <IntentChip intent={sampleIntent({ kind: "support", n: 0, supports: [{ kind: "heal", n: 9, aim: "ally", all: false }] })} />
              </span>
            }
          >
            A support shows its kind, number and whom it is for. If the target falls first, an attack turns to the next companion and a support picks another ally.
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
              <span className="pwt-legend-chips pwt-legend-ko">
                <span className="pwt-legend-ko-plaque">
                  <KoMark from={["A"]} name="the companion" />
                  <span className="pwt-name">Companion</span>
                </span>
              </span>
            }
          >
            A skull on a plate: an enemy acting first has committed to a hit that knocks it out.
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
              : "Keyboard: 1 to 4 picks a key, then A to F an enemy (1 to 4 for a squadmate), Escape backs out, P passes."}
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
