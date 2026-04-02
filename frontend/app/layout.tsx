import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Lindin Gen",
  description: "LinkedIn batch generation workflow for investment banking and fintech automation."
};

export const viewport: Viewport = {
  themeColor: "#0B132B"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
