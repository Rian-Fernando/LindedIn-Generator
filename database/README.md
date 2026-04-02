# Database Notes

This project targets Supabase in production and falls back to a local JSON store in development so the app can still run without credentials.

Tables:

- `trend_events`: raw live trend items used for freshness and deduplication
- `generation_batches`: each Generate click
- `generated_posts`: the 5-post batch output plus lint and similarity metadata
- `post_feedback`: impressions and interaction metrics used by the feedback loop

Primary production schema lives in `database/supabase_schema.sql`.
