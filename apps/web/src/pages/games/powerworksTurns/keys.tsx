import React from "react";
import { actsOnPress, type ActLine, type KeyView } from "./view";

/** Keyboard focus only: a mouse press also focuses a button, and that must not keep a key's previews up after it is used. */
function keyboardFocused(el: HTMLElement): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** The foot line's timing words: spelled out, so "once", "rests 1" and "ready in 1" read as sentences about turns. */
function footWords(keyView: KeyView): string {
  if (keyView.state === "resting") return `ready in ${keyView.restLeft} ${keyView.restLeft === 1 ? "turn" : "turns"}`;
  if (keyView.state === "spent") return "spent";
  if (keyView.signature) return "once per fight";
  if (keyView.rests > 0) return `rests ${keyView.rests} ${keyView.rests === 1 ? "turn" : "turns"}`;
  return "";
}

/** The on-stage card's state word, as short as it can be said: "rests 1", "used", "ready in 2". */
function menuFootWords(keyView: KeyView): string {
  if (keyView.state === "resting") return `ready in ${keyView.restLeft}`;
  if (keyView.state === "spent") return "used";
  if (keyView.signature) return "once";
  if (keyView.rests > 0) return `rests ${keyView.rests}`;
  return "";
}

/** One act in words, for the accessible name: "strike 3", "weaken 14", "sweep 6, all". */
export function actWords(a: ActLine): string {
  return `${a.verb} ${a.was !== undefined ? `${a.was}, now ${a.n}` : a.n}${a.all ? ", all" : ""}`;
}

/**
  One act on a card: the verb and its number, two sizes of one line ("STRIKE 3"). The player's own boost
  or hinder shows as the plain number struck and the number it now carries ("STRIKE 3 1"); ALL says the act
  reaches everyone it can.
*/
export function Act({ a, main = false }: { a: ActLine; main?: boolean }) {
  return (
    <span className={`pwt-act ${main ? "main" : "rider"} ${a.verb}`} data-verb={a.verb}>
      <span className="pwt-act-verb">{a.verb}</span>
      <span className="pwt-act-n" data-n={a.n}>
        {a.was !== undefined && <s className="pwt-act-was">{a.was}</s>}
        {a.n}
      </span>
      {a.all && <span className="pwt-act-all">ALL</span>}
    </span>
  );
}

/**
  One move key (docs/design/powerworks-one-number-one-meaning.md, rule 4): its name, then what the player does
  as a verb and its number. What it would change on each target is drawn on that target's plate, in the rows
  that carry those numbers, while the key is hovered or selected; the card never repeats a number per target.
*/
export function KeyCard({
  keyView,
  armed,
  selected,
  menu = false,
  onPress,
  onHover,
  onFocusKey,
}: {
  keyView: KeyView;
  /** The key can be used now (ready, and no enemy is acting). */
  armed: boolean;
  /** The key is the one chosen and waits for its target. */
  selected: boolean;
  /** The on-stage menu card (desktop): the same facts, small; state words are short and an empty foot line is not drawn. */
  menu?: boolean;
  onPress: () => void;
  /** The pointer is on the key (true) or has left it (false). */
  onHover?: (on: boolean) => void;
  /** Keyboard focus is on the key (true) or has left it (false). */
  onFocusKey?: (on: boolean) => void;
}) {
  const k = keyView;
  // A chosen key that acts on its own (a touch screen selects first) says so; one that needs an enemy asks for it.
  const foot = selected && k.state === "ready" ? (actsOnPress(k) ? "tap again to use" : "pick a target") : menu ? menuFootWords(k) : footWords(k);
  const label = `${k.index + 1}. ${k.name}: ${k.acts.map(actWords).join(", ")}${footWords(k) ? `, ${footWords(k)}` : ""}`;
  return (
    <button
      type="button"
      className={`pwt-key ${menu ? "menu" : ""} ${k.state} ${k.signature ? "signature" : ""} ${selected ? "selected" : ""} ${k.kind === "attack" ? "attack" : "support"}`}
      disabled={!armed}
      aria-pressed={selected}
      aria-label={label}
      data-key={k.index + 1}
      onClick={onPress}
      onMouseMove={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      onFocus={onFocusKey ? (e) => onFocusKey(keyboardFocused(e.currentTarget)) : undefined}
      onBlur={onFocusKey ? () => onFocusKey(false) : undefined}
    >
      <span className="pwt-key-head">
        <span className="pwt-key-index">{k.index + 1}</span>
        <span className="pwt-key-name">{k.name}</span>
      </span>
      <span className="pwt-key-acts">
        {k.acts.map((a, i) => (
          <Act key={`${a.verb}-${i}`} a={a} main={i === 0} />
        ))}
      </span>
      {(!menu || foot) && (
        <span className="pwt-key-foot">
          <span className="pwt-key-foot-words">
            {foot === "once per fight" ? (
              <>
                <span className="pwt-foot-full">once per fight</span>
                <span className="pwt-foot-short">once</span>
              </>
            ) : (
              foot
            )}
          </span>
        </span>
      )}
    </button>
  );
}
