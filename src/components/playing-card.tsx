"use client";

import { memo } from "react";
import { cardName, SUIT_META, type Card } from "@/lib/cards";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: Card;
  selected: boolean;
  disabled: boolean;
  onToggle: (key: string) => void;
  cardKeyValue: string;
}

function PlayingCardComponent({
  card,
  selected,
  disabled,
  onToggle,
  cardKeyValue,
}: PlayingCardProps) {
  const meta = SUIT_META[card.suit];
  const ink =
    card.suit === "hearts"
      ? "text-heart"
      : card.suit === "diamonds"
        ? "text-diamond"
        : "text-felt";

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${cardName(card)}${meta.trump ? ", trump" : ""}`}
      disabled={disabled}
      title={disabled ? "Deselect a card before picking another." : cardName(card)}
      onClick={() => onToggle(cardKeyValue)}
      className={cn(
        "relative flex h-16 w-11 touch-manipulation flex-col rounded-md border bg-[#f7f3ea] px-1 py-1 text-left shadow-sm transition duration-150",
        "focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
        "sm:h-[4.6rem] sm:w-12",
        ink,
        selected && "-translate-y-1.5 border-gold shadow-lg ring-2 ring-gold",
        !selected && !disabled && "border-[#e6dcc6] hover:-translate-y-0.5 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-35 saturate-50",
      )}
    >
      <span
        className={cn(
          "font-heading text-[0.95rem] leading-none font-semibold",
          card.rank === "10" && "text-[0.78rem]",
        )}
      >
        {card.rank}
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-xl leading-none" aria-hidden="true">
        {meta.symbol}
      </span>
    </button>
  );
}

export const PlayingCard = memo(PlayingCardComponent);
