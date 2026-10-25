import { SUIT_META, type Suit } from "@/lib/cards";
import { formatTricks, type BidResult, type BreakdownTone } from "@/lib/bid-engine";
import { cn } from "@/lib/utils";

const TONE_LABEL: Record<BreakdownTone, string> = {
  trump: "Trump",
  side: "Side suit",
  ruff: "Ruff",
};

function suitInk(suit: Suit): string {
  if (suit === "hearts") return "text-heart";
  if (suit === "diamonds") return "text-diamond";
  if (suit === "spades") return "text-gold";
  return "text-ivory";
}

export function BidReport({
  count,
  pending,
  error,
  result,
}: {
  count: number;
  pending: boolean;
  error: string | null;
  result: BidResult | null;
}) {
  return (
    <section id="bid-result" aria-labelledby="bid-heading" className="scroll-mt-24">
      <h2 id="bid-heading" className="font-heading text-2xl text-ivory">
        Recommended bid
      </h2>

      <div aria-live="polite" aria-atomic="true" className="mt-3">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-ivory"
          >
            {error}
          </div>
        ) : null}

        {pending && !result ? (
          <p className="mt-3 text-sm text-muted-foreground">Reading the hand…</p>
        ) : null}

        {!error && !result ? (
          <div className="mt-3 rounded-2xl border border-dashed border-gold/30 bg-black/20 px-4 py-5">
            <p className="font-heading text-5xl text-gold/70">—</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {count === 0
                ? "No bid yet. Pick exactly 13 cards. The engine will not guess from a partial hand."
                : count < 13
                  ? `${13 - count} more ${count === 12 ? "card" : "cards"} and the bid can be calculated.`
                  : "Thirteen cards are in. Calculate the optimal bid."}
            </p>
          </div>
        ) : null}

        {result ? (
          <div className={cn("mt-3", pending && "opacity-70")}>
            <p className="font-heading text-7xl leading-none text-gold sm:text-8xl">
              {result.recommendedBid}
            </p>
            <p className="mt-2 text-sm tracking-wide text-gold uppercase">
              {formatTricks(result.expectedTricks)} expected tricks
            </p>
            <p className="mt-3 text-sm leading-6 text-ivory/90">{result.bidNote}</p>

            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Suit lengths">
              {result.distribution.map((holding) => (
                <li
                  key={holding.suit}
                  className={cn(
                    "rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-sm",
                    suitInk(holding.suit),
                    holding.suit === "spades" && "border-gold/40",
                  )}
                >
                  <span aria-hidden="true">{SUIT_META[holding.suit].symbol}</span>{" "}
                  {SUIT_META[holding.suit].label} {holding.count}
                  {holding.count === 0 ? " · void" : ""}
                </li>
              ))}
            </ul>

            {result.warnings.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {result.warnings.map((warning) => (
                  <li
                    key={warning}
                    className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm leading-5 text-ivory"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}

            <h3 className="mt-6 font-heading text-lg text-ivory">Where the tricks come from</h3>
            <ol className="mt-3 space-y-3">
              {result.breakdown.map((line) => (
                <li
                  key={line.id}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 w-8 shrink-0 text-center text-xl leading-none",
                        suitInk(line.suit),
                      )}
                      aria-hidden="true"
                    >
                      {SUIT_META[line.suit].symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 font-medium text-ivory">{line.summary}</p>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{line.detail}</p>
                      <p className="mt-1 text-[0.7rem] tracking-wide text-gold/80 uppercase">
                        {TONE_LABEL[line.tone]}
                      </p>
                    </div>
                    <span className="font-heading text-lg text-gold tabular-nums">
                      {line.tone === "ruff" ? "+" : ""}
                      {formatTricks(line.tricks)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              These lines add up to {formatTricks(result.expectedTricks)} expected tricks.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
