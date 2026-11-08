// Tresor: alle Waffen und Rüstungen, gruppiert nach Slot, nebeneinander gestapelt.
import { defs, champion, CHAMP_NAME } from './defs.js';
import { oeffneDetail } from './detail.js';
import { bewerte } from './rolls.js';
import { quelle } from './quellen.js';
import { zeigeItemTipp } from './itemtipp.js';

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
      power: i.primaryStat?.value || 0, mw: (it.state & 4) === 4, crafted: (it.state & 8) === 8, element: i.damageType || d.d0 || 0, energie: i.energy?.energyCapacity || 0,
      champ: d.t === 3 ? champion(it.itemHash, plugs, i.breakerType) : null,
      st: d.t === 2 ? armorStats(statDaten[it.itemInstanceId]) : null,
    });
  };
  for (const it of profil.profileInventory?.data?.items || []) nimm(it, 'tresor');
  for (const [cid, inv] of Object.entries(profil.characterInventories?.data || {})) for (const it of inv.items) nimm(it, cid);
  for (const [cid, inv] of Object.entries(profil.characterEquipment?.data || {})) for (const it of inv.items) nimm(it, cid, true);
  return liste;
}

function kachel(x) {
  const champ = x.champ ? `<i class="ch" style="background-image:url(${BILD}${x.champ.i})" aria-label="${esc(CHAMP_NAME[x.champ.n] || x.champ.n)}"></i>` : '';
  const ort = x.ort === 'tresor' ? 'tresor' : x.ort.startsWith('post:') ? 'post' : 'char';
  return `<div class="ic ${x.d.q === 6 ? 'exotic' : ''} ${x.d.t === 3 ? `el-${x.element}` : ''}" data-id="${x.id}" tabindex="0" style="background-image:url(${BILD}${x.d.i})">
    ${champ}<i class="ort ${ort}"></i>${/god/.test(x.m?.roll || '') ? `<i class="god ${/PvP/.test(x.m.roll) ? 'pvp' : ''}" title="${x.m.roll}"></i>` : ''}${!(filter.putz || []).length ? '' : x.junk ? '<i class="mark junk" title="Dismantle suggestion"></i>' : x.fuel ? '<i class="mark fuel" title="Infusion fuel"></i>' : ''}${x.st ? `<span class="pow tot" title="Total stats">${x.st.Total}</span>` : x.power ? `<span class="pow">${x.power}</span>` : ''}</div>`;
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

// Behalten: in Loadouts, angelegt, gesperrt, laut Schaltern geschützt, oder die beste Kopie (PvE und PvP getrennt).
// Infusions-Futter: nicht genutzt, aber stärker als das schwächste genutzte Teil im gleichen Slot (pro Slot die zwei stärksten).
function aufraeumen(alle, profil) {
  const genutzt = new Set();
  for (const c of Object.values(profil.characterLoadouts?.data || {})) for (const l of c.loadouts || []) for (const i of l.items || []) genutzt.add(i.itemInstanceId);
  for (const x of alle) if (x.angelegt) genutzt.add(x.id);
  const fuel = new Set();
  const proSlot = new Map();
  for (const x of alle) { const f = proSlot.get(x.d.b) || { g: [], f: [] }; (genutzt.has(x.id) ? f.g : f.f).push(x); proSlot.set(x.d.b, f); }
  for (const f of proSlot.values()) {
    const p = f.g.map((x) => x.power).filter(Boolean);
    if (!p.length) continue;
    const schwach = Math.min(...p);
    f.f.filter((x) => x.power > schwach).sort((a, b) => b.power - a.power).slice(0, 2).forEach((x) => fuel.add(x.id));
  }
  const gruppen = new Map();
  for (const x of alle) if (x.d.t === 3) gruppen.set(x.hash, [...(gruppen.get(x.hash) || []), x]);
  for (const x of alle) { x.genutzt = genutzt.has(x.id); x.fuel = fuel.has(x.id); x.junk = false; x.grund = ''; }
  const R = putzRegeln;
  for (const kopien of gruppen.values()) {
    if (kopien.length < 2) { kopien[0].grund = 'Only copy'; continue; }
    const wert = (k) => (k.genutzt ? 1000 : 0) + (k.locked ? 500 : 0) + (/god/.test(k.m.roll) ? 300 : /good/.test(k.m.roll) ? 100 : 0) + (k.crafted ? 80 : 0) + (k.mw ? 40 : 0) + k.plugs.length * 2 + k.power / 1000;
    const beste = [...kopien].sort((a, b) => wert(b) - wert(a))[0];
    const bestPvp = [...kopien].filter((k) => /PvP/.test(k.m.roll)).sort((a, b) => wert(b) - wert(a))[0];
    for (const k of kopien) {
      k.grund = k.angelegt ? 'Equipped' : k.genutzt ? 'In an in-game loadout' : k.locked ? 'Locked' : R.exo && k.d.q === 6 ? 'Exotic (rule: keep all exotics)'
        : k === beste ? `Best of your ${kopien.length} copies` : k === bestPvp ? 'Best PvP copy' : R.god && /god/.test(k.m.roll) ? `${k.m.roll} (rule)` : R.gut && /good/.test(k.m.roll) ? `${k.m.roll} (rule)`
        : R.mw && (k.crafted || k.mw) ? `${k.crafted ? 'Crafted' : 'Masterworked'} (rule)` : k.fuel ? 'Infusion fuel (stronger than a weapon you use)' : '';
      if (!k.grund) { k.junk = true; k.grund = `Duplicate: worse roll than your best copy${beste.m.roll ? ` (${beste.m.roll})` : ''}, not locked, not in a loadout`; }
    }
  }
  for (const x of alle) x.m.putz = x.junk ? 'Dismantle suggestion' : x.fuel ? 'Infusion fuel' : x.genutzt ? 'In a loadout' : '';
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
let filter = (() => { try { return JSON.parse(localStorage.getItem('d2a.filter') || '{}'); } catch { return {}; } })();
let suche = '';
const merke = () => { try { localStorage.setItem('d2a.filter', JSON.stringify(filter)); } catch {} };

function passt(x) {
  if (x.st) for (const [n, v] of Object.entries(statMin)) if (v && x.st[n] < v) return false;
  for (const [g, werte] of Object.entries(filter)) if (werte.length && ![].concat(x.m[g] || []).some((v) => werte.includes(v))) return false;
  if (!suche) return true;
  const plugNamen = x.plugs.map((p) => defs.items[p]?.n || '').join(' ');
  return suche.split(/\s+/).every((w) => `${x.d.n} ${x.d.k} ${plugNamen} ${Object.values(x.m).join(' ')}`.toLowerCase().includes(w));
}

// Sortierung und Gruppierung je Nutzer merken.
const SORT = {
  power: ['Power / total', (p, q) => (q.d.q === 6) - (p.d.q === 6) || (q.st?.Total || q.power) - (p.st?.Total || p.power) || p.d.n.localeCompare(q.d.n)],
  name: ['Name', (p, q) => p.d.n.localeCompare(q.d.n) || q.power - p.power],
  roll: ['Best rolls first', (p, q) => rang(q) - rang(p) || p.d.n.localeCompare(q.d.n)],
  neu: ['Newest first', (p, q) => (BigInt(q.id) > BigInt(p.id) ? 1 : -1)],
};
const rang = (x) => (/god/.test(x.m?.roll || '') ? 3 : /good/.test(x.m?.roll || '') ? 2 : 0) + (x.d.q === 6 ? 0.5 : 0) + (x.st?.Total || 0) / 1000;
const ansicht = (() => { try { const a = { sort: 'power', typ: true, ...JSON.parse(localStorage.getItem('d2a.ansicht') || '{}') }; if (!a.v) { a.typ = true; a.v = 2; } return a; } catch { return { sort: 'power', typ: true }; } })();
const merkeAnsicht = () => { try { localStorage.setItem('d2a.ansicht', JSON.stringify(ansicht)); } catch {} };

const zuRaw = (() => { try { return JSON.parse(localStorage.getItem('d2a.zu') || '[]'); } catch { return []; } })();
const zu = new Set(zuRaw);

export function zeigeVault(haupt, zustand, art = 'waffen') {
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
  zustand.alleItems = alle;

  const tresorItems = (profil.profileInventory?.data?.items || []).filter((i) => i.bucketHash === 138197802);
  const tz = { alle: tresorItems.length, w: 0, r: 0 };
  for (const i of tresorItems) { const d = defs.items[i.itemHash]; if (d?.t === 3) tz.w += 1; else if (d?.t === 2) tz.r += 1; }
  const KISTEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/><rect x="8" y="5" width="8" height="7" rx="1"/><path d="M6 16h2M16 16h2M11 8h2"/></svg>';
  haupt.innerHTML = `<div class="kopf vkopf"><h1>${istWaffe ? 'Weapons' : 'Armor'}</h1><input id="suche" type="search" placeholder="Search name, perk, frame, type…" aria-label="Search" value="${esc(suche)}">
    <label class="vsort">Sort <select id="sortierung">${Object.entries(SORT).map(([k, [t]]) => `<option value="${k}" ${k === ansicht.sort ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <button class="chip" id="gruppieren" aria-pressed="${ansicht.typ}" title="Group each slot by ${istWaffe ? 'weapon type' : 'armor set'}">${istWaffe ? 'By type' : 'By set'}</button>
    <details class="tresorbox"><summary class="chip tresorzahl ${tz.alle > 1250 ? 'voll' : ''}" title="Vault space">${KISTEN}<b>${tz.alle}</b>/1300</summary><div class="tpop"><b>Vault space</b><p>${tz.alle} of 1,300 vault slots used${tz.alle > 1250 ? ' – almost full, new drops will go to the Postmaster' : ''}. The vault is shared by all three characters; items on a character or in the Postmaster don't count.</p><div class="tzbar"><i style="width:${(tz.w / 13).toFixed(1)}%" class="w"></i><i style="width:${(tz.r / 13).toFixed(1)}%" class="r"></i><i style="width:${((tz.alle - tz.w - tz.r) / 13).toFixed(1)}%" class="s"></i></div><small><i class="w"></i>Weapons ${tz.w} <i class="r"></i>Armor ${tz.r} <i class="s"></i>Other ${tz.alle - tz.w - tz.r}</small><small>Limit 1,300 since update 9.7.0 (Monument of Triumph).</small></div></details>
    ${zustand.postZahl?.() ? `<button id="zurPost" class="chip postchip" title="Items waiting at the Postmaster">📬 ${zustand.postZahl()}</button>` : ''}<button id="neu" class="chip ikon" title="Reload inventory from Bungie" aria-label="Refresh">↻</button>
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
        ${regeln ? `<div class="putzregeln"><b>Clean-up rules</b><small>Only duplicates of the same weapon can get a red “dismantle” mark. Hover a weapon to see why it stays or goes.</small>${PUTZ_REGELN.filter(([k]) => k !== 'neu').map(([k, t, e]) => `<label class="haken" title="${esc(e)}"><input type="checkbox" data-putz="${k}" ${putzRegeln[k] ? 'checked' : ''}> ${t}</label>`).join('')}<small>Always kept: equipped, locked, in an in-game loadout, the best copy and the best PvP copy, infusion fuel.</small></div>` : ''}</div></details>`;
    }).join('');
    const aktiv = Object.entries(filter).flatMap(([g, l]) => l.map((w) => [g, w]));
    haupt.querySelector('#aktivF').innerHTML = aktiv.length ? `${aktiv.map(([g, w]) => `<button class="chip an" data-g="${g}" data-w="${esc(w)}" title="Remove filter">${esc(w)} ✕</button>`).join('')}<button id="leeren" class="chip">Clear all</button>` : '';
  };
  const zeichne = () => {
    const klassenItems = alle.filter((x) => (istWaffe ? WAFFE.has(x.d.b) : !WAFFE.has(x.d.b) && (x.d.c === klasse || x.d.c === 3)));
    zeichneFilter(klassenItems);
    const sichtbar = klassenItems.filter(passt);
    const sortiere = SORT[ansicht.sort]?.[1] || SORT.power[1];
    const teile = SLOTS.map(([b, name]) => [b, name, sichtbar.filter((x) => x.d.b === b).sort(sortiere)]).filter(([, , st]) => st.length);
    haupt.querySelector('#sprung').innerHTML = teile.length > 1 ? teile.map(([, name, st]) => `<button class="chip" data-spring="${name}">${name} <small>${st.length}</small></button>`).join('') : '';
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
    rBox.innerHTML = reihen || '<p class="leer">Nothing matches these filters.</p>';
    haupt.querySelectorAll('[data-klasse]').forEach((c) => c.setAttribute('aria-pressed', Number(c.dataset.klasse) === klasse));
  };
  zeichne();

  haupt.querySelectorAll('[data-stat]').forEach((sel) => { sel.onchange = () => { statMin[sel.dataset.stat] = Number(sel.value); try { localStorage.setItem('d2a.statmin', JSON.stringify(statMin)); } catch {} zeichne(); }; });
  fBox.addEventListener('change', (e) => { const k = e.target.dataset?.putz; if (!k) return; setzePutz(k, e.target.checked); aufraeumen(alle, profil); zeichne(); });
  haupt.querySelector('#suche').oninput = (e) => { suche = e.target.value.trim().toLowerCase(); zeichne(); };
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
    if (e.target.id === 'leeren') { filter = {}; merke(); return zeichne(); }
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
    const k = e.target.closest('.ic');
    if (k) { tipp.hidden = true; oeffneDetail(alle.find((a) => a.id === k.dataset.id), zustand, () => zeigeVault(haupt, zustand, art)); }
  };
  const tipp = document.querySelector('#tipp');
  const zeige = (el, x, y) => {
    const it = alle.find((a) => a.id === el.dataset.id);
    if (!it) return;
    zeigeItemTipp(it, zustand.profil, x, y);
  };
  haupt.onpointerover = (e) => { const el = e.target.closest('.ic'); if (el) zeige(el, e.clientX, e.clientY); };
  haupt.onpointerout = (e) => { if (e.target.closest('.ic') && !e.relatedTarget?.closest?.('.ic')) tipp.hidden = true; };
  haupt.onfocusin = (e) => { const el = e.target.closest('.ic'); if (el) { const r = el.getBoundingClientRect(); zeige(el, r.right, r.top); } };
  haupt.onfocusout = () => { tipp.hidden = true; };
}
