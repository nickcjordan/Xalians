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
