"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { evaluateHand, type BidResult } from "@/lib/bid-engine";
import { cardKey, cardName, fullDeck, sortCards, SUITS, SUIT_META, type Card } from "@/lib/cards";
import { PRESETS } from "@/lib/presets";
import { BidReport } from "@/components/bid-report";
import { PlayingCard } from "@/components/playing-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DECK = fullDeck();
const DECK_BY_SUIT: Record<(typeof SUITS)[number], Card[]> = {
  spades: DECK.filter((card) => card.suit === "spades"),
  hearts: DECK.filter((card) => card.suit === "hearts"),
  diamonds: DECK.filter((card) => card.suit === "diamonds"),
  clubs: DECK.filter((card) => card.suit === "clubs"),
};

function sameHand(selected: Set<string>, cards: Card[]): boolean {
  return cards.length === selected.size && cards.every((card) => selected.has(cardKey(card)));
}

export function Calculator() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [result, setResult] = useState<BidResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  const selectedCards = useMemo(
    () => sortCards(DECK.filter((card) => selected.has(cardKey(card)))),
    [selected],
  );
  const count = selectedCards.length;
  const locked = count >= 13;

  const toggle = useCallback((key: string) => {
    setResult(null);
    setError(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else if (next.size < 13) next.add(key);
      return next;
    });
  }, []);

  function resetHand() {
    setSelected(new Set());
    setResult(null);
    setError(null);
  }

  function applyCards(cards: Card[]) {
    setSelected(new Set(cards.map(cardKey)));
    setResult(null);
    setError(null);
  }

  function dealRandom() {
    const deck = fullDeck();
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const current = deck[index];
      deck[index] = deck[swap];
      deck[swap] = current;
    }
    applyCards(deck.slice(0, 13));
  }

  function calculate() {
    if (selectedCards.length !== 13) return;
    const hand = selectedCards;
    startTransition(() => {
      try {
        setResult(evaluateHand(hand));
        setError(null);
      } catch (caught) {
        setResult(null);
        setError(caught instanceof Error ? caught.message : "That hand could not be read.");
      }
    });
  }

  useEffect(() => {
    if (!result && !error) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [result, error]);

  const calculateButton = (
    <Button
      type="button"
      className="h-12 w-full text-base font-semibold"
      disabled={count !== 13 || pending}
      aria-describedby="hand-count"
      onClick={calculate}
    >
      {pending ? "Calculating bid…" : "Calculate optimal bid"}
    </Button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start">
      <section id="hand" aria-labelledby="hand-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="hand-heading" className="font-heading text-2xl text-ivory sm:text-3xl">
              Build the 13-card hand
            </h2>
            <p id="hand-count" className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {count} of 13 selected
              {locked ? ". The rest of the deck is locked." : "."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Example hands">
          {PRESETS.map((preset) => {
            const active = sameHand(selected, preset.cards);
            return (
              <Button
                key={preset.id}
                type="button"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                className="min-h-11"
                title={preset.blurb}
                onClick={() => applyCards(preset.cards)}
              >
                {preset.name}
              </Button>
            );
          })}
          <Button type="button" variant="outline" className="min-h-11" onClick={dealRandom}>
            Deal random
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={resetHand}
            disabled={count === 0 && !result}
          >
            Clear hand
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          {SUITS.map((suit) => {
            const meta = SUIT_META[suit];
            const held = selectedCards.filter((card) => card.suit === suit).length;
            return (
              <section
                key={suit}
                aria-labelledby={`suit-${suit}`}
                className={cn(
                  "rounded-2xl border p-3 sm:p-4",
                  suit === "spades"
                    ? "border-gold/50 bg-gold/10"
                    : "border-white/10 bg-black/20",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 id={`suit-${suit}`} className="flex items-center gap-2 text-base font-semibold">
                    <span className={cn("text-xl", suit === "hearts" && "text-heart", suit === "diamonds" && "text-diamond", suit === "spades" && "text-gold")} aria-hidden="true">
                      {meta.symbol}
                    </span>
                    {meta.label}
                    {meta.trump ? (
                      <span className="rounded-full bg-gold px-2 py-0.5 text-[0.65rem] font-bold tracking-wider text-felt uppercase">
                        Trump
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-muted-foreground">{held} in hand</p>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {DECK_BY_SUIT[suit].map((card) => {
                    const key = cardKey(card);
                    const isSelected = selected.has(key);
                    return (
                      <PlayingCard
                        key={key}
                        card={card}
                        cardKeyValue={key}
                        selected={isSelected}
                        disabled={locked && !isSelected}
                        onToggle={toggle}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
        <div className="rounded-2xl border border-gold/25 bg-black/25 p-4">
          <h2 className="font-heading text-xl text-ivory">Your hand</h2>
          {selectedCards.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nothing picked yet. Spades are the trump row, marked in gold.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5" aria-label="Selected cards">
              {SUITS.map((suit) => {
                const cards = selectedCards.filter((card) => card.suit === suit);
                if (cards.length === 0) return null;
                return (
                  <li key={suit} className="text-sm text-ivory">
                    <span className="mr-1" aria-hidden="true">
                      {SUIT_META[suit].symbol}
                    </span>
                    <span className="sr-only">{SUIT_META[suit].label}: </span>
                    {cards.map((card) => card.rank).join(" ")}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 hidden lg:block">{calculateButton}</div>
        </div>

        <div ref={resultRef} className="rounded-2xl border border-gold/25 bg-black/25 p-4">
          <BidReport count={count} pending={pending} error={error} result={result} />
          {result ? (
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Priced hand: {selectedCards.map(cardName).join(", ")}.
            </p>
          ) : null}
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/30 bg-[#10281f]/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="mb-2 text-center text-xs text-muted-foreground">{count} of 13 selected</p>
        {calculateButton}
      </div>
    </div>
  );
}
