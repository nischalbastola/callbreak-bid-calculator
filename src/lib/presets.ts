import { parseHand, type Card } from "@/lib/cards";

export interface HandPreset {
  id: string;
  name: string;
  blurb: string;
  spec: string;
  cards: Card[];
}

const PRESET_SPECS: Omit<HandPreset, "cards">[] = [
  {
    id: "spade-run",
    name: "Spade run",
    blurb: "Ace through eight of spades, plus side aces and kings.",
    spec: "AS KS QS JS 10S 9S 8S AH KH AD AC KC QC",
  },
  {
    id: "four-aces",
    name: "Four aces",
    blurb: "One ace in every suit, with no second honor hiding behind them.",
    spec: "AS 8S 5S 3S AH 9H 4H AD 7D 2D AC 6C 4C",
  },
  {
    id: "club-void",
    name: "Club void",
    blurb: "Five spades and zero clubs, so a low spade can ruff early.",
    spec: "KS 9S 7S 4S 2S AH QH 8H 5H KD 10D 6D 3D",
  },
  {
    id: "heart-trap",
    name: "Heart trap",
    blurb: "Seven hearts. The ace and king look pretty until someone ruffs them.",
    spec: "AS 6S AH KH QH JH 10H 9H 8H AD 5D KC 3C",
  },
];

export const PRESETS: HandPreset[] = PRESET_SPECS.map((preset) => ({
  ...preset,
  cards: parseHand(preset.spec),
}));
