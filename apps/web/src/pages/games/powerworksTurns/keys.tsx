import React from "react";
import { ImpactMark } from "./plate";
import { SUPPORT_WORD, SupportTags } from "./support";
import { TrendingDown, Zap } from "lucide-react";
import { actsOnPress, type KeyView } from "./view";

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

/** Who a key is aimed at, in words. */
function aimWords(k: KeyView): string {
  if (k.aim === "now") return k.supports[0]?.all ? "whole squad" : "on itself";
  if (k.aim === "ally") return "on a squadmate";
  if (k.area) return "every enemy";
  return "on an enemy";
}

/**
  One move key: its name, ONE power number (an attack's power before any matchup, or a support's
  own number) and its shape. What it would land on each target is drawn on that target's plate
  while the key is hovered or selected, so the key never repeats a number per enemy.
*/
export function KeyCard({
  keyView,
  armed,
  selected,
  noted = false,
  onPress,
  onHover,
  onFocusKey,
}: {
  keyView: KeyView;
  /** The key can be used now (ready, and no enemy is acting). */
  armed: boolean;
  /** The key is the one chosen and waits for its target. */
  selected: boolean;
  /** A first-occurrence note is about this key (the note itself sits on the key bar's top line). */
  noted?: boolean;
  onPress: () => void;
  /** The pointer is on the key (true) or has left it (false). */
  onHover?: (on: boolean) => void;
  /** Keyboard focus is on the key (true) or has left it (false). */
  onFocusKey?: (on: boolean) => void;
}) {
  const k = keyView;
  const isAttack = k.kind === "attack";
  // A chosen key that acts on its own (a touch screen selects first) says so; one that needs an enemy asks for it.
  const foot = selected && k.state === "ready" ? (actsOnPress(k) ? "tap again to use" : "pick a target") : footWords(k);
  const word = aimWords(k);
  const label = `${k.index + 1}. ${k.name}: ${
    isAttack ? `power ${k.power}${k.powerNow !== undefined ? `, ${k.ownMark?.kind === "boost" ? "boosted" : "hindered"} to ${k.powerNow}` : ""}${k.area ? ", hits every enemy" : ""}` : k.supports.map((s) => `${SUPPORT_WORD[s.kind]} ${s.n}`).join(", ")
  }, ${word}${footWords(k) ? `, ${footWords(k)}` : ""}`;
  return (
    <button
      type="button"
      className={`pwt-key ${k.state} ${k.signature ? "signature" : ""} ${noted ? "noted" : ""} ${selected ? "selected" : ""} ${isAttack ? "attack" : "support"}`}
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
      <span className="pwt-key-body">
        {isAttack ? (
          <>
            <span className="pwt-key-power" data-power={k.power} data-power-now={k.powerNow} title={`Attack power ${k.power} before the matchup${k.ownMark ? `; ${k.ownMark.kind === "boost" ? "boosted" : "hindered"} by ${k.ownMark.n} on its next attack` : ""}`}>
              <ImpactMark />
              {k.powerNow !== undefined ? (
                <>
                  <s className="pwt-key-power-was">{k.power}</s>
                  <span className="pwt-key-power-arrow" aria-hidden="true">
                    →
                  </span>
                  {k.powerNow}
                </>
              ) : (
                k.power
              )}
              <span className="pwt-key-power-word">power</span>
            </span>
            <span className="pwt-key-shape">
              {k.ownMark && (
                <span className={`pwt-key-own ${k.ownMark.kind}`} data-own={k.ownMark.kind}>
                  {k.ownMark.kind === "hinder" ? <TrendingDown /> : <Zap />}
                  <span className="pwt-key-own-words">{k.ownMark.kind === "hinder" ? "hindered" : "boosted"}</span>
                  {k.ownMark.kind === "hinder" ? "-" : "+"}
                  {k.ownMark.n}
                </span>
              )}
              {k.area && (
                <span className="pwt-shape-all" title="Hits every enemy at once">
                  ALL
                </span>
              )}
              <SupportTags supports={k.supports} area={k.area} />
            </span>
          </>
        ) : (
          <>
            <SupportTags supports={k.supports} area={false} big />
            <span className="pwt-key-shape">
              <span className="pwt-key-aim">{word}</span>
            </span>
          </>
        )}
      </span>
      <span className="pwt-key-foot">
        {noted && (
          <span className="pwt-key-note-tag" title="The note above the keys is about this key">
            <span className="pwt-note-full">Note</span>
            <span className="pwt-note-short" aria-hidden="true">
              i
            </span>
          </span>
        )}
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
    </button>
  );
}
