// Wiki: sortiert nach Kategorien mit Seitennavigation, Detailseiten für Items, Sets, Raids/Dungeons und Orte,
// mögliche Perks je Waffe, Seals mit Schritt-Zählern und ein Farm-Planer mit Eingabe und Vorschlägen.
// Daten: Bungies Spieldaten (defs, Sammlungs-Quellen, Triumphe), data/loot.json (Loot je Begegnung, Quellen dort),
// data/perks.json (Perk-Pools aus Bungies Plug-Sets), data/sets.json (Farm-Orte), DIM-Community-Daten.
import { defs } from './defs.js';
import { sammle } from './vault.js';
import { CHALLENGES } from './challenges.js';
import { empfehlung } from './rolls.js';
import { quelle, KLASSEN_EXO } from './quellen.js';
import { anzeige, vergleiche, sprache } from './sprache.js';
import { guideId } from './guidelinks.js';
import { VOW, VOW_DE } from './symbole.js';
import * as bungie from './bungie.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock', 3: 'Any class' };
const SLOT = { 1498876634: 'Kinetic', 2465295065: 'Energy', 953998645: 'Power', 3448274439: 'Helmet', 3551918588: 'Arms', 14239492: 'Chest', 20886954: 'Legs', 1585787867: 'Class Item' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const norm = (s) => String(s || '').replace(/[’']/g, "'").toLowerCase();
const ORTE = ['EDZ', 'Cosmodrome', 'Nessus', 'Dreaming City', 'Moon', 'Europa', 'Throne World', 'Neomuna', 'Pale Heart', 'Kepler', 'Tangled Shore', 'Mars', 'Mercury', 'Titan', 'Io', 'Eternity', 'Tower'];
const KATEGORIEN = [
  ['exo', 'Exotics', '⭐'], ['waffe', 'Weapons', '🔫'], ['set', 'Armor sets', '🛡'], ['akt', 'Raids & dungeons', '⚔'],
  ['ort', 'Destinations', '🪐'], ['seal', 'Seals', '🎖'], ['chal', 'Raid challenges', '🏆'], ['quelle', 'Collections', '📚'], ['check', 'Checklists', '🥚'], ['farm', 'Farm planner', '🌾'],
];
// Begegnungen, die nicht in der Loot-Tabelle stehen (Challenge-Namen), ihrem Raid zuordnen.
const ENC_EXTRA = { Dissipation: "Salvation's Edge", 'The Abyss': "Crota's End", 'The Bridge': "Crota's End", 'Ir Yut': "Crota's End", Crota: "Crota's End", 'Taniks': 'Deep Stone Crypt', Evade: 'Garden of Salvation', Summon: 'Garden of Salvation', Gatekeeper: 'Vault of Glass' };

let ix = null;
let ansicht = { kat: null, seite: null, sub: 'alle', suche: '', farm: '', wf: {} };
// Zurück-Verlauf: vorherige Seite und Scrollhöhe, damit „←“ wieder an dieselbe Stelle führt.
const verlauf = [];
export function setzeWikiKat(kat) { ansicht = { ...ansicht, kat, seite: null, suche: '', check: null }; verlauf.length = 0; }
export function setzeWikiSuche(q, art) {
  if (art === 'farm') ansicht = { ...ansicht, kat: 'farm', seite: null, farm: q, suche: '' };
  else ansicht = { ...ansicht, kat: null, seite: null, suche: q };
}

// ---------- Daten ----------
async function json(u) { try { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch { return null; } }
let perkDaten = null;
const ladePerks = async () => (perkDaten ??= (await json('data/perks.json')) || { w: {} });
let stand = null;
async function ladeStand(zustand) {
  if (stand) return stand;
  stand = {};
  try {
    const k = zustand.konto;
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=900`);
    Object.assign(stand, r.profileRecords?.data?.records || {});
    for (const c of Object.values(r.characterRecords?.data || {})) for (const [h, v] of Object.entries(c.records || {})) if (!stand[h]) stand[h] = v;
  } catch {}
  return stand;
}
// Checklisten (Corrupted Eggs usw.): Fortschritt live vom Konto, Orte aus data/checklisten.json.
let checkStand = null, checkOrte = null;
async function ladeChecklisten(zustand, neu) {
  if (checkStand && !neu) return checkStand;
  checkOrte ??= (await json('data/checklisten.json')) || { e: {} };
  checkStand = { p: {}, c: {} };
  try {
    const k = zustand.konto;
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=104,202`);
    checkStand.p = r.profileProgression?.data?.checklists || {};
    checkStand.c = r.characterProgressions?.data || {};
  } catch { checkStand.fehler = true; }
  return checkStand;
}
// Hinweise je Bereich, wo man ihn erreicht (Corrupted Eggs).
const BEREICH_HINWEIS = {
  'The Shattered Throne': 'Dungeon The Shattered Throne',
  'Cimmerian Garrison': 'Ascendant Challenge (rotates weekly)', 'Shattered Ruins': 'Ascendant Challenge (rotates weekly)', 'Agonarch Abyss': 'Ascendant Challenge (rotates weekly)',
  'Keep of Honed Edges': 'Ascendant Challenge (rotates weekly)', 'Ouroborea': 'Ascendant Challenge (rotates weekly)', 'Forfeit Shrine': 'Ascendant Challenge (rotates weekly)',
};
async function zeigeChecklisten(x, zustand) {
  const st = await ladeChecklisten(zustand);
  let cid = null; try { cid = localStorage.getItem('d2a.charWahl'); } catch {}
  if (!st.c[cid]) cid = Object.keys(st.c)[0];
  const fort = (h, c) => (c.s === 1 ? st.c[cid]?.checklists?.[h] : st.p[h]) || {};
  const liste = Object.entries(defs.cl || {}).map(([h, c]) => { const f = fort(h, c); const done = c.e.filter((e) => f[e[0]]).length; return { h, c, done, n: c.e.length, bekannt: Object.keys(f).length > 0 }; });
  if (ansicht.check) {
    const it = liste.find((l) => l.h === ansicht.check);
    if (!it) { ansicht.check = null; return ''; }
    const f = fort(it.h, it.c);
    const nurOffen = ansicht.nurOffen !== false;
    const ort = (e) => { const o = checkOrte.e[e[0]]; return { ziel: e[2] || o?.[0] || '', bereich: e[3] || o?.[1] || '' }; };
    const gr = new Map();
    for (const e of it.c.e) { const o = ort(e); const key = [o.ziel, o.bereich].filter(Boolean).join(' · ') || 'Location unknown'; gr.set(key, [...(gr.get(key) || []), { e, ok: !!f[e[0]], o }]); }
    const gruppen = [...gr.entries()].filter(([, l]) => !nurOffen || l.some((y) => !y.ok));
    return `<button class="chip" data-checkzu>← Checklists</button>
      <div class="wseite-kopf">${it.c.i ? `<i class="wic gross" style="background-image:url(${BILD}${it.c.i})"></i>` : ''}<div><h2>${esc(it.c.n)}</h2><small>${it.bekannt ? `${it.done} of ${it.n} found · ${it.n - it.done} missing` : 'Progress could not be read'}</small></div></div>
      ${it.c.d ? `<p class="leer klein">${esc(it.c.d)}</p>` : ''}
      <div class="wsub"><button class="chip" data-nuroffen="1" aria-pressed="${nurOffen}">Only missing</button><button class="chip" data-nuroffen="0" aria-pressed="${!nurOffen}">All</button><button class="chip" data-checkneu>↻ Refresh</button></div>
      ${it.c.s === 1 ? '<p class="leer klein">This list counts per character (the one selected on the Guardians page).</p>' : ''}
      ${gruppen.length ? gruppen.map(([t, l]) => `<section class="wabs"><h3>${esc(t)} <small>${l.filter((y) => y.ok).length}/${l.length}</small></h3>${BEREICH_HINWEIS[l[0].o.bereich] ? `<p class="leer klein">${esc(BEREICH_HINWEIS[l[0].o.bereich])}</p>` : ''}<div class="checkliste">${l.filter((y) => !nurOffen || !y.ok).map((y) => `<div class="checkpunkt ${y.ok ? 'ok' : ''}"><span>${y.ok ? '✓' : '○'}</span><b>${esc(y.e[1])}</b>${y.e[4] ? `<small>${esc(y.e[4])}</small>` : ''}</div>`).join('')}</div></section>`).join('') : '<p class="leer">All found. 🎉</p>'}
      <p class="wm">Areas: ${esc(checkOrte.quelle || '')} The exact spot inside an area isn't in Bungie's data; search the number (e.g. “Egg #23”) in a guide.</p>`;
  }
  return `<p class="leer klein">Hidden collectibles the game doesn't track visibly. Progress is read live from your account${st.fehler ? ' (failed right now, try ↻ later)' : ''}.</p>
    <div class="wgrid breit">${liste.sort((a, b) => (a.done === a.n) - (b.done === b.n) || vergleiche(a.c.n, b.c.n)).map((l) => `<button class="wkachel" data-check="${l.h}">${l.c.i ? `<i class="wic" style="background-image:url(${BILD}${l.c.i})"></i>` : '<span class="wemo">🥚</span>'}<span><b>${esc(l.c.n)}</b><small>${l.bekannt ? `${l.done}/${l.n}${l.done === l.n ? ' · complete' : ` · ${l.n - l.done} missing`}` : `${l.n} entries`}</small><span class="sealbar"><i style="width:${l.bekannt ? Math.round((l.done / l.n) * 100) : 0}%"></i></span></span></button>`).join('')}</div>`;
}
let sektoren = null;
async function ladeSektoren(zustand) {
  if (sektoren) return sektoren;
  sektoren = [];
  try {
    const k = zustand.konto;
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=204`);
    const gesehen = new Set();
    for (const c of Object.values(r.characterActivities?.data || {})) for (const a of c.availableActivities || []) {
      const d = defs.akt?.[a.activityHash];
      if (d?.g !== 'Lost Sectors') continue;
      const n = d.n.split(':')[0].replace(/\s*\(.*\)$/, '').trim();
      if (!gesehen.has(n)) { gesehen.add(n); sektoren.push({ n, o: d.o || '' }); }
    }
  } catch {}
  return sektoren;
}

function sourceGruppe(q, loot) {
  const t = norm(q);
  for (const [n, a] of Object.entries(loot)) if (t.includes(norm(n))) return a.art === 'Raid' ? 'Raids' : 'Dungeons';
  if (/raid/.test(t)) return 'Raids';
  if (/dungeon/.test(t)) return 'Dungeons';
  if (/crucible|trials|iron banner|osiris|shaxx|competitive/.test(t)) return 'Crucible & Trials';
  if (/gambit|drifter/.test(t)) return 'Gambit';
  if (/nightfall|vanguard|strike|zavala|portal|ops|grandmaster/.test(t)) return 'Portal & Vanguard';
  if (/season|episode|artifact|event|solstice|dawning|festival|guardian games|bright/.test(t)) return 'Seasons, episodes & events';
  if (/xûr|xur|banshee|ada-1|saint|vendor|eververse|monument/.test(t)) return 'Vendors';
  if (ORTE.some((o) => t.includes(o.toLowerCase())) || /campaign|lost sector|exotic mission|quest/.test(t)) return 'Destinations & quests';
  return 'Other';
}

async function baue(zustand) {
  if (ix) return ix;
  const [setsFarm, lootRoh] = await Promise.all([json('data/sets.json'), json('data/loot.json')]);
  const loot = lootRoh?.akt || {};
  const besitz = new Map();
  for (const x of zustand.alleItems || sammle(zustand.profil)) besitz.set(x.d.n, (besitz.get(x.d.n) || 0) + 1);
  // Pro Name nur ein Eintrag: bevorzugt die Version mit Quelle (Sammlungen) und Perk-Pool.
  const proName = new Map();
  for (const [h, d] of Object.entries(defs.items)) {
    if (![2, 3].includes(d.t) || !d.i || d.q < 5) continue;
    const q = quelle(h, d);
    const wert = (q ? 2 : 0) + (d.qu ? 1 : 0);
    const alt = proName.get(`${d.t}:${d.n}:${d.c}`);
    if (!alt || wert > alt.wert || (wert === alt.wert && Number(h) > Number(alt.h))) proName.set(`${d.t}:${d.n}:${d.c}`, { h, d, q: q?.text || '', von: q?.von || '', wert });
  }
  const alle = [...proName.values()];
  // Loot-Fundorte: Name → [{ akt, enc }]
  const fundorte = new Map();
  for (const [akt, a] of Object.entries(loot)) {
    for (const [enc, waffen] of a.enc) for (const w of waffen) if (!/^any /.test(w)) fundorte.set(w, [...(fundorte.get(w) || []), { akt, enc }]);
    for (const w of a.pool || []) if (!fundorte.has(w)) fundorte.set(w, [{ akt, enc: 'any encounter' }]);
  }
  const exos = alle.filter((x) => x.d.q === 6);
  const waffen = alle.filter((x) => x.d.t === 3 && x.d.q === 5 && (x.q || fundorte.has(x.d.n)));
  // Sets mit ihren Teilen und Fundort.
  const sets = [];
  for (const [h, s] of Object.entries(defs.sets || {})) {
    if (!s.n) continue;
    const teile = alle.filter((x) => x.d.e === Number(h));
    if (!teile.length) continue;
    const farm = Object.entries(setsFarm?.sets || {}).find(([n]) => norm(s.n).includes(norm(n)) || norm(n).includes(norm(s.n)))?.[1];
    const quellen = [...new Set(teile.map((t) => t.q).filter(Boolean))];
    const akt = Object.keys(loot).find((n) => quellen.some((q) => norm(q).includes(norm(n))));
    sets.push({ h, s, teile, farm, quellen, akt, gruppe: akt ? (loot[akt].art === 'Raid' ? 'Raids' : 'Dungeons') : sourceGruppe(quellen[0] || farm?.ort || '', loot) });
  }
  const akts = Object.entries(loot).map(([n, a]) => {
    const def = Object.entries(defs.akt || {}).find(([, d]) => norm(d.n).startsWith(norm(n)));
    const set = sets.filter((x) => x.akt === n);
    return { n, a, icon: def?.[1].i && !/missing/.test(def[1].i) ? def[1].i : '', d: def?.[1].d || '', set };
  });
  const encRaid = (enc) => {
    for (const x of akts) if (x.a.enc.some(([e]) => norm(e).startsWith(norm(enc).split(/[ (]/)[0]))) return x.n;
    return Object.entries(ENC_EXTRA).find(([k]) => norm(enc).startsWith(norm(k)))?.[1] || 'Other';
  };
  const chals = Object.entries(CHALLENGES).map(([n, [enc, text]]) => ({ n, enc, text, raid: encRaid(enc) })).filter((c, i, l) => l.findIndex((y) => y.text === c.text && y.enc === c.enc) === i);
  ix = { loot, besitz, alle, exos, waffen, sets, akts, chals, fundorte, setsFarm: setsFarm?.sets || {} };
  return ix;
}

// ---------- Bausteine ----------
const ic = (h, d, gross = false) => `<i class="wic ${d.q === 6 ? 'exo' : ''} ${gross ? 'gross' : ''}" data-ih="${h}" style="background-image:url(${BILD}${d.i})"></i>`;
const kachel = (x, besitz) => `<button class="wkachel" data-seite="item:${x.h}">${ic(x.h, x.d)}<span><b>${esc(x.d.n)}</b><small>${esc([x.d.k, x.d.c !== 3 && x.d.t === 2 ? KLASSE[x.d.c] : ''].filter(Boolean).join(' · '))}</small></span>${besitz.get(x.d.n) ? '<em class="hat" title="In your inventory">✓</em>' : ''}</button>`;
const gruppiert = (liste, key, reihe) => {
  const g = new Map();
  for (const x of liste) { const k = key(x); g.set(k, [...(g.get(k) || []), x]); }
  const keys = [...g.keys()].sort((a, b) => (reihe ? reihe.indexOf(a) - reihe.indexOf(b) : 0) || vergleiche(a, b));
  return keys.map((k) => [k, g.get(k)]);
};
const abschnitt = (titel, n, inhalt, id = '') => `<section class="wabs" ${id ? `id="${id}"` : ''}><h3>${esc(titel)} <small>${n}</small></h3>${inhalt}</section>`;
const subnav = (werte, aktiv) => `<div class="wsub" role="tablist">${werte.map(([k, t]) => `<button class="chip" data-sub="${esc(k)}" aria-pressed="${k === aktiv}">${esc(t)}</button>`).join('')}</div>`;
const sprung = (abschnitte) => abschnitte.length > 3 ? `<nav class="wsprung">${abschnitte.map(([t]) => `<a href="#" data-zu="w-${esc(t.replace(/\W/g, ''))}">${esc(t)}</a>`).join('')}</nav>` : '';
const guideKnopf = (enc, raid, text = 'Guide ↗') => { const id = guideId(enc, raid); return id ? `<button class="chip guide-link" data-guide="${id}" title="Open this encounter in the raid guide">${text}</button>` : ''; };

// Filter für die Waffenliste: [Titel, Wert aus der Waffe, Anzeigename des Werts].
const ELEMENT = { 1: 'Kinetic', 2: 'Arc', 3: 'Solar', 4: 'Void', 6: 'Stasis', 7: 'Strand' };
const MUNI = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const WFILTER = {
  typ: ['Weapon type', (w) => w.d.k, (v) => v],
  frame: ['Frame', (w) => w.d.fr || '', (v) => v],
  el: ['Damage type', (w) => w.d.d0 || '', (v) => ELEMENT[v] || v],
  muni: ['Ammo', (w) => w.d.a || '', (v) => MUNI[v] || v],
  slot: ['Slot', (w) => SLOT[w.d.b] || '', (v) => v],
  hat: ['Owned', (w, besitz) => (besitz.get(w.d.n) ? 'ja' : 'nein'), (v) => (v === 'ja' ? 'In my inventory' : 'Not owned')],
};

// ---------- Kategorie-Ansichten ----------
function zeigeKat(k, x) {
  const { besitz } = x;
  if (k === 'exo') {
    const sub = ansicht.sub;
    const liste = x.exos.filter((e) => sub === 'alle' || (sub === 'waffen' ? e.d.t === 3 : e.d.t === 2 && String(e.d.c) === sub));
    const subs = [['alle', 'All'], ['waffen', 'Weapons'], ['0', 'Titan'], ['1', 'Hunter'], ['2', 'Warlock']];
    const gr = gruppiert(liste, (e) => (e.d.t === 3 ? `${SLOT[e.d.b] || 'Weapon'} weapons` : `${KLASSE[e.d.c]} · ${SLOT[e.d.b] || 'Armor'}`), [
      'Kinetic weapons', 'Energy weapons', 'Power weapons', ...['Titan', 'Hunter', 'Warlock', 'Any class'].flatMap((c) => ['Helmet', 'Arms', 'Chest', 'Legs', 'Class Item'].map((s) => `${c} · ${s}`))]);
    return `${subnav(subs, sub)}${sprung(gr)}${gr.map(([t, l]) => abschnitt(t, l.length, `<div class="wgrid">${l.sort((a, b) => vergleiche(a.d.n, b.d.n)).map((e) => kachel(e, besitz)).join('')}</div>`, `w-${t.replace(/\W/g, '')}`)).join('')}`;
  }
  if (k === 'waffe') {
    const sub = ansicht.sub === 'alle' ? 'quelle' : ansicht.sub;
    const wf = ansicht.wf || {};
    const passt = (w, ohne) => Object.entries(wf).every(([f, v]) => !v || f === ohne || String(WFILTER[f][1](w, besitz)) === v);
    const liste = x.waffen.filter((w) => passt(w));
    const gr = sub === 'typ' ? gruppiert(liste, (w) => w.d.k) : gruppiert(liste, (w) => sourceGruppe(w.q || x.fundorte.get(w.d.n)?.[0]?.akt || '', x.loot));
    const auswahl = Object.entries(WFILTER).map(([f, [titel, wert, name]]) => {
      const zaehl = new Map(); for (const w of x.waffen) if (passt(w, f)) { const v = wert(w, besitz); if (v !== '' && v != null) zaehl.set(String(v), (zaehl.get(String(v)) || 0) + 1); }
      if (!zaehl.size) return '';
      const opts = [...zaehl.entries()].sort((a, b) => vergleiche(name(a[0]), name(b[0])));
      return `<label class="wfilter"><span>${titel}</span><select data-wf="${f}"><option value="">All</option>${opts.map(([v, n]) => `<option value="${esc(v)}" ${wf[f] === v ? 'selected' : ''}>${esc(anzeige(name(v)))} (${n})</option>`).join('')}</select></label>`;
    }).join('');
    const aktiv = Object.values(wf).some(Boolean);
    return `${subnav([['quelle', 'By source'], ['typ', 'By weapon type']], sub)}<div class="wfilterzeile">${auswahl}${aktiv ? '<button class="chip" data-wfreset>Reset filters</button>' : ''}</div><p class="leer klein">${aktiv ? `${liste.length} of ${x.waffen.length} legendary weapons match.` : `${x.waffen.length} legendary weapons with a confirmed source.`} Hover an icon for details, click a weapon for perks and where it drops.</p>${liste.length ? '' : '<p class="leer">No weapon matches these filters.</p>'}${sprung(gr)}
      ${gr.map(([t, l]) => abschnitt(t, l.length, `<div class="wgrid">${l.sort((a, b) => vergleiche(a.d.n, b.d.n)).map((w) => kachel(w, besitz)).join('')}</div>`, `w-${t.replace(/\W/g, '')}`)).join('')}`;
  }
  if (k === 'set') {
    const gr = gruppiert(x.sets, (s) => s.gruppe, ['Raids', 'Dungeons', 'Portal & Vanguard', 'Destinations & quests', 'Crucible & Trials', 'Gambit', 'Seasons, episodes & events', 'Vendors', 'Other']);
    return `${sprung(gr)}${gr.map(([t, l]) => abschnitt(t, l.length, `<div class="wgrid breit">${l.sort((a, b) => vergleiche(a.s.n, b.s.n)).map((s) => `<button class="wkachel set" data-seite="set:${s.h}">${s.teile[0] ? ic(s.teile[0].h, s.teile[0].d) : ''}<span><b>${esc(s.s.n)}</b><small>${esc(s.s.p.map((p) => `${p.c}× ${p.n}`).join(' · '))}</small><small class="wq">${esc(s.akt || s.farm?.farm || s.quellen[0] || 'Source unknown')}</small></span></button>`).join('')}</div>`, `w-${t.replace(/\W/g, '')}`)).join('')}`;
  }
  if (k === 'akt') {
    const gr = gruppiert(x.akts, (a) => (a.a.art === 'Raid' ? 'Raids' : 'Dungeons'), ['Raids', 'Dungeons']);
    return gr.map(([t, l]) => abschnitt(t, l.length, `<div class="wgrid breit">${l.map((a) => `<button class="wkachel akt" data-seite="akt:${esc(a.n)}">${a.icon ? `<i class="wic" style="background-image:url(${BILD}${a.icon})"></i>` : ''}<span><b>${esc(a.n)}</b><small>${a.a.enc.length} encounter${a.a.enc.length === 1 ? '' : 's'}${a.a.exo ? ` · exotic: ${esc(a.a.exo[0])}` : ''}</small></span></button>`).join('')}</div>`)).join('');
  }
  if (k === 'ort') {
    const orte = ORTE.map((o) => {
      const re = new RegExp(`\\b${o}\\b`, 'i');
      return { o, w: x.waffen.filter((w) => re.test(w.q)), s: x.sets.filter((s) => re.test(s.farm?.ort || '') || re.test(s.farm?.farm || '') || s.quellen.some((q) => re.test(q))) };
    }).filter((z) => z.w.length || z.s.length);
    return `<div class="wgrid breit">${orte.map((z) => `<button class="wkachel" data-seite="ort:${esc(z.o)}"><span class="wemo">🪐</span><span><b>${esc(z.o)}</b><small>${z.s.length} armor set${z.s.length === 1 ? '' : 's'} · ${z.w.length} weapons</small></span></button>`).join('')}</div>`;
  }
  if (k === 'chal') {
    const gr = gruppiert(x.chals, (c) => c.raid);
    return `<p class="leer klein">Bungie only says “A challenge awaits…”, so these short texts come from community guides (kyberscorner.com). The weekly active challenge is in the side panel.</p>${gr.map(([t, l]) => abschnitt(t, l.length, l.map((c) => `<div class="wchal"><div><b>${esc(c.n)}</b><small>${esc(c.enc)}</small><p>${esc(c.text)}</p></div>${guideKnopf(c.enc, c.raid === 'Other' ? null : c.raid, 'Guide & cheat sheet ↗')}</div>`).join(''))).join('')}`;
  }
  if (k === 'quelle') {
    const proQ = gruppiert(x.waffen.filter((w) => w.q), (w) => w.q);
    const gr = gruppiert(proQ, ([q]) => sourceGruppe(q, x.loot), ['Raids', 'Dungeons', 'Portal & Vanguard', 'Destinations & quests', 'Crucible & Trials', 'Gambit', 'Seasons, episodes & events', 'Vendors', 'Other']);
    return `<p class="leer klein">Every legendary weapon, sorted by where Bungie says it comes from. Open a source to see its collection; ✓ = you own it.</p>${sprung(gr)}${gr.map(([t, l]) => abschnitt(t, l.length, l.map(([q, ws]) => `<details class="wquelle"><summary><b>${esc(q)}</b><small>${ws.filter((w) => besitz.get(w.d.n)).length} / ${ws.length} owned</small></summary><div class="wgrid">${ws.map((w) => kachel(w, besitz)).join('')}</div></details>`).join(''), `w-${t.replace(/\W/g, '')}`)).join('')}`;
  }
  return '';
}

// ---------- Seals ----------
async function zeigeSeals(x, zustand) {
  const st = await ladeStand(zustand);
  const fertig = (h) => { const r = st[h]; return Boolean(r) && (r.state & 4) === 0; };
  // Gleicher Titel kommt mehrfach vor (alte Saison-Versionen, Legacy). Eine Karte je Titel, Versionen darunter.
  const proTitel = new Map();
  for (const [h, sl] of Object.entries(defs.seal || {})) {
    const k = `${sl.t || sl.n}`;
    proTitel.set(k, [...(proTitel.get(k) || []), { h, ...sl }]);
  }
  const karten = [...proTitel].map(([titel, vs]) => {
    const alt = (v) => /legacy/i.test(v.pn || '') || /season (of|1\d|\d)/i.test(v.d);
    vs.sort((a, b) => alt(a) - alt(b) || b.k.filter(fertig).length - a.k.filter(fertig).length);
    return { titel, v: vs[0], andere: vs.slice(1), alt: alt(vs[0]) };
  });
  const schritt = (r) => {
    const s = st[r]; const rec = defs.rec?.[r]; if (!rec) return '';
    const obj = s?.objectives || s?.intervalObjectives || [];
    const ok = fertig(r);
    let zahl = '';
    if (obj.length === 1 && obj[0].completionValue > 1) zahl = `${Math.min(obj[0].progress || 0, obj[0].completionValue)}/${obj[0].completionValue}`;
    else if (obj.length > 1) zahl = `${obj.filter((o) => o.complete).length}/${obj.length}`;
    const anteil = obj.length === 1 ? Math.min(1, (obj[0].progress || 0) / (obj[0].completionValue || 1)) : obj.length ? obj.filter((o) => o.complete).length / obj.length : ok ? 1 : 0;
    return `<div class="sschritt ${ok ? 'ok' : ''}"><span class="sh">${ok ? '✓' : '○'}</span><div><b>${esc(rec.n)}</b>${rec.d ? `<small>${esc(rec.d)}</small>` : ''}${!ok && zahl ? `<div class="sbar2"><i style="width:${Math.round(anteil * 100)}%"></i></div>` : ''}</div>${zahl ? `<em>${ok ? '' : zahl}</em>` : ''}</div>`;
  };
  const karte = ({ titel, v, andere }) => {
    const done = v.k.filter(fertig).length;
    const da = fertig(v.c);
    const vergoldet = v.g && fertig(v.g);
    return `<details class="wseal ${da ? 'da' : ''}"><summary>${v.i ? `<i class="wic" style="background-image:url(${BILD}${v.i})"></i>` : ''}<span><b>${esc(titel)}</b><small>${esc(v.n !== titel ? v.n : 'Seal')}${da ? ' · title earned' : ''}${vergoldet ? ' · gilded this season' : ''}</small><span class="sealbar"><i style="width:${Math.round((done / v.k.length) * 100)}%"></i></span></span><em>${done}/${v.k.length}</em></summary>
      ${v.d ? `<p class="leer klein">${esc(v.d.split('\n')[0])}</p>` : ''}${v.k.map(schritt).join('')}
      ${andere.length ? `<p class="wm">Also exists as ${andere.length} older version${andere.length === 1 ? '' : 's'} (e.g. per season) – those are no longer earnable and are hidden here.</p>` : ''}</details>`;
  };
  const jetzt = karten.filter((k) => !k.alt), alt = karten.filter((k) => k.alt);
  return `<p class="leer klein">One card per title. Counters like 2/6 show the steps of a triumph, the bar fills as you go. Progress is read live from your account.</p>
    ${abschnitt('Current seals', jetzt.length, jetzt.sort((a, b) => a.titel.localeCompare(b.titel)).map(karte).join(''))}
    ${alt.length ? `<details class="wquelle"><summary><b>Legacy seals</b><small>${alt.length} · no longer earnable</small></summary>${alt.map(karte).join('')}</details>` : ''}`;
}

// ---------- Drop-Chance ----------
// Bungie veröffentlicht keine Prozentwerte. Gezeigt wird, was belegt ist: wie oft und aus wie vielen Teilen gewürfelt wird.
function dropChance(d, x) {
  const T = (en, de) => (sprache === 'de' ? de : en);
  const f = x.fundorte.get(d.n) || [];
  const zeilen = [];
  const a = f[0] && x.loot[f[0].akt];
  if (a && (d.t === 3 || d.t === 2)) {
    const enc = a.enc.find(([e]) => e === f[0].enc);
    const pool = enc ? enc[1].length : 0;
    const raid = a.art === 'Raid';
    if (d.q === 6) {
      zeilen.push(T(`${raid ? 'Raid' : 'Dungeon'} exotic: random drop at ${esc(f[0].enc)}. No published rate.`, `${raid ? 'Raid' : 'Dungeon'}-Exotic: Zufallsdrop bei ${esc(f[0].enc)}. Keine veröffentlichte Rate.`));
      zeilen.push(T('Your chance rises with the activity\'s “increased drop chance” triumphs and challenges (account-wide). Bungie confirmed bad-luck protection for Eyes of Tomorrow.', 'Deine Chance steigt mit den Triumphen und Challenges der Aktivität, die eine „erhöhte Drop-Chance“ geben (kontoweit). Bungie hat einen Pech-Schutz für Eyes of Tomorrow bestätigt.'));
      zeilen.push(raid ? T('One try per character per week; in the featured week every clear rolls.', 'Ein Versuch pro Charakter und Woche; in der Featured-Woche würfelt jeder Abschluss.') : T('Newer dungeons: one try per character per week; in the featured week every clear rolls.', 'Neuere Dungeons: ein Versuch pro Charakter und Woche; in der Featured-Woche würfelt jeder Abschluss.'));
    } else {
      const wo = f.length > 1 ? T('Each listed encounter', 'Jeder genannte Encounter') : esc(f[0].enc);
      if (pool > 1) zeilen.push(T(`${wo} rolls from ${pool} weapons${enc[2]?.length ? ' and its armor' : ''}, all equally likely as far as known: roughly <b>1 in ${pool}</b> per weapon drop.`, `${wo} würfelt aus ${pool} Waffen${enc[2]?.length ? ' und seiner Rüstung' : ''}, soweit bekannt gleich wahrscheinlich: etwa <b>1 zu ${pool}</b> pro Waffen-Drop.`));
      else if (pool === 1) zeilen.push(T('The only weapon in this encounter\'s pool: <b>it drops whenever a weapon drops</b> there.', 'Einzige Waffe im Pool dieses Encounters: <b>sie kommt, sobald dort eine Waffe droppt</b>.'));
      zeilen.push(raid ? T('Raids: loot once per encounter per character per week (3 characters = 3 tries), every clear in the featured week.', 'Raids: Beute einmal pro Encounter, Charakter und Woche (3 Charaktere = 3 Versuche), in der Featured-Woche bei jedem Abschluss.') : T('Dungeons: loot on every clear; checkpoints let you repeat one encounter.', 'Dungeons: Beute bei jedem Abschluss; mit Checkpoints wiederholst du einen Encounter.'));
    }
  } else if (d.q === 6 && d.t === 2) zeilen.push(T('Exotic armor: no published rate. Engrams and Lost Sector rewards roll among the exotics you can get.', 'Exotic-Rüstung: keine veröffentlichte Rate. Engramme und Lost-Sector-Belohnungen würfeln unter den Exotics, die du bekommen kannst.'));
  else zeilen.push(T('Bungie publishes no drop rate for this item.', 'Bungie veröffentlicht für dieses Item keine Drop-Rate.'));
  return `<div class="wchance"><b>${T('Drop chance', 'Drop-Chance')}</b>${zeilen.map((z) => `<p>${z}</p>`).join('')}<small>${T('Bungie doesn\'t publish drop percentages for Destiny 2. Numbers here are counted from the loot pool, not official rates.', 'Bungie veröffentlicht für Destiny 2 keine Drop-Prozente. Die Zahlen hier sind aus dem Loot-Pool gezählt, keine offiziellen Raten.')}</small></div>`;
}

// ---------- Detailseiten ----------
function woDropt(name, x) {
  const f = x.fundorte.get(name);
  if (!f) return '';
  return f.map(({ akt, enc }) => `<div class="wfund"><span>⚔</span><div><b>${esc(enc)}</b><small>${esc(akt)} · ${esc(x.loot[akt].art)}</small></div>${guideKnopf(enc, akt)}<button class="chip" data-seite="akt:${esc(akt)}">Loot table</button></div>`).join('');
}

async function seiteItem(h, x) {
  const d = defs.items[h];
  if (!d) return '<p class="leer">Not found.</p>';
  const q = quelle(h, d);
  const set = d.e ? defs.sets?.[d.e] : null;
  let perks = '';
  if (d.t === 3) {
    const pd = await ladePerks();
    const gleich = Object.entries(defs.items).filter(([, y]) => y.t === 3 && y.n === d.n).map(([hh]) => hh);
    const ph = gleich.find((hh) => pd.w[hh]) || h;
    const spalten = pd.w[ph] || [];
    const emp = d.q === 6 ? null : empfehlung(ph) || gleich.map(empfehlung).find(Boolean);
    const god = new Set([...(emp?.ge?.[0] || []), ...(emp?.gv?.[0] || [])]); // nur die Top-Kombination je Modus
    perks = spalten.length ? `<h3>Possible perks</h3><p class="leer klein">Every perk that can roll in each column (from Bungie's game data). <span class="legende"><span><i class="rt rt-pve"></i> PvE pick</span><span><i class="rt rt-pvp"></i> PvP pick</span><span><i class="rt rt-god"></i> god roll perk</span></span></p>
      <div class="wperks">${spalten.map((sp) => `<div class="wpcol"><small>${esc(defs.items[sp[0]]?.k || '')}</small>${sp.map((p) => { const pd2 = defs.items[p]; if (!pd2) return ''; const rt = emp ? `${emp.e?.includes(p) ? 'rt-pve' : ''} ${emp.v?.includes(p) ? 'rt-pvp' : ''} ${god.has(p) ? 'rt-god' : ''}` : ''; return `<div class="wperk" data-ih="${p}" data-ik tabindex="0"><i class="pl ${rt}" style="background-image:url(${BILD}${pd2.i})"></i><span>${esc(pd2.n)}</span></div>`; }).join('')}</div>`).join('')}</div>`
      : '<p class="leer klein">This weapon has fixed perks or no perk data yet.</p>';
  }
  // Waffen-Details: Element, Munition, Frame, Basis-Stats wie im Spiel, Flavor-Text.
  let details = '';
  if (d.t === 3) {
    const gleich = Object.entries(defs.items).filter(([, y]) => y.t === 3 && y.n === d.n).map(([, y]) => y);
    const ws = d.ws || gleich.find((y) => y.ws)?.ws || [];
    const fr = d.fr || gleich.find((y) => y.fr)?.fr;
    const fl = d.fl || gleich.find((y) => y.fl)?.fl;
    const ZAHL = new Set([4284893193, 3871231066, 2961396640, 447667954, 1931675084, 2715839340]);
    const zeile = ([sh, v]) => { const n = defs.stats?.[sh]?.n || ''; if (!n) return ''; return ZAHL.has(Number(sh)) ? `<div class="wstat zahl"><span>${esc(n)}</span><b>${v}</b></div>` : `<div class="wstat"><span>${esc(n)}</span><i><u style="width:${Math.min(100, v)}%"></u></i><b>${v}</b></div>`; };
    const merk = [[ 'Damage type', ELEMENT[d.d0] ], [ 'Ammo', MUNI[d.a] ], [ 'Slot', SLOT[d.b] ], [ d.q === 6 ? '' : 'Frame', d.q === 6 ? '' : fr ]].filter(([a, b]) => a && b);
    details = `<div class="wmerk">${merk.map(([a, b]) => `<span><small>${esc(a)}</small><b>${esc(b)}</b></span>`).join('')}</div>${fl ? `<p class="wflavor">${esc(fl)}</p>` : ''}
      ${ws.length ? `<h3>Base stats</h3><p class="leer klein">Without perks, mods or masterwork, as Bungie lists them.</p><div class="wstats">${ws.map(zeile).join('')}</div>` : ''}`;
  }
  const fund = woDropt(d.n, x);
  const chance = dropChance(d, x);
  const allgemein = d.q === 6 && d.t === 2 && !q ? '<p>Exotic armor: exotic engrams, Legend/Master Lost Sectors played solo (the exotic armor reward rotates), Xûr, or the Monument to Lost Lights in the Tower.</p>' : '';
  return `<div class="wseite-kopf">${ic(h, d, true)}<div><h2>${esc(d.n)}</h2><small>${esc([d.k, d.t === 2 ? KLASSE[d.c] : SLOT[d.b], d.q === 6 ? 'Exotic' : 'Legendary'].filter(Boolean).join(' · '))}</small>${x.besitz.get(d.n) ? `<small class="hat">✓ You own ${x.besitz.get(d.n)}</small>` : ''}</div></div>
    ${d.xd ? `<p class="tt"><b class="tgold">${esc(d.xp || 'Exotic perk')}</b> ${esc(d.xd)}</p>` : ''}
    ${details}
    <h3>Where it drops</h3>${fund}${q ? `<p class="wm">${esc(q.text)} <span>(${esc(q.von)})</span></p>` : ''}${allgemein}${!fund && !q && !allgemein ? '<p class="leer">No confirmed source.</p>' : ''}
    ${chance}
    <div class="wlinks"><button class="chip" data-farm="${esc(d.n)}">🌾 Farm plan</button><a class="chip" href="https://www.light.gg/db/items/${h}/" target="_blank" rel="noopener">light.gg ↗</a>${set ? `<button class="chip" data-seite="set:${d.e}">Set: ${esc(set.n)}</button>` : ''}</div>
    ${set ? `<h3>Set bonus</h3><div class="tset"><b>${esc(set.n)}</b>${set.p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>` : ''}${perks}`;
}

function seiteSet(h, x) {
  const s = x.sets.find((y) => String(y.h) === String(h));
  if (!s) return '<p class="leer">Not found.</p>';
  const a = s.akt ? x.loot[s.akt] : null;
  const proKlasse = gruppiert(s.teile, (t) => KLASSE[t.d.c]);
  return `<div class="wseite-kopf">${s.teile[0] ? ic(s.teile[0].h, s.teile[0].d, true) : ''}<div><h2>${esc(s.s.n)}</h2><small>Armor set · ${esc(s.gruppe)}</small></div></div>
    <div class="tset">${s.s.p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>
    <h3>Where it drops</h3>
    ${a ? `<p>${esc(s.akt)} – armor by encounter:</p>${a.enc.filter(([, , r]) => r.length).map(([enc, , r]) => `<div class="wfund"><span>🛡</span><div><b>${esc(enc)}</b><small>${esc(r.join(', '))}</small></div>${guideKnopf(enc, s.akt)}</div>`).join('')}` : ''}
    ${s.farm ? `<p><b>${esc(s.farm.farm)}</b>${s.farm.schnell ? ' · fast farm' : ''}</p>` : ''}${s.quellen.length ? `<p class="wm">${esc(s.quellen.join(' · '))}</p>` : ''}
    <div class="wlinks"><button class="chip" data-farm="${esc(s.s.n)}">🌾 Farm plan</button><a class="chip" href="https://www.light.gg/db/search/?q=${encodeURIComponent(s.s.n)}" target="_blank" rel="noopener">light.gg ↗</a></div>
    ${proKlasse.map(([k, l]) => abschnitt(k, l.length, `<div class="wgrid">${l.sort((p, q) => Object.keys(SLOT).indexOf(String(p.d.b)) - Object.keys(SLOT).indexOf(String(q.d.b))).map((t) => kachel(t, x.besitz)).join('')}</div>`)).join('')}`;
}

function seiteAkt(n, x) {
  const a = x.akts.find((y) => y.n === n);
  if (!a) return '<p class="leer">Not found.</p>';
  const waffeIc = (w) => { const y = x.alle.find((z) => z.d.t === 3 && z.d.n === w); return y ? `<button class="wmini" data-seite="item:${y.h}">${ic(y.h, y.d)}<span>${esc(w)}</span></button>` : `<span class="wmini"><span>${esc(w)}</span></span>`; };
  const chals = x.chals.filter((c) => c.raid === n);
  return `<div class="wseite-kopf">${a.icon ? `<i class="wic gross" style="background-image:url(${BILD}${a.icon})"></i>` : ''}<div><h2>${esc(n)}</h2><small>${esc(a.a.art)}${a.set.length ? ` · armor: ${esc(a.set.map((s) => s.s.n).join(', '))}` : ''}</small></div>${guideKnopf(n, n, 'Open raid guide ↗')}</div>
    ${n === 'Vow of the Disciple' ? '<div class="wlinks"><a href="#" class="chip an" data-zu="symbole">🔣 Symbols & callouts</a></div>' : ''}${a.d ? `<p class="leer">${esc(a.d)}</p>` : ''}${a.a.frei ? `<p class="wm">${esc(a.a.frei)}</p>` : ''}${a.a.alleText ? `<p class="wm">${esc(a.a.alleText)}</p>` : ''}
    ${a.a.exo ? `<div class="wfund exo"><span>⭐</span><div><b>${esc(a.a.exo[0])}</b><small>${esc(a.a.exo[1])}</small></div></div>` : ''}
    ${a.a.feats ? `<h3>Feats</h3><p class="leer klein">${esc(a.a.feats.text)} <a href="${a.a.feats.q}" target="_blank" rel="noopener">Source ↗</a></p><div class="wlinks">${a.a.feats.liste.map(([f, t]) => `<span class="chip" title="Triumph: ${esc(t)}">${esc(f)} <small>→ ${esc(t)}</small></span>`).join('')}</div>` : ''}
    <h3>Loot by encounter</h3>${a.a.enc.map(([enc, ws, r]) => `<div class="wenc"><div class="wenc-kopf"><b>${esc(enc)}</b>${guideKnopf(enc, n)}</div><div class="wenc-loot">${ws.map((w) => (/^any /.test(w) ? `<span class="wmini"><span>${esc(w)}</span></span>` : waffeIc(w))).join('')}</div>${r.length ? `<small>Armor: ${esc(r.join(', '))}</small>` : ''}
      ${chals.filter((c, i, l) => norm(enc).startsWith(norm(c.enc).split(/[ (]/)[0]) && l.findIndex((y) => y.text === c.text) === i).map((c) => `<p class="wchal-k">🏆 <b>${esc(c.n)}</b> – ${esc(c.text)}</p>`).join('')}</div>`).join('')}
    ${n === 'Vow of the Disciple' ? `<h3 id="symbole">Symbols & callouts</h3><p class="leer klein">27 glyphs, used in Acquisition, Caretaker and Exhibition. Call them by their English name; German helps in voice chat.</p>
      <figure class="symbild"><img src="https://www.destinypedia.com/images/e/e4/VotD_Glyphs.jpg" alt="All Vow of the Disciple glyphs" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').hidden=true"><figcaption>All glyphs in the raid <details class="qblase"><summary aria-label="Source">i</summary><div>In-game screenshot hosted on Destinypedia (fair-use screenshot, game imagery © Bungie). <a href="https://www.destinypedia.com/File:VotD_Glyphs.jpg" target="_blank" rel="noopener">Source ↗</a></div></details></figcaption></figure>
      <div class="symliste">${VOW.map((v) => `<span><b>${esc(v)}</b><small>${esc(VOW_DE[v])}</small></span>`).join('')}</div>` : ''}
    ${a.a.pool ? `<h3>Full pool</h3><div class="wenc-loot">${a.a.pool.map(waffeIc).join('')}</div>` : ''}
    <p class="wm">Loot table source: ${esc(a.a.q)} (checked ${esc('Nov 2026')}). Tell me if something changed in-game.</p>`;
}

function seiteOrt(o, x) {
  const re = new RegExp(`\\b${o}\\b`, 'i');
  const ws = x.waffen.filter((w) => re.test(w.q));
  const ss = x.sets.filter((s) => re.test(s.farm?.ort || '') || re.test(s.farm?.farm || '') || s.quellen.some((q) => re.test(q)));
  return `<div class="wseite-kopf"><span class="wemo gross">🪐</span><div><h2>${esc(o)}</h2><small>Destination</small></div></div>
    ${ss.length ? abschnitt('Armor sets', ss.length, ss.map((s) => `<button class="wkachel set" data-seite="set:${s.h}">${s.teile[0] ? ic(s.teile[0].h, s.teile[0].d) : ''}<span><b>${esc(s.s.n)}</b><small>${esc(s.farm?.farm || s.quellen[0] || '')}</small></span></button>`).join('')) : ''}
    ${ws.length ? abschnitt('Weapons', ws.length, `<div class="wgrid">${ws.map((w) => kachel(w, x.besitz)).join('')}</div>`) : ''}`;
}

// ---------- Farm-Planer ----------
function ziele(x) {
  return [...x.alle.filter((y) => y.d.t === 3 ? y.q || x.fundorte.has(y.d.n) : y.d.q === 6).map((y) => ({ n: y.d.n, typ: y.d.q === 6 ? 'Exotic' : y.d.k, h: y.h, d: y.d })),
    ...x.sets.map((s) => ({ n: s.s.n, typ: 'Armor set', set: s, d: s.teile[0]?.d, h: s.teile[0]?.h }))];
}
async function farmKarte(ziel, x, zustand, rotation) {
  const istSet = Boolean(ziel.set);
  const teile = [];
  const aktName = istSet ? ziel.set.akt : x.fundorte.get(ziel.n)?.[0]?.akt;
  const a = aktName ? x.loot[aktName] : null;
  const feat = rotation?.wochen?.find((w, i, l) => new Date(w.ab) <= new Date() && (!l[i + 1] || new Date(l[i + 1].ab) > new Date()));
  const featured = aktName && feat && [...feat.raids, ...feat.dungeons].some((n) => norm(n) === norm(aktName));
  if (a) {
    const encs = istSet ? a.enc.filter(([, , r]) => r.length) : a.enc.filter(([, ws]) => ws.includes(ziel.n));
    teile.push(`<div class="fschritt"><b>1 · Go to ${esc(aktName)}</b><p>${istSet ? 'Armor pieces drop at these encounters:' : `Drops at ${encs.length > 1 ? 'these encounters' : 'this encounter'}:`}</p>${(encs.length ? encs : a.enc).map(([enc, , r]) => `<div class="wfund"><span>⚔</span><div><b>${esc(enc)}</b>${istSet ? `<small>${esc(r.join(', '))}</small>` : ''}</div>${guideKnopf(enc, aktName)}</div>`).join('')}</div>`);
    teile.push(`<div class="fschritt"><b>2 · How often</b><p>${a.art === 'Raid'
      ? featured ? 'Featured raid this week: every clear can drop loot, so you can farm it.' : 'Each encounter drops loot once per character per week (three characters = three tries). Extra copies: Spoils of Conquest at the final chest.'
      : featured ? 'Featured dungeon this week: farm freely.' : 'Dungeon loot drops on every clear; checkpoints let you repeat a single encounter.'}${ziel.d?.q === 6 ? ' The exotic is a random drop from the final boss (dungeon exotics: one chance per character per week on newer dungeons).' : ''}</p></div>`);
  } else if (ziel.set?.farm) {
    teile.push(`<div class="fschritt"><b>1 · Where</b><p>${esc(ziel.set.farm.farm)}${ziel.set.farm.schnell ? ' · fast farm' : ''}</p></div>`);
  } else {
    const q = ziel.h ? quelle(ziel.h, ziel.d) : null;
    teile.push(`<div class="fschritt"><b>1 · Where</b><p>${q ? esc(q.text) : 'No confirmed source.'}</p></div>`);
    if (ziel.d?.q === 6 && ziel.d.t === 2 && !KLASSEN_EXO.has(ziel.d.n)) {
      const ls = await ladeSektoren(zustand);
      teile.push(`<div class="fschritt"><b>2 · Exotic armor</b><p>Play a Legend or Master Lost Sector solo; the exotic armor slot reward rotates. Also: exotic engrams, Xûr, Monument to Lost Lights.</p>${ls.length ? `<p>Lost Sectors open right now:</p><div class="wlinks">${ls.map((l) => `<span class="chip">${esc(l.n)}${l.o ? ` · ${esc(l.o)}` : ''}</span>`).join('')}</div>` : '<p class="wm">Today\'s Lost Sectors are shown here once Bungie lists them for your characters.</p>'}</div>`);
    }
  }
  return `<article class="farmkarte"><div class="wseite-kopf">${ziel.h && ziel.d ? ic(ziel.h, ziel.d, true) : ''}<div><h2>${esc(ziel.n)}</h2><small>${esc(ziel.typ)}${featured ? ' · <span class="gold">featured this week</span>' : ''}${x.besitz.get(ziel.n) ? ` · you own ${x.besitz.get(ziel.n)}` : ''}</small></div></div>${teile.join('')}
    <div class="wlinks">${istSet ? `<button class="chip" data-seite="set:${ziel.set.h}">Set in the wiki</button>` : ziel.h ? `<button class="chip" data-seite="item:${ziel.h}">In the wiki${ziel.d?.t === 3 ? ' · perks' : ''}</button>` : ''}${aktName ? `<button class="chip" data-seite="akt:${esc(aktName)}">Loot table ${esc(aktName)}</button>` : ''}</div></article>`;
}
let rotationCache;
async function zeigeFarm(x, zustand) {
  const rotation = rotationCache ??= await json('data/rotation.json');
  const liste = ziele(x);
  const z = ansicht.farm ? liste.find((y) => norm(y.n) === norm(ansicht.farm)) || liste.find((y) => norm(y.n).includes(norm(ansicht.farm))) : null;
  // Ideen: was dir für Community-Builds deiner Klassen fehlt.
  let ideen = '';
  try {
    const builds = (await json('data/builds.json'))?.builds || [];
    const klassen = new Set(Object.values(zustand.profil.characters?.data || {}).map((c) => c.classType));
    const fehlt = [...new Set(builds.filter((b) => klassen.has(b.klasse ?? 2)).flatMap((b) => b.exotics))].filter((e) => !x.besitz.has(e)).slice(0, 12);
    if (fehlt.length) ideen = `<h3>Ideas: exotics from popular builds you don't have</h3><div class="wlinks">${fehlt.map((e) => `<button class="chip" data-farm="${esc(e)}">${esc(e)}</button>`).join('')}</div>`;
  } catch {}
  return `<div class="farmsuche"><input id="farmIn" type="search" autocomplete="off" placeholder="What do you want to farm? e.g. Fatebringer, Kentarch 3, Gjallarhorn…" value="${esc(ansicht.farm)}"><div id="farmVor" class="vorschlag" hidden></div></div>
    ${z ? await farmKarte(z, x, zustand, rotation) : ansicht.farm ? '<p class="leer">Nothing found. Try another name.</p>' : '<p class="leer klein">Type a weapon, exotic or armor set. You get the exact encounter, how often it drops, whether it is featured this week, and jump links to the guide and the wiki.</p>'}
    ${ideen}`;
}

// ---------- Suche ----------
function sucheAlle(x, text) {
  const w = norm(text).split(/\s+/).filter((t) => t && !['where', 'does', 'drop', 'the', 'get', 'how', 'to', 'from'].includes(t));
  if (!w.length) return [];
  const kand = [
    ...x.exos.map((e) => ({ t: e.d.n, art: 'Exotic', seite: `item:${e.h}`, h: e.h, d: e.d, extra: `${e.d.k} ${e.d.xp || ''}` })),
    ...x.waffen.map((e) => ({ t: e.d.n, art: e.d.k, seite: `item:${e.h}`, h: e.h, d: e.d, extra: e.q })),
    ...x.sets.map((s) => ({ t: s.s.n, art: 'Armor set', seite: `set:${s.h}`, h: s.teile[0]?.h, d: s.teile[0]?.d, extra: `${s.akt || ''} ${s.farm?.ort || ''}` })),
    ...x.akts.map((a) => ({ t: a.n, art: a.a.art, seite: `akt:${a.n}`, extra: a.a.enc.map((e) => e[0]).join(' ') })),
    ...ORTE.map((o) => ({ t: o, art: 'Destination', seite: `ort:${o}`, extra: 'planet' })),
    ...x.chals.map((c) => ({ t: c.n, art: 'Raid challenge', seite: null, kat: 'chal', extra: `${c.enc} ${c.raid}` })),
  ];
  return kand.map((k) => { const de = norm(anzeige(k.t)); const tt = de !== norm(k.t) && w.every((v) => de.includes(v)) ? de : norm(k.t); const g = `${norm(k.t)} ${de} ${norm(k.extra)}`; if (!w.every((v) => g.includes(v))) return null; return { k, s: w.reduce((a, v) => a + (tt.startsWith(v) ? 4 : tt.includes(v) ? 3 : 1), 0) + (tt === norm(text) ? 10 : 0) }; })
    .filter(Boolean).sort((a, b) => b.s - a.s).map((y) => y.k);
}
const treffer = (k) => `<button class="wkachel" ${k.seite ? `data-seite="${esc(k.seite)}"` : `data-kat="${k.kat}"`}>${k.h && k.d ? ic(k.h, k.d) : '<span class="wemo">📄</span>'}<span><b>${esc(k.t)}</b><small>${esc(k.art)}</small></span></button>`;

// ---------- Rahmen ----------
export async function zeigeWiki(el, zustand) {
  el.innerHTML = '<h1>Wiki</h1><p class="leer">Building the index…</p>';
  const x = await baue(zustand);
  el.innerHTML = `<div class="kopf"><h1>Wiki</h1><div class="wsuchbox"><input id="wsuche" type="search" autocomplete="off" placeholder="Search weapons, exotics, sets, raids, planets…" value="${esc(ansicht.suche)}"><div id="wVor" class="vorschlag" hidden></div></div></div>
    <div class="wlayout"><nav class="wnav" aria-label="Wiki sections"><button data-kat="" class="${!ansicht.kat && !ansicht.suche ? 'an' : ''}"><span>🏠</span>Start</button>${KATEGORIEN.map(([k, n, e]) => `<button data-kat="${k}" class="${ansicht.kat === k ? 'an' : ''}"><span>${e}</span>${n}</button>`).join('')}</nav><div id="wInhalt" class="winhalt"></div></div>`;
  const box = el.querySelector('#wInhalt');
  const zeichne = async () => {
    el.querySelectorAll('.wnav button').forEach((b) => b.classList.toggle('an', (b.dataset.kat || null) === (ansicht.kat || null) && !ansicht.suche));
    let html = '';
    if (ansicht.seite) {
      const [art, ...r] = ansicht.seite.split(':'); const key = r.join(':');
      const vorher = verlauf[verlauf.length - 1]?.seite;
      const zurueck = `<button class="chip" data-zurueck>← ${vorher ? 'Back' : esc(KATEGORIEN.find((k) => k[0] === ansicht.kat)?.[1] || (ansicht.suche ? 'Results' : 'Start'))}</button>`;
      html = zurueck + (art === 'item' ? await seiteItem(key, x) : art === 'set' ? seiteSet(key, x) : art === 'akt' ? seiteAkt(key, x) : seiteOrt(key, x));
    } else if (ansicht.suche) {
      const t = sucheAlle(x, ansicht.suche);
      html = t.length ? `<h2 class="wh">Results <small>${t.length}</small></h2><div class="wgrid breit">${t.slice(0, 60).map(treffer).join('')}</div>` : '<p class="leer">Nothing found. Try a weapon, set, raid or planet name.</p>';
    } else if (ansicht.kat === 'seal') html = `<h2 class="wh">Seals</h2>${await zeigeSeals(x, zustand)}`;
    else if (ansicht.kat === 'check') html = `<h2 class="wh">Checklists</h2>${await zeigeChecklisten(x, zustand)}`;
    else if (ansicht.kat === 'farm') html = `<h2 class="wh">Farm planner</h2>${await zeigeFarm(x, zustand)}`;
    else if (ansicht.kat) html = `<h2 class="wh">${esc(KATEGORIEN.find((k) => k[0] === ansicht.kat)[1])}</h2>${zeigeKat(ansicht.kat, x)}`;
    else {
      html = `<div class="wkat">${KATEGORIEN.map(([k, n, e]) => `<button data-kat="${k}"><span>${e}</span><b>${n}</b><small>${{ check: Object.keys(defs.cl || {}).length, exo: x.exos.length, waffe: x.waffen.length, set: x.sets.length, akt: x.akts.length, ort: ORTE.length, seal: Object.keys(defs.seal || {}).length, chal: x.chals.length, quelle: new Set(x.waffen.map((w) => w.q)).size, farm: '' }[k]}</small></button>`).join('')}</div>
        <p class="leer klein">Tip: hover any icon in the app for details, click it for jump links. Try the farm planner for “where exactly does it drop”.</p>`;
    }
    box.innerHTML = html;
    if (ansicht.kat === 'farm' && !ansicht.seite) verbindeFarm();
  };
  // Vorschläge unter einem Eingabefeld (Pfeiltasten + Enter).
  const vorschlaege = (inp, vor, liste, waehle) => {
    let k = -1, aktuell = [];
    const zeig = () => {
      const q = norm(inp.value.trim());
      const nn = (y) => `${norm(y.n)} ${norm(anzeige(y.n))}`, st = (y) => norm(y.n).startsWith(q) || norm(anzeige(y.n)).startsWith(q);
      aktuell = q ? liste().filter((y) => nn(y).includes(q)).sort((a, b) => st(b) - st(a) || vergleiche(a.n, b.n)).slice(0, 8) : [];
      k = -1;
      vor.hidden = !aktuell.length;
      vor.innerHTML = aktuell.map((y, i) => `<button data-vi="${i}">${y.h && y.d ? `<i class="wic klein" style="background-image:url(${BILD}${y.d.i})"></i>` : ''}<span>${esc(y.n)}</span><small>${esc(y.typ)}</small></button>`).join('');
    };
    inp.addEventListener('input', zeig);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); k = Math.max(0, Math.min(aktuell.length - 1, k + (e.key === 'ArrowDown' ? 1 : -1))); vor.querySelectorAll('button').forEach((b, i) => b.classList.toggle('an', i === k)); }
      if (e.key === 'Enter') { vor.hidden = true; waehle(aktuell[k >= 0 ? k : 0] || { n: inp.value.trim() }); }
      if (e.key === 'Escape') vor.hidden = true;
    });
    vor.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-vi]'); if (b) { e.preventDefault(); vor.hidden = true; waehle(aktuell[Number(b.dataset.vi)]); } });
    inp.addEventListener('blur', () => setTimeout(() => { vor.hidden = true; }, 150));
  };
  const alleZiele = ziele(x);
  const verbindeFarm = () => {
    const inp = box.querySelector('#farmIn');
    vorschlaege(inp, box.querySelector('#farmVor'), () => alleZiele, (y) => { ansicht.farm = y?.n || ''; zeichne(); });
  };
  const suchListe = [...alleZiele, ...x.akts.map((a) => ({ n: a.n, typ: a.a.art, akt: a })), ...ORTE.map((o) => ({ n: o, typ: 'Destination', ort: o }))];
  const f = el.querySelector('#wsuche');
  vorschlaege(f, el.querySelector('#wVor'), () => suchListe, (y) => {
    if (y.akt) ansicht = { ...ansicht, seite: `akt:${y.n}`, suche: '' };
    else if (y.ort) ansicht = { ...ansicht, seite: `ort:${y.n}`, suche: '' };
    else if (y.set) ansicht = { ...ansicht, seite: `set:${y.set.h}`, suche: '' };
    else if (y.h) ansicht = { ...ansicht, seite: `item:${y.h}`, suche: '' };
    else ansicht = { ...ansicht, seite: null, suche: y.n };
    f.value = ansicht.suche; zeichne();
  });
  let t;
  f.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { ansicht.suche = f.value.trim(); ansicht.seite = null; if (ansicht.suche) ansicht.kat = null; zeichne(); }, 250); });
  await zeichne();

  el.onchange = (e) => { const w = e.target.closest('[data-wf]'); if (w) { const y = scrollY; ansicht.wf = { ...(ansicht.wf || {}), [w.dataset.wf]: w.value }; zeichne().then(() => scrollTo({ top: y })); } };
  el.onclick = (e) => {
    const k = e.target.closest('[data-kat]');
    if (k) { verlauf.length = 0; ansicht = { ...ansicht, kat: k.dataset.kat || null, seite: null, sub: 'alle', suche: '', check: null }; f.value = ''; scrollTo({ top: 0 }); return zeichne(); }
    const s = e.target.closest('[data-seite]');
    if (s) { verlauf.push({ seite: ansicht.seite, y: scrollY }); ansicht.seite = s.dataset.seite; scrollTo({ top: 0 }); return zeichne(); }
    if (e.target.closest('[data-zurueck]')) { const v = verlauf.pop() || { seite: null, y: 0 }; ansicht.seite = v.seite; return zeichne().then(() => requestAnimationFrame(() => scrollTo({ top: v.y }))); }
    const ch = e.target.closest('[data-check]');
    if (ch) { verlauf.push({ seite: null, y: scrollY, check: null }); ansicht.check = ch.dataset.check; scrollTo({ top: 0 }); return zeichne(); }
    if (e.target.closest('[data-checkzu]')) { const v = verlauf.pop(); ansicht.check = null; return zeichne().then(() => scrollTo({ top: v?.y || 0 })); }
    const no = e.target.closest('[data-nuroffen]');
    if (no) { ansicht.nurOffen = no.dataset.nuroffen === '1'; return zeichne(); }
    if (e.target.closest('[data-checkneu]')) { return ladeChecklisten(zustand, true).then(zeichne); }
    const wr = e.target.closest('[data-wfreset]');
    if (wr) { ansicht.wf = {}; return zeichne(); }
    const sub = e.target.closest('[data-sub]');
    if (sub) verlauf.length = 0;
    if (sub) { ansicht.sub = sub.dataset.sub; return zeichne(); }
    const fa = e.target.closest('[data-farm]');
    if (fa) { ansicht = { ...ansicht, kat: 'farm', seite: null, farm: fa.dataset.farm, suche: '' }; f.value = ''; return zeichne(); }
    const g = e.target.closest('[data-guide]');
    if (g) { import('./app.js').then((m) => m.springeGuide(g.dataset.guide)); return; }
    const zu = e.target.closest('[data-zu]');
    if (zu) { e.preventDefault(); el.querySelector(`#${zu.dataset.zu}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  };
}
