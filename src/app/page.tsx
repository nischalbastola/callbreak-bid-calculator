import { Calculator } from "@/components/calculator";
import { getSiteUrl } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Call Break Optimal Bid Calculator",
  applicationCategory: "GameApplication",
  operatingSystem: "Any",
  url: getSiteUrl().toString(),
  description:
    "Probabilistic bid calculator for the trick-taking card game Call Break. Evaluate a 13-card hand with spades as trump and get the safest integer bid plus a trick-by-trick breakdown.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Select exactly 13 cards from a 52-card deck",
    "Spades treated as trump",
    "Expected-trick total with a safest integer bid",
    "Breakdown of trump winners, off-suit honors, ruffs, and long-suit penalties",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a
        href="#hand"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-30 focus:rounded-md focus:bg-gold focus:px-3 focus:py-2 focus:text-felt"
      >
        Skip to the hand builder
      </a>
      <header className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">
          Trick-taking · Spades are trump
        </p>
        <h1 className="mt-2 max-w-3xl font-heading text-4xl leading-tight text-ivory sm:text-6xl">
          Call Break Optimal Bid Calculator
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ivory/85 sm:text-lg">
          You get 13 cards. You have to name the tricks you will win before a single one is played.
          This calculator prices the hand, shows where every fraction comes from, and rounds to the
          bid that is safest to defend.
        </p>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-28 sm:px-6 lg:pb-16">
        <Calculator />

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <section
            id="how-bidding-works"
            aria-labelledby="rules-heading"
            className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6"
          >
            <h2 id="rules-heading" className="font-heading text-2xl text-ivory">
              How Call Break bidding works
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-ivory/85">
              <p>
                Call Break, also written Callbreak, is a four-player trick-taking game with a
                standard 52-card deck. Each player is dealt 13 cards. Spades are trump on every
                hand. There is no partner.
              </p>
              <p>
                Before the first lead, each player bids the number of tricks they expect to win.
                The legal range here is 1 to 13. A bid of 0 is not allowed.
              </p>
              <p>
                In the usual South Asian scoring, making the bid scores the bid plus 0.1 for every
                extra trick. Missing scores minus the bid. An overtrick is cheap. A miss is not.
                That is why 3.70 expected tricks becomes a bid of 4, and 3.40 stays at 3.
              </p>
            </div>
          </section>

          <section
            id="how-the-engine-counts"
            aria-labelledby="engine-heading"
            className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6"
          >
            <h2 id="engine-heading" className="font-heading text-2xl text-ivory">
              What the engine counts
            </h2>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-ivory/85">
              <li>
                <strong className="font-semibold text-ivory">Sure trump winners.</strong> The Ace
                of Spades, and any spade in an unbroken sequence under it, is one full trick.
              </li>
              <li>
                <strong className="font-semibold text-ivory">Fractional trump honors.</strong> A
                King of Spades without the Ace is strong when low spades can duck, and weak when
                the King is bare.
              </li>
              <li>
                <strong className="font-semibold text-ivory">Off-suit aces and kings.</strong> An
                ace in a short suit is about 0.85. The same ace in a seven-card suit is cut,
                because an opponent is short and will ruff.
              </li>
              <li>
                <strong className="font-semibold text-ivory">Ruffs.</strong> A void or a singleton
                in hearts, diamonds, or clubs upgrades low spades that were not already counted as
                winners.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This is a heuristic, not a double-dummy solve. It never sees the other three hands.
              The lines in the breakdown are the whole calculation: they add up to the expected
              tricks, and the integer bid is read off that total.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10 px-4 py-6 pb-28 text-center text-xs leading-5 text-muted-foreground sm:px-6 lg:pb-6">
        <p>
          Call Break Optimal Bid Calculator. House rules differ on the minimum bid. This tool uses
          a floor of 1 and steps up only when the fraction clears 0.60.
        </p>
      </footer>
      <noscript>
        <p className="px-4 py-6 text-center text-sm text-ivory">
          Card selection needs JavaScript. The bidding notes above are still readable without it.
        </p>
      </noscript>
    </>
  );
}
