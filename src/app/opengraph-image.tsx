import { ImageResponse } from "next/og";

export const alt = "Call Break Optimal Bid Calculator. Spades are trump. Thirteen cards, one bid.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#12382c",
          color: "#f4efe2",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 2, color: "#e7c98a" }}>
          CALL BREAK · SPADES ARE TRUMP
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.02 }}>
            Optimal Bid Calculator
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#d9d0bc" }}>
            Thirteen cards. A float for the tricks. An integer you can defend.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
