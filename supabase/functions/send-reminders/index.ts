// Edge Function "send-reminders": invia i promemoria arrivati a scadenza tramite Resend.
// Viene chiamata ogni ora da pg_cron (vedi supabase/02-email-reminders.sql).
//
// Segreti da impostare in Supabase → Edge Functions → Secrets:
//   RESEND_API_KEY  la chiave API di Resend (re_…)            [obbligatorio]
//   FROM_EMAIL      mittente, es. "Wishlist <ciao@tuodominio.it>"  [facoltativo]
//   SITE_URL        indirizzo pubblico del sito, es. https://…   [facoltativo]
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono già disponibili automaticamente.
//
// È sicuro che chiunque la chiami: invia solo i promemoria già scaduti e non ancora inviati.

import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Wishlist <onboarding@resend.dev>';
const SITE_URL = (Deno.env.get('SITE_URL') || '').replace(/\/+$/, '');

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function buildEmail(title: string, itemId: string) {
  const link = SITE_URL ? `${SITE_URL}/#/regalo/${encodeURIComponent(itemId)}` : '';
  const safeTitle = escapeHtml(title);
  const html = `
  <div style="font-family: Arial, sans-serif; background:#E6DCFF; padding:24px">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border:3px solid #111111; border-radius:18px; padding:24px">
      <p style="margin:0 0 8px; font-weight:bold">★ wishlist</p>
      <h1 style="margin:0 0 12px; font-size:24px; color:#111111">Ti ricordi del regalo?</h1>
      <p style="margin:0 0 16px; font-size:16px; line-height:1.5; color:#111111">
        Avevi detto «Lo prendo io» per <strong>${safeTitle}</strong>. Ecco il promemoria che avevi chiesto!
      </p>
      ${link ? `<p style="margin:0 0 16px"><a href="${link}" style="display:inline-block; background:#5B2FC9; color:#ffffff; text-decoration:none; font-weight:bold; padding:12px 18px; border-radius:12px">Vedi il regalo e dove comprarlo</a></p>` : ''}
      <p style="margin:0; font-size:13px; color:#444444">Hai ricevuto questa email perché hai chiesto un promemoria sulla wishlist. Non riceverai altre email.</p>
    </div>
  </div>`;
  const text = `Ti ricordi del regalo? Avevi detto «Lo prendo io» per "${title}".${link ? `\nVedi il regalo: ${link}` : ''}`;
  return { subject: `Promemoria regalo: ${title}`, html, text };
}

Deno.serve(async () => {
  if (!RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY mancante' }, { status: 500 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: due, error } = await supabase.rpc('take_due_reminders', { p_limit: 50 });
  if (error) {
    console.error('take_due_reminders', error);
    return Response.json({ error: 'database' }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  for (const r of due ?? []) {
    const { subject, html, text } = buildEmail(r.item_title, r.item_id);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [r.email], subject, html, text }),
    });
    if (res.ok) {
      sent++;
    } else {
      failed++;
      console.error('resend', res.status, await res.text());
      await supabase.rpc('release_reminder', { p_id: r.id });
    }
  }

  return Response.json({ sent, failed });
});
