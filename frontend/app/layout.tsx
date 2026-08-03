import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

import { NetpostMark } from "../components/NetpostMark";
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  GITHUB_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL
} from "../lib/site";

// Referenced as a full static expression so Next inlines it at build time.
// Publishable by design (pk_fdx_...), scoped to one project and locked to the
// configured domain, so shipping it in client HTML is intended.
const FEEDEX_KEY = process.env.NEXT_PUBLIC_FEEDEX_KEY;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Netpost"
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
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

// Sitewide entities. The home page adds WebApplication + FAQPage, and
// /how-it-works adds TechArticle, so nothing is declared twice.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      inLanguage: "en",
      publisher: { "@id": `${AUTHOR_URL}/#person` }
    },
    {
      "@type": "Person",
      "@id": `${AUTHOR_URL}/#person`,
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
      sameAs: ["https://github.com/Rian-Fernando", AUTHOR_URL]
    }
  ]
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>

        <nav aria-label="Primary" className="site-nav">
          <a aria-label={`${SITE_NAME} home`} className="site-nav-brand" href="/">
            <NetpostMark size={22} title="Netpost logo" />
            <span>Netpost</span>
          </a>
          <ul className="site-nav-links">
            <li>
              <a href="/how-it-works">How it works</a>
            </li>
            <li>
              <a href={GITHUB_URL} rel="noopener">
                GitHub
              </a>
            </li>
            <li>
              <a href={AUTHOR_URL} rel="author">
                Portfolio
              </a>
            </li>
          </ul>
        </nav>

        {children}

        <footer className="site-footer">
          <p className="site-footer-blurb">
            Netpost is a free, no-login LinkedIn post generator for B2B fintech and investment
            banking teams. Five source-grounded posts per click.
          </p>
          <ul className="site-footer-links">
            <li>
              <a href="/how-it-works">How it works</a>
            </li>
            <li>
              <a href={GITHUB_URL} rel="noopener">
                Source
              </a>
            </li>
          </ul>
          <p>
            <a href={AUTHOR_URL} rel="author">
              Built by {AUTHOR_NAME}
            </a>
          </p>
        </footer>

        {/* Feedex feedback widget. Rendered only when the key is present, so a
            local checkout without the env var never boots the widget keyless.
            lazyOnload keeps it off the critical path — it loads after hydration
            and does not affect LCP. Theme is pinned to dark because this site
            has no light mode; "auto" would open a light panel for anyone whose
            OS prefers light. */}
        {FEEDEX_KEY ? (
          <Script
            src="https://feedex.rianfernando.com/widget.js"
            strategy="lazyOnload"
            data-feedex-key={FEEDEX_KEY}
            data-feedex-theme="dark"
            data-feedex-accent="#5BC0BE"
            data-feedex-position="bottom-right"
            data-feedex-label="Feedback"
            data-feedex-title="Send feedback"
            data-feedex-description="Found a bug, or did a generated post miss the mark? Tell me what happened."
            data-feedex-categories="bug,quality,feature,other"
          />
        ) : null}
      </body>
    </html>
  );
}
