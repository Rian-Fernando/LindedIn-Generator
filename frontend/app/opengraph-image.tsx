import { ImageResponse } from "next/og";

import { OG_SIZE, OgCard } from "../components/OgCard";

export const alt = "Netpost — LinkedIn Post Generator for Fintech & Investment Banking";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Netpost"
        title="LinkedIn Post Generator"
        subtitle="Five high-signal posts per click. Live fintech and investment banking trends. No AI slop."
      />
    ),
    { ...size }
  );
}
