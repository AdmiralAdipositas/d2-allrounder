// God Rolls aus der Community-Wunschliste (DIM voltron, täglich neu gebaut).
export let rolls = { items: {} };
export async function ladeRolls() {
  try { const r = await fetch('data/rolls.json', { cache: 'no-cache' }); if (r.ok) rolls = await r.json(); } catch {}
  return rolls;
}
export const empfehlung = (hash) => rolls.items?.[hash] || null;

// Bewertet eine Waffe: God Roll, wenn eine empfohlene Kombination komplett drauf ist; "good" ab drei empfohlenen Perks.
export function bewerte(hash, plugs) {
  const r = empfehlung(hash);
  if (!r) return '';
  const hat = new Set(plugs);
  const god = (liste) => (liste || []).some((k) => k.every((p) => hat.has(p)));
  const zahl = (liste) => (liste || []).filter((p) => hat.has(p)).length;
  if (god(r.ge)) return 'PvE god roll';
  if (god(r.gv)) return 'PvP god roll';
  const e = zahl(r.e), v = zahl(r.v);
  if (e >= 3 && e >= v) return 'PvE good roll';
  if (v >= 3) return 'PvP good roll';
  return '';
}
