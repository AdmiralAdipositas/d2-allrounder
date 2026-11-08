// Xûr: komplettes Angebot mit allen Perk-Spalten und Stats, ohne hinzulaufen.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { plugOk } from './detail.js';
import { letzterChar, dauer } from './woche.js';

const BILD = 'https://www.bungie.net';
const XUR = 2190858386;
const STRANGE = 3751514131;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ARMOR_STATS = ['Health', 'Melee', 'Grenade', 'Super', 'Class', 'Weapons'];
const vendorPfad = (k, cid, v) => `/Destiny2/${k.membershipType}/Profile/${k.membershipId}/Character/${cid}/Vendors/${v}/?components=400,402,304,305,310`;

let daten = null;
// Ist Xûr gerade da? Liefert den Abreisezeitpunkt oder null.
export async function xurDa(zustand) {
  try {
    const k = zustand.konto;
    const cid = letzterChar(zustand.profil).characterId;
    const [haupt, strange] = await Promise.allSettled([bungie.get(vendorPfad(k, cid, XUR)), bungie.get(vendorPfad(k, cid, STRANGE))]);
    if (haupt.status !== 'fulfilled' || haupt.value.vendor?.data?.enabled === false) return null;
    // Erst prüfen, dann merken: eine kaputte Antwort darf nicht jeden weiteren Aufruf mitreißen.
    if (!haupt.value?.vendor?.data) return null;
    daten = { zeit: Date.now(), teile: [haupt.value, strange.status === 'fulfilled' ? strange.value : null].filter((t) => t?.vendor?.data) };
    return new Date(haupt.value.vendor.data.nextRefreshDate || Date.now());
  } catch { return null; }
}

const GRUPPEN = [
  ['Exotic Armor', (d) => d.t === 2 && d.q === 6], ['Exotic Weapons', (d) => d.t === 3 && d.q === 6],
  ['Legendary Weapons', (d) => d.t === 3 && d.q === 5], ['Legendary Armor', (d) => d.t === 2 && d.q === 5], ['Other', () => true],
];

function karte(x) {
  const { d, sale, teil, idx } = x;
  const sock = teil.itemComponents?.sockets?.data?.[idx]?.sockets || [];
  const moegl = teil.itemComponents?.reusablePlugs?.data?.[idx]?.plugs || {};
  const spalten = sock.map((s, i) => ({ aktiv: s.plugHash, art: defs.items[s.plugHash]?.k || '', plugs: [...new Set([s.plugHash, ...(moegl[i] || []).map((p) => p.plugItemHash)])].filter(plugOk) }))
    .filter((sp) => sp.plugs.length && !/Combat Flair|Shader|Ornament|Tracker|Memento|Restore Defaults|Mod$/i.test(sp.art) && !/Restore Defaults|Default Ornament/.test(defs.items[sp.aktiv]?.n || ''));
  const roh = Object.values(teil.itemComponents?.stats?.data?.[idx]?.stats || {}).map((s) => ({ n: defs.stats?.[s.statHash]?.n, v: s.value })).filter((s) => s.n);
  const ruestung = d.t === 2;
  const stats = ruestung ? ARMOR_STATS.map((n) => roh.find((s) => s.n === n) || { n, v: 0 }) : roh.filter((s) => s.v);
  const summe = ruestung ? stats.reduce((a, s) => a + s.v, 0) : 0;
  const max = ruestung ? 45 : 100;
  const kosten = (sale.costs || []).map((c) => `${c.quantity}${defs.items[c.itemHash]?.i ? ` <i class="muenze" data-ih="${c.itemHash}" style="background-image:url(${BILD}${defs.items[c.itemHash].i})"></i>` : ''}`).join(' ');
  return `<article class="xk ${d.q === 6 ? 'exo' : ''}">
    <div class="xk-kopf"><i data-ih="${sale.itemHash}" class="ic ${d.q === 6 ? 'exotic' : ''} ${d.t === 3 ? `el-${d.d0}` : ''}" style="background-image:url(${BILD}${d.i})"></i>
      <div><b>${esc(d.n)}</b><small>${esc(d.k)}</small></div><span class="kosten">${kosten}</span></div>
    ${spalten.length ? `<div class="xk-perks">${spalten.map((sp) => `<div class="xcol"><small>${esc(sp.art)}</small>${(sp.plugs.length > 8 ? [sp.aktiv] : sp.plugs).map((h) => `<i class="xp ${h === sp.aktiv ? 'an' : ''}" data-h="${h}" style="background-image:url(${BILD}${defs.items[h].i})"></i>`).join('')}${sp.plugs.length > 8 ? `<small>+${sp.plugs.length - 1}</small>` : ''}</div>`).join('')}</div>` : ''}
    ${stats.length ? `<table class="xstats">${stats.map((s) => `<tr><th>${esc(s.n)}</th><td><i><b style="width:${Math.min(100, (s.v / max) * 100)}%"></b></i></td><td>${s.v}</td></tr>`).join('')}
      ${ruestung ? `<tr class="summe"><th>Total</th><td></td><td>${summe}</td></tr>` : ''}</table>` : ''}
  </article>`;
}

export async function zeigeXur(haupt, zustand, eingebettet = false) {
  haupt.innerHTML = '<h1>Xûr</h1><p class="leer">Asking Xûr what he brought…</p>';
  let bis = null;
  try { bis = !daten || Date.now() - daten.zeit > 10 * 60_000 ? await Promise.race([xurDa(zustand), new Promise((r) => setTimeout(() => r(null), 12000))]) : new Date(daten.teile[0]?.vendor?.data?.nextRefreshDate || Date.now()); } catch { bis = null; }
  if (!bis && daten?.teile?.length === 0) daten = null;
  if (!bis) { haupt.innerHTML = `<h1>Xûr</h1><p class="leer">${[5, 6, 0, 1].includes(new Date().getDay()) || (new Date().getDay() === 2 && new Date().getUTCHours() < 17) ? 'Bungie didn’t answer about Xûr’s stock right now. <button class="chip klein" data-xurnochmal>↻ try again</button>' : 'Xûr is away – he’s back on Friday at the reset.'}</p>`; haupt.querySelector('[data-xurnochmal]')?.addEventListener('click', () => { daten = null; zeigeXur(haupt, zustand, eingebettet); }); return; }
  const alle = [];
  for (const teil of daten.teile) {
    for (const [idx, sale] of Object.entries(teil.sales?.data || {})) {
      const d = defs.items[sale.itemHash];
      if (!d?.i || alle.some((a) => a.d === d && a.idx === idx)) continue;
      alle.push({ d, sale, teil, idx });
    }
  }
  const html = GRUPPEN.map(([titel, test]) => {
    const liste = alle.filter((x) => !x.g && test(x.d));
    liste.forEach((x) => { x.g = titel; });
    return liste.length ? `<section><h2 class="xg">${titel} <small>${liste.length}</small></h2><div class="xraster">${liste.map(karte).join('')}</div></section>` : '';
  }).join('');
  const kopf = `<div class="kopf"><h1>Xûr</h1><span class="tag gold">Stock refreshes in ${dauer(bis)}</span><span class="platz"></span><small class="leer">Rolls as Xûr offers them to your ${esc(['Titan', 'Hunter', 'Warlock'][letzterChar(zustand.profil).classType])}</small></div>`;
  haupt.innerHTML = `${eingebettet ? '' : kopf}${html}`;
  const tipp = document.querySelector('#tipp');
  haupt.onpointerover = (e) => {
    const el = e.target.closest('[data-h]');
    if (!el) return;
    const p = defs.items[el.dataset.h];
    tipp.innerHTML = `<b>${esc(p.n)}</b><small>${esc(p.k || '')}</small><p class="tt">${esc(p.d || '')}</p>`;
    tipp.hidden = false;
    const r = el.getBoundingClientRect(), t = tipp.getBoundingClientRect();
    tipp.style.left = `${(Math.min(r.right + 8, innerWidth - t.width - 8)) / d2aZ()}px`;
    tipp.style.top = `${(Math.min(r.top, innerHeight - t.height - 8)) / d2aZ()}px`;
  };
  haupt.onpointerout = (e) => { if (e.target.closest('[data-h]')) tipp.hidden = true; };
}
