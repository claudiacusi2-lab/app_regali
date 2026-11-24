import { useState } from 'react';
import { REMINDER_OPTIONS } from '../config.js';
import { saveReminder, reminderAvailable } from '../store.js';

// Chiede l'email per un promemoria dopo "Lo prendo io".
export default function ReminderForm({ item, onDone, onSkip, showTitleChip = false }) {
  const options = REMINDER_OPTIONS.filter((o) => reminderAvailable(o.key));
  const [email, setEmail] = useState('');
  const [when, setWhen] = useState(options[0]?.key || 'week');
  const [customDate, setCustomDate] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const minDate = toISODate(new Date(Date.now() + 864e5));
  const maxDate = toISODate(new Date(Date.now() + 365 * 864e5));

  const whenText =
    when === 'custom'
      ? `il ${customDate ? new Date(`${customDate}T09:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}`
      : (REMINDER_OPTIONS.find((o) => o.key === when) || REMINDER_OPTIONS[0]).text;

  async function submit(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Controlla l’indirizzo email.');
      return;
    }
    if (when === 'custom' && !customDate) {
      setError('Scegli la data del promemoria.');
      return;
    }
    setBusy(true);
    const err = await saveReminder({ itemId: item.id, email, when, customDate });
    setBusy(false);
    if (err) setError(err);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="panel" role="status">
        <h2>Promemoria impostato ✓</h2>
        <p>Ti scriveremo {whenText}.</p>
        <button type="button" className="btn btn-dark" onClick={onDone}>Chiudi</button>
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit} aria-label="Promemoria via email">
      {showTitleChip && <span className="prio" style={{ background: 'var(--mint)' }}>Preso: {item.title}</span>}
      <h2>Grazie! Vuoi un promemoria via email?</h2>
      <p>Ti scriviamo per ricordarti di comprarlo in tempo. Usiamo la tua email solo per questo.</p>
      <div className="field">
        <label htmlFor={`rem-${item.id}`}>La tua email</label>
        <input
          id={`rem-${item.id}`}
          className="input"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
        />
        {error && <span className="error" role="alert">{error}</span>}
      </div>
      {options.length > 1 && (
        <div className="field">
          <span className="label">Quando te lo ricordo?</span>
          <div className="row">
            {options.map((o) => (
              <button key={o.key} type="button" className="chip" aria-pressed={when === o.key} onClick={() => { setWhen(o.key); setError(''); }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {when === 'custom' && (
        <div className="field">
          <label htmlFor={`rem-date-${item.id}`}>Data del promemoria</label>
          <input
            id={`rem-date-${item.id}`}
            className="input"
            type="date"
            min={minDate}
            max={maxDate}
            value={customDate}
            onChange={(e) => { setCustomDate(e.target.value); setError(''); }}
          />
          <span className="hint">Ti scriviamo quel giorno alle 9 del mattino.</span>
        </div>
      )}
      <div className="row">
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
          {busy ? 'Salvo…' : 'Ricordamelo'}
        </button>
        <button type="button" className="btn" style={{ minHeight: 52, borderRadius: 14 }} onClick={onSkip}>No, grazie</button>
      </div>
    </form>
  );
}
