-- Lazer Chizma loyihasi uchun Supabase sxemasi
-- Supabase loyihangizda SQL Editor'ga qo'ying va ishga tushiring.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Chizma',
  shapes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);

-- har bir foydalanuvchi faqat o'z loyihalarini ko'radi va tahrirlaydi
alter table public.projects enable row level security;

create policy "foydalanuvchi o'z loyihalarini ko'radi"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "foydalanuvchi o'z loyihasini yaratadi"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "foydalanuvchi o'z loyihasini yangilaydi"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "foydalanuvchi o'z loyihasini o'chiradi"
  on public.projects for delete
  using (auth.uid() = user_id);

-- updated_at avtomatik yangilanishi uchun
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
