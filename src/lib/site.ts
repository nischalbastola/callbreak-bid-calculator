/**
 * Absolute origin for canonical URLs, the sitemap, and Open Graph.
 * Set NEXT_PUBLIC_SITE_URL in production. On Vercel the project URL is used.
 * Local dev falls back to the dev server so metadata still resolves.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit);

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return new URL(`https://${host}`);
  }

  return new URL("http://127.0.0.1:4179");
}
