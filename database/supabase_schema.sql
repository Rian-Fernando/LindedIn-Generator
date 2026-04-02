create extension if not exists pgcrypto;

create table if not exists trend_events (
  id text primary key,
  fingerprint text not null unique,
  title text not null,
  source text not null,
  source_type text not null,
  url text not null,
  summary text,
  relevance_reason text,
  tags jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trend_events_fingerprint_idx on trend_events (fingerprint);
create index if not exists trend_events_created_at_idx on trend_events (created_at desc);

create table if not exists generation_batches (
  id uuid primary key default gen_random_uuid(),
  voice text not null,
  trend_count integer not null,
  feedback_summary text,
  created_at timestamptz not null default now()
);

create table if not exists generated_posts (
  id text primary key,
  batch_id uuid not null references generation_batches(id) on delete cascade,
  trend_id text not null,
  trend_title text not null,
  voice text not null,
  hook text not null,
  hook_type text not null,
  body text not null,
  format text not null,
  hashtags jsonb not null default '[]'::jsonb,
  tagging_hints jsonb not null default '[]'::jsonb,
  source_ids jsonb not null default '[]'::jsonb,
  lint jsonb not null,
  similarity jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_posts_batch_idx on generated_posts (batch_id);
create index if not exists generated_posts_created_at_idx on generated_posts (created_at desc);

create table if not exists post_feedback (
  post_id text primary key references generated_posts(id) on delete cascade,
  impressions integer not null default 0,
  reactions integer not null default 0,
  comments integer not null default 0,
  reposts integer not null default 0,
  saves integer not null default 0,
  clicks integer not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

alter table trend_events enable row level security;
alter table generation_batches enable row level security;
alter table generated_posts enable row level security;
alter table post_feedback enable row level security;

drop policy if exists "service role trend events" on trend_events;
drop policy if exists "service role generation batches" on generation_batches;
drop policy if exists "service role generated posts" on generated_posts;
drop policy if exists "service role post feedback" on post_feedback;

create policy "service role trend events"
  on trend_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role generation batches"
  on generation_batches for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role generated posts"
  on generated_posts for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role post feedback"
  on post_feedback for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
