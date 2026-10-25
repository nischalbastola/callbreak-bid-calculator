# Call Break Optimal Bid Calculator

A probabilistic bid calculator for the trick-taking game Call Break. Pick the 13 cards in your hand. Spades are trump. The app returns the expected number of tricks, the safest integer bid, and a line-by-line breakdown of where those tricks come from.

## Run it

```bash
npm install
npm run dev -- -p 4179
```

Open [http://127.0.0.1:4179](http://127.0.0.1:4179).

`npm run dev` without a port uses Next.js's default port.

## Tests

```bash
npm test
```

The engine tests cover trump sequences, the 0.60 safety line (3.70 bids 4, 3.59 stays at 3), off-suit aces and kings, the penalty on long side suits, and ruffs from a void.

## How a bid is priced

- A spade with nothing higher outstanding, including the Ace of Spades and the King behind it, is 1 trick.
- Other trump honors are fractional, based on how many low spades can duck while missing honors fall.
- Off-suit aces and kings start from a fixed table, then get multiplied by the chance that round is still ruff-free. That chance is the hypergeometric probability that all three opponents can follow suit. Long side suits fail it early.
- Voids and singletons add ruff value only by spending low spades that were not already counted as winners.
- The lines add up to the expected tricks. The bid steps up when the fraction is at least 0.60, because a missed bid costs the whole bid and an overtrick pays 0.1. The minimum bid is 1.

## Production URL

Set `NEXT_PUBLIC_SITE_URL` to the public origin (for example `https://bids.example.com`) so the canonical URL, sitemap, and Open Graph tags point at the real site. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` is used when that variable is unset.
