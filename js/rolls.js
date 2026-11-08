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

// Wie nah ist dieser Roll am Wunsch-Roll? Bestes Wunsch-Paket je Modus: x von y Perks sitzen schon.
export function rollWert(hash, plugs) {
  const r = empfehlung(hash); if (!r) return null;
  const hat = new Set(plugs);
  const best = (liste) => (liste || []).reduce((b, k) => { const n = k.filter((p) => hat.has(p)).length; return n / k.length > b.hat / (b.von || 1) ? { hat: n, von: k.length } : b; }, { hat: 0, von: (liste || [])[0]?.length || 0 });
  return { pve: r.ge?.length ? best(r.ge) : null, pvp: r.gv?.length ? best(r.gv) : null };
}
export const rollBalken = (w) => !w ? '' : `<div class="rollbalken">${[['pve', 'PvE'], ['pvp', 'PvP']].filter(([k]) => w[k]?.von).map(([k, n]) => `<span class="rb ${k} ${w[k].hat === w[k].von ? 'voll' : ''}" title="${w[k].hat} of ${w[k].von} wished ${n} perks on this roll"><small>${n}</small><i>${Array.from({ length: w[k].von }, (_, j) => `<b class="${j < w[k].hat ? 'an' : ''}"></b>`).join('')}</i><em>${w[k].hat}/${w[k].von}</em></span>`).join('')}</div>`;
