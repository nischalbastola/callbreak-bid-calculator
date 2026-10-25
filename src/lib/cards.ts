export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const RANK_VALUE: Record<Rank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};

export const RANK_NAME: Record<Rank, string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
  "10": "10",
  "9": "9",
  "8": "8",
  "7": "7",
  "6": "6",
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
};

export const SUIT_META: Record<
  Suit,
  { label: string; singular: string; plural: string; symbol: string; trump: boolean }
> = {
  spades: {
    label: "Spades",
    singular: "Spade",
    plural: "spades",
    symbol: "♠",
    trump: true,
  },
  hearts: {
    label: "Hearts",
    singular: "Heart",
    plural: "hearts",
    symbol: "♥",
    trump: false,
  },
  diamonds: {
    label: "Diamonds",
    singular: "Diamond",
    plural: "diamonds",
    symbol: "♦",
    trump: false,
  },
  clubs: {
    label: "Clubs",
    singular: "Club",
    plural: "clubs",
    symbol: "♣",
    trump: false,
  },
};

const SUIT_CHAR: Record<string, Suit> = {
  S: "spades",
  H: "hearts",
  D: "diamonds",
  C: "clubs",
};

const RANK_SET: ReadonlySet<string> = new Set(RANKS);

export function isRank(value: string): value is Rank {
  return RANK_SET.has(value);
}

export function cardKey(card: Card): string {
  return `${card.suit}:${card.rank}`;
}

export function cardName(card: Card): string {
  return `${RANK_NAME[card.rank]} of ${SUIT_META[card.suit].label}`;
}

export function fullDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

export function sortCards(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDelta = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    if (suitDelta !== 0) return suitDelta;
    return RANK_VALUE[b.rank] - RANK_VALUE[a.rank];
  });
}

export class HandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandError";
  }
}

/** Parse a hand written as "AS KH 10D 2C". */
export function parseHand(spec: string): Card[] {
  const tokens = spec.trim().split(/\s+/).filter(Boolean);
  return tokens.map((token) => {
    const suitChar = token.slice(-1).toUpperCase();
    const rankToken = token.slice(0, -1).toUpperCase();
    const suit = SUIT_CHAR[suitChar];
    if (!suit || !isRank(rankToken)) {
      throw new HandError(`Unknown card "${token}". Use ranks A,K,Q,J,10–2 and suits S,H,D,C.`);
    }
    return { suit, rank: rankToken };
  });
}

export function higherRanks(rank: Rank): Rank[] {
  return RANKS.filter((candidate) => RANK_VALUE[candidate] > RANK_VALUE[rank]);
}
