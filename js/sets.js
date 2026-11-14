// Rüstungs-Sets überall gleich zeigen: fünf Teile-Symbole (Helm, Arme, Brust, Beine, Klassen-Item – was du besitzt leuchtet)
// plus Name; Hover zeigt Boni und welche Plätze du hast (über data-sh, siehe info.js).
import { defs } from './defs.js';

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const SET_SLOTS = [3448274439, 3551918588, 14239492, 20886954, 1585787867];
export const SET_SLOTNAME = ['Helmet', 'Gauntlets', 'Chest', 'Legs', 'Class item'];
let idx = null, quelle = () => [], klasseJetzt = () => 2;
export function setzeSetQuelle(items, klasse) { quelle = items; klasseJetzt = klasse; }
function index() {
  if (idx) return idx; idx = {};
  for (const d of Object.values(defs.items)) if (d.t === 2 && d.e && d.i && d.q !== 6) { const k = ((idx[d.e] ||= {})[d.c] ||= {}); k[d.b] ||= d; }
  return idx;
}
// Set-Kennung zu einem Namen (genau, sonst enthält/enthalten – Build-Listen schreiben Namen manchmal kürzer).
export function setId(name) {
  const n = String(name || '').toLowerCase(); if (!n) return null;
  const l = Object.entries(defs.sets || {});
  return (l.find(([, s]) => s.n.toLowerCase() === n) || l.find(([, s]) => s.n && (s.n.toLowerCase().includes(n) || n.includes(s.n.toLowerCase()))))?.[0] || null;
}
// Teile je Platz: Symbol und wie viele du davon besitzt.
export function setTeile(id, klasse = klasseJetzt()) {
  const proKlasse = index()[id] || {}; const defsK = proKlasse[klasse] || proKlasse[3] || Object.values(proKlasse)[0] || {};
  const meine = quelle().filter((x) => x.d.t === 2 && String(x.d.e) === String(id) && (x.d.c === klasse || x.d.c === 3));
  return SET_SLOTS.map((b, i) => ({ platz: SET_SLOTNAME[i], d: defsK[b] || null, n: meine.filter((x) => x.d.b === b).length }));
}
// Marke für Fließtext, Chips und Überschriften. opt.ohneName: nur die Symbole.
export function setMarke(name, opt = {}) {
  const id = opt.id || setId(name); if (!id) return esc(name);
  const kl = opt.klasse ?? klasseJetzt();
  return `<span class="setm" data-sh="${id}" data-skl="${kl}"><span class="setm-ic">${setTeile(id, kl).map((t) => `<i class="${t.n ? '' : 'fehlt'}" ${t.d ? `style="background-image:url(${BILD}${t.d.i})"` : ''}></i>`).join('')}</span>${opt.ohneName ? '' : `<b>${esc(name || defs.sets[id].n)}</b>`}</span>`;
}
// Inhalt für das Hover-Fenster: Boni + Plätze mit Besitz.
export function setInfo(id, klasse = klasseJetzt()) {
  const s = defs.sets?.[id]; if (!s) return '';
  const t = setTeile(id, klasse); const hat = t.filter((x) => x.n).length;
  return `<div class="setinfo">${t.map((x) => `<span class="${x.n ? '' : 'fehlt'}"><i ${x.d ? `style="background-image:url(${BILD}${x.d.i})"` : ''}></i><small>${x.platz}</small><em>${x.n ? `×${x.n}` : '–'}</em></span>`).join('')}</div>
    <p class="wm">You own ${hat} of 5 slots${hat >= 4 ? ' – enough for both bonuses' : hat >= 2 ? ' – enough for the 2-piece bonus' : ' – not enough for a bonus yet'}.</p>
    ${s.p.map((p) => `<p><b class="tgold">${p.c}-piece · ${esc(p.n)}</b> ${esc(p.d)}</p>`).join('')}`;
}
