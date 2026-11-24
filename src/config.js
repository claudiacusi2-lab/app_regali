// Personalizza qui il sito.
export const OWNER_NAME = 'Claudia';
export const SITE_TITLE = 'Regalami qualcosa di bello.';
export const ACCENT = '#5B2FC9';

export const CATEGORIES = [
  { key: 'abbonamenti', label: 'Abbonamenti' },
  { key: 'cultura', label: 'Cultura' },
  { key: 'esperienze', label: 'Esperienze' },
  { key: 'importanti', label: 'Regali importanti' },
  { key: 'carine', label: 'Cose inutili ma carine' },
  { key: 'altro', label: 'Altro' },
];

export const FILTERS = [
  { key: 'tutti', label: 'Tutti', test: () => true },
  { key: 'u15', label: 'Sotto 15 €', test: (x) => x.price != null && x.price <= 15 },
  { key: 'u30', label: 'Sotto 30 €', test: (x) => x.price != null && x.price <= 30 },
  ...CATEGORIES.filter((c) => c.key !== 'altro').map((c) => ({
    key: c.key,
    label: c.label,
    test: (x) => x.category === c.key,
  })),
];

export const PRIORITY_LABELS = {
  5: 'Lo voglio tantissimo',
  4: 'Lo vorrei davvero',
  3: 'Mi piacerebbe',
  2: 'Carino',
  1: 'Se capita',
};

export const REMINDER_OPTIONS = [
  { key: 'week', label: 'Tra una settimana', text: 'tra una settimana' },
  { key: 'custom', label: 'Scegli tu la data', text: '' },
];

export const PASTELS = ['#FFC6E5', '#B9F0D2', '#C9D7FF', '#FFD3B0', '#FFF0A8'];
