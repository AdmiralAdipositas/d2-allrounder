// Perk-Spalten einer Waffe wie im Spiel: je Spalte alle wählbaren Perks (aus dem Profil, Komponente 310), der aktive markiert.
// Gemeinsam genutzt von Hover-Fenster, Detail-Ansicht und Kopien-Vergleich – darum ohne Nachladen sofort da.
import { defs } from './defs.js';
import { perkMarke } from './rolls.js';

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const PERKSPALTE = /^(barrels|scopes|magazines|magazines_gl|tubes|arrows|batteries|blades|guards|hafts|bowstrings|stocks|grips|frames|origins|intrinsics)$/;
const SPALTENNAME = { intrinsics: 'Frame', frames: 'Trait', origins: 'Origin', barrels: 'Barrel', scopes: 'Sight', magazines: 'Magazine', magazines_gl: 'Magazine', tubes: 'Tube', arrows: 'Arrow', batteries: 'Battery', blades: 'Blade', guards: 'Guard', hafts: 'Haft', bowstrings: 'String', stocks: 'Stock', grips: 'Grip' };

export function perkSpalten(it, profil) {
  const so = profil?.itemComponents?.sockets?.data?.[it.id]?.sockets || (it.sockel || []).map((plugHash) => ({ plugHash }));
  const moegl = profil?.itemComponents?.reusablePlugs?.data?.[it.id]?.plugs || {};
  const sp = [];
  so.forEach((s, i) => {
    const d = defs.items[s.plugHash];
    if (!d || !PERKSPALTE.test(d.pc || '') || !d.i || s.isEnabled === false) return;
    const plugs = [...new Set([s.plugHash, ...(moegl[i] || []).map((p) => p.plugItemHash)])].filter((h) => defs.items[h]?.i);
    sp.push({ s: i, aktiv: s.plugHash, pc: d.pc, art: SPALTENNAME[d.pc] || d.k || '', plugs });
  });
  return sp;
}
// Alle wählbaren Perks (für die „kann“-Bewertung).
export const alleOptionen = (it, profil) => perkSpalten(it, profil).flatMap((sp) => sp.plugs);

// Ein Perk-Symbol mit kleiner, klar unterscheidbarer Empfehlung: grünes E = PvE, blaues P = PvP, goldener Ring = Teil des God Rolls.
export function perkIcon(h, marke, aktiv, extra = '') {
  const p = defs.items[h]; if (!p) return '';
  const m = marke ? marke(h) : { e: false, v: false, g: false };
  const verb = /Enhanced/i.test(p.k || '');
  const tip = `<b>${esc(p.n)}</b>${verb ? ' <em>Enhanced</em>' : ''}${m.g ? ' · god roll perk' : ''}${m.e ? ' · PvE pick' : ''}${m.v ? ' · PvP pick' : ''}${aktiv ? ' · active' : ''}<br>${esc(p.d || '')}`;
  return `<i class="pk ${aktiv ? 'an' : ''} ${m.g ? 'pk-god' : ''} ${verb ? 'pk-enh' : ''}" data-ph="${h}" ${extra} data-tip="${esc(tip)}" style="background-image:url(${BILD}${p.i})">${m.e ? '<u class="pk-e">E</u>' : ''}${m.v ? '<u class="pk-v">P</u>' : ''}</i>`;
}
// Raster aller Spalten (kompakt). klein = ohne Spaltenüberschrift.
export function perkRaster(it, profil, opt = {}) {
  const sp = perkSpalten(it, profil); if (!sp.length) return '';
  const marke = it.d.q === 6 ? null : perkMarke(it.hash);
  return `<div class="pkraster ${opt.klein ? 'klein' : ''}">${sp.map((s) => `<div class="pkspalte">${opt.klein ? '' : `<small>${esc(s.art)}</small>`}${s.plugs.map((h) => perkIcon(h, marke, h === s.aktiv)).join('')}</div>`).join('')}</div>`;
}
export const PERK_LEGENDE = '<span class="pklegende"><span data-tip="Recommended for PvE by the community wish list (DIM “voltron”)."><u class="pk-e">E</u> PvE pick</span><span data-tip="Recommended for PvP by the community wish list."><u class="pk-v">P</u> PvP pick</span><span data-tip="Part of the community’s top god roll for this weapon."><i class="pk-ring"></i> god roll</span><span data-tip="The bright one in each column is the perk that is active right now."><i class="pk-akt"></i> active</span></span>';
