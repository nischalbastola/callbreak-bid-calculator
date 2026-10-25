import {
  cardName,
  cardKey,
  HandError,
  higherRanks,
  isRank,
  RANK_NAME,
  RANK_VALUE,
  RANKS,
  sortCards,
  SUIT_META,
  SUITS,
  type Card,
  type Rank,
  type Suit,
} from "@/lib/cards";

/**
 * Call Break bid engine.
 *
 * Spades are always trump. Four players, 13 cards each, no partners.
 * A missed bid costs the whole bid and an overtrick pays 0.1, so the
 * integer bid steps up only when the fraction clears a safety line.
 *
 * Trump tricks come from a per-card model: a spade with nothing higher
 * outstanding is a full winner (Ace of Spades, or the King behind the Ace).
 * Everything below a gap is fractional, based on how many low spades can
 * duck while the missing honors fall.
 *
 * Off-suit honors start from the same kind of table, then get multiplied
 * by the chance the round is still ruff-free. That chance is the exact
 * probability that all three opponents were dealt enough cards of the suit
 * to follow (multivariate hypergeometric on the 39-card remainder).
 * Long side suits fail that test early, which is the length penalty.
 *
 * Voids and singletons add ruff tricks, but only by spending spades that
 * were not already counted as winners. Those low spades are upgraded
 * from "almost nothing" to a real ruffing trick.
 */

export const STEP_UP_FRACTION = 0.6;

/** A spade at or above this cashing chance is already a winner, so it is not ruff fuel. */
const RUFF_FUEL_MAX_P = 0.35;

const SIDE_HONORS: readonly Rank[] = ["A", "K", "Q", "J", "10"];

export type BreakdownTone = "trump" | "side" | "ruff";

export interface BreakdownLine {
  id: string;
  tone: BreakdownTone;
  suit: Suit;
  tricks: number;
  summary: string;
  detail: string;
}

export interface SuitHolding {
  suit: Suit;
  count: number;
  cards: Card[];
}

export interface BidResult {
  expectedTricks: number;
  recommendedBid: number;
  bidNote: string;
  breakdown: BreakdownLine[];
  distribution: SuitHolding[];
  warnings: string[];
}

interface DraftLine {
  id: string;
  tone: BreakdownTone;
  suit: Suit;
  tricks: number;
  summary: string;
  detail: string;
}

interface TrumpCard {
  rank: Rank;
  p: number;
  master: boolean;
  fuel: number;
}

export function formatTricks(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}

export function trickPhrase(value: number): string {
  const label = formatTricks(value);
  return label === "1" ? "1 trick" : `${label} tricks`;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function safestBid(expectedTricks: number): number {
  if (!Number.isFinite(expectedTricks) || expectedTricks <= 1) return 1;
  const capped = Math.min(13, Math.max(0, expectedTricks));
  const whole = Math.floor(capped + 1e-9);
  const fraction = capped - whole;
  const bid = fraction + 1e-9 >= STEP_UP_FRACTION ? whole + 1 : whole;
  return Math.max(1, Math.min(13, bid));
}

export function describeBid(expectedTricks: number, bid: number): string {
  const shown = formatTricks(expectedTricks);
  if (expectedTricks < 1) {
    return `This hand expects ${shown} tricks. Call Break does not allow a bid of 0, so the safest legal bid is 1.`;
  }

  const whole = Math.floor(expectedTricks + 1e-9);
  const fraction = round2(expectedTricks - whole);
  if (bid === whole + 1 && fraction > 0) {
    return `Expected tricks are ${shown}. The extra ${formatTricks(fraction)} clears the ${formatTricks(STEP_UP_FRACTION)} safety line, so the bid steps up to ${bid}. A missed bid costs the whole bid. An overtrick pays only 0.1, which is why a fraction under ${formatTricks(STEP_UP_FRACTION)} stays put.`;
  }
  if (fraction > 0 && bid === whole) {
    return `Expected tricks are ${shown}. That fraction sits under the ${formatTricks(STEP_UP_FRACTION)} safety line, so the bid stays at ${bid} instead of chasing ${bid + 1}. Missing the bid costs far more than an extra overtrick pays.`;
  }
  return `Expected tricks are ${shown}, so the bid is ${bid}.`;
}

const logBinomCache = new Map<string, number>();

function logBinom(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return Number.NEGATIVE_INFINITY;
  if (k === 0 || k === n) return 0;
  const small = Math.min(k, n - k);
  const key = `${n},${small}`;
  const cached = logBinomCache.get(key);
  if (cached !== undefined) return cached;
  let sum = 0;
  for (let i = 1; i <= small; i++) {
    sum += Math.log(n - small + i) - Math.log(i);
  }
  logBinomCache.set(key, sum);
  return sum;
}

function hyperProb(
  suitLeft: number,
  takeSuit: number,
  population: number,
  draw: number,
): number {
  const takeNon = draw - takeSuit;
  const nonLeft = population - suitLeft;
  if (
    takeSuit < 0 ||
    takeNon < 0 ||
    takeSuit > suitLeft ||
    takeNon > nonLeft
  ) {
    return 0;
  }
  const logP =
    logBinom(suitLeft, takeSuit) +
    logBinom(nonLeft, takeNon) -
    logBinom(population, draw);
  return Math.exp(logP);
}

const ruffFreeCache = new Map<string, number>();

/**
 * Chance that every opponent can still follow suit on `round` (1 = opening lead
 * of that suit) when our hand holds `held` cards of it. Trump never calls this.
 */
export function pRuffFree(held: number, round: number): number {
  if (round <= 0) return 1;
  if (held < 0 || held > 13) return 0;
  const key = `${held}:${round}`;
  const cached = ruffFreeCache.get(key);
  if (cached !== undefined) return cached;

  const outstanding = 13 - held;
  if (outstanding < 3 * round) {
    ruffFreeCache.set(key, 0);
    return 0;
  }

  let total = 0;
  for (let left = round; left <= Math.min(13, outstanding); left++) {
    for (
      let across = round;
      across <= Math.min(13, outstanding - left);
      across++
    ) {
      const right = outstanding - left - across;
      if (right < round || right > 13) continue;
      total +=
        hyperProb(outstanding, left, 39, 13) *
        hyperProb(outstanding - left, across, 26, 13) *
        hyperProb(outstanding - left - across, right, 13, 13);
    }
  }

  const probability = Math.min(1, Math.max(0, total));
  ruffFreeCache.set(key, probability);
  return probability;
}

function frictionFor(round: number): number {
  if (round <= 1) return 0.88;
  if (round === 2) return 0.84;
  if (round === 3) return 0.75;
  return 0.62;
}

function trumpCap(holding: readonly Rank[]): number {
  let cap = holding.length;
  if (!holding.includes("A")) cap -= 0.85;
  if (!holding.includes("A") && !holding.includes("K")) cap -= 0.45;
  return Math.max(0, cap);
}

function trumpWinProb(
  rank: Rank,
  holding: readonly Rank[],
): { p: number; master: boolean } {
  const higherMissing = higherRanks(rank).filter((candidate) => !holding.includes(candidate)).length;
  const lowerHeld = holding.filter((candidate) => RANK_VALUE[candidate] < RANK_VALUE[rank]).length;
  const higherHeld = holding.length - lowerHeld - 1;

  if (higherMissing === 0) return { p: 1, master: true };

  if (holding.length === 1) {
    if (rank === "K") return { p: 0.22, master: false };
    if (rank === "Q") return { p: 0.1, master: false };
    if (rank === "J") return { p: 0.06, master: false };
    return { p: 0.03, master: false };
  }

  if (lowerHeld >= higherMissing) {
    const surplus = lowerHeld - higherMissing;
    return {
      p: Math.min(
        0.95,
        0.72 + 0.06 * Math.min(surplus, 3) + 0.04 * Math.min(higherHeld, 2),
      ),
      master: false,
    };
  }

  if (lowerHeld === higherMissing - 1) {
    return {
      p: Math.min(0.7, 0.42 + 0.08 * Math.min(higherHeld, 3)),
      master: false,
    };
  }

  return {
    p: Math.max(0.04, 0.2 - 0.04 * (higherMissing - lowerHeld - 1)),
    master: false,
  };
}

function applyTrumpCap(cards: TrumpCard[]): void {
  const cap = trumpCap(cards.map((card) => card.rank));
  const sum = cards.reduce((total, card) => total + card.p, 0);
  if (sum <= cap + 1e-9) return;

  const flexible = cards.filter((card) => !card.master);
  const fixed = cards
    .filter((card) => card.master)
    .reduce((total, card) => total + card.p, 0);
  const flexSum = flexible.reduce((total, card) => total + card.p, 0);
  if (flexSum <= 0) {
    const scale = cap / sum;
    for (const card of cards) card.p *= scale;
    return;
  }
  const scale = Math.max(0, cap - fixed) / flexSum;
  for (const card of flexible) card.p *= scale;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function missingAbovePhrase(rank: Rank, holding: readonly Rank[]): string {
  const missing = higherRanks(rank).filter((candidate) => !holding.includes(candidate));
  const names = missing.map((candidate) => `the ${RANK_NAME[candidate]}`);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function describeTrump(card: TrumpCard, holding: readonly Rank[]): { summary: string; detail: string } {
  const name = cardName({ suit: "spades", rank: card.rank });
  const summary = `${trickPhrase(card.p)} expected from the ${name}`;
  const higherMissing = higherRanks(card.rank).filter((candidate) => !holding.includes(candidate)).length;
  const lowerHeld = holding.filter((candidate) => RANK_VALUE[candidate] < RANK_VALUE[card.rank]).length;

  if (card.rank === "A" && card.master) {
    return {
      summary,
      detail:
        "The Ace of Spades is the highest card in the deck. Nothing beats it, and a spade lead cannot be ruffed. Count a full trick.",
    };
  }
  if (card.master) {
    return {
      summary,
      detail: `The ${name} sits in an unbroken spade sequence from the Ace. Cash that sequence from the top and the lead stays with you, so this card is a full trick.`,
    };
  }
  if (holding.length === 1) {
    return {
      summary,
      detail: `The ${name} is bare. ${missingAbovePhrase(card.rank, holding)} is still out, and there is no low spade to duck with, so it usually gets captured.`,
    };
  }
  if (lowerHeld >= higherMissing) {
    const duck = lowerHeld === 1 ? "1 lower spade" : `${lowerHeld} lower spades`;
    return {
      summary,
      detail: `The ${name} is not master yet (${missingAbovePhrase(card.rank, holding)} still out). ${duck} can be played underneath, so the honor still expects ${trickPhrase(card.p)} once those higher cards fall.`,
    };
  }
  return {
    summary,
    detail: `The ${name} is thin. ${missingAbovePhrase(card.rank, holding)} ${higherMissing === 1 ? "is" : "are"} still out and only ${lowerHeld} lower ${lowerHeld === 1 ? "spade is" : "spades are"} available to duck. Count ${trickPhrase(card.p)}.`,
  };
}

function sideShape(
  rank: Rank,
  higherHonors: number,
  lowers: number,
): { base: number; round: number } | null {
  if (rank === "A") return { base: 1, round: 1 };
  if (rank === "K") {
    if (higherHonors >= 1) return { base: 0.98, round: 2 };
    if (lowers <= 0) return { base: 0.42, round: 1 };
    if (lowers === 1) return { base: 0.74, round: 2 };
    if (lowers === 2) return { base: 0.91, round: 2 };
    return { base: 0.95, round: 2 };
  }
  if (rank === "Q") {
    if (higherHonors >= 2) return { base: 0.96, round: 3 };
    if (higherHonors === 1) {
      if (lowers <= 0) return { base: 0.35, round: 2 };
      if (lowers === 1) return { base: 0.55, round: 2 };
      return { base: 0.68, round: 3 };
    }
    if (lowers <= 0) return { base: 0.12, round: 1 };
    if (lowers === 1) return { base: 0.22, round: 2 };
    if (lowers === 2) return { base: 0.32, round: 2 };
    return { base: 0.4, round: 3 };
  }
  if (rank === "J") {
    if (higherHonors >= 3) return { base: 0.9, round: 4 };
    if (higherHonors === 2) return { base: lowers >= 1 ? 0.45 : 0.25, round: 3 };
    if (higherHonors === 1) return { base: lowers >= 2 ? 0.22 : 0.12, round: 3 };
    return { base: lowers >= 2 ? 0.08 : 0.04, round: 2 };
  }
  if (rank === "10") {
    if (higherHonors >= 4) return { base: 0.55, round: 4 };
    if (higherHonors === 3 && lowers >= 1) return { base: 0.3, round: 4 };
    if (higherHonors >= 2) return { base: 0.08, round: 3 };
    return null;
  }
  return null;
}

function higherHonorsHeld(rank: Rank, holding: readonly Rank[]): number {
  return SIDE_HONORS.filter(
    (candidate) =>
      RANK_VALUE[candidate] > RANK_VALUE[rank] && holding.includes(candidate),
  ).length;
}

function describeSide(
  card: Card,
  tricks: number,
  base: number,
  round: number,
  ruffFree: number,
  length: number,
): { summary: string; detail: string } {
  const name = cardName(card);
  const suitLabel = SUIT_META[card.suit].label;
  const summary = `${trickPhrase(tricks)} expected from the ${name}`;
  const ruffPct = Math.round(ruffFree * 100);
  const lengthLabel = length === 1 ? "1-card" : `${length}-card`;
  let detail = `The ${name} is worth ${formatTricks(base)} before anyone ruffs. In a ${lengthLabel} ${suitLabel} suit, round ${round} is still free of ruffs ${ruffPct}% of the time.`;
  if (length >= 5) {
    detail += ` That long ${suitLabel} holding is a penalty: opponents are short and will trump the high cards.`;
  } else if (ruffFree < 0.9) {
    detail += ` The suit is long enough for an opponent to get short and ruff.`;
  }
  detail += ` After the timing haircut, count ${trickPhrase(tricks)}.`;
  return { summary, detail };
}

type RuffKind = "void" | "singleton-honor" | "singleton-low" | "doubleton-low" | "doubleton-honor";

interface RuffOpportunity {
  suit: Suit;
  kind: RuffKind;
  requested: number;
  card?: Card;
}

function ruffOpportunities(bySuit: Record<Suit, Card[]>): RuffOpportunity[] {
  const opportunities: RuffOpportunity[] = [];
  for (const suit of ["hearts", "diamonds", "clubs"] as const) {
    const cards = bySuit[suit];
    if (cards.length === 0) {
      opportunities.push({ suit, kind: "void", requested: 0.85 });
      continue;
    }
    if (cards.length === 1) {
      const honor = RANK_VALUE[cards[0].rank] >= RANK_VALUE.J;
      opportunities.push({
        suit,
        kind: honor ? "singleton-honor" : "singleton-low",
        requested: honor ? 0.42 : 0.6,
        card: cards[0],
      });
      continue;
    }
    if (cards.length === 2) {
      const honors = cards.filter((card) => RANK_VALUE[card.rank] >= RANK_VALUE.J).length;
      if (honors === 0) {
        opportunities.push({ suit, kind: "doubleton-low", requested: 0.22 });
      } else if (honors === 1) {
        opportunities.push({ suit, kind: "doubleton-honor", requested: 0.12 });
      }
    }
  }
  return opportunities.sort((a, b) => b.requested - a.requested);
}

function describeRuff(
  opportunity: RuffOpportunity,
  tricks: number,
): { summary: string; detail: string } {
  const label = SUIT_META[opportunity.suit].label;
  const singular = SUIT_META[opportunity.suit].singular;
  const cut =
    tricks + 0.001 < opportunity.requested
      ? ` Spare spades ran short, so this ruff is cut from ${formatTricks(opportunity.requested)} to ${formatTricks(tricks)}.`
      : "";

  if (opportunity.kind === "void") {
    return {
      summary: `+${trickPhrase(tricks)} from low spades due to a ${singular} void`,
      detail: `There are no ${label.toLowerCase()} in the hand. The first ${label.toLowerCase()} lead can be ruffed with a low spade that was not already a winner.${cut}`,
    };
  }
  if (opportunity.kind === "singleton-low") {
    return {
      summary: `+${trickPhrase(tricks)} from low spades due to a ${singular} singleton`,
      detail: `The single low ${singular.toLowerCase()} is played off, and the next round of ${label.toLowerCase()} is a ruff.${cut}`,
    };
  }
  if (opportunity.kind === "singleton-honor" && opportunity.card) {
    return {
      summary: `+${trickPhrase(tricks)} from a ruff after the ${cardName(opportunity.card)}`,
      detail: `The ${cardName(opportunity.card)} is already counted on its own. Once it is gone the suit is a void, and a low spade can ruff the next round.${cut}`,
    };
  }
  if (opportunity.kind === "doubleton-low") {
    return {
      summary: `+${trickPhrase(tricks)} from low spades due to a ${singular} doubleton`,
      detail: `Two low ${label.toLowerCase()} can be played off. A third-round ruff is only a partial chance, because someone else usually gets there first.${cut}`,
    };
  }
  return {
    summary: `+${trickPhrase(tricks)} from low spades due to short ${label}`,
    detail: `Short ${label.toLowerCase()} leave a late ruffing chance once the honor has been played.${cut}`,
  };
}

function spendRuffFuel(spades: TrumpCard[], fuelNeeded: number): void {
  let remaining = fuelNeeded;
  const spenders = spades
    .filter((card) => card.fuel > 0)
    .sort((a, b) => a.p - b.p || RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);

  for (const card of spenders) {
    if (remaining <= 1e-9) break;
    const used = Math.min(card.fuel, remaining);
    const fraction = used / card.fuel;
    card.p *= 1 - fraction;
    card.fuel -= used;
    remaining -= used;
  }
}

function validateHand(cards: readonly Card[]): void {
  if (cards.length !== 13) {
    throw new HandError(
      `Call Break deals 13 cards. This hand has ${cards.length}.`,
    );
  }
  const seen = new Set<string>();
  for (const card of cards) {
    if (!SUITS.includes(card.suit) || !isRank(card.rank)) {
      throw new HandError("A card has a suit or rank this deck does not use.");
    }
    const key = cardKey(card);
    if (seen.has(key)) {
      throw new HandError(`${cardName(card)} is in the hand twice.`);
    }
    seen.add(key);
  }
}

function emptyBySuit(): Record<Suit, Card[]> {
  return { spades: [], hearts: [], diamonds: [], clubs: [] };
}

function pushKept(
  target: DraftLine[],
  drafts: DraftLine[],
  lump: Omit<DraftLine, "tricks"> & { names: string[] },
): void {
  const kept: DraftLine[] = [];
  const dust: DraftLine[] = [];
  for (const line of drafts) {
    if (line.tricks >= 0.05) kept.push(line);
    else if (line.tricks > 0.005) dust.push(line);
  }
  target.push(...kept);
  const dustSum = dust.reduce((total, line) => total + line.tricks, 0);
  if (dustSum < 0.05) return;
  const names = lump.names;
  target.push({
    id: lump.id,
    tone: lump.tone,
    suit: lump.suit,
    tricks: dustSum,
    summary: `${trickPhrase(dustSum)} expected from low ${SUIT_META[lump.suit].plural}${names.length ? ` (${names.join(", ")})` : ""}`,
    detail: lump.detail,
  });
}

export function evaluateHand(cards: readonly Card[]): BidResult {
  validateHand(cards);

  const bySuit = emptyBySuit();
  for (const card of cards) bySuit[card.suit].push(card);
  for (const suit of SUITS) {
    bySuit[suit].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
  }

  const spadeRanks = bySuit.spades.map((card) => card.rank);
  const trumpCards: TrumpCard[] = spadeRanks.map((rank) => {
    const win = trumpWinProb(rank, spadeRanks);
    return {
      rank,
      p: win.p,
      master: win.master,
      fuel: win.p < RUFF_FUEL_MAX_P ? 1 : 0,
    };
  });
  applyTrumpCap(trumpCards);
  for (const card of trumpCards) {
    card.fuel = card.p < RUFF_FUEL_MAX_P ? 1 : 0;
  }

  const opportunities = ruffOpportunities(bySuit);
  const totalFuel = trumpCards.reduce((total, card) => total + card.fuel, 0);
  let fuelLeft = totalFuel;
  const takenRuffs: { opportunity: RuffOpportunity; tricks: number }[] = [];
  for (const opportunity of opportunities) {
    if (fuelLeft <= 1e-9) break;
    const tricks = Math.min(opportunity.requested, fuelLeft);
    fuelLeft -= tricks;
    if (tricks > 0.005) takenRuffs.push({ opportunity, tricks });
  }
  const fuelSpent = totalFuel - fuelLeft;
  if (fuelSpent > 0) spendRuffFuel(trumpCards, fuelSpent);

  const warnings: string[] = [];
  if (spadeRanks.length === 0) {
    warnings.push(
      "No spades. You cannot ruff, and every off-suit honor can be trumped.",
    );
  } else if (
    spadeRanks.length < 13 &&
    opportunities.some((item) => item.requested >= 0.4) &&
    totalFuel <= 0
  ) {
    const shorts = joinLabels(
      opportunities
        .filter((item) => item.requested >= 0.4)
        .map((item) => SUIT_META[item.suit].label),
    );
    warnings.push(
      `You are short in ${shorts}, but every spade is already counted as a winner. Ruffing with those spades would not add a trick.`,
    );
  }

  for (const suit of ["hearts", "diamonds", "clubs"] as const) {
    const holding = bySuit[suit];
    const hasHonor = holding.some((card) => RANK_VALUE[card.rank] >= RANK_VALUE.J);
    if (holding.length >= 6 && hasHonor) {
      warnings.push(
        `${SUIT_META[suit].label} runs ${holding.length} cards. High ${SUIT_META[suit].plural} are marked down because an opponent is short and will ruff them.`,
      );
    }
  }

  const breakdown: DraftLine[] = [];

  const trumpDrafts: DraftLine[] = trumpCards
    .slice()
    .sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])
    .map((card) => {
      const copy = describeTrump(card, spadeRanks);
      return {
        id: `trump:${card.rank}`,
        tone: "trump" as const,
        suit: "spades" as const,
        tricks: card.p,
        summary: copy.summary,
        detail: copy.detail,
      };
    });
  const trumpDustNames = trumpDrafts
    .filter((line) => line.tricks > 0.005 && line.tricks < 0.05)
    .map((line) => line.id.slice("trump:".length));
  pushKept(breakdown, trumpDrafts, {
    id: "trump:spots",
    tone: "trump",
    suit: "spades",
    summary: "",
    detail:
      "These spades are too small to cash on their own. Their real job is ruffing when a side suit is short. Anything not spent on a ruff is only a sliver of a trick.",
    names: trumpDustNames,
  });

  for (const suit of ["hearts", "diamonds", "clubs"] as const) {
    const holding = bySuit[suit];
    if (holding.length === 0) continue;
    const ranks = holding.map((card) => card.rank);
    const sideDrafts: DraftLine[] = [];
    for (const rank of RANKS) {
      if (!ranks.includes(rank)) continue;
      const shape = sideShape(rank, higherHonorsHeld(rank, ranks), ranks.filter((item) => RANK_VALUE[item] < RANK_VALUE[rank]).length);
      if (!shape) continue;
      const ruffFree = pRuffFree(holding.length, shape.round);
      const tricks = shape.base * ruffFree * frictionFor(shape.round);
      const card = { suit, rank };
      const copy = describeSide(card, tricks, shape.base, shape.round, ruffFree, holding.length);
      sideDrafts.push({
        id: `side:${suit}:${rank}`,
        tone: "side",
        suit,
        tricks,
        summary: copy.summary,
        detail: copy.detail,
      });
    }
    const dustNames = sideDrafts
      .filter((line) => line.tricks > 0.005 && line.tricks < 0.05)
      .map((line) => RANK_NAME[line.id.slice(line.id.lastIndexOf(":") + 1) as Rank]);
    pushKept(breakdown, sideDrafts, {
      id: `side:${suit}:spots`,
      tone: "side",
      suit,
      summary: "",
      detail: `Small ${SUIT_META[suit].plural} honors rarely survive long enough to score. What is left after the ruffing penalty is only a sliver.`,
      names: dustNames,
    });
  }

  const ruffBySuit = new Map(takenRuffs.map((item) => [item.opportunity.suit, item]));
  for (const suit of ["hearts", "diamonds", "clubs"] as const) {
    const taken = ruffBySuit.get(suit);
    if (!taken || taken.tricks < 0.05) continue;
    const copy = describeRuff(taken.opportunity, taken.tricks);
    breakdown.push({
      id: `ruff:${suit}`,
      tone: "ruff",
      suit,
      tricks: taken.tricks,
      summary: copy.summary,
      detail: copy.detail,
    });
  }

  const rounded = breakdown
    .map((line) => ({ ...line, tricks: round2(line.tricks) }))
    .filter((line) => line.tricks >= 0.05);

  let expectedTricks = round2(rounded.reduce((total, line) => total + line.tricks, 0));
  if (expectedTricks > 13) {
    const scale = 13 / expectedTricks;
    for (const line of rounded) line.tricks = round2(line.tricks * scale);
    expectedTricks = round2(rounded.reduce((total, line) => total + line.tricks, 0));
  }

  const recommendedBid = safestBid(expectedTricks);

  return {
    expectedTricks,
    recommendedBid,
    bidNote: describeBid(expectedTricks, recommendedBid),
    breakdown: rounded,
    distribution: SUITS.map((suit) => ({
      suit,
      count: bySuit[suit].length,
      cards: sortCards(bySuit[suit]),
    })),
    warnings,
  };
}
