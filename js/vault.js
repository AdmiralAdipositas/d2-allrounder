// Tresor: alle Waffen und Rüstungen, gruppiert nach Slot, nebeneinander gestapelt.
import { defs, champion, CHAMP_NAME } from './defs.js';
import { oeffneDetail } from './detail.js';
import { bewerte, rollWert, perkMarke } from './rolls.js';
import { alleOptionen, PERKSPALTE } from './perks.js';
import { quelle } from './quellen.js';
import { zeigeItemTipp } from './itemtipp.js';
import { baueSuche, verbindeVorschlaege, tags as tagListe, notizen, TAGS, setzeTag } from './suche.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const SLOTS = [
  [1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power'],
  [3448274439, 'Helmet'], [3551918588, 'Gauntlets'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class item'],
];
const WAFFE = new Set([1498876634, 2465295065, 953998645]);
export const NEBENSACHE = /shader|skins|tracker|masterworks?\b|mementos|crafting|empty|v400\.plugs\.weapons\.masterworks|origins|enhancements\.(season|universal)/i;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let klasse = null;
const POST = 215593132;
// Lokale Änderungen nach Aktionen, bis Bungies Profil nachgezogen hat.
export const aenderungen = new Map();
export function merkeAenderung(id, werte) { aenderungen.set(id, { ...werte, zeit: Date.now() }); }

export const ARMOR_STATS = ['Health', 'Melee', 'Grenade', 'Super', 'Class', 'Weapons'];
function armorStats(roh) {
  const st = Object.fromEntries(ARMOR_STATS.map((n) => [n, 0]));
  for (const s of Object.values(roh?.stats || {})) { const n = defs.stats?.[s.statHash]?.n; if (n in st) st[n] = s.value; }
  st.Total = ARMOR_STATS.reduce((a, n) => a + st[n], 0);
  return st;
}
let statMin = (() => { try { return JSON.parse(localStorage.getItem('d2a.statmin') || '{}'); } catch { return {}; } })();

// Alles aus dem Profil zu einer flachen Liste machen.
// Bringt ein Item auf einen Charakter und macht vorher Platz: Ein Charakter hat pro Slot nur 9 freie Plätze
// (plus das angelegte Teil). Ist der Slot voll, wandert das schwächste nicht angelegte, nicht gesperrte Teil,
// das in keinem Ingame-Loadout steckt und nicht gerade gebraucht wird, in den Tresor.
// Ein angelegtes Teil kann nicht verschoben werden: vorher automatisch ein Ersatz aus demselben Slot anlegen.
// Bevorzugt: höchste Power, gleiche Klasse; ein Exotic nur, wenn das alte auch eins war (sonst Exotic-Konflikt).
export async function ersatzAnlegen(zustand, it) {
  if (!it.angelegt) return;
  const bungie = await import('./bungie.js');
  const cid = it.ort;
  const klasse = zustand.profil.characters?.data?.[cid]?.classType;
  const kand = sammle(zustand.profil).filter((x) => x.ort === cid && !x.angelegt && x.d.b === it.d.b && x.id !== it.id && (x.d.c === 3 || x.d.c === klasse) && (it.d.q === 6 || x.d.q !== 6))
    .sort((a, b) => b.power - a.power);
  const neu = kand[0];
  if (!neu) throw new Error(`${it.d.n} is equipped and there is nothing else in that slot on this character to swap in.`);
  await bungie.ausruesten(zustand.konto, neu, cid);
  merkeAenderung(neu.id, { ort: cid, angelegt: true });
  merkeAenderung(it.id, { ort: cid, angelegt: false });
  it.angelegt = false;
  const { meldung } = await import('./app.js');
  meldung(`Equipped ${neu.d.n} instead.`);
}

export async function zumCharakter(zustand, it, cid, brauchen = new Set()) {
  const bungie = await import('./bungie.js');
  const k = zustand.konto;
  const alle = sammle(zustand.profil);
  const imLoadout = new Set();
  for (const c of Object.values(zustand.profil.characterLoadouts?.data || {})) for (const l of c.loadouts || []) for (const x of l.items || []) imLoadout.add(x.itemInstanceId);
  const hier = alle.filter((x) => x.ort === cid && !x.angelegt && x.d.b === it.d.b && x.id !== it.id);
  if (hier.length >= 9) {
    const kand = hier.filter((x) => !brauchen.has(x.id)).sort((a, b) => (a.locked - b.locked) || (imLoadout.has(a.id) - imLoadout.has(b.id)) || (a.d.q === 6) - (b.d.q === 6) || a.power - b.power);
    const weg = kand[0];
    if (!weg) throw new Error(`No free ${it.d.k || 'slot'} space on this character. Move something to the vault first.`);
    try { await bungie.verschiebe(k, weg, cid, true); } catch (e) { throw new Error(/no item slots/i.test(e.message) ? 'Your vault is full, so I could not make room on the character. Free up vault space first.' : e.message); }
    merkeAenderung(weg.id, { ort: 'tresor', angelegt: false });
    const { meldung } = await import('./app.js');
    meldung(`Made room: ${weg.d.n} went to the vault.`);
  }
  await bungie.verschiebe(k, it, cid, false);
}

export function sammle(profil) {
  const inst = profil.itemComponents?.instances?.data || {};
  const statDaten = profil.itemComponents?.stats?.data || {};
  const sockel = profil.itemComponents?.sockets?.data || {};
  const liste = [];
  // Kill-Tracker (Komponente 309): Summe aller Tracker-Plugs je Waffe.
  const ziele = profil.itemComponents?.plugObjectives?.data || {};
  const killsVon = (id) => { const o = ziele[id]?.objectivesPerPlug; if (!o) return 0; let n = 0; for (const [ph, l] of Object.entries(o)) { if (!/tracker/i.test(defs.items[ph]?.pc || '')) continue; for (const x of l) n += x.progress || 0; } return n; };
  const nimm = (it, ort0, angelegt0 = false) => {
    const neu = aenderungen.get(it.itemInstanceId);
    const frisch = neu && Date.now() - neu.zeit < 120_000;
    const ort = frisch ? neu.ort : (it.bucketHash === POST ? `post:${ort0}` : ort0);
    const angelegt = frisch ? neu.angelegt : angelegt0;
    const d = defs.items[it.itemHash];
    if (!d || !it.itemInstanceId || !SLOTS.some(([b]) => b === d.b)) return;
    const i = inst[it.itemInstanceId] || {};
    const roh = (sockel[it.itemInstanceId]?.sockets || []).map((s) => (s.isEnabled === false ? 0 : s.plugHash || 0));
    const plugs = roh.filter(Boolean);
    liste.push({
      id: it.itemInstanceId, hash: it.itemHash, d, ort, angelegt, plugs, sockel: roh, locked: (it.state & 1) === 1,
      power: i.primaryStat?.value || 0, tier: i.gearTier || 0, mw: (it.state & 4) === 4, crafted: (it.state & 8) === 8, kills: d.t === 3 ? killsVon(it.itemInstanceId) : 0, element: i.damageType || d.d0 || 0, energie: i.energy?.energyCapacity || 0,
      champ: d.t === 3 ? champion(it.itemHash, plugs, i.breakerType) : null,
      st: d.t === 2 ? armorStats(statDaten[it.itemInstanceId]) : null,
    });
  };
  for (const it of profil.profileInventory?.data?.items || []) nimm(it, 'tresor');
  for (const [cid, inv] of Object.entries(profil.characterInventories?.data || {})) for (const it of inv.items) nimm(it, cid);
  for (const [cid, inv] of Object.entries(profil.characterEquipment?.data || {})) for (const it of inv.items) nimm(it, cid, true);
  return liste;
}

// Kachel: feste Zonen, damit sich nichts überdeckt.
//   links: Stufen-Rauten · oben rechts: Notiz, Markierung, Hergestellt, Ort-Punkt · rechts darunter: Champion
//   Fußzeile: Urteil (JUNK / FUEL / BEST / ?) und God-Roll-Stern links, Power bzw. Stat-Summe rechts.
const UB = { junk: ['JUNK', 'Clean-up suggestion: can be dismantled'], infuse: ['FUEL', 'Clean-up suggestion: use as infusion fuel'], best: ['BEST', 'Best of your copies'], frei: ['?', 'Duplicate without a clear verdict – compare yourself'] };
const ORT_TIP = { tresor: 'In the vault', post: 'At the Postmaster', char: 'On a character' };
function kachel(x) {
  const champ = x.champ ? `<i class="ch" style="background-image:url(${BILD}${x.champ.i})" title="Stuns ${esc(CHAMP_NAME[x.champ.n] || x.champ.n)} champions"></i>` : '';
  const ort = x.ort === 'tresor' ? 'tresor' : x.ort.startsWith('post:') ? 'post' : 'char';
  const tag = tagC[x.id] ? TAGS.find((t) => t[0] === tagC[x.id]) : null;
  const ub = UB[x.urteil?.art];
  return `<div class="ic ${auswahl?.has(x.id) ? 'gewaehlt' : ''} ${x.d.q === 6 ? 'exotic' : ''} ${x.mw ? 'mw' : ''} ${x.d.t === 3 ? `el-${x.element}` : ''} ${x.urteil ? `iu-${x.urteil.art}` : ''}" data-id="${x.id}" tabindex="0" style="background-image:${x.d.w ? `url(${BILD}${x.d.w}),` : ''}url(${BILD}${x.d.i})">
    ${x.tier ? `<span class="ck-tier">${'<b></b>'.repeat(Math.min(5, x.tier))}</span>` : ''}<span class="ic-ecke">${notC[x.id] ? '<i class="notm">✎</i>' : ''}${tag ? `<i class="tagm">${tag[1]}</i>` : ''}${x.crafted ? '<i class="ck-shaped"></i>' : ''}${x.locked ? '<i class="ic-lock"></i>' : ''}<i class="ort ${ort}"></i></span>${champ}${auswahl?.has(x.id) ? '<i class="wahlm">✓</i>' : ''}
    <span class="ic-fuss">${ub ? `<i class="ub ub-${x.urteil.art}">${ub[0]}</i>` : ''}${/god/.test(x.m?.roll || '') ? `<i class="god ${/PvP/.test(x.m.roll) ? 'pvp' : ''}">★</i>` : ''}${x.st ? `<span class="pow tot">${x.st.Total}</span>` : x.power ? `<span class="pow">${x.power}</span>` : ''}</span></div>`;
}

// Filtergruppen: innerhalb einer Gruppe ODER, zwischen Gruppen UND.
const AMMO = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const SELTEN = { 6: 'Exotic', 5: 'Legendary', 4: 'Rare', 3: 'Uncommon', 2: 'Common' };
const GRUPPEN = [
  ['ort', 'Location'], ['element', 'Element'], ['ammo', 'Ammo'], ['champ', 'Champion'], ['art', 'Weapon type'], ['frame', 'Frame'], ['perk', 'Perks'],
  ['quelle', 'Source'], ['selten', 'Rarity'], ['set', 'Armor set'], ['kopien', 'Copies'], ['roll', 'God rolls'], ['putz', 'Clean-up'],
];

// Aufräumen-Regeln: jede Kopie bekommt einen Grund, warum sie bleibt oder weg kann. Schalter liegen in d2a.putz.
export const PUTZ_REGELN = [
  ['exo', 'Keep all exotics', 'Exotic weapons like Ergo Sum roll differently every drop, so copies are never suggested.'],
  ['god', 'Keep every god roll', 'Any copy that matches a community PvE or PvP god roll stays, not only the best one.'],
  ['gut', 'Keep good rolls', 'Copies with at least a decent community roll stay.'],
  ['mw', 'Keep crafted & masterworked', 'Crafted, enhanced or masterworked copies cost resources, so they stay.'],
];
export let putzRegeln = (() => { try { return { exo: true, god: true, gut: false, mw: true, ...JSON.parse(localStorage.getItem('d2a.putz') || '{}') }; } catch { return { exo: true, god: true, mw: true }; } })();
export function setzePutz(k, v) { putzRegeln = { ...putzRegeln, [k]: v }; try { localStorage.setItem('d2a.putz', JSON.stringify(putzRegeln)); } catch {} }

// Urteil je Teil: behalten / beste Kopie / kann weg / Infusions-Futter – immer mit Begründung.
// Grundsätze: Nur echte Duplikate (Waffen) oder klar übertroffene Teile (Rüstung) können „weg“. Bewertet wird, was der Roll KANN
// (alle wählbaren Perks der Spalten), nicht nur was gerade aktiv ist. Ohne Community-Daten gibt es kein Urteil statt Quatsch.
const aelter = (a, b) => (a.length !== b.length ? a.length < b.length : a < b); // kleinere Instanz-ID = älteres Teil
function aufraeumen(alle, profil) {
  const genutzt = new Set();
  for (const c of Object.values(profil.characterLoadouts?.data || {})) for (const l of c.loadouts || []) for (const i of l.items || []) genutzt.add(i.itemInstanceId);
  for (const x of alle) if (x.angelegt) genutzt.add(x.id);
  const tg = tagListe();
  const fuel = new Set();
  const proSlot = new Map();
  for (const x of alle) { const f = proSlot.get(x.d.b) || { g: [], f: [] }; (genutzt.has(x.id) ? f.g : f.f).push(x); proSlot.set(x.d.b, f); }
  for (const f of proSlot.values()) {
    const p = f.g.map((x) => x.power).filter(Boolean);
    if (!p.length) continue;
    const schwach = Math.min(...p);
    f.f.filter((x) => x.power > schwach).sort((a, b) => b.power - a.power).slice(0, 2).forEach((x) => fuel.add(x.id));
  }
  for (const x of alle) { x.genutzt = genutzt.has(x.id); x.fuel = false; x.junk = false; x.grund = ''; x.urteil = null; }
  const R = putzRegeln;
  const setze = (x, art, grund) => { x.urteil = { art, grund }; x.grund = grund; x.junk = art === 'junk' || art === 'infuse'; x.fuel = art === 'infuse'; };
  // Gründe, die immer schützen (oder die du selbst gesetzt hast).
  const fest = (x) => {
    const t = tg[x.id];
    if (t === 'junk') return ['junk', 'You tagged it as junk'];
    if (t === 'futter') return ['infuse', 'You tagged it as infusion fodder'];
    if (x.angelegt) return ['keep', 'Equipped'];
    if (x.genutzt) return ['keep', 'Used in an in-game loadout'];
    if (x.locked) return ['keep', 'Locked in the game'];
    if (t === 'keep' || t === 'fav') return ['keep', t === 'fav' ? 'Your favorite' : 'You tagged it to keep'];
    return null;
  };
  const weg = (x, grund) => (fuel.has(x.id) ? setze(x, 'infuse', `${grund}. Its power is higher than gear you use – infuse it instead of dismantling.`) : setze(x, 'junk', grund));

  // ---- Waffen: Kopien derselben Waffe vergleichen ----
  const gruppen = new Map();
  for (const x of alle) if (x.d.t === 3) { const k = x.d.n; gruppen.set(k, [...(gruppen.get(k) || []), x]); }
  const bruch = (w) => (w?.von ? `${w.kann}/${w.von}` : '');
  for (const kopien of gruppen.values()) {
    for (const k of kopien) {
      const opt = alleOptionen(k, profil);
      k.rw = k.d.q === 6 ? null : rollWert(k.hash, k.plugs, opt);
      const marke = k.rw ? perkMarke(k.hash) : null;
      k.wSet = new Set(marke ? [...k.plugs, ...opt].filter((p) => { const m = marke(p); return m.e || m.v; }).map((p) => defs.items[p]?.n) : []);
      k.oSet = [...new Set([...k.plugs, ...opt].map((p) => defs.items[p]).filter((p) => p && PERKSPALTE.test(p.pc || '')).map((p) => p.n))].sort().join('|');
    }
    if (kopien.length < 2) { const f = fest(kopien[0]); setze(kopien[0], f ? f[0] : 'keep', f ? f[1] : 'Your only copy'); continue; }
    const n = kopien.length;
    const q = (k, m) => (k.rw?.[m]?.von ? k.rw[m].kann / k.rw[m].von : -1);
    const reihe = (m) => [...kopien].sort((a, b) => q(b, m) - q(a, m) || (b.rw?.[m]?.hat || 0) - (a.rw?.[m]?.hat || 0) || b.tier - a.tier || (b.crafted + b.mw) - (a.crafted + a.mw) || b.genutzt - a.genutzt || b.locked - a.locked || b.kills - a.kills || b.power - a.power);
    const hatDaten = kopien.some((k) => k.rw && (k.rw.pve || k.rw.pvp));
    const bestE = hatDaten && kopien.some((k) => q(k, 'pve') >= 0) ? reihe('pve')[0] : null;
    const bestV = hatDaten && kopien.some((k) => q(k, 'pvp') > 0) ? reihe('pvp')[0] : null;
    const maxTier = Math.max(...kopien.map((k) => k.tier || 0));
    const meiste = [...kopien].sort((a, b) => b.kills - a.kills)[0];
    for (const k of kopien) {
      const f = fest(k);
      if (f) { f[0] === 'keep' ? setze(k, 'keep', f[1]) : setze(k, f[0], f[1]); if (k === bestE || k === bestV) k.urteil.beste = true; continue; }
      if (R.exo && k.d.q === 6) { setze(k, 'keep', 'Exotic (rule: keep all exotics)'); continue; }
      if (k === bestE) { setze(k, 'best', `Best PvE roll of your ${n} copies${bruch(k.rw.pve) ? ` (${bruch(k.rw.pve)} wish perks possible)` : ''}`); continue; }
      if (k === bestV) { setze(k, 'best', `Best PvP roll of your ${n} copies (${bruch(k.rw.pvp)} wish perks possible)`); continue; }
      const voll = k.rw && ['pve', 'pvp'].some((m) => k.rw[m]?.von && k.rw[m].kann === k.rw[m].von);
      if (R.god && voll) { setze(k, 'keep', 'Complete god roll (rule: keep every god roll)'); continue; }
      if (R.gut && /good|god/.test(k.m.roll)) { setze(k, 'keep', `${k.m.roll} (rule: keep good rolls)`); continue; }
      if (R.mw && (k.crafted || k.mw)) { setze(k, 'keep', `${k.crafted ? 'Crafted' : 'Masterworked'} (rule: keep crafted & masterworked)`); continue; }
      if (k.tier && k.tier === maxTier && kopien.filter((y) => y.tier === maxTier).length === 1) { setze(k, 'keep', `Your only Tier ${k.tier} copy`); continue; }
      if (k === meiste && k.kills >= 500) { setze(k, 'keep', `Your most used copy (${k.kills.toLocaleString()} kills)`); continue; }
      if (!hatDaten) {
        const zwilling = kopien.find((y) => y !== k && y.oSet === k.oSet && y.tier >= k.tier && (y.urteil ? y.urteil.art !== 'junk' && y.urteil.art !== 'infuse' : true) && (y.locked || y.genutzt || aelter(y.id, k.id)));
        if (zwilling && k.oSet) weg(k, 'Exact duplicate: another copy has the same perks');
        else setze(k, 'frei', `One of ${n} copies. No community roll data for this weapon – compare the perks yourself`);
        continue;
      }
      // Hat diese Kopie Wunsch-Perks, die deine besten Kopien NICHT haben? Dann ist sie kein klarer Müll.
      const besteNamen = new Set([...(bestE?.wSet || []), ...(bestV?.wSet || [])]);
      const eigen = [...k.wSet].filter((x) => !besteNamen.has(x));
      const gleichGut = (bestE && q(k, 'pve') === q(bestE, 'pve')) || (bestV && q(k, 'pvp') === q(bestV, 'pvp') && q(k, 'pvp') > 0);
      if (eigen.length && gleichGut) { setze(k, 'frei', `As good as your best copy, but with other wish perks (${eigen.slice(0, 3).join(', ')}) – your call`); continue; }
      const vgl = [bestE ? `PvE ${bruch(k.rw?.pve) || '0'} vs ${bruch(bestE.rw.pve)}` : '', bestV ? `PvP ${bruch(k.rw?.pvp) || '0'} vs ${bruch(bestV.rw.pvp)}` : ''].filter(Boolean).join(', ');
      weg(k, `Duplicate with a weaker roll than your best copy (${vgl}); not locked, not in a loadout`);
    }
  }
  // ---- Rüstung: nur wenn ein anderes Teil (gleiche Klasse, gleicher Platz, gleiches Set, gleiche oder höhere Stufe) in JEDEM Wert mindestens gleich gut ist ----
  const rg = new Map();
  for (const x of alle) if (x.d.t === 2 && x.st) { const k = `${x.d.c}|${x.d.b}`; rg.set(k, [...(rg.get(k) || []), x]); }
  for (const liste of rg.values()) for (const x of liste) {
    const f = fest(x);
    if (f) { setze(x, f[0], f[1]); continue; }
    if (x.d.q === 6) { if (liste.filter((y) => y.d.n === x.d.n).length === 1) setze(x, 'keep', 'Your only copy of this exotic'); continue; }
    const besser = liste.find((y) => y !== x && y.d.q !== 6 && (y.d.e || 0) === (x.d.e || 0) && (y.tier || 0) >= (x.tier || 0) && ARMOR_STATS.every((n) => y.st[n] >= x.st[n]) && (y.st.Total > x.st.Total || (y.st.Total === x.st.Total && (y.locked || y.genutzt || aelter(y.id, x.id)))));
    if (besser) weg(x, `Outclassed: your ${besser.d.n} (total ${besser.st.Total}${besser.ort === 'tresor' ? ', vault' : ''}) is equal or better in every stat${x.d.e ? ' and from the same set' : ''}`);
  }
  for (const x of alle) x.m.putz = x.urteil?.art === 'junk' ? 'Dismantle suggestion' : x.urteil?.art === 'infuse' ? 'Infusion fuel' : x.urteil?.art === 'best' ? 'Best copy' : x.urteil?.art === 'frei' ? 'Undecided duplicate' : x.genutzt ? 'In a loadout' : '';
}
const merkmale = (x, anzahl, nachChar) => ({
  ort: x.ort === 'tresor' ? 'Vault' : x.ort.startsWith('post:') ? 'Postmaster' : nachChar[x.ort] || 'Character',
  element: x.d.t === 3 ? defs.schaden?.[x.element]?.n || '' : '',
  ammo: AMMO[x.d.a] || '',
  champ: x.champ ? CHAMP_NAME[x.champ.n] || x.champ.n : '',
  art: x.d.t === 3 ? x.d.k : '',
  frame: x.d.t === 3 ? x.plugs.map((p) => defs.items[p]).find((p) => p?.pc === 'intrinsics')?.n || '' : '',
  selten: SELTEN[x.d.q] || '',
  set: x.d.e ? defs.sets?.[x.d.e]?.n || '' : '',
  kopien: anzahl[x.hash] > 1 ? 'Duplicates' : 'Single',
  roll: x.d.t === 3 && x.d.q !== 6 ? bewerte(x.hash, x.plugs) : '',
  // Mehrere Werte: alle Trait-Perks (Spalten 3/4) und Origin-Perks, die auf diesem Item sitzen.
  perk: x.d.t === 3 ? [...new Set(x.plugs.map((p) => defs.items[p]).filter((p) => p && /^(frames|origins)$/.test(p.pc)).map((p) => p.n))] : [],
  quelle: (quelle(x.hash, x.d)?.text || '').replace(/^Source:\s*/i, '').slice(0, 48),
});
// Filter getrennt je Seite (Waffen / Rüstung), damit ein Waffen-Filter nicht die Rüstung leert.
const fAlle = (() => { try { return JSON.parse(localStorage.getItem('d2a.filter2') || '{}'); } catch { return {}; } })();
let filter = {}, letzteArt = null;
let suche = '', pruef = () => true, tagC = {}, notC = {}, auswahl = null; // auswahl: Set der markierten IDs im Mehrfach-Modus
const merke = () => { try { localStorage.setItem('d2a.filter2', JSON.stringify(fAlle)); } catch {} };

function passt(x) {
  if (x.st) for (const [n, v] of Object.entries(statMin)) if (v && x.st[n] < v) return false;
  for (const [g, werte] of Object.entries(filter)) if (werte.length && ![].concat(x.m[g] || []).some((v) => werte.includes(v))) return false;
  return suche ? pruef(x) : true;
}

// Sortierung und Gruppierung je Nutzer merken.
const SORT = {
  power: ['Power / total', (p, q) => (q.d.q === 6) - (p.d.q === 6) || (q.st?.Total || q.power) - (p.st?.Total || p.power) || p.d.n.localeCompare(q.d.n)],
  name: ['Name', (p, q) => p.d.n.localeCompare(q.d.n) || q.power - p.power],
  roll: ['Best rolls first', (p, q) => rang(q) - rang(p) || p.d.n.localeCompare(q.d.n)],
  putz: ['Clean-up: junk first', (p, q) => UR[q.urteil?.art || ''] - UR[p.urteil?.art || ''] || p.d.n.localeCompare(q.d.n) || rang(q) - rang(p)],
  kills: ['Most kills', (p, q) => q.kills - p.kills || p.d.n.localeCompare(q.d.n)],
  neu: ['Newest first', (p, q) => (BigInt(q.id) > BigInt(p.id) ? 1 : -1)],
};
const UR = { junk: 5, infuse: 4, frei: 3, best: 2, keep: 1, '': 0 };
const rang = (x) => (/god/.test(x.m?.roll || '') ? 3 : /good/.test(x.m?.roll || '') ? 2 : 0) + (x.rw ? Math.max(x.rw.pve?.von ? x.rw.pve.kann / x.rw.pve.von : 0, x.rw.pvp?.von ? x.rw.pvp.kann / x.rw.pvp.von : 0) : 0) + (x.d.q === 6 ? 0.5 : 0) + (x.st?.Total || 0) / 1000;
const ansicht = (() => { try { const a = { sort: 'power', typ: true, ...JSON.parse(localStorage.getItem('d2a.ansicht') || '{}') }; if (!a.v) { a.typ = true; a.v = 2; } return a; } catch { return { sort: 'power', typ: true }; } })();
const merkeAnsicht = () => { try { localStorage.setItem('d2a.ansicht', JSON.stringify(ansicht)); } catch {} };

const zuRaw = (() => { try { return JSON.parse(localStorage.getItem('d2a.zu') || '[]'); } catch { return []; } })();
const zu = new Set(zuRaw);

// Alle Teile inklusive Merkmalen und Urteil – für Hover-Fenster außerhalb des Tresors (Loadouts, Info-Karten).
export function alleMitUrteil(zustand) {
  const profil = zustand.profil; if (!profil) return [];
  if (zustand.alleItems?.fertig) return zustand.alleItems;
  const chars = Object.values(profil.characters?.data || {});
  const alle = sammle(profil);
  const nachChar = Object.fromEntries(chars.map((c) => [c.characterId, KLASSE[c.classType]]));
  const anzahl = {}; for (const x of alle) anzahl[x.hash] = (anzahl[x.hash] || 0) + 1;
  for (const x of alle) x.m = merkmale(x, anzahl, nachChar);
  aufraeumen(alle, profil);
  alle.fertig = true; zustand.alleItems = alle;
  return alle;
}

export function zeigeVault(haupt, zustand, art = 'waffen') {
  if (art !== letzteArt) { suche = ''; letzteArt = art; }
  filter = fAlle[art] || (fAlle[art] = {});
  const istWaffe = art === 'waffen';
  const profil = zustand.profil;
  const chars = Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (klasse === null) klasse = chars[0]?.classType ?? 2;
  const alle = sammle(profil);
  const nachChar = Object.fromEntries(chars.map((c) => [c.characterId, KLASSE[c.classType]]));
  const anzahl = {};
  for (const x of alle) anzahl[x.hash] = (anzahl[x.hash] || 0) + 1;
  for (const x of alle) x.m = merkmale(x, anzahl, nachChar);
  aufraeumen(alle, profil);
  alle.fertig = true; zustand.alleItems = alle;

  const tresorItems = (profil.profileInventory?.data?.items || []).filter((i) => i.bucketHash === 138197802);
  const tz = { alle: tresorItems.length, w: 0, r: 0 };
  for (const i of tresorItems) { const d = defs.items[i.itemHash]; if (d?.t === 3) tz.w += 1; else if (d?.t === 2) tz.r += 1; }
  const KISTEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/><rect x="8" y="5" width="8" height="7" rx="1"/><path d="M6 16h2M16 16h2M11 8h2"/></svg>';
  haupt.innerHTML = `<div class="kopf vkopf"><h1>${istWaffe ? 'Weapons' : 'Armor'}</h1><input id="suche" type="search" placeholder="Search … or is:dupe  perk:  stat:total:>=70" aria-label="Search" value="${esc(suche)}">
    <label class="vsort">Sort <select id="sortierung">${Object.entries(SORT).map(([k, [t]]) => `<option value="${k}" ${k === ansicht.sort ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <button class="chip" id="gruppieren" aria-pressed="${ansicht.typ}" title="Group each slot by ${istWaffe ? 'weapon type' : 'armor set'}">${istWaffe ? 'By type' : 'By set'}</button>
    <details class="tresorbox"><summary class="chip tresorzahl ${tz.alle > 1250 ? 'voll' : ''}" title="Vault space">${KISTEN}<span class="tz-l">Vault</span> <b>${tz.alle}</b>/1300</summary><div class="tpop"><b>Vault space</b><p>${tz.alle} of 1,300 vault slots used${tz.alle > 1250 ? ' – almost full, new drops will go to the Postmaster' : ''}. The vault is shared by all three characters; items on a character or in the Postmaster don't count.</p><div class="tzbar"><i style="width:${(tz.w / 13).toFixed(1)}%" class="w"></i><i style="width:${(tz.r / 13).toFixed(1)}%" class="r"></i><i style="width:${((tz.alle - tz.w - tz.r) / 13).toFixed(1)}%" class="s"></i></div><small><i class="w"></i>Weapons ${tz.w} <i class="r"></i>Armor ${tz.r} <i class="s"></i>Other ${tz.alle - tz.w - tz.r}</small><small>Limit 1,300 since update 9.7.0 (Monument of Triumph).</small></div></details>
    ${zustand.postZahl?.() ? `<button id="zurPost" class="chip postchip" title="Items waiting at the Postmaster">📬 ${zustand.postZahl()}</button>` : ''}<button id="mehrfach" class="chip" aria-pressed="${!!auswahl}" title="Select several items to move, lock or tag them together">☑ Select</button><button id="kGroesse" class="chip ikon" title="Tile size: compact / large" aria-label="Tile size">${document.documentElement.dataset.kachel === 'gross' ? '▣' : '▦'}</button><button id="neu" class="chip ikon" title="Reload inventory from Bungie" aria-label="Refresh">↻</button>
    <div class="chips" role="group" aria-label="Class" ${istWaffe ? 'hidden' : ''}>
    ${chars.map((c) => `<button class="chip" data-klasse="${c.classType}" aria-pressed="${c.classType === klasse}">${KLASSE[c.classType]} <small>${c.light}</small></button>`).join('')}
    </div></div><div id="filter" class="filter"></div><div id="aktivF" class="aktivf"></div>${istWaffe ? '' : `<div class="statmin" aria-label="Minimum stats">${[...ARMOR_STATS, 'Total'].map((n) => `<label>${n}<select data-stat="${n}">${(n === 'Total' ? [0, 60, 65, 70, 75, 80, 85, 90] : [0, 5, 10, 15, 20, 25, 30, 35]).map((v) => `<option value="${v}" ${Number(statMin[n] || 0) === v ? 'selected' : ''}>${v ? `${v}+` : 'any'}</option>`).join('')}</select></label>`).join('')}</div>`}<nav id="sprung" class="sprung" aria-label="Jump to slot"></nav><div id="reihen"></div>`;
  const fBox = haupt.querySelector('#filter');
  const rBox = haupt.querySelector('#reihen');
  const offen = new Set();

  const zeichneFilter = (sichtbar) => {
    fBox.innerHTML = GRUPPEN.map(([g, titel]) => {
      const zaehl = {};
      for (const x of sichtbar) for (const v of [].concat(x.m[g] || [])) zaehl[v] = (zaehl[v] || 0) + 1;
      const werte = Object.keys(zaehl).sort((a, b) => zaehl[b] - zaehl[a] || a.localeCompare(b));
      const regeln = g === 'putz' && istWaffe;
      if (!werte.length && !regeln) return '';
      const gewaehlt = filter[g] || [];
      return `<details data-gruppe="${g}" ${offen.has(g) ? 'open' : ''}><summary>${titel}${gewaehlt.length ? ` <b>${gewaehlt.length}</b>` : ''}</summary><div class="fpop"><div class="chips">
        ${werte.map((w) => `<button class="chip" data-g="${g}" data-w="${esc(w)}" aria-pressed="${gewaehlt.includes(w)}">${esc(w)} <small>${zaehl[w]}</small></button>`).join('') || '<small class="leer">No duplicates to clean up.</small>'}</div>
        ${regeln ? `<div class="putzregeln"><b>Clean-up rules</b><small>Only duplicates of the same weapon can get a red “dismantle” mark. Hover a weapon to see why it stays or goes.</small>${PUTZ_REGELN.filter(([k]) => k !== 'neu').map(([k, t, e]) => `<label class="haken" title="${esc(e)}"><input type="checkbox" data-putz="${k}" ${putzRegeln[k] ? 'checked' : ''}> ${t}</label>`).join('')}<small>Always kept: equipped, locked, in an in-game loadout, tagged Keep/Favorite, your best PvE and best PvP copy, your only copy of the highest tier, your most-used copy. A roll is judged by every perk you can select on it, not only the active ones. Without community roll data only exact duplicates are marked.</small></div>` : ''}</div></details>`;
    }).join('');
    const aktiv = Object.entries(filter).flatMap(([g, l]) => l.map((w) => [g, w]));
    haupt.querySelector('#aktivF').innerHTML = aktiv.length ? `${aktiv.map(([g, w]) => `<button class="chip an" data-g="${g}" data-w="${esc(w)}" title="Remove filter">${esc(w)} ✕</button>`).join('')}<button id="leeren" class="chip">Clear all</button>` : '';
  };
  const zeichne = () => {
    tagC = tagListe(); notC = notizen();
    const klassenItems = alle.filter((x) => (istWaffe ? WAFFE.has(x.d.b) : !WAFFE.has(x.d.b) && (x.d.c === klasse || x.d.c === 3)));
    zeichneFilter(klassenItems);
    const sichtbar = klassenItems.filter(passt);
    const sortiere = SORT[ansicht.sort]?.[1] || SORT.power[1];
    const teile = SLOTS.map(([b, name]) => [b, name, sichtbar.filter((x) => x.d.b === b).sort(sortiere)]).filter(([, , st]) => st.length);
    haupt.querySelector('#sprung').innerHTML = (teile.length > 1 ? teile.map(([, name, st]) => `<button class="chip" data-spring="${name}">${name} <small>${st.length}</small></button>`).join('') : '') + '<span class="vlegende"><span data-tip="Where the item is: yellow = vault, green = on a character, red = Postmaster."><i class="ort tresor"></i><i class="ort char"></i><i class="ort post"></i>location</span><span data-tip="A complete community god roll (green = PvE, blue = PvP)."><b class="lg-god">★</b>god roll</span><span data-tip="Gold frame = masterworked."><b class="lg-mw"></b>masterwork</span><span data-tip="Clean-up suggestion. JUNK = duplicate with a weaker roll, FUEL = junk with high power (infuse it), BEST = best of your copies, ? = undecided duplicate. Hover the item for the reason."><i class="ub ub-junk">JUNK</i><i class="ub ub-infuse">FUEL</i><i class="ub ub-best">BEST</i>clean-up</span></span>';
    const reihen = teile.map(([, name, st]) => {
      const offenR = !zu.has(name);
      let inhalt = '';
      if (offenR) {
        if (ansicht.typ) {
          const g = new Map();
          for (const x of st) { const k = istWaffe ? x.d.k : x.d.q === 6 ? 'Exotic' : x.m.set || 'No set'; g.set(k, [...(g.get(k) || []), x]); }
          inhalt = `<div class="tgruppen">${[...g].sort((a, b) => (istWaffe ? a[0].localeCompare(b[0]) : a[0] === 'Exotic' ? -1 : b[0] === 'Exotic' ? 1 : b[1].length - a[1].length)).map(([k, l]) => `<div class="tgr"><small>${esc(k)} <b>${l.length}</b></small><div class="raster">${l.map(kachel).join('')}</div></div>`).join('')}</div>`;
        } else inhalt = `<div class="raster">${st.map(kachel).join('')}</div>`;
      }
      return `<section class="reihe ${offenR ? '' : 'zu'}" id="slot-${name.replace(/\s/g, '')}"><h3><button class="klapp" data-reihe="${name}" aria-expanded="${offenR}">${offenR ? '▾' : '▸'} ${name} <small>${st.length}</small></button></h3>${inhalt}</section>`;
    }).join('');
    rBox.innerHTML = reihen || `<p class="leer">${Object.values(filter).some((l) => l.length) || suche || Object.values(statMin || {}).some(Boolean) ? 'Nothing matches these filters.' : 'Nothing here for this class yet.'}</p>`;
    haupt.querySelectorAll('[data-klasse]').forEach((c) => c.setAttribute('aria-pressed', Number(c.dataset.klasse) === klasse));
    haupt.querySelector('#mehrfach')?.setAttribute('aria-pressed', !!auswahl);
    let ml = haupt.querySelector('#mfach');
    if (!auswahl) { ml?.remove(); return; }
    if (!ml) { ml = document.createElement('div'); ml.id = 'mfach'; haupt.append(ml); }
    ml.dataset.leer = auswahl.size ? '' : '1';
    ml.innerHTML = `<b>${auswahl.size}</b><span class="mf-t">selected</span><button data-mfach="alle" title="Select everything shown">All shown</button>
      <span class="mf-g">${chars.map((c) => `<button data-mfach="zu" data-c="${c.characterId}" title="Move to ${KLASSE[c.classType]}">→ ${KLASSE[c.classType][0]}</button>`).join('')}<button data-mfach="tresor" title="Move to vault">→ ${KISTEN}</button></span>
      <span class="mf-g"><button data-mfach="lock" title="Lock">🔒</button><button data-mfach="unlock" title="Unlock">🔓</button></span>
      <span class="mf-g">${TAGS.map(([t, e, n]) => `<button data-mfach="tag:${t}" title="${n}">${e}</button>`).join('')}<button data-mfach="tag:" title="Remove tag">⌫</button></span>
      <button data-mfach="ende" class="mf-zu" title="Done">✕</button>`;
    sichtbarC = sichtbar;
  };
  let sichtbarC = [];
  zeichne();
  async function mehrfachAktion(a, cid) {
    if (a === 'ende') { auswahl = null; return zeichne(); }
    if (a === 'alle') { sichtbarC.forEach((x) => auswahl.add(x.id)); return zeichne(); }
    const liste = alle.filter((x) => auswahl.has(x.id)); if (!liste.length) return;
    if (a.startsWith('tag:')) { liste.forEach((x) => setzeTag(x.id, a.slice(4) || null)); return zeichne(); }
    const { meldung } = await import('./app.js'); const bungie = await import('./bungie.js'); const k = zustand.konto; let ok = 0, fehl = 0;
    haupt.querySelector('#mfach')?.classList.add('laeuft');
    for (const x of liste) {
      try {
        if (a === 'lock' || a === 'unlock') {
          const zu = a === 'lock'; if (x.locked === zu) { ok++; continue; }
          const c = x.ort === 'tresor' || x.ort.startsWith('post:') ? chars[0].characterId : x.ort;
          await bungie.post('/Destiny2/Actions/Items/SetLockState/', { state: zu, itemId: x.id, characterId: c, membershipType: k.membershipType }); x.locked = zu;
        } else {
          const ziel = a === 'tresor' ? 'tresor' : cid; let ort = x.ort;
          if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); }
          if (ort !== ziel && ort !== 'tresor') { if (x.angelegt) await ersatzAnlegen(zustand, x); await bungie.verschiebe(k, x, ort, true); }
          if (ziel !== 'tresor' && ort !== ziel) await zumCharakter(zustand, x, ziel, new Set(liste.map((y) => y.id)));
          merkeAenderung(x.id, { ort: ziel, angelegt: false }); x.ort = ziel; x.angelegt = false;
        }
        ok++;
      } catch { fehl++; }
      meldung(`${ok + fehl} / ${liste.length} …`);
    }
    meldung(fehl ? `${ok} done, ${fehl} failed (equipped or no space).` : `Done: ${ok} items.`, !!fehl);
    zeichne();
  }

  haupt.querySelectorAll('[data-stat]').forEach((sel) => { sel.onchange = () => { statMin[sel.dataset.stat] = Number(sel.value); try { localStorage.setItem('d2a.statmin', JSON.stringify(statMin)); } catch {} zeichne(); }; });
  fBox.addEventListener('change', (e) => { const k = e.target.dataset?.putz; if (!k) return; setzePutz(k, e.target.checked); aufraeumen(alle, profil); zeichne(); });
  const sEl = haupt.querySelector('#suche');
  const neuSuche = () => { suche = sEl.value.trim().toLowerCase(); pruef = baueSuche(suche, alle); zeichne(); };
  pruef = baueSuche(suche, alle);
  sEl.oninput = neuSuche;
  verbindeVorschlaege(sEl, neuSuche);
  fBox.addEventListener('toggle', (e) => {
    const g = e.target.dataset?.gruppe;
    if (!g) return;
    if (e.target.open) { offen.clear(); offen.add(g); fBox.querySelectorAll('details[open]').forEach((d) => d !== e.target && (d.open = false)); } else offen.delete(g);
  }, true);
  haupt.querySelector('#sortierung').onchange = (e) => { ansicht.sort = e.target.value; merkeAnsicht(); zeichne(); };
  // Popups schließen, wenn außerhalb geklickt wird.
  const zuKlick = (e) => { if (!haupt.isConnected) return document.removeEventListener('pointerdown', zuKlick); if (!e.target.closest('.filter details,.tresorbox')) { haupt.querySelectorAll('.filter details[open],.tresorbox[open]').forEach((d) => { d.open = false; }); offen.clear(); } };
  document.addEventListener('pointerdown', zuKlick);
  haupt.onclick = (e) => {
    if (e.target.closest('#kGroesse')) { const g = document.documentElement.dataset.kachel === 'gross' ? 'klein' : 'gross'; document.documentElement.dataset.kachel = g; try { localStorage.setItem('d2a.kachel', g); } catch {} e.target.closest('#kGroesse').textContent = g === 'gross' ? '▣' : '▦'; return; }
    const c = e.target.closest('[data-klasse]');
    if (c) { klasse = Number(c.dataset.klasse); return zeichne(); }
    const f = e.target.closest('[data-g]');
    if (f) {
      const liste = filter[f.dataset.g] || [];
      const w = f.dataset.w;
      filter[f.dataset.g] = liste.includes(w) ? liste.filter((x) => x !== w) : [...liste, w];
      merke();
      return zeichne();
    }
    if (e.target.id === 'leeren') { filter = fAlle[art] = {}; merke(); return zeichne(); }
    if (e.target.closest('#gruppieren')) { ansicht.typ = !ansicht.typ; merkeAnsicht(); e.target.closest('#gruppieren').setAttribute('aria-pressed', ansicht.typ); return zeichne(); }
    const sp = e.target.closest('[data-spring]');
    if (sp) { const n = sp.dataset.spring; if (zu.has(n)) { zu.delete(n); zeichne(); } return haupt.querySelector(`#slot-${n.replace(/\s/g, '')}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (e.target.id === 'neu') return zustand.neuLaden();
    if (e.target.closest('#zurPost')) return zustand.oeffnePanel?.('post');
    const r = e.target.closest('[data-reihe]');
    if (r) {
      const n = r.dataset.reihe;
      if (zu.has(n)) zu.delete(n); else zu.add(n);
      try { localStorage.setItem('d2a.zu', JSON.stringify([...zu])); } catch {}
      return zeichne();
    }
    if (e.target.closest('#mehrfach')) { auswahl = auswahl ? null : new Set(); return zeichne(); }
    const ma = e.target.closest('[data-mfach]');
    if (ma) return mehrfachAktion(ma.dataset.mfach, ma.dataset.c);
    const k = e.target.closest('.ic');
    if (k && auswahl) { if (auswahl.has(k.dataset.id)) auswahl.delete(k.dataset.id); else auswahl.add(k.dataset.id); return zeichne(); }
    if (k) { tipp.hidden = true; oeffneDetail(alle.find((a) => a.id === k.dataset.id), zustand, () => zeigeVault(haupt, zustand, art)); }
  };
  const tipp = document.querySelector('#tipp');
  const zeige = (el, x, y) => {
    const it = alle.find((a) => a.id === el.dataset.id);
    if (!it) return;
    zeigeItemTipp(it, zustand.profil, x, y, el);
  };
  haupt.oncontextmenu = (e) => { if (e.target.closest('.ic')) e.preventDefault(); };
  haupt.onpointerover = (e) => { if (auswahl || e.pointerType !== 'mouse') return; const el = e.target.closest('.ic'); if (el) zeige(el, e.clientX, e.clientY); };
  haupt.onpointerout = (e) => { if (e.target.closest('.ic') && !e.relatedTarget?.closest?.('.ic,#tipp')) tipp.hidden = true; };
  haupt.onfocusin = (e) => { if (!matchMedia('(hover: hover)').matches) return; const el = e.target.closest('.ic'); if (el) { const r = el.getBoundingClientRect(); zeige(el, r.right, r.top); } };
  haupt.onfocusout = () => { tipp.hidden = true; };
}
