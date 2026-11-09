// Inventar (Startseite): Hüter, Waffen und Rüstung in einer Ansicht.
// Breiter Bildschirm: alle Charaktere nebeneinander + Tresor. Handy: aktiver Charakter groß, die anderen als schmale Streifen
// (beim Ziehen klappt der Streifen unter dem Finger auf), Tresor darunter.
// Klick auf Waffe/Rüstung öffnet die Detailansicht (Anlegen, Verschieben, Sperren).
import { defs } from './defs.js';
import { sammle, ARMOR_STATS, merkeAenderung, zumCharakter, ersatzAnlegen } from './vault.js';
import * as bungie from './bungie.js';
import { meldung } from './app.js';
import { oeffneDetail } from './detail.js';
import { zeigeItemTipp } from './itemtipp.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const RASSE = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Gear Tier wie im Spiel: senkrechte gelbe Rauten links oben (1–5).
const tierPips = (t) => (t > 0 ? `<span class="ck-tier" title="Gear Tier ${t}">${'<b></b>'.repeat(Math.min(5, t))}</span>` : '');
const WTYP_SVG = { 'Auto Rifle': 'auto', 'Combat Bow': 'bow', 'Fusion Rifle': 'fusion', 'Grenade Launcher': 'gl', 'Hand Cannon': 'hc', 'Linear Fusion Rifle': 'lfr', 'Pulse Rifle': 'pulse', 'Scout Rifle': 'scout', 'Shotgun': 'shotgun', 'Sidearm': 'sidearm', 'Sniper Rifle': 'sniper', 'Submachine Gun': 'smg', 'Trace Rifle': 'trace', 'Glaive': 'glaive', 'Rocket Launcher': 'rocket', 'Machine Gun': 'mg', 'Sword': 'sword' };
// Nostalgie: Munitions-Synthese aus Destiny 1 neben den Waffen-Slots im Tresor.
const AMMO_D1 = { 1498876634: ['Ammo Synthesis', '/common/destiny_content/icons/898503d21982fe4101a3e6e1374ad43c.jpg'], 2465295065: ['Special Ammo Synthesis', '/common/destiny_content/icons/7ecb6e289d773ac39e6f425abf651f70.jpg'], 953998645: ['Heavy Ammo Synthesis', '/common/destiny_content/icons/b67087079a950013dfbdf6e0ebaeb245.jpg'] };
// D1-Icons haben einen hellen Kasten: Hintergrund per Flutfüllung von den Rändern aus entfernen (einmal, dann gemerkt).
const frei = (() => { try { return JSON.parse(localStorage.getItem('d2a.d1frei2') || '{}'); } catch { return {}; } })();
function freistellen(pfad) {
  return new Promise((ok) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const n = img.naturalWidth, m = img.naturalHeight, c = document.createElement('canvas'); c.width = n; c.height = m;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0); const bild = g.getImageData(0, 0, n, m), p = bild.data;
        const bg = [p[0], p[1], p[2]];
        const ab = (i) => Math.hypot(p[i * 4] - bg[0], p[i * 4 + 1] - bg[1], p[i * 4 + 2] - bg[2]);
        const weg = new Uint8Array(n * m), q = [];
        for (let x = 0; x < n; x++) q.push(x, (m - 1) * n + x); for (let y = 0; y < m; y++) q.push(y * n, y * n + n - 1);
        while (q.length) { const i = q.pop(); if (weg[i] || ab(i) > 28 || p[i * 4] - p[i * 4 + 2] < 9) continue; /* nur der warme, beige Kasten, nicht das graue Metall */ weg[i] = 1; const x = i % n, y = (i / n) | 0; if (x > 0) q.push(i - 1); if (x < n - 1) q.push(i + 1); if (y > 0) q.push(i - n); if (y < m - 1) q.push(i + n); }
        for (let i = 0; i < n * m; i++) if (weg[i]) p[i * 4 + 3] = 0;
        g.putImageData(bild, 0, 0); frei[pfad] = c.toDataURL('image/png');
        try { localStorage.setItem('d2a.d1frei2', JSON.stringify(frei)); } catch {}
        ok(frei[pfad]);
      } catch { ok(null); }
    };
    img.onerror = () => ok(null); img.src = `${BILD}${pfad}?f=1`;
  });
}
// Infusions-Futter: eigene Markierung (nur in diesem Browser, sicherbar über Konto → Backup).
const futter = new Set((() => { try { return JSON.parse(localStorage.getItem('d2a.futter') || '[]'); } catch { return []; } })());
let markieren = false;
const tauf = new Set((() => { try { return JSON.parse(localStorage.getItem('d2a.tauf') || '[]'); } catch { return []; } })());
const WAFFEN = [[1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power']];
const RUESTUNG = [[3448274439, 'Helmet'], [3551918588, 'Arms'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class Item']];
const SONST = [[3284755031, 'Subclass'], [4023194814, 'Ghost'], [2025709351, 'Sparrow'], [284967655, 'Ship'], [4274335291, 'Emblem']];
const ENGRAMME = 375726501, POST = 215593132;
const ELEMENT = { 1: 'kinetic', 2: 'arc', 3: 'solar', 4: 'void', 6: 'stasis', 7: 'strand' };

let leerenFrage = null, leerenT = 0;
let wahl = null, bereich = 'ausr', suche = '', filter = new Set();
// Allgemeine Items (Ghost, Sparrow, Schiff, Emblem, Subclass) – nicht in sammle(); eigene Liste + lokale Änderungen nach dem Verschieben.
const ALLG = new Set([4023194814, 2025709351, 284967655, 4274335291, 3284755031]);
const allgAend = new Map();
function allgemein(p) {
  const out = [];
  const add = (i, ort, angelegt) => { const d = defs.items[i.itemHash]; if (!d || !i.itemInstanceId || !ALLG.has(d.b)) return; const a = allgAend.get(i.itemInstanceId); out.push({ id: i.itemInstanceId, hash: i.itemHash, d, ort: a?.ort ?? ort, angelegt: a?.angelegt ?? angelegt, allg: true, locked: Boolean(i.state & 1), power: 0 }); };
  for (const [cid, c] of Object.entries(p.characterEquipment?.data || {})) for (const i of c.items || []) add(i, cid, true);
  for (const [cid, c] of Object.entries(p.characterInventories?.data || {})) for (const i of c.items || []) add(i, cid, false);
  for (const i of p.profileInventory?.data?.items || []) add(i, 'tresor', false);
  return out;
}
try { wahl = localStorage.getItem('d2a.charWahl'); bereich = localStorage.getItem('d2a.invBereich') || 'ausr'; if (!localStorage.getItem('d2a.invV2')) { bereich = 'ausr'; localStorage.setItem('d2a.invV2', '1'); localStorage.setItem('d2a.invBereich', bereich); } } catch {}
const BEREICHE = [['ausr', 'Weapons & armor'], ['waffen', 'Weapons'], ['ruestung', 'Armor'], ['sonst', 'General'], ['alle', 'All']];

export function zeigeCharakter(haupt, zustand) {
  const p = zustand.profil;
  const chars = Object.values(p.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (!chars.length) { haupt.innerHTML = '<p class="leer">No characters found.</p>'; return; }
  if (!chars.some((c) => c.characterId === wahl)) wahl = chars[0].characterId;
  const inst = p.itemComponents?.instances?.data || {};
  let items = [], proId = new Map();
  let laeuft = false;

  const zeichne = () => {
    // Waffen und Rüstung kommen aus der Item-Liste mit deinen letzten Änderungen, damit Verschobenes sofort umzieht.
    items = sammle(p); const allg = allgemein(p); proId = new Map([...items, ...allg].map((x) => [x.id, x]));
    const alsRoh = (x) => ({ itemHash: x.hash, itemInstanceId: x.id, bucketHash: x.d.b, quantity: 1 });
    const gear = new Set(items.map((x) => x.d.b));
    const q = suche.trim().toLowerCase();
    const anzahl = new Map(); for (const x of items) anzahl.set(x.d.n, (anzahl.get(x.d.n) || 0) + 1);
    const istAllg = (i) => i.itemInstanceId && ALLG.has(defs.items[i.itemHash]?.b);
    const anVon = (cid) => [...(p.characterEquipment?.data?.[cid]?.items || []).filter((i) => !gear.has(i.bucketHash) && !istAllg(i)), ...items.filter((x) => x.ort === cid && x.angelegt).map(alsRoh), ...allg.filter((x) => x.ort === cid && x.angelegt).map(alsRoh)];
    const invVon = (cid) => [...(p.characterInventories?.data?.[cid]?.items || []).filter((i) => (!gear.has(i.bucketHash) || i.bucketHash === POST) && !istAllg(i)), ...items.filter((x) => x.ort === cid && !x.angelegt).map(alsRoh), ...allg.filter((x) => x.ort === cid && !x.angelegt).map(alsRoh)];
    const kachel = (i, gross) => {
      const d = defs.items[i.itemHash];
      if (!d) return `<span class="ck leer-k ${gross ? 'gross' : ''}" title="Unknown item"></span>`;
      const x = proId.get(i.itemInstanceId);
      const power = inst[i.itemInstanceId]?.primaryStat?.value;
      const el = ELEMENT[inst[i.itemInstanceId]?.damageType] || '';
      const klick = x ? `data-cid="${i.itemInstanceId}"` : '';
      const elName = ELEMENT[inst[i.itemInstanceId]?.damageType] || '';
      const passt = (f) => (f === 'exo' ? d.q === 6 : f === 'leg' ? d.q === 5 : f === 'lock' ? x?.locked : f === 'dupe' ? x && (anzahl.get(d.n) || 0) > 1 : f === 'futter' ? futter.has(i.itemInstanceId) : f.startsWith('el:') ? elName === f.slice(3) : true);
      const dim = (q && !d.n.toLowerCase().includes(q) && !(d.k || '').toLowerCase().includes(q)) || (filter.size && ![...filter].every(passt));
      return `<button class="ck ${gross ? 'gross' : ''} ${d.q === 6 ? 'exo' : ''} ${x?.mw ? 'mw' : ''} ${el ? `elr-${el}` : ''} ${dim ? 'dim' : ''}" ${klick} data-ih="${i.itemHash}" aria-label="${esc(d.n)}" style="background-image:${d.w ? `url(${BILD}${d.w}),` : ''}url(${BILD}${d.i})">${tierPips(inst[i.itemInstanceId]?.gearTier)}${futter.has(i.itemInstanceId) ? '<i class="ck-futter" title="Infusion fodder">🔥</i>' : ''}${x?.crafted ? '<i class="ck-shaped" title="Crafted"></i>' : ''}${power ? `<em class="${el}">${power}</em>` : ''}${i.quantity > 1 ? `<em>${i.quantity}</em>` : ''}${x?.locked ? '<i class="ck-lock">🔒</i>' : ''}</button>`;
    };
    const reihen = bereich === 'waffen' ? WAFFEN : bereich === 'ruestung' ? RUESTUNG : bereich === 'sonst' ? SONST : bereich === 'ausr' ? [...WAFFEN, ...RUESTUNG] : [...WAFFEN, ...RUESTUNG, ...SONST];
    const reihe = (cid, an, inv) => ([b, name]) => {
      const e = an.find((i) => i.bucketHash === b);
      const rest = inv.filter((i) => i.bucketHash === b);
      const max = b === 3284755031 ? rest.length : 9;
      const gear = [...WAFFEN, ...RUESTUNG].some(([x]) => x === b); return `<div class="creihe" data-bucket="${b}" data-cfor="${cid}"><small>${name}${gear && rest.length ? `<button class="cleeren ${leerenFrage === `${cid}|${b}` ? 'frage' : ''}" data-leeren="${cid}|${b}" title="Move all ${rest.length} unequipped ${name} items to the vault">${leerenFrage === `${cid}|${b}` ? `${rest.length} → vault?` : '⇩ vault'}</button>` : ''}</small><div class="cr-in">${e ? kachel(e, true) : '<span class="ck gross leer-k"></span>'}<div class="cgitter">${rest.map((i) => kachel(i)).join('')}${Array(Math.max(0, max - rest.length)).fill('<span class="ck leer-k"></span>').join('')}</div></div> ${b !== 3284755031 && rest.length >= max ? '<b class="cvoll" title="Full: the app makes room automatically when it moves something here">full</b>' : ''}</div>`;
    };
    const statsVon = (x) => ARMOR_STATS.map((n) => { const h = Object.keys(defs.stats || {}).find((k) => defs.stats[k].n === n && x.stats?.[k] != null) || Object.keys(defs.stats || {}).find((k) => defs.stats[k].n === n); return [n, x.stats?.[h] || 0, defs.stats?.[h]?.i]; });
    const kopfVon = (x) => `<div class="ckopf" data-wahl="${x.characterId}" style="background-image:url(${BILD}${x.emblemBackgroundPath || ''})"><span class="ck-z1"><b>${KLASSE[x.classType]}</b><small>${RASSE[x.raceType] || ''}</small><em>✦ ${x.light}</em></span><span class="ck-stats">${statsVon(x).map(([n, v, ic]) => `<span title="${n}: ${v}">${ic ? `<i style="background-image:url(${BILD}${ic})"></i>` : ''}<b>${v}</b><small class="ck-sn">${n.slice(0, 3)}</small></span>`).join('')}</span></div>`;
    const extraVon = (cid) => { const inv = invVon(cid); const e = inv.filter((i) => i.bucketHash === ENGRAMME), po = inv.filter((i) => i.bucketHash === POST); if (!e.length && !po.length) return ''; return `<div class="cextra">${e.length ? '' : '<!--'}<div><small>Engrams ${e.length}/10</small><div class="cgitter klein">${e.map((i) => kachel(i)).join('')}</div></div>${e.length ? '' : '-->'}${po.length ? `<div><small>Postmaster <b class="${po.length >= 18 ? 'warn' : ''}">${po.length}/21</b></small><div class="cgitter klein">${po.map((i) => kachel(i)).join('')}</div><button class="chip klein" data-postpanel>Open Postmaster</button></div>` : ''}</div>`; };
    const spalte = (x) => { const an = anVon(x.characterId), inv = invVon(x.characterId); return `<section class="cspalte ${x.characterId === wahl ? 'an' : ''}" data-ziel="${x.characterId}">${kopfVon(x)}${extraVon(x.characterId)}<div class="cleer-alle"><button class="cleeren gross ${leerenFrage === `${x.characterId}|alle` ? 'frage' : ''}" data-leeren="${x.characterId}|alle" title="Move every unequipped weapon and armor piece of this character to the vault (not ghosts, ships, sparrows…)">${leerenFrage === `${x.characterId}|alle` ? 'Tap again: all weapons & armor → vault' : '⇩ Empty weapons & armor to vault'}</button></div>${reihen.map(reihe(x.characterId, an, inv)).join('')}</section>`; };
    // Schmaler Streifen (Handy): Emblem + angelegte Teile; beim Ziehen klappt er auf.
    const streifen = (x) => { const an = anVon(x.characterId); return `<section class="cstreifen" data-ziel="${x.characterId}" data-wahl="${x.characterId}" style="--emb:url(${BILD}${x.emblemPath || x.emblemBackgroundPath || ''})"><span class="cs-kopf"><i></i><b>${KLASSE[x.classType][0]}</b></span>${reihen.map(([b]) => { const e = an.find((i) => i.bucketHash === b); return `<span class="cs-slot">${e ? kachel(e) : '<span class="ck leer-k"></span>'}</span>`; }).join('')}</section>`; };
    const tresorItems = [...items, ...allg].filter((x) => x.ort === 'tresor' && reihen.some(([b]) => b === x.d.b));
    const sortiere = (a, c) => (c.d.q === 6) - (a.d.q === 6) || (a.d.c - c.d.c) || a.d.n.localeCompare(c.d.n);
    // Tresor kompakt: oben eine Symbolleiste (Waffentyp bzw. Klasse) mit Anzahl; nur angeklickte Gruppen klappen auf.
    // Standard: alles zu. Der Zustand wird gemerkt.
    const maske = (f) => `style="-webkit-mask-image:url(img/wtyp/${f}.svg);mask-image:url(img/wtyp/${f}.svg)"`;
    const gruppenLeiste = (b, gruppen) => `<div class="tleiste">${gruppen.map(([k, titel, f, l]) => { const auf = tauf.has(`${b}:${k}`); return `<button class="tsym ${auf ? 'auf' : ''}" data-tauf="${b}:${esc(k)}" title="${esc(titel)} · ${l.length}" aria-expanded="${auf}">${f ? `<i ${maske(f)}></i>` : `<small>${esc(titel)}</small>`}<em>${l.length}</em></button>`; }).join('')}</div>`;
    const gruppenInhalt = (b, gruppen) => gruppen.filter(([k]) => tauf.has(`${b}:${k}`)).map(([k, titel, f, l]) => `<div class="tgruppe"><span class="tg-kopf">${f ? `<i ${maske(f)}></i>` : ''}${esc(titel)} <em>${l.length}</em></span><div class="cgitter breit">${l.sort(sortiere).map((x) => kachel(alsRoh(x))).join('')}</div></div>`).join('');
    const KL_DATEI = { 0: 'titan', 1: 'hunter', 2: 'warlock' };
    const tresorBlock = ([b, name]) => {
      const l = tresorItems.filter((x) => x.d.b === b); if (!l.length) return '';
      const kopf = `<small>${AMMO_D1[b] ? `<img class="d1ammo" src="${frei[AMMO_D1[b][1]] || `${BILD}${AMMO_D1[b][1]}`}" data-frei="${AMMO_D1[b][1]}" alt="" title="${AMMO_D1[b][0]} (Destiny 1)" ${frei[AMMO_D1[b][1]] ? '' : 'style="opacity:0"'}>` : ''}${name} <span>${l.length}</span></small>`;
      let gruppen = null;
      if (WAFFEN.some(([w]) => w === b)) gruppen = [...new Set(l.map((x) => x.d.k))].sort().map((t) => [t, t, WTYP_SVG[t], l.filter((x) => x.d.k === t)]);
      else if (RUESTUNG.some(([w]) => w === b)) gruppen = [0, 1, 2, 3].map((c) => [String(c), KLASSE[c] || 'Any class', KL_DATEI[c], l.filter((x) => x.d.c === c)]).filter((g) => g[3].length);
      if (gruppen) return `<div class="treihe">${kopf}${gruppenLeiste(b, gruppen)}${gruppenInhalt(b, gruppen)}</div>`;
      return `<div class="treihe">${kopf}<div class="cgitter breit">${l.sort(sortiere).map((x) => kachel(alsRoh(x))).join('')}</div></div>`;
    };
    const tresor = `<section class="ctresorbox" data-ziel="tresor"><div class="ckopf tres"><b>Vault</b><em>${tresorItems.length}</em></div>${(() => { const sp = [WAFFEN, RUESTUNG, SONST].map((g) => reihen.filter((r) => g.includes(r)).map(tresorBlock).join('')).filter(Boolean); return sp.length ? `<div class="tspalten n${sp.length}">${sp.map((x) => `<div class="tspalte">${x}</div>`).join('')}</div>` : '<p class="leer klein">Nothing of this kind in the vault.</p>'; })()}</section>`;
    const c = chars.find((x) => x.characterId === wahl);
    const breit = (haupt.clientWidth || innerWidth) >= 980;
    const FILTER = [['exo', 'Exotic'], ['leg', 'Legendary'], ['lock', 'Locked'], ['dupe', 'Duplicates'], ['futter', '🔥 Fodder'], ['el:kinetic', 'Kinetic'], ['el:arc', 'Arc'], ['el:solar', 'Solar'], ['el:void', 'Void'], ['el:stasis', 'Stasis'], ['el:strand', 'Strand']];
    haupt.innerHTML = `<div class="kopf"><h1>Inventory</h1></div>
      <div class="invleiste"><div class="wsub">${BEREICHE.map(([k, t]) => `<button class="chip" data-bereich="${k}" aria-pressed="${k === bereich}">${t}</button>`).join('')}</div><input id="invSuche" type="search" placeholder="Highlight: name or type…" value="${esc(suche)}" aria-label="Highlight items"></div>
      <div class="invfilter">${FILTER.map(([k, t]) => `<button class="chip klein ${k.startsWith('el:') ? `el-${k.slice(3)}` : ''}" data-filter="${k}" aria-pressed="${filter.has(k)}">${t}</button>`).join('')}<button class="chip klein futter-modus" data-markieren aria-pressed="${markieren}" title="Click items to mark or unmark them as infusion fodder">${markieren ? '🔥 Marking… click items · done' : '🔥 Mark fodder'}</button>${filter.size || q ? '<button class="chip klein" data-filterweg>✕ clear</button>' : ''}<span class="invlinks"><button class="chip klein" data-tabweiter="vault" title="All weapons with every filter">Weapon list ↗</button><button class="chip klein" data-tabweiter="armor" title="All armor with stats">Armor list ↗</button></span></div>
      ${breit
        ? `<div class="inv inv-alle b-${bereich}" style="--n:${chars.length}">${chars.map(spalte).join('')}<div class="crechts">${tresor}<section class="cpostbox" aria-label="Postmaster"></section></div></div>`
        : `<div class="chandy-tabs">${chars.map((x) => `<button data-wahl="${x.characterId}" class="${x.characterId === wahl ? 'an' : ''}" style="--emb:url(${BILD}${x.emblemPath || ''})"><i></i><b>${KLASSE[x.classType]}</b><small>✦ ${x.light}</small></button>`).join('')}</div><div class="inv inv-fokus b-${bereich}">${spalte(c)}<div class="cstreifen-box">${chars.filter((x) => x.characterId !== wahl).map(streifen).join('')}</div></div>${tresor}`}`;
    const pb = haupt.querySelector('.cpostbox'); if (pb) import('./post.js').then((m) => m.zeigePost(pb, zustand)).catch(() => pb.remove());
    haupt.querySelectorAll('img.d1ammo[style]').forEach((el) => freistellen(el.dataset.frei).then((u) => { if (u) el.src = u; el.style.opacity = ''; }));
    const si = haupt.querySelector('#invSuche');
    si?.addEventListener('input', () => { suche = si.value; const pos = si.selectionStart; zeichne(); const n = haupt.querySelector('#invSuche'); n.focus(); n.setSelectionRange(pos, pos); });
  };
  zeichne();
  // Breite ändert sich (Fenster, Seitenpanel): Layout neu wählen.
  let breitWar = (haupt.clientWidth || innerWidth) >= 980;
  if (window.__d2aInvResize) removeEventListener('resize', window.__d2aInvResize);
  window.__d2aInvResize = () => { const b = (haupt.clientWidth || innerWidth) >= 980; if (b !== breitWar && haupt.querySelector('.inv')) { breitWar = b; zeichne(); } };
  addEventListener('resize', window.__d2aInvResize);

  // Verschieben: Tresor, anderer Hüter, oder auf das angelegte Teil dieses Hüters = anlegen.
  async function bewege(x, ziel) {
    if (laeuft) return; laeuft = true;
    const k = zustand.konto;
    if (x.allg) { try { await bewegeAllg(x, ziel); } catch (e) { meldung(e.message, true); } laeuft = false; zeichne(); return; }
    try {
      let ort = x.ort;
      if (ziel.startsWith('anlegen')) {
        const cid = ziel.split(':')[1] || wahl;
        if (ort !== cid) { meldung(`Moving ${x.d.n}…`); if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); } if (ort !== 'tresor' && ort !== cid) { await ersatzAnlegen(zustand, x); await bungie.verschiebe(k, x, ort, true); } if (ort !== cid) await zumCharakter(zustand, x, cid, new Set([x.id])); }
        await bungie.ausruesten(k, x, cid);
        for (const y of items) if (y.ort === cid && y.angelegt && y.d.b === x.d.b && y.id !== x.id) merkeAenderung(y.id, { ort: cid, angelegt: false });
        merkeAenderung(x.id, { ort: cid, angelegt: true });
        meldung(`${x.d.n} equipped.`);
      } else {
        if (ort === ziel) { laeuft = false; return; }
        await ersatzAnlegen(zustand, x);
        meldung(`Moving ${x.d.n}…`);
        if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); }
        if (ort !== 'tresor') await bungie.verschiebe(k, x, ort, true);
        if (ziel !== 'tresor') await zumCharakter(zustand, x, ziel, new Set([x.id]));
        merkeAenderung(x.id, { ort: ziel, angelegt: false });
        meldung(`${x.d.n} → ${ziel === 'tresor' ? 'vault' : KLASSE[chars.find((c) => c.characterId === ziel)?.classType]}.`);
      }
      zustand.alleItems = null;
    } catch (e) { meldung(e.message, true); }
    laeuft = false; zeichne();
  }

  // Allgemeine Items: Ghost, Sparrow, Schiff, Emblem zwischen Hütern/Tresor; Subclass nur am eigenen Hüter anlegen.
  async function bewegeAllg(x, ziel) {
    const k = zustand.konto;
    const zielCid = ziel.startsWith('anlegen') ? ziel.split(':')[1] : ziel;
    if (x.d.b === 3284755031 && zielCid !== x.ort) throw new Error('Subclasses stay on their guardian.');
    const ersatz = async () => {
      if (!x.angelegt) return;
      const alle = allgemein(p);
      const neu = alle.find((y) => y.ort === x.ort && !y.angelegt && y.d.b === x.d.b);
      if (!neu) throw new Error(`${x.d.n} is equipped and there is nothing else in that slot to swap in.`);
      await bungie.ausruesten(k, neu, x.ort); allgAend.set(neu.id, { ort: x.ort, angelegt: true }); x.angelegt = false; allgAend.set(x.id, { ort: x.ort, angelegt: false });
    };
    if (zielCid !== x.ort) {
      if (zielCid !== 'tresor') { const voll = allgemein(p).filter((y) => y.ort === zielCid && !y.angelegt && y.d.b === x.d.b).length >= 9; if (voll) throw new Error(`No free ${x.d.k || 'slot'} space on that guardian.`); }
      meldung(`Moving ${x.d.n}…`);
      if (x.ort !== 'tresor') { await ersatz(); await bungie.verschiebe(k, x, x.ort, true); }
      if (zielCid !== 'tresor') await bungie.verschiebe(k, x, zielCid, false);
      allgAend.set(x.id, { ort: zielCid, angelegt: false }); x.ort = zielCid; x.angelegt = false;
    }
    if (ziel.startsWith('anlegen')) {
      await bungie.ausruesten(k, x, zielCid);
      for (const y of allgemein(p)) if (y.ort === zielCid && y.angelegt && y.d.b === x.d.b && y.id !== x.id) allgAend.set(y.id, { ort: zielCid, angelegt: false });
      allgAend.set(x.id, { ort: zielCid, angelegt: true });
      meldung(`${x.d.n} equipped.`);
    } else meldung(`${x.d.n} → ${zielCid === 'tresor' ? 'vault' : KLASSE[chars.find((c) => c.characterId === zielCid)?.classType]}.`);
  }

  // Ziehen mit Maus und Finger (Pointer Events). Maus: ab 6 px Bewegung. Finger: erst 300 ms halten, dann ziehen.
  let zug = null;
  const zielUnter = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const r = el?.closest('.creihe'); const gross = el?.closest('.ck.gross');
    if (r && gross && Number(r.dataset.bucket) === zug?.x.d.b) return `anlegen:${r.dataset.cfor}`;
    const z = el?.closest('[data-ziel]'); return z ? z.dataset.ziel : null;
  };
  const markiere = (z) => {
    haupt.querySelectorAll('[data-ziel],.ck.gross').forEach((e) => e.classList.toggle('drop-an', Boolean(z) && (e.dataset.ziel === z || (z?.startsWith('anlegen') && e.classList.contains('gross') && `anlegen:${e.closest('.creihe')?.dataset.cfor}` === z && Number(e.closest('.creihe')?.dataset.bucket) === zug?.x.d.b))));
    haupt.querySelectorAll('.cstreifen').forEach((e) => e.classList.toggle('auf', Boolean(z) && e.dataset.ziel === z));
  };
  const starte = (cx, cy) => {
    zug.aktiv = true; document.body.classList.add('zieht'); const tp = document.querySelector('#tipp'); if (tp) tp.hidden = true;
    zug.geist = zug.t.cloneNode(true); zug.geist.classList.add('geist'); document.body.append(zug.geist);
    zug.t.classList.add('quelle'); bewegeGeist(cx, cy);
    // Ablage-Leiste, die beim Ziehen immer sichtbar ist (egal wie weit gescrollt).
    const dock = document.createElement('div'); dock.className = 'cdock';
    dock.innerHTML = `<div class="cd-ziel" data-ziel="tresor"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/><rect x="8" y="5" width="8" height="7" rx="1"/></svg><b>Vault</b></div>${chars.filter((c) => c.characterId !== wahl).map((c) => `<div class="cd-ziel" data-ziel="${c.characterId}" style="background-image:url(${BILD}${c.emblemBackgroundPath || ''})"><b>${KLASSE[c.classType]}</b></div>`).join('')}`;
    document.body.append(dock); zug.dock = dock;
  };
  const markiereDock = (z) => zug?.dock?.querySelectorAll('[data-ziel]').forEach((e) => e.classList.toggle('drop-an', e.dataset.ziel === z));
  const bewegeGeist = (cx, cy) => {
    zug.geist.style.left = `${(cx - 24) / d2aZ()}px`; zug.geist.style.top = `${(cy - 24) / d2aZ()}px`; const z = zielUnter(cx, cy); markiere(z); markiereDock(z);
    // Am Rand automatisch scrollen.
    clearInterval(zug.scroll); const rand = 70;
    if (cy < rand || cy > innerHeight - rand) { const dy = cy < rand ? -14 : 14; zug.scroll = setInterval(() => scrollBy(0, dy), 16); }
  };
  const beginne = (t, cx, cy, finger) => {
    const x = proId.get(t.dataset.cid); if (!x) return;
    zug = { x, t, sx: cx, sy: cy, aktiv: false, finger };
    if (finger) zug.timer = setTimeout(() => { if (zug && !zug.aktiv) { starte(zug.sx, zug.sy); navigator.vibrate?.(15); } }, 300);
  };
  const ziehe = (cx, cy, ev) => {
    if (!zug) return;
    if (!zug.aktiv) { const weit = Math.hypot(cx - zug.sx, cy - zug.sy) > 6; if (zug.finger) { if (weit) { clearTimeout(zug.timer); zug = null; } return; } if (!weit) return; starte(cx, cy); }
    ev.preventDefault(); bewegeGeist(cx, cy);
  };
  const ende = (cx, cy) => {
    if (!zug) return;
    clearTimeout(zug.timer);
    const war = zug; zug = null;
    if (!war.aktiv) return;
    const z = zielUnter(cx, cy);
    clearInterval(war.scroll); war.dock?.remove(); war.geist.remove(); war.t.classList.remove('quelle'); document.body.classList.remove('zieht'); markiere(null);
    haupt.dataset.keinKlick = '1'; setTimeout(() => delete haupt.dataset.keinKlick, 80);
    if (z) bewege(war.x, z);
  };
  // Maus über Pointer Events, Finger über Touch Events (nur so lässt sich das Scrollen während des Ziehens stoppen).
  const futterUm = (t) => { const id = t.dataset.cid; futter.has(id) ? futter.delete(id) : futter.add(id); try { localStorage.setItem('d2a.futter', JSON.stringify([...futter])); } catch {} zeichne(); };
  if (haupt.__futter) { haupt.removeEventListener('pointerdown', haupt.__futter[0], true); haupt.removeEventListener('touchstart', haupt.__futter[1], true); }
  haupt.__futter = [(e) => { if (!markieren) return; const t = e.target.closest('.ck[data-cid]'); if (t) { e.stopImmediatePropagation(); e.preventDefault(); futterUm(t); } }, (e) => { if (markieren && e.target.closest('.ck[data-cid]')) e.stopImmediatePropagation(); }];
  haupt.addEventListener('pointerdown', haupt.__futter[0], true); haupt.addEventListener('touchstart', haupt.__futter[1], true);
  haupt.onpointerdown = (e) => { if (e.pointerType !== 'mouse' || e.button > 0) return; const t = e.target.closest('.ck[data-cid]'); if (t) beginne(t, e.clientX, e.clientY, false); };
  haupt.ontouchstart = (e) => { const t = e.target.closest('.ck[data-cid]'); const p0 = e.touches[0]; if (t && e.touches.length === 1) beginne(t, p0.clientX, p0.clientY, true); };
  const h = {
    pm: (e) => { if (zug && !zug.finger) ziehe(e.clientX, e.clientY, e); },
    pu: (e) => { if (zug && !zug.finger) ende(e.clientX, e.clientY); },
    tm: (e) => { if (zug?.finger) { const p0 = e.touches[0]; ziehe(p0.clientX, p0.clientY, e); } },
    tu: (e) => { if (zug?.finger) { const p0 = e.changedTouches[0]; ende(p0.clientX, p0.clientY); } },
  };
  const alt = window.__d2aZiehen;
  if (alt) { removeEventListener('pointermove', alt.pm); removeEventListener('pointerup', alt.pu); removeEventListener('touchmove', alt.tm); removeEventListener('touchend', alt.tu); removeEventListener('touchcancel', alt.tu); }
  window.__d2aZiehen = h;
  addEventListener('pointermove', h.pm); addEventListener('pointerup', h.pu);
  addEventListener('touchmove', h.tm, { passive: false }); addEventListener('touchend', h.tu); addEventListener('touchcancel', h.tu);
  haupt.oncontextmenu = (e) => { if (e.target.closest('.ck[data-cid]') && (zug?.finger || e.pointerType === 'touch')) e.preventDefault(); };

  // In-Game-Hover für Waffen und Rüstung.
  haupt.onpointerover = (e) => { if (e.pointerType !== 'mouse' || zug?.aktiv) return; const t = e.target.closest('.ck[data-cid]'); const it = t && proId.get(t.dataset.cid); if (it && !it.allg) zeigeItemTipp(it, p, e.clientX, e.clientY); };
  haupt.onpointerout = (e) => { if (e.target.closest('.ck[data-cid]') && !e.relatedTarget?.closest?.('.ck[data-cid]') && !document.querySelector('#tippFest:checked')) { const tp = document.querySelector('#tipp'); if (tp) tp.hidden = true; } };
  async function leeren(was) {
    const [cid, b] = was.split('|'); const gear = new Set([...WAFFEN, ...RUESTUNG].map(([x]) => x));
    const liste = sammle(zustand.profil).filter((x) => x.ort === cid && !x.angelegt && (b === 'alle' ? gear.has(x.d.b) : x.d.b === Number(b)));
    if (!liste.length) return meldung('Nothing to move.');
    let ok = 0, fehl = 0;
    for (const x of liste) {
      try { await bungie.verschiebe(zustand.konto, x, cid, true); merkeAenderung(x.id, { ort: 'tresor', angelegt: false }); ok++; } catch { fehl++; }
      meldung(`To vault: ${ok + fehl}/${liste.length}…`);
    }
    meldung(fehl ? `${ok} moved, ${fehl} failed (vault full or locked by the game).` : `${ok} items moved to the vault.`, !!fehl);
    zeichne();
  }
  haupt.onclick = (e) => {
    const lb = e.target.closest('[data-leeren]');
    if (lb) { e.stopPropagation(); if (leerenFrage !== lb.dataset.leeren) { leerenFrage = lb.dataset.leeren; clearTimeout(leerenT); leerenT = setTimeout(() => { leerenFrage = null; zeichne(); }, 5000); return zeichne(); } leerenFrage = null; return leeren(lb.dataset.leeren); }
    if (haupt.dataset.keinKlick) return;
    { const tp = document.querySelector('#tipp'); if (tp) tp.hidden = true; }
    const fi = e.target.closest('[data-filter]');
    if (fi) { const k = fi.dataset.filter; if (filter.has(k)) filter.delete(k); else { if (k.startsWith('el:')) for (const f of [...filter]) if (f.startsWith('el:')) filter.delete(f); if (k === 'exo') filter.delete('leg'); if (k === 'leg') filter.delete('exo'); filter.add(k); } return zeichne(); }
    if (e.target.closest('[data-filterweg]')) { filter.clear(); suche = ''; return zeichne(); }
    if (e.target.closest('[data-markieren]')) { markieren = !markieren; return zeichne(); }
    if (markieren && e.target.closest('.ck[data-cid]')) return;
    const br = e.target.closest('[data-bereich]');
    if (br) { bereich = br.dataset.bereich; try { localStorage.setItem('d2a.invBereich', bereich); } catch {} return zeichne(); }
    const tw = e.target.closest('[data-tabweiter]');
    if (tw) { document.querySelector(`#rail [data-tab="${tw.dataset.tabweiter}"]`)?.click(); return; }
    if (e.target.closest('.ck[data-cid]') == null && e.target.closest('.cstreifen')) { const st = e.target.closest('.cstreifen'); wahl = st.dataset.wahl; try { localStorage.setItem('d2a.charWahl', wahl); } catch {} return zeichne(); }
    const w = e.target.closest('[data-wahl]');
    if (w) { wahl = w.dataset.wahl; try { localStorage.setItem('d2a.charWahl', wahl); } catch {} return zeichne(); }
    if (e.target.closest('[data-postpanel]')) return zustand.oeffnePanel?.('post');
    const tt = e.target.closest('[data-tauf]');
    if (tt) { const t = tt.dataset.tauf; tauf.has(t) ? tauf.delete(t) : tauf.add(t); try { localStorage.setItem('d2a.tauf', JSON.stringify([...tauf])); } catch {} return zeichne(); }
    const k = e.target.closest('[data-cid]');
    if (k) { const x = proId.get(k.dataset.cid); if (x && !x.allg) oeffneDetail(x, zustand, () => zeichne()); }
  };
}
