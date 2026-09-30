import React from "react";
import { Shield } from "lucide-react";
import { CellButton, SupportRiders } from "./keys";
import { HitChip, ComingChip, MarkChips, ElementBadge } from "./plate";
import { TurnRail } from "./rail";
import { DeltaChip } from "./banner";
import type { Cell, RailSlot } from "./view";

/**
  The Guide as a legend (UX pass 2, round 2): every mark a player meets, drawn by the same
  component the play screen uses, beside one plain sentence. The samples are inert (no focus, no
  pointer) and use plain numbers only to show the form; the sentence says what the form means.
*/

const cell = (over: Partial<Cell>): Cell => ({
  target: "sample",
  letter: "A",
  n: 14,
  step: 1,
  immune: false,
  finishes: false,
  absorbed: 0,
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

function Cells({ children }: { children: React.ReactNode }) {
  return <div className="pwt-cells">{children}</div>;
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

export function GuidePanel({
  onClose,
  touch = false,
  squadArt,
  enemyArt,
}: {
  onClose: () => void;
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
  const cellProps = { kind: "attack" as const, keyName: "Move", targetName: "enemy", armed: true, onPick: noop };
  return (
    <div className="pwt-overlay" onClick={onClose}>
      <div className="pwt-panel pwt-guide" role="dialog" aria-label="Guide" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Guide</p>
        <h2>What the marks mean</h2>
        <ul className="pwt-legend">
          <Row
            sample={
              <Cells>
                <CellButton {...cellProps} cell={cell({})} />
              </Cells>
            }
          >
            A damage cell: the health this move takes from that enemy. The letter is the enemy.
          </Row>
          <Row
            sample={
              <Cells>
                <CellButton {...cellProps} cell={cell({ finishes: true })} />
              </Cells>
            }
          >
            A gold cell with a skull: this move knocks that enemy out. Gold means only this.
          </Row>
          <Row
            sample={
              <Cells>
                <CellButton {...cellProps} cell={cell({ step: 1.5, n: 21 })} />
                <CellButton {...cellProps} cell={cell({ step: 0.5, n: 7, letter: "B" })} />
              </Cells>
            }
          >
            Chevrons: up is a strong element matchup, more damage; down is weak, less. Green is good for you, raspberry is bad for you, everywhere.
          </Row>
          <Row
            sample={
              <Cells>
                <CellButton {...cellProps} cell={cell({ immune: true, n: 0 })} />
              </Cells>
            }
          >
            The element chart gives 0: this move does nothing to that enemy.
          </Row>
          <Row
            wide
            sample={
              <Cells>
                <CellButton {...cellProps} kind="support" cell={cell({ before: 14, n: 0 })} />
              </Cells>
            }
          >
            A hinder cell (swords, dashed frame): that enemy&apos;s next hit on you falls from 14 to 0.
          </Row>
          <Row
            wide
            sample={
              <Cells>
                <button type="button" className="pwt-cell now" tabIndex={-1}>
                  <span className="pwt-key-now-chips">
                    <span className="pwt-key-now-chip shield">
                      <Shield />
                      10
                    </span>
                  </span>
                  <span className="pwt-key-now-label">on itself</span>
                </button>
              </Cells>
            }
          >
            {touch
              ? "A move with no target is a cell too. Tap it once and the units it affects are ringed; tap it again to use it."
              : "A move with no target is a cell too: press it to use it. Hover it and the units it affects are ringed."}
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <MarkChips marks={{ shield: 10, boost: 12, hinder: 14 }} />
              </span>
            }
          >
            Chips on a plate: shield (absorbs that much damage), boost (added to its next attack), hinder (taken off its next attack).
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <HitChip hit={{ n: 21, step: 1.5 }} who="the companion acting" />
                <HitChip hit={{ n: 7, step: 0.5 }} who="the companion acting" />
              </span>
            }
          >
            An enemy&apos;s hit chip: the strongest hit it can make on the companion acting now, at its next turn. A strong matchup for it is raspberry, a weak one is green.
          </Row>
          <Row sample={<ComingChip coming={{ n: 46, step: 1, turns: 1 }} who="the companion acting" />}>
            The resting form: a stronger hit that is not ready yet. &quot;in 1&quot; is how many of its turns after its next one it waits.
          </Row>
          <Row
            sample={
              <div className="pwt-key-foot">
                <SupportRiders supports={[{ kind: "hinder", n: 14, aim: "enemy", all: false }]} area={false} />
              </div>
            }
          >
            A rider chip: the move also does this to the enemy it hits.
          </Row>
          <Row
            sample={
              <div className="pwt-cells-wrap area">
                <div className="pwt-area-band">
                  <span>ALL</span>
                </div>
                <Cells>
                  <CellButton {...cellProps} cell={cell({})} />
                  <CellButton {...cellProps} cell={cell({ letter: "B", n: 9 })} />
                </Cells>
              </div>
            }
          >
            The ALL band: an area move, it hits every enemy at once and each cell shows that enemy&apos;s number.
          </Row>
          <Row
            sample={
              <div className="pwt-key-foot">
                <span className="pwt-key-foot-words">rests 1 turn</span>
                <span className="pwt-key-foot-words">once per fight</span>
              </div>
            }
          >
            Rests: turns the move waits after use. Once per fight: the signature (marked with a star) works one time a fight.
          </Row>
          <Row sample={<ElementBadge element={foe.element} className="pwt-el-static" />}>
            The element tag on every unit. The chevrons already compare elements for you.
          </Row>
          <Row
            sample={
              <span className="pwt-legend-chips">
                <span className="pwt-float-tag good">Strong</span>
                <span className="pwt-float-tag bad">Weak</span>
              </span>
            }
          >
            Beside a landing number: STRONG or WEAK matchup, green when it favors you, raspberry when it does not.
          </Row>
          <Row
            wide
            sample={
              <div className="pwt-legend-rail">
                <TurnRail rail={rail} round={2} />
              </div>
            }
          >
            The turn rail, along the top: one row in time order. NOW acts, NEXT is after it, then 3, 4 and on. Enemies ride a notch above the line, your squad a notch below; a divider starts the next round.
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
            A change on a plate: health lost or gained since your last turn.
          </Row>
        </ul>
        <p className="pwt-panel-note">
          {touch
            ? "Touch: tap a cell once to see who it lands on, tap it again to use it. Tap Pass to end a turn without acting."
            : "Keyboard: 1 to 4 picks a key, A to F an enemy cell, 1 to 4 a squadmate cell, Escape backs out, P passes."}
        </p>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-secondary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
