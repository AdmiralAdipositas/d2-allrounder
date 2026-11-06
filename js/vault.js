// Tresor: alle Waffen und Rüstungen, gruppiert nach Slot, nebeneinander gestapelt.
import { defs, champion, CHAMP_NAME } from './defs.js';
import { oeffneDetail } from './detail.js';

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

// Alles aus dem Profil zu einer flachen Liste machen.
export function sammle(profil) {
  const inst = profil.itemComponents?.instances?.data || {};
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
    const plugs = (sockel[it.itemInstanceId]?.sockets || []).map((s) => s.plugHash).filter(Boolean);
    liste.push({
      id: it.itemInstanceId, hash: it.itemHash, d, ort, angelegt, plugs,
      power: i.primaryStat?.value || 0, element: i.damageType || d.d0 || 0,
      champ: d.t === 3 ? champion(it.itemHash, plugs, i.breakerType) : null,
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
    ${champ}<i class="ort ${ort}"></i>${x.power ? `<span class="pow">${x.power}</span>` : ''}</div>`;
}

// Filtergruppen: innerhalb einer Gruppe ODER, zwischen Gruppen UND.
const AMMO = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const SELTEN = { 6: 'Exotic', 5: 'Legendary', 4: 'Rare', 3: 'Uncommon', 2: 'Common' };
const GRUPPEN = [
  ['ort', 'Location'], ['element', 'Element'], ['ammo', 'Ammo'], ['champ', 'Champion'], ['art', 'Weapon type'], ['frame', 'Frame'],
  ['selten', 'Rarity'], ['set', 'Armor set'], ['kopien', 'Copies'],
];
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
});
let filter = (() => { try { return JSON.parse(localStorage.getItem('d2a.filter') || '{}'); } catch { return {}; } })();
let suche = '';
const merke = () => { try { localStorage.setItem('d2a.filter', JSON.stringify(filter)); } catch {} };

function passt(x) {
  for (const [g, werte] of Object.entries(filter)) if (werte.length && !werte.includes(x.m[g])) return false;
  if (!suche) return true;
  const plugNamen = x.plugs.map((p) => defs.items[p]?.n || '').join(' ');
  return suche.split(/\s+/).every((w) => `${x.d.n} ${x.d.k} ${plugNamen} ${Object.values(x.m).join(' ')}`.toLowerCase().includes(w));
}

export function zeigeVault(haupt, zustand) {
  const profil = zustand.profil;
  const chars = Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (klasse === null) klasse = chars[0]?.classType ?? 2;
  const alle = sammle(profil);
  const nachChar = Object.fromEntries(chars.map((c) => [c.characterId, KLASSE[c.classType]]));
  const anzahl = {};
  for (const x of alle) anzahl[x.hash] = (anzahl[x.hash] || 0) + 1;
  for (const x of alle) x.m = merkmale(x, anzahl, nachChar);

  haupt.innerHTML = `<div class="kopf"><h1>Vault</h1><input id="suche" type="search" placeholder="Search name, perk, frame…" aria-label="Search" value="${esc(suche)}">
    <button id="neu" class="chip" title="Reload from Bungie">↻ Refresh</button><span class="platz"></span><div class="chips" role="group" aria-label="Class">
    ${chars.map((c) => `<button class="chip" data-klasse="${c.classType}" aria-pressed="${c.classType === klasse}">${KLASSE[c.classType]} <small>${c.light}</small></button>`).join('')}
    </div></div><div id="filter" class="filter"></div><div id="reihen"></div>`;
  const fBox = haupt.querySelector('#filter');
  const rBox = haupt.querySelector('#reihen');
  const offen = new Set(JSON.parse((() => { try { return localStorage.getItem('d2a.offen'); } catch { return null; } })() || '[]'));

  const zeichneFilter = (sichtbar) => {
    const aktiv = Object.values(filter).flat().length;
    fBox.innerHTML = GRUPPEN.map(([g, titel]) => {
      const zaehl = {};
      for (const x of sichtbar) if (x.m[g]) zaehl[x.m[g]] = (zaehl[x.m[g]] || 0) + 1;
      const werte = Object.keys(zaehl).sort((a, b) => zaehl[b] - zaehl[a] || a.localeCompare(b));
      if (!werte.length) return '';
      const gewaehlt = filter[g] || [];
      return `<details data-gruppe="${g}" ${offen.has(g) ? 'open' : ''}><summary>${titel}${gewaehlt.length ? ` <b>${gewaehlt.length}</b>` : ''}</summary><div class="chips">
        ${werte.map((w) => `<button class="chip" data-g="${g}" data-w="${esc(w)}" aria-pressed="${gewaehlt.includes(w)}">${esc(w)} <small>${zaehl[w]}</small></button>`).join('')}</div></details>`;
    }).join('') + (aktiv ? '<button id="leeren" class="chip">Clear filters</button>' : '');
  };
  const zeichne = () => {
    const klassenItems = alle.filter((x) => WAFFE.has(x.d.b) || x.d.c === klasse || x.d.c === 3);
    zeichneFilter(klassenItems);
    const sichtbar = klassenItems.filter(passt);
    const reihen = SLOTS.map(([b, name]) => {
      const st = sichtbar.filter((x) => x.d.b === b).sort((p, q) => (q.d.q === 6) - (p.d.q === 6) || q.power - p.power || p.d.n.localeCompare(q.d.n));
      return st.length ? `<section class="reihe"><h3>${name} <small>${st.length}</small></h3><div class="raster">${st.map(kachel).join('')}</div></section>` : '';
    }).join('');
    rBox.innerHTML = reihen || '<p class="leer">Nothing matches these filters.</p>';
    haupt.querySelectorAll('[data-klasse]').forEach((c) => c.setAttribute('aria-pressed', Number(c.dataset.klasse) === klasse));
  };
  zeichne();

  haupt.querySelector('#suche').oninput = (e) => { suche = e.target.value.trim().toLowerCase(); zeichne(); };
  fBox.addEventListener('toggle', (e) => {
    const g = e.target.dataset?.gruppe;
    if (!g) return;
    if (e.target.open) offen.add(g); else offen.delete(g);
    try { localStorage.setItem('d2a.offen', JSON.stringify([...offen])); } catch {}
  }, true);
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
    if (e.target.id === 'neu') return zustand.neuLaden();
    const k = e.target.closest('.ic');
    if (k) { tipp.hidden = true; oeffneDetail(alle.find((a) => a.id === k.dataset.id), zustand, () => zeigeVault(haupt, zustand)); }
  };
  const tipp = document.querySelector('#tipp');
  const zeige = (el, x, y) => {
    const it = alle.find((a) => a.id === el.dataset.id);
    if (!it) return;
    const perks = it.plugs.map((p) => defs.items[p]).filter((p) => p?.i && p.pc && !NEBENSACHE.test(p.pc));
    const wo = `${it.m.ort}${it.angelegt ? ', equipped' : ''}`;
    const champ = it.champ ? ` · ${esc(it.m.champ)}` : '';
    const frame = it.m.frame ? ` · ${esc(it.m.frame)}` : '';
    const set = it.m.set ? ` · ${esc(it.m.set)}` : '';
    tipp.innerHTML = `<b>${esc(it.d.n)}</b><small>${esc(it.d.k)}${it.power ? ` · ${it.power}` : ''}${frame}${champ}${set} · ${wo}</small>
      <div class="perks">${perks.slice(0, 10).map((p) => `<i title="${esc(p.n)}" style="background-image:url(${BILD}${p.i})"></i>`).join('')}</div>`;
    tipp.hidden = false;
    const r = tipp.getBoundingClientRect();
    tipp.style.left = `${Math.min(x + 14, innerWidth - r.width - 8)}px`;
    tipp.style.top = `${Math.min(y + 14, innerHeight - r.height - 8)}px`;
  };
  haupt.onpointerover = (e) => { const el = e.target.closest('.ic'); if (el) zeige(el, e.clientX, e.clientY); };
  haupt.onpointerout = (e) => { if (e.target.closest('.ic') && !e.relatedTarget?.closest?.('.ic')) tipp.hidden = true; };
  haupt.onfocusin = (e) => { const el = e.target.closest('.ic'); if (el) { const r = el.getBoundingClientRect(); zeige(el, r.right, r.top); } };
  haupt.onfocusout = () => { tipp.hidden = true; };
}
