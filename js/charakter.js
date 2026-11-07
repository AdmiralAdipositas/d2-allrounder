// Charakter-Ansicht (Startseite): deine Hüter oben zur Auswahl, darunter wie im Spiel:
// angelegte Teile + die 9 Inventarplätze pro Slot, Subclass, Ghost, Sparrow, Schiff, Engramme und Postmaster.
// Klick auf Waffe/Rüstung öffnet die Detailansicht (Anlegen, Verschieben, Sperren).
import { defs } from './defs.js';
import { sammle, ARMOR_STATS } from './vault.js';
import { oeffneDetail } from './detail.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const RASSE = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const WAFFEN = [[1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power']];
const RUESTUNG = [[3448274439, 'Helmet'], [3551918588, 'Arms'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class Item']];
const SONST = [[3284755031, 'Subclass'], [4023194814, 'Ghost'], [2025709351, 'Sparrow'], [284967655, 'Ship'], [4274335291, 'Emblem']];
const ENGRAMME = 375726501, POST = 215593132;
const ELEMENT = { 1: 'kinetic', 2: 'arc', 3: 'solar', 4: 'void', 6: 'stasis', 7: 'strand' };

let wahl = null;
try { wahl = localStorage.getItem('d2a.charWahl'); } catch {}

export function zeigeCharakter(haupt, zustand) {
  const p = zustand.profil;
  const chars = Object.values(p.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (!chars.length) { haupt.innerHTML = '<p class="leer">No characters found.</p>'; return; }
  if (!chars.some((c) => c.characterId === wahl)) wahl = chars[0].characterId;
  const items = sammle(p);
  const proId = new Map(items.map((x) => [x.id, x]));
  const inst = p.itemComponents?.instances?.data || {};

  const zeichne = () => {
    const c = chars.find((x) => x.characterId === wahl);
    const an = p.characterEquipment?.data?.[wahl]?.items || [];
    const inv = p.characterInventories?.data?.[wahl]?.items || [];
    const kachel = (i, gross) => {
      const d = defs.items[i.itemHash];
      if (!d) return `<span class="ck leer-k ${gross ? 'gross' : ''}" title="Unknown item"></span>`;
      const x = proId.get(i.itemInstanceId);
      const power = inst[i.itemInstanceId]?.primaryStat?.value;
      const el = ELEMENT[inst[i.itemInstanceId]?.damageType] || '';
      const klick = x ? `data-cid="${i.itemInstanceId}"` : '';
      return `<button class="ck ${gross ? 'gross' : ''} ${d.q === 6 ? 'exo' : ''} ${x?.mw ? 'mw' : ''}" ${klick} data-ih="${i.itemHash}" aria-label="${esc(d.n)}" style="background-image:url(${BILD}${d.i})">${power ? `<em class="${el}">${power}</em>` : ''}${i.quantity > 1 ? `<em>${i.quantity}</em>` : ''}${x?.locked ? '<i class="ck-lock">🔒</i>' : ''}</button>`;
    };
    const reihe = ([b, name]) => {
      const e = an.find((i) => i.bucketHash === b);
      const rest = inv.filter((i) => i.bucketHash === b);
      const max = b === 3284755031 ? 3 : 9;
      return `<div class="creihe"><small>${name}</small><div class="cr-in">${e ? kachel(e, true) : '<span class="ck gross leer-k"></span>'}<div class="cgitter">${rest.map((i) => kachel(i)).join('')}${Array(Math.max(0, max - rest.length)).fill('<span class="ck leer-k"></span>').join('')}</div></div>${rest.length >= max ? '<b class="cvoll" title="Full: the app makes room automatically when it moves something here">full</b>' : ''}</div>`;
    };
    const engr = inv.filter((i) => i.bucketHash === ENGRAMME);
    const post = inv.filter((i) => i.bucketHash === POST);
    const stats = ARMOR_STATS.map((n) => { const h = Object.keys(defs.stats || {}).find((k) => defs.stats[k].n === n); return [n, c.stats?.[h] || 0, defs.stats?.[h]?.i]; });
    haupt.innerHTML = `<div class="kopf"><h1>Guardians</h1></div>
      <div class="cwahl">${chars.map((x) => `<button class="cbanner ${x.characterId === wahl ? 'an' : ''}" data-wahl="${x.characterId}" style="background-image:url(${BILD}${x.emblemBackgroundPath || ''})"><b>${KLASSE[x.classType]}</b><small>${RASSE[x.raceType] || ''}</small><span>✦ ${x.light}</span></button>`).join('')}</div>
      <div class="cstats">${stats.map(([n, v, ic]) => `<span title="${n}">${ic ? `<i style="background-image:url(${BILD}${ic})"></i>` : ''}<small>${n}</small><b>${v}</b></span>`).join('')}</div>
      <div class="cgrid"><section class="ckarte"><h3>Weapons</h3>${WAFFEN.map(reihe).join('')}</section>
      <section class="ckarte"><h3>Armor</h3>${RUESTUNG.map(reihe).join('')}</section>
      <section class="ckarte"><h3>Subclass & gear</h3>${SONST.map(reihe).join('')}</section>
      <section class="ckarte"><h3>Engrams <small>${engr.length} / 10</small></h3><div class="cgitter breit">${engr.map((i) => kachel(i)).join('')}${Array(Math.max(0, 10 - engr.length)).fill('<span class="ck leer-k"></span>').join('')}</div>
        <h3 class="cpost">Postmaster <small>${post.length} / 21</small></h3>${post.length ? `<div class="cgitter breit">${post.map((i) => kachel(i)).join('')}</div><button class="chip" data-postpanel>Open Postmaster</button>` : '<p class="leer klein">Empty.</p>'}</section></div>
      <p class="leer klein">Click a weapon or armor piece to equip, move or lock it. Empty boxes are free inventory slots on this character.</p>`;
  };
  zeichne();
  haupt.onclick = (e) => {
    const w = e.target.closest('[data-wahl]');
    if (w) { wahl = w.dataset.wahl; try { localStorage.setItem('d2a.charWahl', wahl); } catch {} return zeichne(); }
    if (e.target.closest('[data-postpanel]')) return zustand.oeffnePanel?.('post');
    const k = e.target.closest('[data-cid]');
    if (k) { const x = proId.get(k.dataset.cid); if (x) oeffneDetail(x, zustand, () => zeigeCharakter(haupt, zustand)); }
  };
}
