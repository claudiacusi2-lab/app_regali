-- PROVA dei promemoria.
-- Prima, sul sito (meglio in una finestra in incognito), premi «Lo prendo io» su un regalo
-- e chiedi un promemoria con l'email a cui vuoi mandarlo (va bene qualunque indirizzo:
-- il dominio è verificato su Resend).
-- Poi esegui questa query: rende il promemoria "scaduto" adesso.
update public.reminders
   set send_at = now() - interval '1 minute', sent_at = null
 where email = 'EMAIL-DELLA-PROVA@esempio.it';

-- Infine apri Edge Functions → send-reminders → Test (o aspetta il prossimo cambio d'ora).
-- Controllo: dopo l'invio, sent_at deve avere una data.
select email, when_key, send_at, sent_at from public.reminders order by created_at desc limit 5;
