# Third-party data, services & attribution

Netpost is released under the MIT License (see [`LICENSE`](LICENSE)). It relies
on the following third-party feeds and services at runtime. Netpost is an
independent project and is **not affiliated with, endorsed by, or connected to
any of them — including LinkedIn Corporation.**

## Trend sources

| Data | Source | Access | Terms |
|---|---|---|---|
| Top stories | [Hacker News](https://news.ycombinator.com) via the [Firebase API](https://github.com/HackerNews/API) | Public, keyless | Free for non-commercial use |
| Community posts | [Reddit](https://www.reddit.com) public JSON endpoints | Public, keyless | [Reddit API Terms](https://www.redditinc.com/policies/data-api-terms) |
| Industry news | Finextra, PYMNTS, TechCrunch, American Banker, Financial Times, The Banker, Finovate, Tearsheet, Banking Dive, Payments Dive | Public RSS | Each publisher's own terms; headlines and links only |
| Headlines | [News API](https://newsapi.org) | API key required | [NewsAPI Terms](https://newsapi.org/terms) |

Netpost stores only headlines, summaries, links and derived scores. It does not
republish full article text, and every generated post links back to the source
it was drawn from.

## Generation

| Service | Use |
|---|---|
| [OpenAI](https://openai.com) | Chat completions with structured JSON output |
| [Supabase](https://supabase.com) | PostgreSQL persistence via the REST API |

## Style corpus

`database/influencer_corpus.json` contains **pattern summaries only** — hook
types, structural shapes, credibility moves and pacing tendencies distilled from
publicly documented research into high-performing B2B LinkedIn writing. It
contains **no copied posts** and reproduces no creator's text. Named references
are cited in [`docs/research-sources.md`](docs/research-sources.md) as research
sources, not as endorsements or partnerships.

## Fonts

Inter and Cormorant Garamond are served from Google Fonts under the
[SIL Open Font License](https://openfontlicense.org/).

**Editorial responsibility stays with you.** Netpost drafts posts and shows its
linting and similarity scores; it does not verify claims. Read the sources
before publishing anything it produces.
