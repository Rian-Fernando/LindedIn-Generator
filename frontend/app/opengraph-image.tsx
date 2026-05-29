import { ImageResponse } from "next/og";

export const alt = "Netpost — LinkedIn Post Generator for Fintech & Investment Banking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "88px",
          background:
            "linear-gradient(135deg, #0B132B 0%, #1C2541 55%, #3A506B 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#5BC0BE"
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#5BC0BE"
            }}
          />
          Netpost
        </div>

        <div
          style={{
            fontSize: 104,
            fontWeight: 700,
            lineHeight: 1.02,
            marginTop: 28,
            maxWidth: 1000,
            letterSpacing: -2
          }}
        >
          LinkedIn Post Generator
        </div>

        <div
          style={{
            fontSize: 36,
            lineHeight: 1.3,
            marginTop: 32,
            maxWidth: 1020,
            color: "#d2def2"
          }}
        >
          Five high-signal posts per click. Live fintech and investment banking trends. No AI slop.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 56,
            fontSize: 26,
            color: "#9aa7c2"
          }}
        >
          <span>netpost.rianfernando.com</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Built by Rian Fernando</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
