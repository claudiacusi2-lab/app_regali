// Archivio dei desideri, collegato a Supabase.
// Tutte le letture/scritture passano da qui: le pagine non parlano mai direttamente col database.
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase.js';
import { CATEGORIES, PRIORITY_LABELS } from './config.js';

const MY_CLAIMS_KEY = 'wishlist.myclaims.v1'; // item_id -> token, solo in questo browser

// ---------------------------------------------------------------- stato condiviso
let state = { items: [], loading: true, error: '' };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const setState = (patch) => {
  state = { ...state, ...patch };
  emit();
};

// Codice casuale univoco. crypto.randomUUID esiste solo su https: su http usiamo getRandomValues.
function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function readMyClaims() {
  try {
    return JSON.parse(localStorage.getItem(MY_CLAIMS_KEY)) || {};
  } catch {
    return {};
  }
}
function writeMyClaims(map) {
  try {
    localStorage.setItem(MY_CLAIMS_KEY, JSON.stringify(map));
  } catch {
    /* navigazione privata: pazienza, non si potrà annullare */
  }
}

function fromRow(row, takenIds, mine) {
  return {
    id: row.id,
    title: row.title,
    price: row.price == null ? null : Number(row.price),
    category: row.category,
    stars: row.stars,
    notes: row.notes || '',
    image: row.image || '',
    shops: Array.isArray(row.shops) ? row.shops : [],
    createdAt: row.created_at,
    taken: takenIds.has(row.id),
    takenByMe: Boolean(mine[row.id]),
  };
}

export async function refresh() {
  const [itemsRes, claimsRes] = await Promise.all([
    supabase.from('items').select('*').order('created_at', { ascending: false }),
    supabase.from('claims').select('item_id'),
  ]);
  if (itemsRes.error || claimsRes.error) {
    setState({ loading: false, error: 'Non riesco a caricare la lista. Riprova tra poco.' });
    return;
  }
  const takenIds = new Set(claimsRes.data.map((c) => c.item_id));
  const mine = readMyClaims();
  setState({ loading: false, error: '', items: itemsRes.data.map((r) => fromRow(r, takenIds, mine)) });
}

// Primo caricamento + aggiornamento quando torni sulla pagina e ogni minuto.
refresh();
if (typeof window !== 'undefined') {
  window.addEventListener('focus', refresh);
  setInterval(refresh, 60_000);
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore() {
  return useSyncExternalStore(subscribe, () => state);
}

export function useItems() {
  return useStore().items;
}

// ---------------------------------------------------------------- "Lo prendo io"
export async function claim(itemId) {
  const token = newId();
  const { error } = await supabase.from('claims').insert({ item_id: itemId, token });
  if (error) {
    await refresh();
    return error.code === '23505' ? 'Qualcuno l’ha appena preso!' : 'Non ci sono riuscito, riprova.';
  }
  writeMyClaims({ ...readMyClaims(), [itemId]: token });
  await refresh();
  return '';
}

export async function unclaim(itemId) {
  const mine = readMyClaims();
  const token = mine[itemId];
  if (!token) return 'Solo chi l’ha preso può annullare.';
  const { error } = await supabase.rpc('unclaim', { p_item: itemId, p_token: token });
  if (error) return 'Non ci sono riuscito, riprova.';
  delete mine[itemId];
  writeMyClaims(mine);
  await refresh();
  return '';
}

// ---------------------------------------------------------------- promemoria
// customDate: 'AAAA-MM-GG' scelto da chi regala (solo per when = 'custom').
// I promemoria partono alle 9 del mattino (ora di chi li imposta).
export function reminderDate(whenKey, customDate) {
  const now = new Date();
  if (whenKey === 'week') return new Date(now.getTime() + 7 * 864e5);
  if (whenKey === 'custom') return customDate ? new Date(`${customDate}T09:00:00`) : null;
  return null;
}

export function reminderAvailable(whenKey) {
  if (whenKey === 'custom') return true;
  return reminderDate(whenKey) > new Date();
}

export async function saveReminder({ itemId, email, when, customDate }) {
  const sendAt = reminderDate(when, customDate);
  if (!sendAt || Number.isNaN(sendAt.getTime()) || sendAt <= new Date()) return 'Scegli una data futura.';
  const { error } = await supabase.from('reminders').insert({
    item_id: itemId,
    email: email.trim(),
    when_key: when,
    send_at: sendAt.toISOString(),
  });
  return error ? 'Non sono riuscito a salvare il promemoria, riprova.' : '';
}

// ---------------------------------------------------------------- admin
export async function addItem(data) {
  const { error } = await supabase.from('items').insert(data);
  if (error) return 'Salvataggio non riuscito. Sei ancora collegata?';
  await refresh();
  return '';
}

export async function updateItem(id, data) {
  const { error } = await supabase.from('items').update(data).eq('id', id);
  if (error) return 'Salvataggio non riuscito. Sei ancora collegata?';
  await refresh();
  return '';
}

export async function removeItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) return 'Eliminazione non riuscita.';
  await refresh();
  return '';
}

// Toglie la prenotazione di qualunque persona (solo l'admin può farlo: lo controlla il database).
export async function freeItem(id) {
  const { data, error } = await supabase.from('claims').delete().eq('item_id', id).select('item_id');
  if (error || !data?.length) {
    await refresh();
    return 'Non sono riuscito a liberarlo. Sei ancora collegata?';
  }
  await refresh();
  return '';
}

export async function uploadPhoto(blob) {
  const path = `${newId()}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) return { url: '', error: 'Caricamento della foto non riuscito.' };
  return { url: supabase.storage.from('photos').getPublicUrl(path).data.publicUrl, error: '' };
}

// ---------------------------------------------------------------- helpers di visualizzazione
export const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
export const priorityLabel = (n) => PRIORITY_LABELS[n] || '';
export const categoryLabel = (key) => (CATEGORIES.find((c) => c.key === key) || {}).label || '';
export const formatPrice = (p) => (p == null || p === '' ? '—' : `€ ${Number(p).toLocaleString('it-IT')}`);
