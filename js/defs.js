import { EXO_CHAMP } from './exochamp.js';
// Kompakte Spieldaten (von der GitHub Action gebaut) und Regeln, die Bungie nicht mitliefert.
export let defs = null;
export async function ladeDefs() {
  const r = await fetch('data/defs.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Game data is not built yet. It appears after the first publish.');
  defs = await r.json();
  return defs;
}

// Anti-Champion seit "Monument of Triumph": fester Effekt je Frame. Bungie-Angaben haben Vorrang.
const FRAME = [
  [/^Aggressive/, 'Stagger'], [/^High-Impact/, 'Stagger'], [/^Heavy Burst/, 'Stagger'], [/^Wave Sword/, 'Stagger'], [/^Rocket-Assisted/, 'Stagger'],
  [/^Precision Frame/, 'Shield Piercing'], [/^Adaptive/, 'Shield Piercing'], [/^Caster Frame/, 'Shield Piercing'],
  [/^Lightweight/, 'Disruption'], [/^Rapid-Fire/, 'Disruption'], [/^Area Denial/, 'Disruption'], [/^Vortex Frame/, 'Disruption'], [/Heat Weapon$/, 'Disruption'],
];
export const CHAMP_NAME = { 'Shield Piercing': 'Barrier', Disruption: 'Overload', Stagger: 'Unstoppable' };
export function champion(hash, plugs, breakerInstanz) {
  const nach = (n) => Object.values(defs.breaker).find((b) => b.n === n);
  const d = defs.items[hash];
  if (!d || d.t !== 3) return null;
  const art = breakerInstanz || d.br;
  if (art && defs.breaker[art]) return { ...defs.breaker[art], quelle: 'Bungie' };
  // Exotics: fest zugewiesen (Ergo Sum folgt seinem Schwert-Frame, siehe unten).
  const exo = d.q === 6 && d.n !== 'Ergo Sum' ? EXO_CHAMP[d.n.toUpperCase()] : null;
  if (exo) return { ...nach({ B: 'Shield Piercing', O: 'Disruption', U: 'Stagger' }[exo]), quelle: 'Exotic' };
  for (const p of plugs) {
    const m = (defs.items[p]?.d || '').match(/\[(Shield-Piercing|Disruption|Stagger)\]/);
    if (m) return { ...nach(m[1] === 'Shield-Piercing' ? 'Shield Piercing' : m[1]), quelle: defs.items[p].n };
  }
  if (d.k === 'Sidearm') return { ...nach('Stagger'), quelle: 'Sidearm' };
  for (const p of plugs) {
    const n = defs.items[p]?.n || '';
    const r = FRAME.find(([m]) => m.test(n));
    if (r) return { ...nach(r[1]), quelle: n };
  }
  return null;
}
