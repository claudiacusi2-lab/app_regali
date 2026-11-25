import { useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { colorFor } from '../components/Photo.jsx';
import { CATEGORIES, PRIORITY_LABELS } from '../config.js';
import { useStore, addItem, updateItem, removeItem, freeItem, uploadPhoto, stars, categoryLabel, formatPrice } from '../store.js';
import { useAdminSession, signIn, signOut } from '../auth.js';

const EMPTY = { title: '', price: '', category: 'altro', stars: 3, notes: '', image: '', shops: [{ name: '', url: '' }] };

// Riduce la foto (lato lungo max 1200px) e la converte in JPG.
function resizeImage(file, max = 1200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('bad image'))), 'image/jpeg', 0.82);
    };
    img.src = url;
  });
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  }

  return (
    <form className="panel" style={{ maxWidth: 440 }} onSubmit={submit} aria-label="Accedi all'area riservata">
      <h1 style={{ margin: 0, fontSize: 30 }}>Area riservata</h1>
      <p>Entra per aggiungere e modificare i tuoi desideri.</p>
      <div className="field">
        <label htmlFor="l-email">Email</label>
        <input id="l-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="l-pass">Password</label>
        <input id="l-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Entro…' : 'Entra'}</button>
    </form>
  );
}

function Editor() {
  const { items } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [preview, setPreview] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [surprise, setSurprise] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const formRef = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setShop = (i, patch) => set({ shops: form.shops.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview('');
    setPhotoBlob(null);
    set({ image: '' });
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await resizeImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setPhotoBlob(blob);
      setPreview(URL.createObjectURL(blob));
      setError('');
    } catch {
      setError('Non riesco a leggere questa foto. Prova con un JPG o PNG.');
    }
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    clearPhoto();
  }

  function startEdit(item) {
    reset();
    setEditingId(item.id);
    setForm({ ...EMPTY, ...item, price: item.price ?? '', shops: item.shops?.length ? item.shops : [{ name: '', url: '' }] });
    setMessage('');
    setError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Dai un nome al desiderio.');
      return;
    }
    setBusy(true);
    setError('');
    let image = form.image.trim();
    if (photoBlob) {
      const up = await uploadPhoto(photoBlob);
      if (up.error) {
        setBusy(false);
        setError(up.error);
        return;
      }
      image = up.url;
    }
    const data = {
      title: form.title.trim(),
      price: form.price === '' ? null : Number(form.price),
      category: form.category,
      stars: form.stars,
      notes: form.notes.trim(),
      image,
      shops: form.shops.filter((s) => s.url.trim()).map((s) => ({ name: s.name.trim(), url: s.url.trim() })),
    };
    const err = editingId ? await updateItem(editingId, data) : await addItem(data);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setMessage(editingId ? 'Modifiche salvate ✓' : `«${data.title}» aggiunto alla lista ✓`);
    reset();
  }

  async function remove(item) {
    if (!window.confirm(`Eliminare «${item.title}» dalla lista?`)) return;
    const err = await removeItem(item.id);
    if (err) setError(err);
    else if (editingId === item.id) reset();
  }

  async function free(item) {
    if (!window.confirm(`Togliere la prenotazione di «${item.title}»?\nTornerà libero e chi l'aveva preso non riceverà più il promemoria.`)) return;
    setError('');
    const err = await freeItem(item.id);
    if (err) setError(err);
  }

  const shownImage = preview || form.image;

  return (
    <div className="admin">
      <form ref={formRef} className="panel admin-form" onSubmit={submit} aria-label={editingId ? 'Modifica desiderio' : 'Aggiungi un desiderio'}>
        <h1 style={{ margin: 0, fontSize: 30, letterSpacing: '-0.02em' }}>{editingId ? 'Modifica desiderio' : 'Aggiungi un desiderio'}</h1>

        <div className="field">
          <label htmlFor="f-title">Nome</label>
          <input id="f-title" className="input" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Es. Giradischi" />
        </div>

        <div className="field">
          <span className="label">Dove si compra</span>
          {form.shops.map((s, i) => (
            <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="input" style={{ flex: '0 0 34%' }} aria-label={`Nome negozio ${i + 1}`} placeholder="Negozio" value={s.name} onChange={(e) => setShop(i, { name: e.target.value })} />
              <input className="input" type="url" aria-label={`Link negozio ${i + 1}`} placeholder="https://…" value={s.url} onChange={(e) => setShop(i, { url: e.target.value })} />
              {form.shops.length > 1 && (
                <button type="button" className="btn btn-icon" aria-label={`Rimuovi negozio ${i + 1}`} onClick={() => set({ shops: form.shops.filter((_, j) => j !== i) })}>×</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost" style={{ border: 0, alignSelf: 'flex-start', textDecoration: 'underline', padding: 0 }} onClick={() => set({ shops: [...form.shops, { name: '', url: '' }] })}>
            + Aggiungi un altro negozio
          </button>
        </div>

        <div className="field">
          <span className="label">Foto</span>
          <label className="dropzone" htmlFor="f-photo">
            {shownImage ? <img src={shownImage} alt="Anteprima" /> : 'Clicca per scegliere una foto (o scattala dal telefono)'}
          </label>
          <input ref={fileRef} id="f-photo" type="file" accept="image/*" onChange={onPhoto} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
          {!photoBlob && (
            <input className="input" type="url" aria-label="Oppure link a un'immagine" placeholder="…oppure incolla il link di un'immagine" value={form.image} onChange={(e) => set({ image: e.target.value })} />
          )}
          {shownImage && (
            <button type="button" className="btn btn-ghost" style={{ border: 0, alignSelf: 'flex-start', textDecoration: 'underline', padding: 0 }} onClick={clearPhoto}>
              Togli la foto
            </button>
          )}
        </div>

        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <div className="field" style={{ width: 130, flex: 'none' }}>
            <label htmlFor="f-price">Prezzo (€)</label>
            <input id="f-price" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="0" />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 0 }}>
            <label htmlFor="f-cat">Categoria</label>
            <select id="f-cat" className="input" value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="label">Quanto lo vuoi?</span>
          <div className="star-picker" role="radiogroup" aria-label="Priorità da 1 a 5 stelle">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" role="radio" aria-checked={form.stars === v} aria-label={v === 1 ? '1 stella' : `${v} stelle`} onClick={() => set({ stars: v })}>
                {v <= form.stars ? '★' : '☆'}
              </button>
            ))}
            <span style={{ marginLeft: 8, fontWeight: 700 }}>{form.stars}/5 · {PRIORITY_LABELS[form.stars]}</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-notes">Note per chi regala</label>
          <textarea id="f-notes" className="input" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Taglia, colore, va bene anche usato…" />
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {message && <p role="status" style={{ fontWeight: 700 }}>{message}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Salvo…' : editingId ? 'Salva le modifiche' : 'Aggiungi alla lista'}
        </button>
        {editingId && <button type="button" className="btn" onClick={reset}>Annulla</button>}
      </form>

      <section className="admin-list" aria-label="I tuoi desideri">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 30, letterSpacing: '-0.02em' }}>I tuoi desideri ({items.length})</h2>
          <button type="button" className="chip" aria-pressed={surprise} onClick={() => setSurprise(!surprise)}>
            Modalità sorpresa: {surprise ? 'attiva' : 'spenta'}
          </button>
        </div>
        <p style={{ margin: 0 }}>
          {surprise ? 'Non vedi cosa è già stato preso, così non ti rovini la sorpresa.' : 'Vedi quali regali sono già stati presi.'}
        </p>

        {items.length === 0 && <p className="empty">La lista è vuota: aggiungi il tuo primo desiderio.</p>}

        {items.map((item) => (
          <div key={item.id} className="admin-row">
            <div className="thumb" style={{ background: colorFor(item.id) }}>{item.image && <img src={item.image} alt="" />}</div>
            <div className="meta">
              <strong>{item.title}</strong>
              <span>
                {categoryLabel(item.category)} · <span style={{ color: 'var(--accent)' }}>{stars(item.stars)}</span> · {formatPrice(item.price)}
              </span>
            </div>
            <span className="status" style={{ background: surprise ? 'var(--ground)' : item.taken ? 'var(--pink)' : 'var(--mint)' }}>
              {surprise ? 'Segreto' : item.taken ? 'Già preso' : 'Libero'}
            </span>
            {!surprise && item.taken && (
              <button type="button" className="btn" onClick={() => free(item)} aria-label={`Libera ${item.title}`}>Libera</button>
            )}
            <button type="button" className="btn" onClick={() => startEdit(item)}>Modifica</button>
            <button type="button" className="btn btn-icon" aria-label={`Elimina ${item.title}`} onClick={() => remove(item)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" />
              </svg>
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AdminPage() {
  const { loading, session, isAdmin } = useAdminSession();

  return (
    <main className="page">
      <TopBar>
        <span className="badge-dark">Area riservata</span>
        <a className="btn" href="#/">Vedi la lista ↗</a>
        {session && <button type="button" className="btn btn-ghost" onClick={signOut}>Esci</button>}
      </TopBar>

      {loading && <p className="empty">Carico…</p>}
      {!loading && !session && <LoginForm />}
      {!loading && session && !isAdmin && (
        <div className="panel" style={{ maxWidth: 520 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Accesso non autorizzato</h1>
          <p>Questo account non è amministratore della lista. Se sei tu, esegui lo script <code>supabase/make-me-admin.sql</code> nel SQL Editor di Supabase.</p>
        </div>
      )}
      {!loading && session && isAdmin && <Editor />}
    </main>
  );
}
