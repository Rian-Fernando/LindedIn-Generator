import { ImageResponse } from "next/og";

import { OG_SIZE, OgCard } from "../../components/OgCard";

export const alt = "How Netpost works — trend scoring, linting and similarity checks";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Netpost"
        title="How it works"
        subtitle="Trend scoring, the anti-slop linter, and the similarity thresholds that decide what reaches you."
      />
    ),
    { ...size }
  );
}
