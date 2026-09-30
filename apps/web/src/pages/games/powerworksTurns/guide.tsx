import React from "react";
import { CellButton, SupportRiders } from "./keys";
import { HitChip, ComingChip, MarkChips } from "./plate";
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
  squadArt,
  enemyArt,
}: {
  onClose: () => void;
  squadArt?: { art: string; element: string };
  enemyArt?: { art: string; element: string };
}) {
  const me = squadArt ?? { art: "shield", element: "metal" };
  const foe = enemyArt ?? { art: "shield", element: "metal" };
  const rail: RailSlot[] = [
    { id: "g1", enemy: false, name: "Your companion", art: me.art, element: me.element, state: "now" },
    { id: "g2", enemy: true, letter: "A", name: "Enemy", art: foe.art, element: foe.element, state: "next" },
    { id: "g3", enemy: false, name: "Your companion", art: me.art, element: me.element, state: "later", roundStart: 3 },
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
            A gold cell with a skull: this move knocks that enemy out.
          </Row>
          <Row
            sample={
              <Cells>
                <CellButton {...cellProps} cell={cell({ step: 1.5, n: 21 })} />
                <CellButton {...cellProps} cell={cell({ step: 0.5, n: 7, letter: "B" })} />
              </Cells>
            }
          >
            Up chevron: a strong element matchup, more damage. Down chevron: a weak matchup, less.
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
            A hinder cell: that enemy&apos;s next hit on you falls from 14 to 0.
          </Row>
          <Row sample={<MarkChips marks={{ shield: 10, boost: 0, hinder: 0 }} />}>
            Shield: it absorbs that much damage before health goes.
          </Row>
          <Row sample={<MarkChips marks={{ shield: 0, boost: 12, hinder: 0 }} />}>
            Boost: added to that unit&apos;s next attack.
          </Row>
          <Row sample={<MarkChips marks={{ shield: 0, boost: 0, hinder: 14 }} />}>
            Hindered: taken off that unit&apos;s next attack.
          </Row>
          <Row sample={<HitChip hit={{ n: 14, step: 1 }} who="the companion acting" />}>
            An enemy&apos;s hit chip: the strongest hit it can make on the companion acting now, at its next turn.
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
            Rests: turns the move waits after use. Once per fight: the signature works one time a fight.
          </Row>
          <Row
            wide
            sample={
              <div className="pwt-legend-rail">
                <TurnRail rail={rail} round={2} />
              </div>
            }
          >
            The turn rail, along the top: NOW acts, NEXT is after it, enemies above the line, your squad below, a divider starts the next round.
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
        <p className="pwt-panel-note">Keyboard: 1 to 4 picks a key, A to F an enemy cell, 1 to 4 a squadmate cell, Escape backs out, P passes.</p>
        <div className="pwt-panel-actions">
          <button type="button" className="pwt-secondary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
