// God Rolls aus der Community-Wunschliste (DIM voltron, täglich neu gebaut).
// Verglichen wird nach Perk-NAMEN, nicht nach Hash: verbesserte ("Enhanced") Perks haben einen anderen Hash,
// sind aber derselbe Perk – sonst stünde bei hergestellten/Tier-5-Waffen fälschlich 0/4.
import { defs } from './defs.js';

export let rolls = { items: {} };
let nachName = null;
export async function ladeRolls() {
  try { const r = await fetch('data/rolls.json', { cache: 'no-cache' }); if (r.ok) rolls = await r.json(); } catch {}
  nachName = null;
  return rolls;
}
const basis = (n) => String(n || '').replace(/\s*\((Adept|Timelost|Harrowed|Brave)\)\s*$/i, '').trim();
// Empfehlung für eine Waffe; Adept/Timelost & Co. fallen auf die Liste der Grundwaffe zurück (gleiche Perks).
export const empfehlung = (hash) => {
  const r = rolls.items?.[hash]; if (r) return r;
  const d = defs?.items?.[hash]; if (!d || d.t !== 3) return null;
  if (!nachName) { nachName = new Map(); for (const [h, e] of Object.entries(rolls.items || {})) { const n = basis(defs.items[h]?.n); if (n && !nachName.has(n)) nachName.set(n, e); } }
  return nachName.get(basis(d.n)) || null;
};
const nm = (h) => defs?.items?.[h]?.n || String(h);
const namen = (liste) => new Set((liste || []).map(nm));

// Markierung für einen einzelnen Perk dieser Waffe: PvE-Wunsch, PvP-Wunsch, Teil des God Rolls.
export function perkMarke(hash) {
  const r = empfehlung(hash); if (!r) return () => ({ e: false, v: false, g: false, ge: false, gv: false });
  const e = namen(r.e), v = namen(r.v), ge = namen(r.ge?.[0] || []), gv = namen(r.gv?.[0] || []);
  return (plug) => { const n = nm(plug); return { e: e.has(n), v: v.has(n), ge: ge.has(n), gv: gv.has(n), g: ge.has(n) || gv.has(n) }; };
}

// Bewertet eine Waffe: God Roll, wenn eine empfohlene Kombination komplett drauf ist; "good" ab drei empfohlenen Perks.
export function bewerte(hash, plugs) {
  const r = empfehlung(hash);
  if (!r) return '';
  const hat = namen(plugs);
  const god = (liste) => (liste || []).some((k) => k.every((p) => hat.has(nm(p))));
  const zahl = (liste) => [...namen(liste)].filter((n) => hat.has(n)).length;
  if (god(r.ge)) return 'PvE god roll';
  if (god(r.gv)) return 'PvP god roll';
  const e = zahl(r.e), v = zahl(r.v);
  if (e >= 3 && e >= v) return 'PvE good roll';
  if (v >= 3) return 'PvP good roll';
  return '';
}

// Wie nah ist dieser Roll am Wunsch-Roll? Bestes Wunsch-Paket je Modus.
//   hat  = so viele Wunsch-Perks sind gerade AKTIV
//   kann = so viele wären drin, wenn du die wählbaren Perks in den Spalten umstellst (moeglich = alle wählbaren Plugs)
export function rollWert(hash, plugs, moeglich) {
  const r = empfehlung(hash); if (!r) return null;
  const hat = namen(plugs), kann = moeglich ? namen([...plugs, ...moeglich]) : hat;
  const best = (liste) => {
    if (!liste?.length) return null;
    let b = { hat: -1, kann: -1, von: liste[0].length };
    for (const k of liste) { const n = k.filter((p) => hat.has(nm(p))).length, m = k.filter((p) => kann.has(nm(p))).length; if (m / k.length > b.kann / b.von || (m / k.length === b.kann / b.von && n > b.hat)) b = { hat: n, kann: m, von: k.length }; }
    return b;
  };
  return { pve: best(r.ge), pvp: best(r.gv) };
}
const RB_TIPP = (n, w) => `${n} wish roll: ${w.hat} of ${w.von} perks of the community's best ${n} roll are active on this copy${w.kann > w.hat ? ` – ${w.kann} of ${w.von} are possible if you switch perks in its columns` : ''}${w.hat === w.von ? ' – complete god roll' : ''}.`;
export const rollBalken = (w) => !w ? '' : `<div class="rollbalken">${[['pve', 'PvE'], ['pvp', 'PvP']].filter(([k]) => w[k]?.von).map(([k, n]) => `<span class="rb ${k} ${w[k].hat === w[k].von ? 'voll' : ''}" data-tip="${RB_TIPP(n, w[k])}"><small>${n} roll</small><i>${Array.from({ length: w[k].von }, (_, j) => `<b class="${j < w[k].hat ? 'an' : j < w[k].kann ? 'kann' : ''}"></b>`).join('')}</i><em>${w[k].hat}/${w[k].von}${w[k].kann > w[k].hat ? `<small> · up to ${w[k].kann}</small>` : ''}</em></span>`).join('')}</div>`;
