import { useState } from 'react';
import { claim, unclaim } from '../store.js';

// Gestisce i tre casi: libero, preso da me (posso annullare), preso da qualcun altro.
export default function TakeButton({ item, onClaimed, big = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onClick() {
    setBusy(true);
    setError('');
    let err;
    try {
      err = item.takenByMe ? await unclaim(item.id) : await claim(item.id);
    } catch {
      err = 'Non ci sono riuscito, riprova.';
    }
    setBusy(false);
    if (err) setError(err);
    else if (!item.takenByMe && onClaimed) onClaimed(item);
  }

  const takenByOther = item.taken && !item.takenByMe;
  const label = busy ? '…' : item.takenByMe ? (big ? 'Preso da te ✓ (annulla)' : 'Preso da te ✓') : takenByOther ? 'Già preso' : 'Lo prendo io';

  const style = big
    ? { minHeight: 60, fontSize: 20, background: item.taken ? 'var(--ink)' : 'var(--accent)' }
    : undefined;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, alignItems: big ? 'stretch' : 'flex-end' }}>
      <button
        type="button"
        className={big ? 'btn btn-primary' : 'btn take'}
        style={style}
        aria-pressed={item.taken}
        disabled={busy || takenByOther}
        title={item.takenByMe ? 'Clicca per annullare' : undefined}
        aria-label={item.takenByMe ? 'Preso da te: clicca per annullare' : undefined}
        onClick={onClick}
      >
        {label}
      </button>
      {error && <span className="error" role="alert" style={{ fontSize: 13 }}>{error}</span>}
    </span>
  );
}
