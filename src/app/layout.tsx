import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = getSiteUrl();

const description =
  "Pick your 13 Call Break cards and get a probabilistic bid. Spades are trump. Sure winners, off-suit aces, ruffs, and long-suit penalties, rounded to the safest bid.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Call Break Optimal Bid Calculator",
    template: "%s · Call Break Bid Calculator",
  },
  description,
  applicationName: "Call Break Optimal Bid Calculator",
  keywords: [
    "Call Break",
    "Callbreak",
    "bid calculator",
    "spades trump",
    "13 card hand",
    "trick-taking bid",
    "optimal bid",
  ],
  authors: [{ name: "Call Break Bid Calculator" }],
  creator: "Call Break Bid Calculator",
  category: "games",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Call Break Bid Calculator",
    title: "Call Break Optimal Bid Calculator",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Call Break Optimal Bid Calculator",
    description,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#12382c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
