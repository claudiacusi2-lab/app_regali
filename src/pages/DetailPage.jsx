import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Photo from '../components/Photo.jsx';
import ReminderForm from '../components/ReminderForm.jsx';
import TakeButton from '../components/TakeButton.jsx';
import { useStore, stars, priorityLabel, categoryLabel, formatPrice } from '../store.js';

export default function DetailPage({ id }) {
  const { items, loading } = useStore();
  const item = items.find((x) => x.id === id);
  const [askReminder, setAskReminder] = useState(false);

  if (loading) {
    return (
      <main className="page">
        <TopBar />
        <p className="empty">Carico…</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="page">
        <TopBar />
        <p className="empty">Questo desiderio non esiste più.</p>
        <a className="btn" href="#/" style={{ alignSelf: 'flex-start' }}>← Torna alla lista</a>
      </main>
    );
  }

  return (
    <main className="page">
      <TopBar>
        <a className="btn" href="#/">← Torna alla lista</a>
      </TopBar>

      <div className="detail">
        <div className="detail-media">
          <Photo item={item} taken={item.taken} />
        </div>

        <div className="detail-info">
          <div className="row">
            {item.category && <span className="prio">{categoryLabel(item.category)}</span>}
            <span className="prio">
              <span className="stars" aria-label={`${item.stars} su 5`}>{stars(item.stars)}</span> {priorityLabel(item.stars)}
            </span>
            {item.taken && <span className="prio" style={{ background: 'var(--accent)', color: '#fff' }}>Già preso</span>}
          </div>
          <h1>{item.title}</h1>
          <span className="price" style={{ fontSize: 24 }}>{formatPrice(item.price)}</span>

          {item.notes && (
            <section className="panel" style={{ boxShadow: 'none' }}>
              <h2 style={{ fontSize: 18 }}>Le mie note</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{item.notes}</p>
            </section>
          )}

          {item.shops?.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Dove prenderlo</h2>
              {item.shops.map((s, i) => (
                <div key={i} className="shop">
                  <span>{s.name || 'Negozio'}</span>
                  <a className="btn take" href={s.url} target="_blank" rel="noopener noreferrer">Vai al negozio ↗</a>
                </div>
              ))}
            </section>
          )}

          <TakeButton item={item} big onClaimed={() => setAskReminder(true)} />

          {askReminder && item.takenByMe && (
            <ReminderForm item={item} onDone={() => setAskReminder(false)} onSkip={() => setAskReminder(false)} />
          )}
        </div>
      </div>
    </main>
  );
}
