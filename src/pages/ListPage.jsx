import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Photo from '../components/Photo.jsx';
import ReminderForm from '../components/ReminderForm.jsx';
import { FILTERS, OWNER_NAME, SITE_TITLE } from '../config.js';
import TakeButton from '../components/TakeButton.jsx';
import { useStore, stars, priorityLabel, formatPrice } from '../store.js';

export default function ListPage() {
  const { items, loading, error } = useStore();
  const [filter, setFilter] = useState('tutti');
  const [asking, setAsking] = useState(null); // item per cui chiedere il promemoria
  const [copied, setCopied] = useState(false);

  const active = FILTERS.find((f) => f.key === filter);
  const shown = items
    .filter(active.test)
    .slice()
    .sort((a, b) => Number(a.taken) - Number(b.taken) || b.stars - a.stars);

  async function share() {
    const url = window.location.href.split('#')[0];
    try {
      if (navigator.share) await navigator.share({ title: 'La mia wishlist', url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* l'utente ha annullato */
    }
  }

  return (
    <main className="page">
      <TopBar>
        <button type="button" className="btn btn-dark" onClick={share}>{copied ? 'Link copiato ✓' : 'Condividi la lista'}</button>
      </TopBar>

      <section className="hero">
        <h1>{SITE_TITLE}</h1>
        <div className="intro">
          <div className="avatar" aria-hidden="true">★</div>
          <p>
            Ehi, ciao! Sono <strong>{OWNER_NAME}</strong>. Qui ci sono le cose che mi renderebbero felice: ho fatto questo
            sito per chi non sa cosa regalarmi. Ovviamente ogni regalo è gradito, basta il pensiero!
            <br />
            Se ne scegli una, premi <strong>«Lo prendo io»</strong>: così gli altri sapranno che ci hai già pensato tu.
          </p>
        </div>
      </section>

      <nav className="filters" aria-label="Filtri">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </nav>

      {loading && <p className="empty">Carico la lista…</p>}
      {error && <p className="empty error" role="alert">{error}</p>}
      {!loading && !error && shown.length === 0 && (
        <p className="empty">{items.length === 0 ? 'La lista è ancora vuota: torna presto!' : 'Nessun desiderio in questa categoria, per ora.'}</p>
      )}

      <div className="grid">
        {shown.map((item) => (
          <article key={item.id} className="card">
            {item.taken && <span className="sticker">Già preso!</span>}
            <a href={`#/regalo/${encodeURIComponent(item.id)}`} tabIndex={-1} aria-hidden="true">
              <Photo item={item} taken={item.taken} />
            </a>
            <span className="prio">
              <span className="stars" aria-label={`${item.stars} su 5`}>{stars(item.stars)}</span> {priorityLabel(item.stars)}
            </span>
            <h2><a href={`#/regalo/${encodeURIComponent(item.id)}`}>{item.title}</a></h2>
            <div className="card-foot">
              <span className="price">{formatPrice(item.price)}</span>
              <TakeButton item={item} onClaimed={setAsking} />
            </div>
          </article>
        ))}
      </div>

      {asking && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Promemoria via email" onClick={(e) => e.target === e.currentTarget && setAsking(null)}>
          <ReminderForm item={asking} showTitleChip onDone={() => setAsking(null)} onSkip={() => setAsking(null)} />
        </div>
      )}

      <footer className="foot">
        <a href="#/admin">🔒 Area riservata</a>
      </footer>
    </main>
  );
}
