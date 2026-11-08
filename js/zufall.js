// Zufall: Loadout-Randomizer (mit Glücks-/Pechhebel, Set-Boni, Special-Pflicht) und Glücksrad
// mit Ketten-Modus (Aktivität → Schwierigkeit → Modifier → Subclass → Waffen → Exotic → Set), einstellbarer Physik.
import { defs } from './defs.js';
import { sammle, merkeAenderung, zumCharakter, ersatzAnlegen } from './vault.js';
import * as bungie from './bungie.js';
import { meldung } from './app.js';

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const SLOTS = [[1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power']];
const RUEST = [[3448274439, 'Helmet'], [3551918588, 'Arms'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class Item']];
const SUBS = ['Arc', 'Solar', 'Void', 'Stasis', 'Strand', 'Prismatic'];
const STUFEN = ['Normal', 'Advanced', 'Expert', 'Master', 'Grandmaster'];
const lies = (k, s) => { try { return { ...s, ...(JSON.parse(localStorage.getItem(k)) || {}) }; } catch { return s; } };
const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const zuf = (l) => l[Math.floor(Math.random() * l.length)];

let opt = lies('d2a.zufallOpt', { waffen: true, ruestung: true, subclass: true, exoW: 'ja', exoR: 'ja', special: false, set: '0', glueck: 0, aus: [] });
// Ältere Einstellungen (true/false) übernehmen.
if (typeof opt.exoW === 'boolean') opt.exoW = opt.nurExo ? 'immer' : opt.exoW ? 'ja' : 'nie';
if (typeof opt.exoR === 'boolean') opt.exoR = opt.exoR ? 'ja' : 'nie';
let rad = lies('d2a.rad', { vorlage: 'fun', aus: {}, eigen: '', tempo: 5, bremse: 4, kette: { akt: true, diff: true, mod: 1, sub: true, w: true, exo: true, set: false }, pool: 'Portal' });
let temp = lies('d2a.zufallTemp', { l: [] }).l;
let ergebnis = null;
let kills = null; // Kill-Tracker je Item-Instanz, nur geladen wenn der Hebel benutzt wird

// ---------- Glückshebel ----------
async function ladeKills(zustand) {
  if (kills) return; kills = {};
  try {
    const k = zustand.konto; const p = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=309`);
    for (const [id, o] of Object.entries(p.itemComponents?.plugObjectives?.data || {})) {
      let n = 0; for (const [ph, l] of Object.entries(o.objectivesPerPlug || {})) { if (!/tracker/i.test(defs.items[ph]?.pc || '')) continue; for (const x of l) n += x.progress || 0; }
      if (n) kills[id] = n;
    }
  } catch {}
}
// 0 = schlecht, 1 = gut: oft benutzt, Masterwork, gesperrt (= gemocht), hohe Stats.
function guete(x, maxKills, maxSt) {
  if (x.d.t === 3) return 0.35 * x.mw + 0.15 * x.locked + 0.1 * x.crafted + 0.4 * (kills?.[x.id] ? Math.log1p(kills[x.id]) / Math.log1p(maxKills || 1) : 0);
  const q = x.d.q < 5 ? 0 : 1; // weiße/blaue Rüstung ist „Pech“
  return q * (0.5 * ((x.st?.Total || 0) / (maxSt || 1)) + 0.3 * x.mw + 0.2 * x.locked);
}
function ziehe(l, hebel) {
  if (!l.length) return null;
  if (!hebel) return zuf(l);
  const mk = Math.max(1, ...l.map((x) => kills?.[x.id] || 0)), ms = Math.max(1, ...l.map((x) => x.st?.Total || 0));
  const g = l.map((x) => Math.exp((hebel / 100) * 4 * (2 * guete(x, mk, ms) - 1)));
  let r = Math.random() * g.reduce((a, b) => a + b, 0);
  for (let i = 0; i < l.length; i++) { r -= g[i]; if (r <= 0) return l[i]; }
  return l[l.length - 1];
}

// ---------- Loadout würfeln ----------
function pools(zustand, cid) {
  const items = sammle(zustand.profil);
  const klasse = zustand.profil.characters?.data?.[cid]?.classType;
  return { waffen: items.filter((x) => x.d.t === 3 && !opt.aus.includes(x.d.k)), ruest: items.filter((x) => x.d.t === 2 && (x.d.c === klasse || x.d.c === 3)) };
}
function wuerfleWaffen(waffen, fest = {}) {
  const out = []; let exoDa = Object.values(fest).some((x) => x?.d.q === 6);
  const mitSpecial = SLOTS.filter(([b]) => waffen.some((x) => x.d.b === b && x.d.a === 2 && (opt.exoW !== 'nie' || x.d.q !== 6)));
  const specialSlot = opt.special && !Object.values(fest).some((x) => x?.d.a === 2) ? zuf(mitSpecial)?.[0] : null;
  const exoSlot = opt.exoW === 'immer' && !exoDa ? zuf(SLOTS.filter(([b]) => b !== specialSlot && waffen.some((x) => x.d.b === b && x.d.q === 6)).concat(SLOTS.filter(([b]) => b === specialSlot && waffen.some((x) => x.d.b === b && x.d.q === 6 && x.d.a === 2))))?.[0] : null;
  for (const [b, n] of SLOTS) {
    if (fest[b]) { out.push({ x: fest[b], slot: n, b }); continue; }
    let l = waffen.filter((x) => x.d.b === b);
    if (opt.exoW === 'nie' || exoDa) l = l.filter((x) => x.d.q !== 6);
    if (b === exoSlot) l = l.filter((x) => x.d.q === 6);
    if (b === specialSlot) l = l.filter((x) => x.d.a === 2);
    const x = ziehe(l, opt.glueck); if (!x) continue;
    if (x.d.q === 6) exoDa = true;
    out.push({ x, slot: n, b });
  }
  return out;
}
function wuerfleRuestung(ruest, festExo = null, festSet = null) {
  const out = []; const frei = new Set(RUEST.map(([b]) => b));
  let exo = festExo;
  if (!exo && (opt.exoR === 'immer' || (opt.exoR === 'ja' && Math.random() < 0.5))) exo = ziehe(ruest.filter((x) => x.d.q === 6), opt.glueck);
  if (exo) { out.push({ x: exo, slot: RUEST.find(([b]) => b === exo.d.b)?.[1], b: exo.d.b }); frei.delete(exo.d.b); }
  const n = Number(opt.set) || 0;
  const set = festSet || (n ? zuf(setsMitMindestens(ruest, n, frei)) : null);
  if (set) {
    const slots = RUEST.map(([b]) => b).filter((b) => frei.has(b) && ruest.some((x) => x.d.e == set && x.d.b === b)).sort(() => Math.random() - 0.5).slice(0, festSet ? 5 : n);
    for (const b of slots) { const x = ziehe(ruest.filter((y) => y.d.e == set && y.d.b === b && y.d.q !== 6), opt.glueck); if (x) { out.push({ x, slot: RUEST.find(([c]) => c === b)[1], b }); frei.delete(b); } }
  }
  for (const [b, nm] of RUEST) if (frei.has(b)) { const x = ziehe(ruest.filter((y) => y.d.b === b && y.d.q !== 6), opt.glueck); if (x) out.push({ x, slot: nm, b }); }
  return { teile: out, set };
}
function setsMitMindestens(ruest, n, frei = new Set(RUEST.map(([b]) => b))) {
  const pro = new Map();
  for (const x of ruest) if (x.d.e && x.d.q !== 6 && frei.has(x.d.b)) { const s = pro.get(x.d.e) || new Set(); s.add(x.d.b); pro.set(x.d.e, s); }
  return [...pro].filter(([, s]) => s.size >= n).map(([e]) => e);
}
const setName = (e) => defs.sets?.[e]?.n || 'Armor set';
const sortiert = (l) => { const r = [...SLOTS, ...RUEST].map(([b]) => b); return l.sort((a, c) => r.indexOf(a.b) - r.indexOf(c.b)); };
function wuerfle(zustand, cid) {
  const { waffen, ruest } = pools(zustand, cid);
  const w = opt.waffen ? wuerfleWaffen(waffen) : [];
  const r = opt.ruestung ? wuerfleRuestung(ruest) : { teile: [] };
  return { cid, teile: sortiert([...w, ...r.teile]), sub: opt.subclass ? zuf(SUBS) : null, set: r.set };
}

async function anlegen(zustand, e) {
  const k = zustand.konto;
  for (const { x } of e.teile) {
    try {
      let ort = x.ort;
      if (ort !== e.cid) {
        if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); }
        if (ort !== 'tresor' && ort !== e.cid) { await ersatzAnlegen(zustand, x); await bungie.verschiebe(k, x, ort, true); }
        await zumCharakter(zustand, x, e.cid, new Set(e.teile.map((t) => t.x.id)));
      }
      await bungie.ausruesten(k, x, e.cid);
      merkeAenderung(x.id, { ort: e.cid, angelegt: true });
    } catch (err) { meldung(`${x.d.n}: ${err.message}`, true); return; }
  }
  zustand.alleItems = null;
  meldung('Random loadout equipped. Good luck.');
}
// Temporäres Loadout: nur in der App gespeichert, jederzeit wieder anlegbar oder löschbar.
function merkeTemp(e, titel) {
  temp = [{ t: titel || new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }), cid: e.cid, sub: e.sub, info: e.info || [], ids: e.teile.map((t) => t.x.id) }, ...temp].slice(0, 12);
  schreib('d2a.zufallTemp', { l: temp });
}
function ausTemp(zustand, t) {
  const alle = new Map(sammle(zustand.profil).map((x) => [x.id, x]));
  return { cid: t.cid, sub: t.sub, info: t.info, teile: sortiert(t.ids.map((id) => alle.get(id)).filter(Boolean).map((x) => ({ x, b: x.d.b, slot: [...SLOTS, ...RUEST].find(([b]) => b === x.d.b)?.[1] || '' }))) };
}

// ---------- Glücksrad ----------
const SPASS = ['Primaries only', 'No super', 'No grenades', 'Hand cannons only', 'Swords only', 'Everyone on the same element', 'No exotics', 'Sidearms only', 'Only blue (rare) weapons', 'Melee kills only for adds', 'No radar (turn it off in settings)', 'Random fireteam leader picks every loadout'];
const basis = (n) => n.split(':')[0].trim();
const aktPool = (g) => Object.values(defs.akt || {}).filter((a) => a.g === g);
function vorlagen(zustand) {
  const namen = (g) => [...new Set(aktPool(g).map((a) => basis(a.n)))].sort();
  const exos = [...new Set(sammle(zustand.profil).filter((x) => x.d.t === 3 && x.d.q === 6).map((x) => x.d.n))].sort();
  const typen = [...new Set(Object.values(defs.items).filter((d) => d.t === 3 && d.q === 5 && d.k).map((d) => d.k))].sort();
  return {
    fun: ['Fun challenges', SPASS], portal: ['Strikes & Portal', namen('Portal')], raid: ['Raids', namen('Raids')], dungeon: ['Dungeons', namen('Dungeons')], ls: ['Lost Sectors', namen('Lost Sectors')],
    sub: ['Subclasses', SUBS], typ: ['Weapon types', typen], exo: ['Your exotic weapons', exos],
    eigen: ['My own list', rad.eigen.split('\n').map((s) => s.trim()).filter(Boolean)],
  };
}
const POOLS = [['Portal', 'Strikes & Portal'], ['Raids', 'Raids'], ['Dungeons', 'Dungeons'], ['Lost Sectors', 'Lost Sectors']];
// Kette: jede Stufe liefert die Einträge für das nächste Drehen.
function kettenSchritte(zustand, cid, stand) {
  const k = rad.kette; const s = [];
  if (k.akt) s.push(['akt', 'Activity', () => [...new Set(aktPool(rad.pool).map((a) => basis(a.n)))].sort()]);
  if (k.diff) s.push(['diff', 'Difficulty', () => { const v = aktPool(rad.pool).filter((a) => !stand.akt || basis(a.n) === stand.akt).map((a) => a.n.split(':')[1]?.trim()).filter(Boolean); const u = [...new Set(v)]; return u.length >= 2 ? u : STUFEN; }]);
  for (let i = 0; i < (Number(k.mod) || 0); i++) s.push([`mod${i}`, `Modifier ${i + 1}`, () => { const hs = new Set(aktPool(rad.pool).filter((a) => !stand.akt || basis(a.n) === stand.akt).flatMap((a) => a.m || [])); const l = [...hs].map((h) => defs.mod?.[h]?.n).filter(Boolean); const u = [...new Set(l)].filter((n) => !Object.entries(stand).some(([key, v]) => key.startsWith('mod') && v === n)); return u; }]);
  if (k.sub) s.push(['sub', 'Subclass', () => SUBS]);
  const { waffen, ruest } = pools(zustand, cid);
  if (k.w) for (const [b, n] of SLOTS) s.push([`w${b}`, `${n} weapon`, () => { const fest = Object.fromEntries(SLOTS.map(([c]) => [c, stand.obj?.[`w${c}`]]).filter(([, x]) => x)); const l = wuerfleKandidaten(waffen, b, fest); return l; }, true]);
  if (k.exo) s.push(['exo', 'Exotic armor', () => ruest.filter((x) => x.d.q === 6).sort(() => Math.random() - 0.5), true]);
  if (k.set) s.push(['set', 'Armor set', () => setsMitMindestens(ruest, 2).map((e) => ({ e, n: setName(e) }))]);
  return s;
}
function wuerfleKandidaten(waffen, b, fest) {
  const exoDa = Object.values(fest).some((x) => x.d.q === 6);
  let l = waffen.filter((x) => x.d.b === b);
  if (opt.exoW === 'nie' || exoDa) l = l.filter((x) => x.d.q !== 6);
  if (opt.special && b === 953998645 && !Object.values(fest).some((x) => x.d.a === 2) && l.some((x) => x.d.a === 2)) l = l.filter((x) => x.d.a === 2);
  // Rad bleibt lesbar: höchstens 20 Kandidaten, gezogen mit dem Glückshebel.
  const out = []; const rest = [...l];
  while (out.length < 20 && rest.length) { const x = ziehe(rest, opt.glueck); out.push(x); rest.splice(rest.indexOf(x), 1); }
  return out;
}
const FARBEN = ['var(--sh1,#9b7bff)', 'var(--sh2,#7fd5ff)', 'var(--sh3,#ff8a2a)', 'var(--sh4,#3fe08f)', 'var(--sh5,#e8c35a)', 'var(--sh6,#ff6fae)'];
const label = (t) => (typeof t === 'string' ? t : t.d ? t.d.n : t.n);
function radSvg(eintraege) {
  const n = Math.max(1, eintraege.length), r = 150;
  const seg = eintraege.map((e, i) => {
    const t = label(e);
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const p = (a) => `${160 + r * Math.cos(a)} ${160 + r * Math.sin(a)}`;
    const mid = (a0 + a1) / 2;
    return `<path d="M160 160 L${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z" style="fill:${FARBEN[i % FARBEN.length]}" opacity="${0.55 + 0.4 * (i % 2)}" stroke="#0008"/>
      <text x="${160 + r * 0.6 * Math.cos(mid)}" y="${160 + r * 0.6 * Math.sin(mid)}" transform="rotate(${(mid * 180) / Math.PI} ${160 + r * 0.6 * Math.cos(mid)} ${160 + r * 0.6 * Math.sin(mid)})" text-anchor="middle" dominant-baseline="middle" font-size="${n > 16 ? 8 : 11}" font-weight="700" fill="#0b0a1a">${esc(t.length > 18 ? `${t.slice(0, 17)}…` : t)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 320 320" class="rad-svg"><g class="rad-dreh">${seg}</g><circle cx="160" cy="160" r="16" fill="#0b0a1a" stroke="#fff"/></svg><div class="rad-zeiger">▼</div>`;
}
// Physik: Startgeschwindigkeit v (Umdrehungen/s), Bremse a (U/s²) → gleichmäßig gebremst.
const physik = () => { const v = 0.6 + rad.tempo * 0.45, a = 0.15 + rad.bremse * 0.18; return { dauer: v / a, umdr: (v * v) / (2 * a) }; };

export function oeffneZufall(zustand) {
  document.querySelector('#zufall')?.remove();
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  let cid = chars[0]?.characterId; let tab = 'loadout';
  const typen = [...new Set(sammle(zustand.profil).filter((x) => x.d.t === 3).map((x) => x.d.k))].sort();
  const box = document.createElement('div'); box.id = 'zufall'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  document.body.append(box);
  let winkel = 0, drehe = false;
  let kette = null; // { stand: {akt, diff, …, obj:{}}, i, verlauf: [[titel, wert]] }
  const radEintraege = () => {
    if (rad.vorlage === 'kette') { if (!kette) return []; const s = kettenSchritte(zustand, cid, kette.stand)[kette.i]; return s ? s[2]() : []; }
    const v = vorlagen(zustand); const aus = new Set(rad.aus[rad.vorlage] || []);
    return (v[rad.vorlage] || v.fun)[1].filter((t) => !aus.has(t));
  };
  let aktuell = [];
  const ergebnisHtml = (e, mitKnopf = true) => `<div class="zf-erg">${e.info?.length ? `<p>${e.info.map(([a, b]) => `${esc(a)}: <b>${esc(b)}</b>`).join(' · ')}</p>` : ''}${e.sub ? `<p>Subclass: <b>${esc(e.sub)}</b>${e.set ? ` · Set: <b>${esc(setName(e.set))}</b>` : ''}</p>` : ''}<div class="zf-teile">${e.teile.map(({ x, slot }) => `<div class="zf-teil ${x.d.q === 6 ? 'exo' : ''}"><i style="background-image:url(${BILD}${x.d.i})" data-ih="${x.hash}"></i><span><small>${esc(slot)}${kills?.[x.id] ? ` · ${kills[x.id].toLocaleString()} kills` : ''}${x.mw ? ' · MW' : ''}</small><b>${esc(x.d.n)}</b><small>${esc(x.d.k)}${x.st?.Total ? ` · ${x.st.Total} stats` : ''}</small></span></div>`).join('') || '<p class="leer">Nothing fits these settings.</p>'}</div>
    ${mitKnopf && e.teile.length ? '<div class="konto-knoepfe"><button data-anlegen>Equip on this guardian</button><button data-temp>Save as temporary loadout</button><button data-wuerfeln>Reroll</button></div>' : ''}</div>`;
  const hebelText = () => (opt.glueck > 0 ? `Luck +${opt.glueck}: favours masterworked, locked, high-kill and high-stat gear` : opt.glueck < 0 ? `Bad luck ${opt.glueck}: favours dusty, low-stat and blue/white gear` : 'Neutral: every item equally likely');
  const zeichne = () => {
    const v = vorlagen(zustand);
    const liste = rad.vorlage === 'kette' ? [] : (v[rad.vorlage] || v.fun)[1];
    const aus = new Set(rad.aus[rad.vorlage] || []);
    aktuell = radEintraege();
    const schritte = kette ? kettenSchritte(zustand, cid, kette.stand) : [];
    const sel = (k, wahl) => `<select data-opt="${k}">${wahl.map(([w, t]) => `<option value="${w}" ${String(opt[k]) === w ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    box.innerHTML = `<div class="wk-box zf-box"><button class="zf-zu" data-zu aria-label="Close">✕</button>
      <div class="wsub"><button class="chip" data-tab="loadout" aria-pressed="${tab === 'loadout'}">🎲 Loadout randomizer</button><button class="chip" data-tab="rad" aria-pressed="${tab === 'rad'}">🎡 Lucky wheel</button>${temp.length ? `<button class="chip" data-tab="temp" aria-pressed="${tab === 'temp'}">📌 Saved rolls (${temp.length})</button>` : ''}</div>
      <div class="zf-opt"><label>Guardian <select data-char>${chars.map((c) => `<option value="${c.characterId}" ${c.characterId === cid ? 'selected' : ''}>${KLASSE[c.classType]} ${c.light}</option>`).join('')}</select></label></div>
      ${tab === 'loadout' ? `
        <div class="zf-opt">${[['waffen', 'Weapons'], ['ruestung', 'Armor'], ['subclass', 'Subclass'], ['special', 'Always a special weapon']].map(([k, t]) => `<label class="zf-cb"><input type="checkbox" data-opt="${k}" ${opt[k] ? 'checked' : ''}> ${t}</label>`).join('')}</div>
        <div class="zf-opt"><label>Exotic weapon ${sel('exoW', [['ja', 'maybe'], ['immer', 'always'], ['nie', 'never']])}</label><label>Exotic armor ${sel('exoR', [['ja', 'maybe'], ['immer', 'always'], ['nie', 'never']])}</label><label>Set bonus ${sel('set', [['0', 'don’t care'], ['2', '2-piece'], ['4', '4-piece']])}</label></div>
        <div class="zf-hebel"><span>☠ Bad luck</span><input type="range" min="-100" max="100" step="10" value="${opt.glueck}" data-glueck aria-label="Luck lever"><span>Luck ☘</span><small>${hebelText()}</small></div>
        <details class="zf-typen"><summary>Weapon types in the pool (${typen.length - opt.aus.filter((t) => typen.includes(t)).length}/${typen.length})</summary><div class="zf-haken">${typen.map((t) => `<label class="zf-cb"><input type="checkbox" data-typ="${esc(t)}" ${!opt.aus.includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div></details>
        <button class="haupt-knopf" data-wuerfeln>🎲 Roll</button>
        ${ergebnis ? ergebnisHtml(ergebnis) : '<p class="leer klein">Only uses items you own. Exotic items from Collections can’t be pulled by apps, so “exotic armor” means one you own.</p>'}`
      : tab === 'temp' ? `${temp.map((t, i) => { const e = ausTemp(zustand, t); return `<details class="zf-tmp"><summary><b>${esc(t.t)}</b> · ${KLASSE[zustand.profil.characters?.data?.[t.cid]?.classType] || ''} · ${e.teile.length} items<button class="chip klein" data-tempweg="${i}">remove</button></summary>${ergebnisHtml(e, false)}<div class="konto-knoepfe"><button data-tempan="${i}">Equip</button></div></details>`; }).join('')}`
      : `
        <div class="zf-opt"><label>Wheel <select data-vorlage><option value="kette" ${rad.vorlage === 'kette' ? 'selected' : ''}>⛓ Multi-wheel run (activity → … → loadout)</option>${Object.entries(v).map(([k, [t, l]]) => `<option value="${k}" ${k === rad.vorlage ? 'selected' : ''}>${esc(t)} (${l.length})</option>`).join('')}</select></label></div>
        ${rad.vorlage === 'kette' ? `<details class="zf-typen" ${kette ? '' : 'open'}><summary>Steps of the run</summary><div class="zf-haken">
            <label>Pool <select data-pool>${POOLS.map(([w, t]) => `<option value="${w}" ${rad.pool === w ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
            ${[['akt', 'Activity'], ['diff', 'Difficulty'], ['sub', 'Subclass'], ['w', 'Weapons (3 spins)'], ['exo', 'Exotic armor'], ['set', 'Armor set']].map(([k, t]) => `<label class="zf-cb"><input type="checkbox" data-kette="${k}" ${rad.kette[k] ? 'checked' : ''}> ${t}</label>`).join('')}
            <label>Modifiers <select data-kettemod>${[0, 1, 2, 3].map((n) => `<option ${Number(rad.kette.mod) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div></details>
          ${kette ? `<ol class="zf-kette">${schritte.map(([, t], i) => `<li class="${i < kette.i ? 'ok' : i === kette.i ? 'jetzt' : ''}">${esc(t)}${kette.verlauf[i] ? `: <b>${esc(kette.verlauf[i])}</b>` : ''}</li>`).join('')}</ol>` : ''}` : ''}
        ${rad.vorlage === 'eigen' ? `<textarea data-eigen rows="4" placeholder="One entry per line">${esc(rad.eigen)}</textarea>` : ''}
        ${rad.vorlage === 'kette' && !kette ? '<button class="haupt-knopf" data-kettestart>⛓ Start the run</button>' : rad.vorlage === 'kette' && kette.i >= schritte.length ? `${kette.e ? ergebnisHtml(kette.e) : ''}<button class="chip" data-kettestart>⛓ New run</button>` : `
        <div class="rad">${aktuell.length ? radSvg(aktuell) : '<p class="leer">Pick at least one entry.</p>'}</div>
        <button class="haupt-knopf" data-drehen ${aktuell.length < 1 ? 'disabled' : ''}>🎡 Spin${kette ? `: ${esc(schritte[kette.i]?.[1] || '')}` : ''}</button>${kette ? ' <button class="chip" data-kettewahl>pick myself</button>' : ''}<p class="zf-rad-erg" aria-live="polite"></p>`}
        <div class="zf-hebel"><span>Speed</span><input type="range" min="1" max="10" value="${rad.tempo}" data-rad="tempo"><span>${rad.tempo}</span></div>
        <div class="zf-hebel"><span>Brake</span><input type="range" min="1" max="10" value="${rad.bremse}" data-rad="bremse"><span>${rad.bremse}</span><small>about ${physik().dauer.toFixed(1)} s and ${physik().umdr.toFixed(1)} turns</small></div>
        ${rad.vorlage !== 'kette' ? `<details><summary>Entries (${aktuell.length}/${liste.length} on)</summary><div class="zf-haken">${liste.map((t) => `<label class="zf-cb"><input type="checkbox" data-eintrag="${esc(t)}" ${!aus.has(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div></details>` : ''}`}
    </div>`;
  };
  const ketteFertig = () => {
    const st = kette.stand; const { waffen, ruest } = pools(zustand, cid);
    const fest = Object.fromEntries(SLOTS.map(([b]) => [b, st.obj[`w${b}`]]).filter(([, x]) => x));
    const w = rad.kette.w ? wuerfleWaffen(waffen, fest) : [];
    const r = wuerfleRuestung(ruest, st.obj.exo || null, st.obj.set?.e || null);
    kette.e = { cid, teile: sortiert([...w, ...r.teile]), sub: st.sub || null, set: r.set, info: [['Activity', st.akt], ['Difficulty', st.diff], ...Object.keys(st).filter((k) => /^mod/.test(k)).map((k) => ['Modifier', st[k]])].filter(([, b]) => b) };
  };
  const setzeKette = (wert) => {
    const s = kettenSchritte(zustand, cid, kette.stand)[kette.i]; if (!s) return;
    const [key] = s; kette.stand[key] = label(wert); if (typeof wert !== 'string') kette.stand.obj[key] = wert; kette.verlauf[kette.i] = label(wert); kette.i++;
    ueberspringe();
  };
  // Stufen ohne Kandidaten (z. B. keine Power-Waffe im Pool) überspringen.
  const ueberspringe = () => {
    for (;;) { const l = kettenSchritte(zustand, cid, kette.stand); if (kette.i >= l.length) { ketteFertig(); return; } if (l[kette.i][2]().length) return; kette.verlauf[kette.i] = '— nothing fits'; kette.i++; }
  };
  zeichne();
  box.onclick = async (e) => {
    if (e.target === box || e.target.closest('[data-zu]')) { box.remove(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return zeichne(); }
    if (e.target.closest('[data-wuerfeln]') && tab === 'rad' && kette?.e) { ketteFertig(); return zeichne(); }
    if (e.target.closest('[data-wuerfeln]')) { if (opt.glueck) await ladeKills(zustand); ergebnis = wuerfle(zustand, cid); return zeichne(); }
    if (e.target.closest('[data-anlegen]')) { e.target.disabled = true; await anlegen(zustand, tab === 'rad' ? kette.e : ergebnis); return; }
    if (e.target.closest('[data-temp]')) { const x = tab === 'rad' ? kette.e : ergebnis; merkeTemp(x, x.info?.[0]?.[1]); meldung('Saved under “Saved rolls”.'); return zeichne(); }
    const ta = e.target.closest('[data-tempan]'); if (ta) { ta.disabled = true; await anlegen(zustand, ausTemp(zustand, temp[Number(ta.dataset.tempan)])); return; }
    const tw = e.target.closest('[data-tempweg]'); if (tw) { e.preventDefault(); temp.splice(Number(tw.dataset.tempweg), 1); schreib('d2a.zufallTemp', { l: temp }); if (!temp.length) tab = 'loadout'; return zeichne(); }
    if (e.target.closest('[data-kettestart]')) { if (opt.glueck) await ladeKills(zustand); kette = { stand: { obj: {} }, i: 0, verlauf: [] }; winkel = 0; ueberspringe(); return zeichne(); }
    if (e.target.closest('[data-kettewahl]')) {
      const box2 = box.querySelector('.zf-rad-erg'); box2.innerHTML = `<select data-wahlliste><option value="">Pick…</option>${aktuell.map((x, i) => `<option value="${i}">${esc(label(x))}</option>`).join('')}</select>`; return;
    }
    if (e.target.closest('[data-drehen]') && !drehe) {
      const n = aktuell.length; const i = Math.floor(Math.random() * n);
      const { dauer, umdr } = physik();
      // Mitte des Gewinner-Segments landet oben unter dem Zeiger; Kurve = gleichmäßiges Abbremsen.
      winkel += Math.max(1, Math.floor(umdr)) * 360 + (360 - ((i + 0.5) / n) * 360) - (winkel % 360);
      const g = box.querySelector('.rad-dreh'); drehe = true;
      g.style.transition = `transform ${dauer}s cubic-bezier(.33,.67,.67,1)`; g.style.transform = `rotate(${winkel}deg)`;
      box.querySelectorAll('[data-drehen],[data-kettewahl]').forEach((b) => { b.disabled = true; });
      setTimeout(() => {
        drehe = false; const gew = aktuell[i];
        box.querySelector('.zf-rad-erg').innerHTML = `<b>${esc(label(gew))}</b>`;
        if (kette) { setzeKette(gew); setTimeout(() => { winkel = 0; zeichne(); }, 900); } else box.querySelectorAll('[data-drehen]').forEach((b) => { b.disabled = false; });
      }, dauer * 1000 + 100);
    }
  };
  box.onchange = async (e) => {
    const el = e.target;
    if (el.matches('[data-opt]')) { const k = el.dataset.opt; opt[k] = el.type === 'checkbox' ? el.checked : el.value; schreib('d2a.zufallOpt', opt); return; }
    if (el.matches('[data-typ]')) { const n = el.dataset.typ; opt.aus = el.checked ? opt.aus.filter((x) => x !== n) : [...opt.aus, n]; schreib('d2a.zufallOpt', opt); return; }
    if (el.matches('[data-glueck]')) { opt.glueck = Number(el.value); schreib('d2a.zufallOpt', opt); if (opt.glueck) await ladeKills(zustand); return zeichne(); }
    if (el.matches('[data-rad]')) { rad[el.dataset.rad] = Number(el.value); schreib('d2a.rad', rad); return zeichne(); }
    if (el.matches('[data-eintrag]')) { const a = new Set(rad.aus[rad.vorlage] || []); el.checked ? a.delete(el.dataset.eintrag) : a.add(el.dataset.eintrag); rad.aus[rad.vorlage] = [...a]; schreib('d2a.rad', rad); return zeichne(); }
    if (el.matches('[data-kette]')) { rad.kette[el.dataset.kette] = el.checked; schreib('d2a.rad', rad); kette = null; return zeichne(); }
    if (el.matches('[data-kettemod]')) { rad.kette.mod = Number(el.value); schreib('d2a.rad', rad); kette = null; return zeichne(); }
    if (el.matches('[data-pool]')) { rad.pool = el.value; schreib('d2a.rad', rad); kette = null; return zeichne(); }
    if (el.matches('[data-wahlliste]') && el.value !== '') { setzeKette(aktuell[Number(el.value)]); return zeichne(); }
    if (el.matches('[data-char]')) { cid = el.value; ergebnis = null; kette = null; return zeichne(); }
    if (el.matches('[data-vorlage]')) { rad.vorlage = el.value; winkel = 0; kette = null; schreib('d2a.rad', rad); return zeichne(); }
    if (el.matches('[data-eigen]')) { rad.eigen = el.value; schreib('d2a.rad', rad); return zeichne(); }
  };
  box.oninput = (e) => { if (e.target.matches('[data-rad]')) { const s = e.target.nextElementSibling; if (s) s.textContent = e.target.value; } };
  box.onkeydown = (e) => { if (e.key === 'Escape') box.remove(); };
}
