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

// Ein Perk-Symbol mit kleiner, klar unterscheidbarer Empfehlung: blaues E = PvE, rotes P = PvP,
// Gold-Ring mit blauem (PvE) / rotem (PvP) Innenring = Teil des God Rolls, hell = aktiv.
export const ringKlasse = (m) => `${m.ge ? 'pk-ge' : ''} ${m.gv ? 'pk-gv' : ''}`;
export function perkIcon(h, marke, aktiv, extra = '') {
  const p = defs.items[h]; if (!p) return '';
  const m = marke ? marke(h) : { e: false, v: false, g: false };
  const verb = /Enhanced/i.test(p.k || '');
  const tip = `<b>${esc(p.n)}</b>${verb ? ' <em>Enhanced</em>' : ''}${m.ge ? ' · PvE god roll perk' : ''}${m.gv ? ' · PvP god roll perk' : ''}${m.e ? ' · PvE pick' : ''}${m.v ? ' · PvP pick' : ''}${aktiv ? ' · active' : extra ? ' · click to switch to it' : ''}<br>${esc(p.d || '')}`;
  return `<i class="pk ${aktiv ? 'an' : ''} ${ringKlasse(m)} ${verb ? 'pk-enh' : ''}" data-ph="${h}" ${extra} data-tip="${esc(tip)}" style="background-image:url(${BILD}${p.i})">${m.e ? '<u class="pk-e">E</u>' : ''}${m.v ? '<u class="pk-v">P</u>' : ''}</i>`;
}
// Raster aller Spalten (kompakt). klein = ohne Spaltenüberschrift. Jeder Perk ist anklickbar und wird dann im Spiel eingesetzt.
export function perkRaster(it, profil, opt = {}) {
  const sp = perkSpalten(it, profil); if (!sp.length) return '';
  const marke = it.d.q === 6 ? null : perkMarke(it.hash);
  return `<div class="pkraster ${opt.klein ? 'klein' : ''}">${sp.map((s) => `<div class="pkspalte">${opt.klein ? '' : `<small>${esc(s.art)}</small>`}${s.plugs.map((h) => perkIcon(h, marke, h === s.aktiv, it.id && s.plugs.length > 1 ? `data-s="${s.s}" data-iid="${it.id}"` : '')).join('')}</div>`).join('')}</div>`;
}
// Perk im Spiel einsetzen (kostenlos, jederzeit umkehrbar) und die lokalen Daten nachziehen.
export async function wendePerkAn(it, profil, s, h) {
  const [{ zustand, meldung }, bungie] = await Promise.all([import('./app.js'), import('./bungie.js')]);
  const chars = Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const cid = it.ort?.startsWith('post:') ? it.ort.slice(5) : !it.ort || it.ort === 'tresor' ? chars[0]?.characterId : it.ort;
  try {
    await bungie.plugSetzen(zustand.konto, it, cid, s, h);
    const so = profil.itemComponents?.sockets?.data?.[it.id]?.sockets?.[s]; const alt = so?.plugHash ?? it.sockel?.[s];
    if (so) so.plugHash = h;
    if (it.sockel) it.sockel[s] = h;
    it.plugs = (it.plugs || []).map((p) => (p === alt ? h : p));
    if (zustand.alleItems) zustand.alleItems.fertig = false;
    meldung(`${defs.items[h]?.n || 'Perk'} is now active on ${it.d.n}.`);
    return true;
  } catch (e) { meldung(`${defs.items[h]?.n || 'Perk'}: ${e.message}`, true); return false; }
}
export const PERK_LEGENDE = '<span class="pklegende"><span data-tip="Recommended for PvE by the community wish list (DIM “voltron”)."><u class="pk-e">E</u> PvE pick</span><span data-tip="Recommended for PvP by the community wish list."><u class="pk-v">P</u> PvP pick</span><span data-tip="Gold ring = part of the community’s top god roll. Blue inside = PvE god roll, red inside = PvP god roll, half and half = both."><i class="pk-ring"></i> god roll</span><span data-tip="The bright one in each column is the perk that is active right now. Click a dimmed one to switch to it."><i class="pk-akt"></i> active</span></span>';
