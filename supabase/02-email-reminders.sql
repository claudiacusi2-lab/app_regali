-- =====================================================================
-- Promemoria via email: da eseguire UNA volta nel SQL Editor (nuova query → Run),
-- DOPO aver creato la Edge Function "send-reminders".
-- =====================================================================

-- 1) Il promemoria ora può essere "tra una settimana", "data scelta" o "il giorno prima della festa".
alter table public.reminders drop constraint if exists reminders_when_key_check;
alter table public.reminders
  add constraint reminders_when_key_check check (when_key in ('week', 'custom', 'd1'));

-- 2) Prende i promemoria da inviare e li segna come "inviati" in un colpo solo
--    (così due invii contemporanei non mandano la stessa email due volte).
--    Salta i regali per cui "Lo prendo io" è stato annullato.
create or replace function public.take_due_reminders(p_limit int default 50)
returns table (id uuid, email text, item_id uuid, item_title text)
language sql
security definer
set search_path = public
as $$
  with due as (
    select r.id
    from public.reminders r
    where r.sent_at is null
      and r.send_at <= now()
      and exists (select 1 from public.claims c where c.item_id = r.item_id)
    order by r.send_at
    limit p_limit
    for update skip locked
  )
  update public.reminders r
     set sent_at = now()
    from due, public.items i
   where r.id = due.id
     and i.id = r.item_id
  returning r.id, r.email, r.item_id, i.title;
$$;

-- Se l'invio fallisce, rimette il promemoria in coda.
create or replace function public.release_reminder(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reminders set sent_at = null where id = p_id;
$$;

-- Solo la funzione server (service_role) può usarle, non il sito.
revoke all on function public.take_due_reminders(int) from public, anon, authenticated;
revoke all on function public.release_reminder(uuid) from public, anon, authenticated;
grant execute on function public.take_due_reminders(int) to service_role;
grant execute on function public.release_reminder(uuid) to service_role;

-- 3) Ogni ora (al minuto 0) chiama la funzione che invia le email.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('send-reminders')
where exists (select 1 from cron.job where jobname = 'send-reminders');

select cron.schedule(
  'send-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://czcvljauununjwnbkwrh.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Controllo: deve comparire una riga "send-reminders".
select jobname, schedule from cron.job;
