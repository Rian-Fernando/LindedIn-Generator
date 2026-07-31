import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

type OgCardProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

/** Shared 1200×630 Open Graph layout, rendered to PNG by next/og. */
export function OgCard({ eyebrow, title, subtitle }: OgCardProps): ReactElement {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "88px",
        background: "linear-gradient(135deg, #0B132B 0%, #1C2541 55%, #3A506B 100%)",
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
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: "#5BC0BE" }} />
        {eyebrow}
      </div>

      <div
        style={{
          fontSize: title.length > 26 ? 84 : 104,
          fontWeight: 700,
          lineHeight: 1.02,
          marginTop: 28,
          maxWidth: 1000,
          letterSpacing: -2
        }}
      >
        {title}
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
        {subtitle}
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
  );
}
