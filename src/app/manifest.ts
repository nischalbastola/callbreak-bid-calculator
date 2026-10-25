import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Call Break Optimal Bid Calculator",
    short_name: "Call Break Bid",
    description:
      "Pick 13 Call Break cards. Spades are trump. Get the safest bid and the trick-by-trick breakdown.",
    start_url: "/",
    display: "standalone",
    background_color: "#12382c",
    theme_color: "#12382c",
    lang: "en",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
