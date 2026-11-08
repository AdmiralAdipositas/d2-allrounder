// Drop-Quellen: zuerst Bungies Sammlungs-Text, sonst DIMs Community-Daten (d2-additional-info).
let daten = { items: {} };
export async function ladeQuellen() {
  try { const r = await fetch('data/quellen.json', { cache: 'no-cache' }); if (r.ok) daten = await r.json(); } catch {}
}
// Liefert { text, von } oder null, wenn nichts bestätigt ist.
// Exotic-Class-Items (The Final Shape): Quelle fehlt in Bungies Daten und bei DIM.
export const KLASSEN_EXO = new Set(['Stoicism', 'Relativism', 'Solipsism']);
const KLASSEN_EXO_TEXT = 'Exotic mission “Dual Destiny” in the Pale Heart (The Final Shape), fireteam of exactly two. Your first one only comes from there; replays and the weekly challenge give more. Also: Pale Heart Overthrow chests and Xûr.';
export function quelle(hash, d) {
  const bungie = (d?.qu || '').replace(/^Source:\s*/i, '').trim();
  if (bungie) return { text: bungie, von: 'Bungie' };
  const dim = daten.items?.[hash];
  if (dim?.length) return { text: dim.join(' · '), von: 'DIM community data' };
  if (KLASSEN_EXO.has(d?.n)) return { text: KLASSEN_EXO_TEXT, von: 'Blueberries, 03/2025' };
  return null;
}
