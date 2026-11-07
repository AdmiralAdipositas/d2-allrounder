// Waffen- und Set-Empfehlungen für einen Build: passende Exotic-Waffe (nach Perk-Text und Element),
// 2–3 Legendaries pro Slot (Element, Community-God-Roll, Besitz) und das passendste Rüstungsset.
import { defs } from './defs.js';
import { empfehlung } from './rolls.js';

const SCHADEN = { Kinetic: 1, Arc: 2, Solar: 3, Void: 4, Stasis: 6, Strand: 7 };
const SLOT = { kinetic: 1498876634, energy: 2465295065, power: 953998645 };
const STOP = new Set('with that this when your from have will after into their they them grants damage final blows weapon weapons targets target nearby enemies while more also each'.split(' '));
const worte = (t) => new Set((t || '').toLowerCase().match(/[a-z]{4,}/g)?.filter((w) => !STOP.has(w)) || []);

let cache = null;
function waffen() {
  if (cache) return cache;
  const nachName = new Map();
  for (const [h, d] of Object.entries(defs.items)) {
    if (d.t !== 3 || ![5, 6].includes(d.q) || !d.i) continue;
    const r = empfehlung(h);
    const alt = nachName.get(d.n);
    const punkte = (r?.ge?.length || 0) + (r?.e?.length ? 1 : 0);
    if (!alt || punkte > alt.punkte || (punkte === alt.punkte && Number(h) > alt.hash)) nachName.set(d.n, { ...d, hash: Number(h), punkte });
  }
  cache = [...nachName.values()];
  return cache;
}

export function empfehle(build, besitz, element) {
  const text = [build.warum, build.subclass, ...(build.faehigkeiten || []), ...(build.aspekte || []), ...(build.fragmente || []), ...(build.waffen || [])].join(' ');
  const w = worte(text);
  const el = SCHADEN[element] || 0;
  const typWunsch = (build.waffen || []).map((x) => x.replace(/^Any /, '').toLowerCase());
  const exoName = build.exoWaffe || (build.exotics || []).find((n) => waffen().some((x) => x.n === n && x.q === 6));
  const passt = (d) => (el ? d.d0 === el : true);
  const typPflicht = build.waffeTyp || [];
  // Harte Regeln: verlangt die Rüstung einen Waffentyp oder Kinetic-Schaden, kommt nichts anderes in Frage.
  const erlaubt = (d) => (!typPflicht.length || typPflicht.includes(d.k)) && (!build.kinetisch || d.d0 === 1) && (d.d0 === 1 || passt(d));
  // Exotic-Waffe: im Build genannt, sonst die mit dem passendsten Perk-Text.
  let exotic = exoName ? waffen().find((x) => x.n === exoName) : null;
  if (!exotic) {
    const pool = waffen().filter((x) => x.q === 6);
    exotic = (pool.some(erlaubt) ? pool.filter(erlaubt) : pool.filter((x) => !typPflicht.length || typPflicht.includes(x.k))).map((x) => {
      let s = 0;
      for (const v of worte(`${x.xp || ''} ${x.xd || ''}`)) if (w.has(v)) s += 2;
      if (passt(x)) s += 4;
      if (besitz.has(x.n)) s += 1;
      return { ...x, s };
    }).sort((a, b) => b.s - a.s)[0];
  }
  const legendaries = {};
  for (const [slot, b] of Object.entries(SLOT)) {
    const liste = waffen().filter((x) => x.q === 5 && x.b === b && x.punkte > 0 && (!(build.kinetisch && slot === 'kinetic') || x.d0 === 1)).map((x) => {
      let s = Math.min(x.punkte, 4);
      if (slot === 'kinetic' ? (x.d0 === 1 || passt(x)) : passt(x)) s += 9;
      if (besitz.has(x.n)) s += 3;
      if (typWunsch.some((t) => x.k.toLowerCase() === t)) s += 14;
      return { ...x, s };
    }).sort((a, b2) => b2.s - a.s);
    const typen = new Set();
    legendaries[slot] = liste.filter((x) => (typen.has(x.k) ? false : typen.add(x.k))).slice(0, 3);
  }
  return { exotic, legendaries };
}

// Rüstungsset, dessen Boni am besten zum Build passen (nur Sets mit Teilen für diese Klasse).
export function setVorschlag(build, klasse) {
  const w = worte([build.warum, ...(build.faehigkeiten || []), ...(build.aspekte || []), ...(build.stats || [])].join(' '));
  const mitTeilen = new Set(Object.values(defs.items).filter((d) => d.t === 2 && d.e && (d.c === klasse || d.c === 3)).map((d) => d.e));
  return Object.entries(defs.sets || {}).filter(([h, s]) => mitTeilen.has(Number(h)) && s.p?.length).map(([h, s]) => {
    let p = 0;
    for (const perk of s.p) for (const v of worte(`${perk.n} ${perk.d}`)) if (w.has(v)) p += 1;
    return { set: s.n, p };
  }).filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 2)
    .map((x, i) => ({ set: x.set, rolle: i ? 'Alternative' : 'Best match', stuecke: i ? 2 : 4, grund: defs.sets[Object.keys(defs.sets).find((h) => defs.sets[h].n === x.set)].p.map((q) => `${q.c}-piece ${q.n}: ${q.d}`).join(' ') }));
}
