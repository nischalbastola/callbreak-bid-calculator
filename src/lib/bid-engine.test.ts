import { describe, expect, it } from "vitest";

import { cardKey, parseHand } from "@/lib/cards";
import {
  evaluateHand,
  pRuffFree,
  safestBid,
  STEP_UP_FRACTION,
  type BidResult,
} from "@/lib/bid-engine";
import { PRESETS } from "@/lib/presets";

function line(result: BidResult, id: string) {
  return result.breakdown.find((entry) => entry.id === id);
}

describe("ruff-free probabilities", () => {
  it("matches the hypergeometric table for a 3-card suit", () => {
    expect(pRuffFree(3, 1)).toBeCloseTo(0.9749, 3);
    expect(pRuffFree(3, 2)).toBeCloseTo(0.784, 3);
    expect(pRuffFree(1, 1)).toBeCloseTo(0.9926, 3);
    expect(pRuffFree(7, 1)).toBeCloseTo(0.7899, 3);
    expect(pRuffFree(7, 2)).toBeCloseTo(0.145, 2);
  });

  it("is zero once three opponents cannot all follow", () => {
    expect(pRuffFree(5, 3)).toBe(0);
    expect(pRuffFree(11, 1)).toBe(0);
  });
});

describe("safestBid", () => {
  it("steps up only after the safety line, and never bids 0", () => {
    expect(STEP_UP_FRACTION).toBe(0.6);
    expect(safestBid(0)).toBe(1);
    expect(safestBid(0.2)).toBe(1);
    expect(safestBid(Number.NaN)).toBe(1);
    expect(safestBid(-3)).toBe(1);
    expect(safestBid(1.59)).toBe(1);
    expect(safestBid(1.6)).toBe(2);
    expect(safestBid(3.59)).toBe(3);
    expect(safestBid(3.6)).toBe(4);
    expect(safestBid(3.7)).toBe(4);
    expect(safestBid(12.59)).toBe(12);
    expect(safestBid(12.6)).toBe(13);
    expect(safestBid(13)).toBe(13);
    expect(safestBid(20)).toBe(13);
  });
});

describe("evaluateHand", () => {
  it("rejects the wrong count and duplicate cards", () => {
    expect(() => evaluateHand(parseHand("AS KS"))).toThrow(/13 cards/);
    expect(() =>
      evaluateHand(parseHand("AS AS KS QS JS 10S 9S 8S 7S 6S 5S 4S 3S")),
    ).toThrow(/twice/);
  });

  it("scores thirteen spades as thirteen sure tricks", () => {
    const result = evaluateHand(
      parseHand("AS KS QS JS 10S 9S 8S 7S 6S 5S 4S 3S 2S"),
    );
    expect(result.expectedTricks).toBe(13);
    expect(result.recommendedBid).toBe(13);
    expect(result.breakdown).toHaveLength(13);
    expect(result.breakdown.every((entry) => entry.tricks === 1)).toBe(true);
    expect(line(result, "trump:A")?.summary).toMatch(/Ace of Spades/);
    expect(result.warnings).toHaveLength(0);
  });

  it("counts the Ace and the King behind it as full trump tricks", () => {
    const result = evaluateHand(
      parseHand("AS KS 4S 3S AH 9H 5H AD 7D 2D AC 6C 4C"),
    );
    expect(line(result, "trump:A")?.tricks).toBe(1);
    expect(line(result, "trump:K")?.tricks).toBe(1);
    expect(line(result, "trump:K")?.detail).toMatch(/sequence from the Ace/i);
  });

  it("prices a guarded off-suit king near 0.6 and a normal ace near 0.85", () => {
    const result = evaluateHand(
      parseHand("AS 9S 5S 2S KH 5H 4H AD 7D 3D AC 6C 3C"),
    );
    const king = line(result, "side:hearts:K");
    const ace = line(result, "side:diamonds:A");
    expect(king).toBeDefined();
    expect(ace).toBeDefined();
    expect(king!.tricks).toBeGreaterThanOrEqual(0.55);
    expect(king!.tricks).toBeLessThanOrEqual(0.7);
    expect(ace!.tricks).toBeGreaterThanOrEqual(0.84);
    expect(ace!.tricks).toBeLessThanOrEqual(0.9);
    expect(king!.summary).toMatch(/King of Hearts/);
  });

  it("penalizes an ace buried in a long side suit", () => {
    const short = evaluateHand(
      parseHand("AS KS QS JS 10S AH 2D 3D 4D 5D 2C 3C 4C"),
    );
    const long = evaluateHand(
      parseHand("AS KS QS AH 9H 8H 7H 6H 5H 4H 2D 3D 2C"),
    );
    const shortAce = line(short, "side:hearts:A")!.tricks;
    const longAce = line(long, "side:hearts:A")!.tricks;
    expect(shortAce).toBeGreaterThan(longAce + 0.1);
    expect(long.warnings.some((warning) => /Hearts runs 7/.test(warning))).toBe(
      true,
    );
    expect(line(long, "side:hearts:A")?.detail).toMatch(/penalty/i);
  });

  it("upgrades low spades when the hand is void in clubs", () => {
    const voidHand = evaluateHand(
      parseHand("KS 9S 7S 4S 2S AH QH 8H 5H KD 10D 6D 3D"),
    );
    const filled = evaluateHand(
      parseHand("KS 9S 7S 4S AH QH 8H 5H KD 10D 6D 3D 2C"),
    );
    const ruff = line(voidHand, "ruff:clubs");
    expect(ruff).toBeDefined();
    expect(ruff!.tricks).toBeGreaterThanOrEqual(0.8);
    expect(ruff!.summary).toMatch(/low spades/i);
    expect(ruff!.summary).toMatch(/Club void/);
    const filledRuff = line(filled, "ruff:clubs");
    expect(filledRuff?.summary).toMatch(/Club singleton/);
    expect(ruff!.tricks).toBeGreaterThan(filledRuff!.tricks);
    expect(voidHand.expectedTricks).toBeGreaterThan(filled.expectedTricks);
  });

  it("does not invent ruffs when the hand has no spades", () => {
    const result = evaluateHand(
      parseHand("AH KH QH JH 10H 9H AD KD QD JD 10D AC KC"),
    );
    expect(result.breakdown.some((entry) => entry.tone === "ruff")).toBe(false);
    expect(result.warnings.some((warning) => /No spades/.test(warning))).toBe(
      true,
    );
    expect(result.recommendedBid).toBeGreaterThanOrEqual(1);
    expect(result.recommendedBid).toBeLessThanOrEqual(13);
  });

  it("keeps the breakdown sum equal to the expected tricks", () => {
    const hands = [
      "AS KS QS JS 10S 9S 8S AH KH AD AC KC QC",
      "AS 8S 5S 3S AH 9H 4H AD 7D 2D AC 6C 4C",
      "KS 9S 7S 4S 2S AH QH 8H 5H KD 10D 6D 3D",
      "AS 6S AH KH QH JH 10H 9H 8H AD 5D KC 3C",
      "2S 3S 4S 5S 6S 7S 8S 9S 10S JH QH KH AH",
    ];
    for (const spec of hands) {
      const result = evaluateHand(parseHand(spec));
      const sum = Math.round(
        result.breakdown.reduce((total, entry) => total + entry.tricks, 0) * 100,
      ) / 100;
      expect(sum).toBe(result.expectedTricks);
      expect(result.recommendedBid).toBe(safestBid(result.expectedTricks));
      expect(Number.isInteger(result.recommendedBid)).toBe(true);
      const keys = new Set(parseHand(spec).map(cardKey));
      expect(keys.size).toBe(13);
    }
  });
});

describe("presets", () => {
  it("are legal 13-card hands the engine can price", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(4);
    for (const preset of PRESETS) {
      expect(new Set(preset.cards.map(cardKey)).size).toBe(13);
      const result = evaluateHand(preset.cards);
      expect(result.expectedTricks).toBeGreaterThan(0);
      expect(result.breakdown.length).toBeGreaterThan(0);
    }
  });
});
