// Tresor: alle Waffen und Rüstungen, gruppiert nach Slot, nebeneinander gestapelt.
import { defs, champion, CHAMP_NAME } from './defs.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const SLOTS = [
  [1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power'],
  [3448274439, 'Helmet'], [3551918588, 'Gauntlets'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class item'],
];
const WAFFE = new Set([1498876634, 2465295065, 953998645]);
const NEBENSACHE = /shader|skins|tracker|masterworks?\b|mementos|crafting|empty|v400\.plugs\.weapons\.masterworks|origins|enhancements\.(season|universal)/i;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let klasse = null;

// Alles aus dem Profil zu einer flachen Liste machen.
export function sammle(profil) {
  const inst = profil.itemComponents?.instances?.data || {};
  const sockel = profil.itemComponents?.sockets?.data || {};
  const liste = [];
  const nimm = (it, ort, angelegt = false) => {
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
  const ort = x.ort === 'tresor' ? 'tresor' : 'char';
  return `<div class="ic ${x.d.q === 6 ? 'exotic' : ''} ${x.d.t === 3 ? `el-${x.element}` : ''}" data-id="${x.id}" tabindex="0" style="background-image:url(${BILD}${x.d.i})">
    ${champ}<i class="ort ${ort}"></i>${x.power ? `<span class="pow">${x.power}</span>` : ''}</div>`;
}

export function zeigeVault(haupt, zustand) {
  const profil = zustand.profil;
  const chars = Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (klasse === null) klasse = chars[0]?.classType ?? 2;
  const alle = sammle(profil);
  const nachChar = Object.fromEntries(chars.map((c) => [c.characterId, KLASSE[c.classType]]));

  const zeichne = () => {
    const sichtbar = alle.filter((x) => WAFFE.has(x.d.b) || x.d.c === klasse || x.d.c === 3);
    const reihen = SLOTS.map(([b, name]) => {
      const st = sichtbar.filter((x) => x.d.b === b).sort((p, q) => (q.d.q === 6) - (p.d.q === 6) || q.power - p.power || p.d.n.localeCompare(q.d.n));
      return st.length ? `<section class="reihe"><h3>${name} <small>${st.length}</small></h3><div class="raster">${st.map(kachel).join('')}</div></section>` : '';
    }).join('');
    haupt.innerHTML = `<div class="kopf"><h1>Vault</h1><span class="platz"></span><div class="chips" role="group" aria-label="Class">
      ${chars.map((c) => `<button class="chip" data-klasse="${c.classType}" aria-pressed="${c.classType === klasse}">${KLASSE[c.classType]} <small>${c.light}</small></button>`).join('')}
      </div></div>${reihen || '<p class="leer">No weapons or armor found.</p>'}`;
  };
  zeichne();

  haupt.onclick = (e) => {
    const c = e.target.closest('[data-klasse]');
    if (c) { klasse = Number(c.dataset.klasse); zeichne(); }
  };
  const tipp = document.querySelector('#tipp');
  const zeige = (el, x, y) => {
    const it = alle.find((a) => a.id === el.dataset.id);
    if (!it) return;
    const perks = it.plugs.map((p) => defs.items[p]).filter((p) => p?.i && p.pc && !NEBENSACHE.test(p.pc));
    const wo = it.ort === 'tresor' ? 'Vault' : `${nachChar[it.ort] || 'Character'}${it.angelegt ? ', equipped' : ''}`;
    const champ = it.champ ? ` · ${esc(CHAMP_NAME[it.champ.n] || it.champ.n)}` : '';
    tipp.innerHTML = `<b>${esc(it.d.n)}</b><small>${esc(it.d.k)}${it.power ? ` · ${it.power}` : ''}${champ} · ${wo}</small>
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
