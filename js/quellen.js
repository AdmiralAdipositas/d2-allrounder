// Drop-Quellen: zuerst Bungies Sammlungs-Text, sonst DIMs Community-Daten (d2-additional-info).
let daten = { items: {} };
export async function ladeQuellen() {
  try { const r = await fetch('data/quellen.json', { cache: 'no-cache' }); if (r.ok) daten = await r.json(); } catch {}
}
// Liefert { text, von } oder null, wenn nichts bestätigt ist.
export function quelle(hash, d) {
  const bungie = (d?.qu || '').replace(/^Source:\s*/i, '').trim();
  if (bungie) return { text: bungie, von: 'Bungie' };
  const dim = daten.items?.[hash];
  if (dim?.length) return { text: dim.join(' · '), von: 'DIM community data' };
  return null;
}
