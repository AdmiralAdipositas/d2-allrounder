// Zufall: Loadout-/Waffen-Randomizer mit Kriterien und ein Glücksrad (Vorlagen + eigener Text, alles an-/abwählbar).
import { defs } from './defs.js';
import { sammle, merkeAenderung, zumCharakter, ersatzAnlegen } from './vault.js';
import * as bungie from './bungie.js';
import { meldung } from './app.js';

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const SLOTS = [[1498876634, 'Kinetic'], [2465295065, 'Energy'], [953998645, 'Power']];
const RUEST = [[3448274439, 'Helmet'], [3551918588, 'Arms'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class Item']];
const lies = (k, s) => { try { return JSON.parse(localStorage.getItem(k)) ?? s; } catch { return s; } };
const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const zuf = (l) => l[Math.floor(Math.random() * l.length)];

let opt = lies('d2a.zufallOpt', { waffen: true, ruestung: false, exoW: true, exoR: true, nurExo: false, subclass: true, aus: [] });
let rad = lies('d2a.rad', { vorlage: 'fun', aus: {}, eigen: '' });
let ergebnis = null;

function wuerfle(zustand, cid) {
  const items = sammle(zustand.profil);
  const klasse = zustand.profil.characters?.data?.[cid]?.classType;
  const out = [];
  const waffen = items.filter((x) => x.d.t === 3 && !opt.aus.includes(x.d.k));
  const ruest = items.filter((x) => x.d.t === 2 && (x.d.c === klasse || x.d.c === 3));
  let exoWDa = false, exoRDa = false;
  if (opt.waffen) {
    const slots = SLOTS.slice().sort(() => Math.random() - 0.5); // Exotic-Platz zufällig verteilen
    for (const [b, n] of slots) {
      let l = waffen.filter((x) => x.d.b === b && (opt.exoW ? !(exoWDa && x.d.q === 6) : x.d.q !== 6));
      if (opt.nurExo && !exoWDa && opt.exoW && l.some((x) => x.d.q === 6)) l = l.filter((x) => x.d.q === 6);
      const x = zuf(l); if (!x) continue;
      if (x.d.q === 6) exoWDa = true;
      out.push({ x, slot: n, b });
    }
  }
  if (opt.ruestung) {
    for (const [b, n] of RUEST.slice().sort(() => Math.random() - 0.5)) {
      const l = ruest.filter((x) => x.d.b === b && (opt.exoR ? !(exoRDa && x.d.q === 6) : x.d.q !== 6));
      const x = zuf(l); if (!x) continue;
      if (x.d.q === 6) exoRDa = true;
      out.push({ x, slot: n, b });
    }
  }
  const reihenfolge = [...SLOTS, ...RUEST].map(([b]) => b);
  out.sort((a, c) => reihenfolge.indexOf(a.b) - reihenfolge.indexOf(c.b));
  return { cid, teile: out, sub: opt.subclass ? zuf(['Arc', 'Solar', 'Void', 'Stasis', 'Strand', 'Prismatic']) : null };
}

async function anlegen(zustand, e) {
  const k = zustand.konto;
  for (const { x } of e.teile) {
    try {
      let ort = x.ort;
      if (ort !== e.cid) {
        if (ort.startsWith('post:')) { ort = ort.slice(5); await bungie.abholen(k, x, ort); }
        if (ort !== 'tresor' && ort !== e.cid) { await ersatzAnlegen(zustand, x); await bungie.verschiebe(k, x, ort, true); }
        await zumCharakter(zustand, x, e.cid, new Set(e.teile.map((t) => t.x.id)));
      }
      await bungie.ausruesten(k, x, e.cid);
      merkeAenderung(x.id, { ort: e.cid, angelegt: true });
    } catch (err) { meldung(`${x.d.n}: ${err.message}`, true); return; }
  }
  zustand.alleItems = null;
  meldung('Random loadout equipped. Good luck.');
}

// ---------- Glücksrad ----------
const SPASS = ['Primaries only', 'No super', 'No grenades', 'Hand cannons only', 'Swords only', 'Everyone on the same element', 'No exotics', 'Sidearms only', 'Only blue (rare) weapons', 'Melee kills only for adds', 'No radar (turn it off in settings)', 'Random fireteam leader picks every loadout'];
function vorlagen(zustand) {
  const akt = Object.values(defs.akt || {});
  const namen = (g) => [...new Set(akt.filter((a) => a.g === g).map((a) => a.n.split(':')[0].trim()))].sort();
  const exos = [...new Set(sammle(zustand.profil).filter((x) => x.d.t === 3 && x.d.q === 6).map((x) => x.d.n))].sort();
  const typen = [...new Set(Object.values(defs.items).filter((d) => d.t === 3 && d.q === 5 && d.k).map((d) => d.k))].sort();
  return {
    fun: ['Fun challenges', SPASS], raid: ['Raids', namen('Raids')], dungeon: ['Dungeons', namen('Dungeons')],
    sub: ['Subclasses', ['Arc', 'Solar', 'Void', 'Stasis', 'Strand', 'Prismatic']], typ: ['Weapon types', typen], exo: ['Your exotic weapons', exos],
    eigen: ['My own list', rad.eigen.split('\n').map((s) => s.trim()).filter(Boolean)],
  };
}
const FARBEN = ['var(--sh1,#9b7bff)', 'var(--sh2,#7fd5ff)', 'var(--sh3,#ff8a2a)', 'var(--sh4,#3fe08f)', 'var(--sh5,#e8c35a)', 'var(--sh6,#ff6fae)'];
function radSvg(eintraege) {
  const n = Math.max(1, eintraege.length), r = 150;
  const seg = eintraege.map((t, i) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const p = (a) => `${160 + r * Math.cos(a)} ${160 + r * Math.sin(a)}`;
    const mid = (a0 + a1) / 2;
    return `<path d="M160 160 L${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z" style="fill:${FARBEN[i % FARBEN.length]}" opacity="${0.55 + 0.4 * ((i % 2))}" stroke="#0008"/>
      <text x="${160 + r * 0.6 * Math.cos(mid)}" y="${160 + r * 0.6 * Math.sin(mid)}" transform="rotate(${(mid * 180) / Math.PI} ${160 + r * 0.6 * Math.cos(mid)} ${160 + r * 0.6 * Math.sin(mid)})" text-anchor="middle" dominant-baseline="middle" font-size="${n > 16 ? 8 : 11}" font-weight="700" fill="#0b0a1a">${esc(t.length > 18 ? `${t.slice(0, 17)}…` : t)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 320 320" class="rad-svg"><g class="rad-dreh">${seg}</g><circle cx="160" cy="160" r="16" fill="#0b0a1a" stroke="#fff"/></svg><div class="rad-zeiger">▼</div>`;
}

export function oeffneZufall(zustand) {
  document.querySelector('#zufall')?.remove();
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  let cid = chars[0]?.characterId; let tab = 'loadout';
  const typen = [...new Set(sammle(zustand.profil).filter((x) => x.d.t === 3).map((x) => x.d.k))].sort();
  const box = document.createElement('div'); box.id = 'zufall'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  document.body.append(box);
  let winkel = 0, drehe = false;
  const zeichne = () => {
    const v = vorlagen(zustand);
    const liste = (v[rad.vorlage] || v.fun)[1];
    const aus = new Set(rad.aus[rad.vorlage] || []);
    const aktiv = liste.filter((t) => !aus.has(t));
    box.innerHTML = `<div class="wk-box zf-box"><button class="zf-zu" data-zu aria-label="Close">✕</button>
      <div class="wsub"><button class="chip" data-tab="loadout" aria-pressed="${tab === 'loadout'}">🎲 Loadout randomizer</button><button class="chip" data-tab="rad" aria-pressed="${tab === 'rad'}">🎡 Lucky wheel</button></div>
      ${tab === 'loadout' ? `
        <div class="zf-opt"><label>Guardian <select data-char>${chars.map((c) => `<option value="${c.characterId}" ${c.characterId === cid ? 'selected' : ''}>${KLASSE[c.classType]} ${c.light}</option>`).join('')}</select></label>
          ${[['waffen', 'Weapons'], ['ruestung', 'Armor'], ['exoW', 'Allow exotic weapon'], ['exoR', 'Allow exotic armor'], ['nurExo', 'Always include an exotic weapon'], ['subclass', 'Random subclass']].map(([k, t]) => `<label class="zf-cb"><input type="checkbox" data-opt="${k}" ${opt[k] ? 'checked' : ''}> ${t}</label>`).join('')}</div>
        <details class="zf-typen"><summary>Weapon types in the pool (${typen.length - opt.aus.filter((t) => typen.includes(t)).length}/${typen.length})</summary><div class="chips">${typen.map((t) => `<button class="chip klein" data-typ="${esc(t)}" aria-pressed="${!opt.aus.includes(t)}">${esc(t)}</button>`).join('')}</div></details>
        <button class="haupt-knopf" data-wuerfeln>🎲 Roll</button>
        ${ergebnis ? `<div class="zf-erg">${ergebnis.sub ? `<p>Subclass: <b>${esc(ergebnis.sub)}</b></p>` : ''}<div class="zf-teile">${ergebnis.teile.map(({ x, slot }) => `<div class="zf-teil ${x.d.q === 6 ? 'exo' : ''}"><i style="background-image:url(${BILD}${x.d.i})" data-ih="${x.hash}"></i><span><small>${esc(slot)}</small><b>${esc(x.d.n)}</b><small>${esc(x.d.k)}</small></span></div>`).join('') || '<p class="leer">Nothing fits these settings.</p>'}</div>
          ${ergebnis.teile.length ? '<div class="konto-knoepfe"><button data-anlegen>Equip all on this guardian</button><button data-wuerfeln>Reroll</button></div>' : ''}</div>` : '<p class="leer klein">Only uses items you own. Respects the one-exotic-weapon / one-exotic-armor rule.</p>'}`
      : `
        <div class="zf-opt"><label>List <select data-vorlage>${Object.entries(v).map(([k, [t, l]]) => `<option value="${k}" ${k === rad.vorlage ? 'selected' : ''}>${esc(t)} (${l.length})</option>`).join('')}</select></label></div>
        ${rad.vorlage === 'eigen' ? `<textarea data-eigen rows="4" placeholder="One entry per line">${esc(rad.eigen)}</textarea>` : ''}
        <div class="rad">${aktiv.length ? radSvg(aktiv) : '<p class="leer">Pick at least one entry.</p>'}</div>
        <button class="haupt-knopf" data-drehen ${aktiv.length < 2 ? 'disabled' : ''}>🎡 Spin</button><p class="zf-rad-erg" aria-live="polite"></p>
        <details><summary>Entries (${aktiv.length}/${liste.length} on)</summary><div class="chips">${liste.map((t) => `<button class="chip klein" data-eintrag="${esc(t)}" aria-pressed="${!aus.has(t)}">${esc(t)}</button>`).join('')}</div></details>`}
    </div>`;
  };
  zeichne();
  box.onclick = async (e) => {
    if (e.target === box || e.target.closest('[data-zu]')) { box.remove(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return zeichne(); }
    const ty = e.target.closest('[data-typ]'); if (ty) { const n = ty.dataset.typ; opt.aus = opt.aus.includes(n) ? opt.aus.filter((x) => x !== n) : [...opt.aus, n]; schreib('d2a.zufallOpt', opt); return zeichne(); }
    if (e.target.closest('[data-wuerfeln]')) { ergebnis = wuerfle(zustand, cid); return zeichne(); }
    if (e.target.closest('[data-anlegen]') && ergebnis) { e.target.disabled = true; await anlegen(zustand, ergebnis); return; }
    const ei = e.target.closest('[data-eintrag]'); if (ei) { const a = new Set(rad.aus[rad.vorlage] || []); a.has(ei.dataset.eintrag) ? a.delete(ei.dataset.eintrag) : a.add(ei.dataset.eintrag); rad.aus[rad.vorlage] = [...a]; schreib('d2a.rad', rad); return zeichne(); }
    if (e.target.closest('[data-drehen]') && !drehe) {
      const v = vorlagen(zustand); const aus = new Set(rad.aus[rad.vorlage] || []); const aktiv = (v[rad.vorlage] || v.fun)[1].filter((x) => !aus.has(x));
      const i = Math.floor(Math.random() * aktiv.length); const n = aktiv.length;
      // Mitte des Gewinner-Segments landet oben unter dem Zeiger.
      winkel += 360 * 5 + (360 - ((i + 0.5) / n) * 360) - (winkel % 360);
      const g = box.querySelector('.rad-dreh'); drehe = true;
      g.style.transition = 'transform 4s cubic-bezier(.17,.67,.2,1)'; g.style.transform = `rotate(${winkel}deg)`;
      setTimeout(() => { drehe = false; box.querySelector('.zf-rad-erg').innerHTML = `<b>${esc(aktiv[i])}</b>`; }, 4100);
    }
  };
  box.onchange = (e) => {
    const o = e.target.closest('[data-opt]'); if (o) { opt[o.dataset.opt] = o.checked; schreib('d2a.zufallOpt', opt); return; }
    if (e.target.closest('[data-char]')) { cid = e.target.value; ergebnis = null; return zeichne(); }
    if (e.target.closest('[data-vorlage]')) { rad.vorlage = e.target.value; winkel = 0; schreib('d2a.rad', rad); return zeichne(); }
    if (e.target.closest('[data-eigen]')) { rad.eigen = e.target.value; schreib('d2a.rad', rad); return zeichne(); }
  };
  box.onkeydown = (e) => { if (e.key === 'Escape') box.remove(); };
}
