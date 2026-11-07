// App-weite Infos zu Symbolen: Hover zeigt Details, Klick öffnet eine Karte mit Sprunglinks.
// Markieren: data-ih="<itemHash>" (Waffe, Rüstung, Perk, Mod), data-mh (Modifier), data-ah (Aktivität), data-sh (Set).
import { defs } from './defs.js';
import { quelle } from './quellen.js';
import { empfehlung } from './rolls.js';
import { guideId } from './guidelinks.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock', 3: '' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let nav = { wiki: () => {}, guide: () => {}, items: () => [] };
export function setzeNav(n) { nav = { ...nav, ...n }; }

function inhalt(el) {
  const { ih, mh, ah, sh } = el.dataset;
  if (ih) {
    const d = defs.items[ih];
    if (!d) return null;
    const q = quelle(ih, d);
    const besitz = nav.items().filter((x) => x.d.n === d.n).length;
    const set = d.e ? defs.sets?.[d.e] : null;
    const r = d.t === 3 ? empfehlung(ih) : null;
    const istPerk = d.t === 19;
    const links = [];
    if (!istPerk) links.push(['wiki', d.n, 'In the wiki']);
    if (set) links.push(['wiki', set.n, 'Set in the wiki']);
    if (d.t === 2 || d.t === 3) links.push(['farm', d.n, 'Where to farm']);
    if (!istPerk) links.push(['url', `https://www.light.gg/db/items/${ih}/`, 'light.gg ↗']);
    else links.push(['url', `https://www.light.gg/db/search/?q=${encodeURIComponent(d.n)}`, 'light.gg ↗']);
    return {
      titel: d.n, icon: d.i, unter: [d.k, KLASSE[d.c], d.q === 6 ? 'Exotic' : ''].filter(Boolean).join(' · '),
      text: `${d.d && istPerk ? `<p>${esc(d.d)}</p>` : ''}${d.xd ? `<p><b class="tgold">${esc(d.xp || 'Exotic perk')}</b> ${esc(d.xd)}</p>` : ''}
        ${set ? `<div class="tset"><b>${esc(set.n)}</b>${set.p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>` : ''}
        ${q ? `<p class="wm">Source: ${esc(q.text)}</p>` : ''}${!istPerk && (d.t === 2 || d.t === 3) ? `<p class="wm">${besitz ? `You own ${besitz}.` : 'Not in your inventory.'}${r?.ge?.length ? ' PvE god roll known.' : ''}${r?.gv?.length ? ' PvP god roll known.' : ''}</p>` : ''}`,
      links,
    };
  }
  if (mh) { const m = defs.mod?.[mh]; return m && { titel: m.n, icon: m.i, unter: 'Activity modifier', text: `<p>${esc(m.d)}</p>`, links: [['wiki', m.n, 'Search the wiki']] }; }
  if (ah) {
    const a = defs.akt?.[ah]; if (!a) return null;
    const n = a.n.split(':')[0].trim(); const g = guideId(n);
    return { titel: a.n, icon: a.i && !/pgcr/.test(a.i) ? a.i : '', unter: [a.g, a.o].filter(Boolean).join(' · '), text: a.d ? `<p>${esc(a.d)}</p>` : '', links: [['wiki', n, 'Loot & encounters'], ...(g ? [['guide', g, 'Raid guide']] : [])] };
  }
  if (sh) { const s = defs.sets?.[sh]; return s && { titel: s.n, icon: '', unter: 'Armor set', text: s.p.map((p) => `<p><b>${p.c}-piece · ${esc(p.n)}</b> ${esc(p.d)}</p>`).join(''), links: [['wiki', s.n, 'In the wiki'], ['farm', s.n, 'Where to farm']] }; }
  return null;
}

const tipp = () => document.querySelector('#tipp');
function zeigeTipp(el) {
  const x = inhalt(el); if (!x) return;
  const t = tipp();
  t.innerHTML = `<b>${esc(x.titel)}</b><small>${esc(x.unter)}</small>${x.text}<small class="thint">Click for links · Shift to pin</small>`;
  t.hidden = false;
  const r = el.getBoundingClientRect(), b = t.getBoundingClientRect();
  t.style.left = `${Math.max(8, Math.min(r.right + 8, innerWidth - b.width - 8))}px`;
  t.style.top = `${Math.max(8, Math.min(r.top, innerHeight - b.height - 8))}px`;
}

let karte = null;
function zeigeKarte(el) {
  const x = inhalt(el); if (!x) return;
  karte?.remove();
  karte = document.createElement('div');
  karte.className = 'infokarte'; karte.setAttribute('role', 'dialog');
  karte.innerHTML = `<div class="ik-kopf">${x.icon ? `<i style="background-image:url(${BILD}${x.icon})"></i>` : ''}<div><b>${esc(x.titel)}</b><small>${esc(x.unter)}</small></div><button class="ik-zu" aria-label="Close">✕</button></div>
    <div class="ik-text">${x.text}</div><div class="ik-links">${x.links.map(([art, ziel, txt]) => art === 'url' ? `<a class="chip" href="${esc(ziel)}" target="_blank" rel="noopener">${txt}</a>` : `<button class="chip" data-ika="${art}" data-ikz="${esc(ziel)}">${txt}</button>`).join('')}</div>`;
  document.body.append(karte);
  const r = el.getBoundingClientRect(), b = karte.getBoundingClientRect();
  if (innerWidth > 760) { karte.style.left = `${Math.max(8, Math.min(r.left, innerWidth - b.width - 8))}px`; karte.style.top = `${r.bottom + 8 + b.height > innerHeight ? Math.max(8, r.top - b.height - 8) : r.bottom + 8}px`; }
  tipp().hidden = true;
}
const zu = () => { karte?.remove(); karte = null; };

// Ein Element mit eigener Klick-Aktion (Kachel, Perk-Knopf …) behält seinen Klick; dort hilft Rechtsklick/langes Drücken.
const eigenerKlick = (el) => el.closest('button:not([data-ik]),a,[data-id],[data-oid],.pl,[data-opt]') && !el.hasAttribute('data-ik');
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-ih],[data-mh],[data-ah],[data-sh]');
  if (el && !el.closest('.infokarte') && !el.closest('[data-id],[data-oid],.pl')) zeigeTipp(el);
});
document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-ih],[data-mh],[data-ah],[data-sh]') && !e.target.closest('[data-id],[data-oid],.pl') && !document.querySelector('#tippFest:checked')) tipp().hidden = true; });
document.addEventListener('click', (e) => {
  const l = e.target.closest('[data-ika]');
  if (l) { const { ika, ikz } = l.dataset; zu(); if (ika === 'wiki') nav.wiki(ikz); if (ika === 'farm') nav.wiki(ikz, 'farm'); if (ika === 'guide') nav.guide(ikz); return; }
  if (e.target.closest('.ik-zu')) return zu();
  const el = e.target.closest('[data-ih],[data-mh],[data-ah],[data-sh]');
  if (el && !el.closest('.infokarte') && !eigenerKlick(el)) { e.preventDefault(); return zeigeKarte(el); }
  if (karte && !e.target.closest('.infokarte')) zu();
});
document.addEventListener('contextmenu', (e) => { if (document.body.classList.contains('zieht') || e.target.closest('.ck[data-cid]')) return; const el = e.target.closest('[data-ih],[data-mh],[data-ah],[data-sh]'); if (el) { e.preventDefault(); zeigeKarte(el); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
