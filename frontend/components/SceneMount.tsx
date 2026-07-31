"use client";

import dynamic from "next/dynamic";

// WebGL is client-only and non-essential to the content, so it is loaded
// lazily and never server-rendered — the page reads fine without it.
const PipelineScene = dynamic(() => import("./PipelineScene"), { ssr: false });

export function SceneMount() {
  return <PipelineScene />;
}
