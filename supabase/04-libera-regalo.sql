-- Quando una prenotazione viene tolta (da chi l'aveva fatta con «annulla»,
-- oppure da te con «Libera» nell'area riservata), cancella anche i promemoria
-- di quel regalo: così a chi aveva prenotato non arriva più l'email, nemmeno
-- se poi lo stesso regalo lo prende un'altra persona.
-- Da eseguire una volta sola nel SQL Editor di Supabase.

create or replace function public.claims_cleanup_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.reminders where item_id = old.item_id;
  return old;
end;
$$;
revoke all on function public.claims_cleanup_reminders() from public, anon, authenticated;

drop trigger if exists claims_cleanup_reminders on public.claims;
create trigger claims_cleanup_reminders
  after delete on public.claims
  for each row execute function public.claims_cleanup_reminders();

-- Pulizia una tantum: promemoria rimasti per regali che non sono più prenotati.
delete from public.reminders r
 where not exists (select 1 from public.claims c where c.item_id = r.item_id);
