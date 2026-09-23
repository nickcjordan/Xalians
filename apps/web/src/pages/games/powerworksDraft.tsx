// Tier: chrome. The squad draft is setup: it configures the run, and the facility entered afterward is the immersive experience (docs/design/powerworks-v5-mechanics.md, contract decision 49).
import * as React from "react";
import { ArrowLeft, ArrowRight, Crown } from "lucide-react";

import XalianNavbar from "@/components/navbar";
import XalianImage from "@/components/xalianImage";
import { Masthead, Shell } from "@/components/system/masthead";
import { LiveRegion } from "@/components/system/a11y";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";

import {
  DRAFT_OFFER_SIZE,
  SQUAD_SIZE,
  basePower,
  draftOffer,
  usable,
  type Move,
  type OfferEntry,
  type Unit,
} from "@xalians/rules/dungeon";

import {
  baseName,
  charges,
  cooldownLimit,
  harms,
  hasPaintedArt,
  melee,
  closes,
  moveDescription,
} from "./powerworksVisuals";

/**
  One action as the game reads it, in a few plain words (contract decision 49): its power
  on the move card's curve, what else it does, its reach and its tempo. An action the game
  cannot resolve says so plainly; one that resolves only in part says that too.
*/
export function actionReading(u: Unit, m: Move) {
  if (!usable(m)) {
    const reason = m.effects.find((e) => e.reason)?.reason;
    return { text: "", none: true, part: false, reason };
  }
  const parts: string[] = [];
  if (harms(m)) parts.push(`power ${basePower(u, m)}`);
  for (const e of m.effects) {
    if (e.support === "bind") parts.push("binds");
    else if (e.support === "displace") parts.push("pulls");
    else if (e.support === "restore")
      parts.push(e.recipient === "self" ? "heals self" : "heals squadmate");
    else if (e.support === "protect")
      parts.push(e.recipient === "self" ? "shields self" : "shields squadmate");
    else if (e.support === "remove") parts.push(`clears ${(e.methods ?? []).join("/")}`);
    else if (e.support === "status" && e.status)
      parts.push(e.recipient === "self" ? `${e.status} self` : e.status);
  }
  // Reach: an action on its user already says "self" in its effect words.
  if (m.approach !== "self") {
    parts.push(melee(m) ? "melee" : "ranged");
    // What binding blocks, said where it applies.
    if (closes(m)) parts.push("closes in");
  }
  if (m.area) parts.push("area");
  // Tempo in the player's words, short enough never to be cut off: a one-round cooldown
  // means every second round.
  parts.push(
    charges(m)
      ? "charges"
      : cooldownLimit(m)
      ? `every ${({ 1: "2nd", 2: "3rd" } as Record<number, string>)[cooldownLimit(m)] ?? `${cooldownLimit(m) + 1}th`}`
      : "each round"
  );
  const part = m.effects.some((e) => e.support === "unsupported");
  return {
    text: [...new Set(parts)].join(" · "),
    none: false,
    part,
    reason: part ? m.effects.find((e) => e.reason)?.reason : undefined,
  };
}

/** The creature's art in a square frame on its element wash: painted art where it exists, the species silhouette otherwise (contract decision 50). */
function DraftArt({ u }: { u: Unit }) {
  return (
    <span className="row-span-2 block size-12 shrink-0 overflow-hidden bg-el/80" aria-hidden="true">
      {hasPaintedArt(u.species) ? (
        <img
          src={`/assets/powerworks/${u.species}.webp`}
          alt=""
          width={48}
          height={48}
          className="block size-full object-contain object-bottom"
          draggable={false}
        />
      ) : (
        <XalianImage variant="token" colored speciesName={u.species} primaryType={u.element} unPadded />
      )}
    </span>
  );
}

function OfferCard({
  entry,
  picked,
  locked,
  onToggle,
}: {
  entry: OfferEntry;
  picked: boolean;
  locked: boolean;
  onToggle: (index: number, on: boolean) => void;
}) {
  const u = entry.unit;
  const name = u.name;
  const headingId = `draft-${entry.index}-name`;
  return (
    <li className="min-w-0">
      <Card
        variant="panel"
        className={`el-${u.element} h-full gap-2 p-3 ${picked ? "border-viable-lo" : ""}`}
        aria-labelledby={headingId}
        data-picked={picked ? "true" : undefined}
      >
        {/* Art over two rows; the name shares its row with the pick, and the element and the
            numbers the game reads take the full width under both. */}
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <DraftArt u={u} />
          <h2 id={headingId} className="type-subhead m-0 truncate">
            {name}
          </h2>
          {/* At four picks the rest stay pressable (a press says to unpick one first) rather
              than disabled, so every pick keeps its hit area and its focus. */}
          <Toggle
            pressed={picked}
            aria-disabled={locked && !picked ? true : undefined}
            onPressedChange={(on: boolean) => onToggle(entry.index, on)}
            aria-label={`Pick ${name}`}
            className="aria-disabled:opacity-40"
            data-draft="pick"
            size="sm"
          >
            {picked ? "Picked" : "Pick"}
          </Toggle>
          <div className="col-span-2 flex min-w-0 items-center gap-2">
            <Badge variant="chip">{u.element}</Badge>
            <span className="type-data truncate text-tiny text-ink-2">
              HP {u.max} · Speed {u.speed}
            </span>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`${name}'s actions`}>
          {u.moves.map((m) => {
            const read = actionReading(u, m);
            return (
              <li key={m.key} className="min-w-0" title={moveDescription(u, m)}>
                <div className="flex min-w-0 items-center gap-1.5 text-small leading-tight text-ink">
                  {m.signature && <Crown className="size-3.5 shrink-0 text-ink-2" aria-label="Signature" />}
                  <span className="truncate">{baseName(m)}</span>
                  {read.none && (
                    <Badge variant="warn" className="ml-auto">
                      No effect here
                    </Badge>
                  )}
                </div>
                <div className="text-tiny text-ink-2" data-draft="reading">
                  {read.none
                    ? read.reason ?? "Nothing it does has a rule in this game."
                    : `${read.text}${read.part ? " · part has no effect here" : ""}`}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </li>
  );
}

/**
  The squad draft (contract decisions 45 to 49): eight generated creatures from the run
  seed's offer, four picked, then "Enter the facility". It never decides anything the rules
  do not: the offer, the reading of every creature and the command it sends all come from
  `@xalians/rules/dungeon`.
*/
export function PowerworksDraft({
  seed,
  onBack,
  onEnter,
}: {
  seed: number;
  onBack: () => void;
  onEnter: (picks: number[]) => void;
}) {
  const offer = React.useMemo(() => draftOffer(seed), [seed]);
  const [picks, setPicks] = React.useState<number[]>([]);
  const [notice, setNotice] = React.useState("");
  const full = picks.length === SQUAD_SIZE;
  const toggle = (index: number, on: boolean) => {
    const name = offer[index].unit.name;
    if (on && picks.length >= SQUAD_SIZE) {
      setNotice(`${SQUAD_SIZE} are picked. Unpick one to take ${name}.`);
      return;
    }
    const next = on
      ? picks.length < SQUAD_SIZE && !picks.includes(index)
        ? [...picks, index]
        : picks
      : picks.filter((i) => i !== index);
    setPicks(next);
    setNotice(
      `${name} ${on ? "picked" : "removed"}. ${next.length} of ${SQUAD_SIZE} picked.`
    );
  };
  const names = picks.map((i) => offer[i].unit.name);
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-room font-body text-ink" data-tier="chrome">
      {/* The navbar carries the skip link and is the way out of the whole route. */}
      <XalianNavbar />
      <main id="main" className="flex min-h-0 flex-1 flex-col" data-tier="chrome">
        <Shell className="flex min-h-0 flex-1 flex-col">
          <Masthead
            className="mt-3 mb-3"
            kicker="Powerworks · squad draft"
            title="Draft a squad"
            subtitle={`Pick ${SQUAD_SIZE} of ${DRAFT_OFFER_SIZE}. The offer always holds a bind, a pull and a squadmate's helper.`}
          />
          <ul
            className="m-0 grid min-h-0 flex-1 list-none grid-cols-1 content-start gap-2 overflow-y-auto p-0 pb-2 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="The offer"
            data-slot="draft-offer"
          >
            {offer.map((entry) => (
              <OfferCard
                key={entry.seed}
                entry={entry}
                picked={picks.includes(entry.index)}
                locked={full}
                onToggle={toggle}
              />
            ))}
          </ul>
          <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-edge py-2">
            <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to the briefing">
              <ArrowLeft />
              Back
            </Button>
            <p className="m-0 min-w-0 flex-1 text-small text-ink-2">
              <span className="type-data text-ink">
                {picks.length} of {SQUAD_SIZE}
              </span>{" "}
              picked
              <span className="hidden md:inline">{names.length ? `: ${names.join(", ")}` : ""}</span>
            </p>
            <Button
              disabled={!full}
              onClick={() => onEnter(picks)}
              data-draft="enter"
              className="w-full sm:w-auto"
            >
              Enter the facility
              <ArrowRight />
            </Button>
          </footer>
        </Shell>
        <LiveRegion>{notice}</LiveRegion>
      </main>
    </div>
  );
}
