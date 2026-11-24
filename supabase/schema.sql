-- =====================================================================
-- Wishlist: tabelle e regole di sicurezza.
-- Da incollare in Supabase → SQL Editor → New query → Run (una volta sola).
-- =====================================================================

-- 1) DESIDERI ----------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  price numeric(10, 2) check (price is null or price >= 0),
  category text not null default 'altro',
  stars int not null default 3 check (stars between 1 and 5),
  notes text not null default '' check (char_length(notes) <= 2000),
  image text not null default '',
  shops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 2) CHI È L'AMMINISTRATRICE --------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 3) "LO PRENDO IO" ----------------------------------------------------
-- Una riga per ogni regalo preso. Il token resta nel browser di chi l'ha preso,
-- così solo quella persona può annullare.
create table if not exists public.claims (
  item_id uuid primary key references public.items (id) on delete cascade,
  token uuid not null,
  created_at timestamptz not null default now()
);

-- 4) PROMEMORIA EMAIL ----------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  when_key text not null check (when_key in ('week', 'custom', 'd1')),
  send_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- SICUREZZA (Row Level Security)
-- =====================================================================
alter table public.items enable row level security;
alter table public.admins enable row level security;
alter table public.claims enable row level security;
alter table public.reminders enable row level security;

-- Desideri: tutti li leggono, solo l'admin li crea/modifica/cancella.
drop policy if exists "items_read" on public.items;
create policy "items_read" on public.items for select using (true);
drop policy if exists "items_insert" on public.items;
create policy "items_insert" on public.items for insert to authenticated with check (public.is_admin());
drop policy if exists "items_update" on public.items;
create policy "items_update" on public.items for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "items_delete" on public.items;
create policy "items_delete" on public.items for delete to authenticated using (public.is_admin());

-- Admin: puoi vedere solo la tua riga (serve al sito per sapere se sei admin).
drop policy if exists "admins_self" on public.admins;
create policy "admins_self" on public.admins for select to authenticated using (user_id = auth.uid());

-- Regali presi: tutti vedono QUALI sono presi (non il token); chiunque può prenderne uno libero.
revoke all on public.claims from anon, authenticated;
grant select (item_id, created_at) on public.claims to anon, authenticated;
grant insert (item_id, token) on public.claims to anon, authenticated;
grant delete on public.claims to authenticated;
drop policy if exists "claims_read" on public.claims;
create policy "claims_read" on public.claims for select using (true);
drop policy if exists "claims_insert" on public.claims;
create policy "claims_insert" on public.claims for insert with check (true);
drop policy if exists "claims_admin_delete" on public.claims;
create policy "claims_admin_delete" on public.claims for delete to authenticated using (public.is_admin());

-- Annullare "Lo prendo io": solo con il token giusto.
create or replace function public.unclaim(p_item uuid, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.claims where item_id = p_item and token = p_token;
  return found;
end;
$$;
revoke all on function public.unclaim(uuid, uuid) from public;
grant execute on function public.unclaim(uuid, uuid) to anon, authenticated;

-- Promemoria: chiunque può lasciarne uno, nessuno li può leggere dal sito
-- (le email restano private; le leggerà solo la funzione che invia i promemoria).
revoke all on public.reminders from anon, authenticated;
grant insert (item_id, email, when_key, send_at) on public.reminders to anon, authenticated;
drop policy if exists "reminders_insert" on public.reminders;
create policy "reminders_insert" on public.reminders for insert
  with check (send_at > now() - interval '1 day' and send_at < now() + interval '400 days');

-- =====================================================================
-- FOTO (Storage): cartella pubblica "photos", solo l'admin carica.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos_insert" on storage.objects;
create policy "photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_admin());
drop policy if exists "photos_update" on storage.objects;
create policy "photos_update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.is_admin());
drop policy if exists "photos_delete" on storage.objects;
create policy "photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());
