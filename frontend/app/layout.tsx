import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

const SITE_URL = "https://netpost.rianfernando.com";
const SITE_NAME = "Netpost";
const SITE_TITLE = "Netpost — LinkedIn Post Generator for Fintech & Investment Banking";
const SITE_DESCRIPTION =
  "Netpost generates five high-signal LinkedIn posts per click, grounded in live fintech and investment banking trends. No login. Founder or company voice, with anti-AI-slop linting.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Netpost"
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Rian Fernando", url: "https://rianfernando.com" }],
  creator: "Rian Fernando",
  publisher: "Rian Fernando",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  category: "technology"
};

export const viewport: Viewport = {
  themeColor: "#0B132B"
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  },
  author: {
    "@type": "Person",
    name: "Rian Fernando",
    url: "https://rianfernando.com"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <footer className="site-footer">
          <a href="https://rianfernando.com" rel="author">
            Built by Rian Fernando
          </a>
        </footer>
      </body>
    </html>
  );
}
