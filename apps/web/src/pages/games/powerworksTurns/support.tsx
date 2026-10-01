import React from "react";
import { Shield, HeartPulse, Zap, Link2, Swords, TrendingDown } from "lucide-react";
import type { SupportChip } from "./view";

/**
  One icon per support kind, so a key's effect reads at a glance beside its number. Hinder
  uses the swords icon everywhere on this page (blind readers read the chain-link as
  "turns" or "stacks", not "weakens an attack"): swords say "this is about a hit", the minus
  sign says which way. Delay (the turn-order layer) is the one kind that is not about a hit,
  so it keeps the link icon.
*/
export function SupportIcon({ kind, onCompanion = false }: { kind: SupportChip["kind"]; /** The hinder lands on a companion: its own next attack made smaller, so not the swords. */ onCompanion?: boolean }) {
  if (kind === "heal") return <HeartPulse />;
  if (kind === "shield") return <Shield />;
  if (kind === "boost") return <Zap />;
  if (kind === "delay") return <Link2 />;
  return onCompanion ? <TrendingDown /> : <Swords />; // hinder
}

/** An intent chip's verb: what the enemy's committed move does, in a word before its target. */
export const INTENT_VERB: Record<"hit" | SupportChip["kind"], string> = {
  hit: "hits",
  heal: "heals",
  shield: "shields",
  boost: "boosts",
  hinder: "weakens",
  delay: "slows",
};
export const SUPPORT_WORD: Record<SupportChip["kind"], string> = {
  heal: "heal",
  shield: "shield",
  boost: "boost",
  hinder: "its next hit",
  delay: "slow",
};

/**
  A move's supports as small tags (a rider on an attack, or a support key's own content), in words
  and icons: the kind, its number, and who it reaches when that is not the obvious one.
*/
export function SupportTags({ supports, area, big = false }: { supports: SupportChip[]; area: boolean; big?: boolean }) {
  if (!supports.length) return null;
  return (
    <span className={`pwt-tags${big ? " big" : ""}`}>
      {supports.map((s) => {
        const whom = s.aim === "enemy" && area ? " each" : s.all ? ", whole squad" : "";
        const sign = s.kind === "hinder" || s.kind === "delay" ? "-" : s.kind === "boost" ? "+" : "";
        return (
          <span key={`${s.kind}-${s.aim}`} className={`pwt-tag ${s.kind}`} title={`${SUPPORT_WORD[s.kind]} ${s.n}${whom}`}>
            <SupportIcon kind={s.kind} />
            {sign}
            {s.n}
            {s.aim === "enemy" && area ? <span className="pwt-tag-each">each</span> : null}
          </span>
        );
      })}
    </span>
  );
}
