-- Da eseguire DOPO aver creato il tuo utente in Authentication → Users → Add user.
-- Sostituisci l'indirizzo con la tua email (quella dell'utente appena creato), poi Run.
insert into public.admins (user_id)
select id from auth.users where email = 'LA-TUA-EMAIL@esempio.it'
on conflict do nothing;

-- Controllo: deve comparire una riga con la tua email.
select u.email from public.admins a join auth.users u on u.id = a.user_id;
