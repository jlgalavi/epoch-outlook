-- Create forecast_cache table to persist forecast responses by coordinate/date
create table if not exists public.forecast_cache (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lon double precision not null,
  target_date date not null,
  day_window integer not null default 7,
  units text not null default 'metric',
  response jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forecast_cache_unique unique (lat, lon, target_date, day_window, units)
);

-- Enable RLS
alter table public.forecast_cache enable row level security;

-- Public read policy
create policy "Public can read forecast cache"
  on public.forecast_cache
  for select
  using (true);

-- Public insert policy
create policy "Public can insert forecast cache"
  on public.forecast_cache
  for insert
  with check (true);

-- Public update policy (allow updating existing cached entries)
create policy "Public can update forecast cache"
  on public.forecast_cache
  for update
  using (true)
  with check (true);

-- Timestamp trigger function (reuse if exists)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to maintain updated_at
create trigger set_forecast_cache_updated_at_trigger
before update on public.forecast_cache
for each row
execute function public.set_updated_at();