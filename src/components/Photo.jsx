import { PASTELS } from '../config.js';

function colorFor(id = '') {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PASTELS[h % PASTELS.length];
}

export default function Photo({ item, taken = false, className = '' }) {
  return (
    <div className={`photo ${taken ? 'is-taken' : ''} ${className}`} style={{ background: colorFor(item.id) }}>
      {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span aria-hidden="true">Foto prodotto</span>}
    </div>
  );
}

export { colorFor };
