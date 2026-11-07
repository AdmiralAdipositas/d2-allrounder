// Build Finder als Feed: kuratierte Community-Builds plus eine Build-Idee je Exotic-Rüstung,
// endlos scrollbar, Karten auf- und zuklappbar, Filter für Klasse, Element, Besitz und Nischen-Suche.
import { defs } from './defs.js';
import { sammle } from './vault.js';
import { baueIdee, elementeAus } from './generator.js';
import { quelle } from './quellen.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const ELEMENTE = ['Solar', 'Arc', 'Void', 'Stasis', 'Strand', 'Prismatic'];
const SUBCLASS_EL = { Dawnblade: 'Solar', Sunbreaker: 'Solar', Gunslinger: 'Solar', Stormcaller: 'Arc', Striker: 'Arc', Arcstrider: 'Arc', Voidwalker: 'Void', Sentinel: 'Void', Nightstalker: 'Void', Shadebinder: 'Stasis', Behemoth: 'Stasis', Revenant: 'Stasis', Broodweaver: 'Strand', Berserker: 'Strand', Threadrunner: 'Strand' };
const STAT_WORT = [['Grenade', /grenade/i], ['Melee', /melee|punch|charged/i], ['Super', /super/i], ['Class', /class ability|dodge|rift|barricade|dive/i], ['Weapons', /weapon|reload|ammo|precision/i], ['Health', /heal|restor|damage resistance|overshield|survivab/i]];
const PAKET = 10;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lies = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

let daten = null;
let wahl = lies('d2a.finder', { klasse: null, el: [], besitz: false, nurKuratiert: false, suche: '' });
const offen = new Set();

async function lade() {
  if (daten) return daten;
  const [b, s] = await Promise.all([fetch('data/builds.json').then((r) => r.json()), fetch('data/sets.json').then((r) => r.json())]);
  daten = { builds: b.builds.map((x) => ({ klasse: 2, ...x })), stand: b.stand, sets: s.sets, setQuelle: s.quelle };
  return daten;
}

let index = null;
function finde(name) {
  if (!index) {
    index = new Map();
    for (const [h, d] of Object.entries(defs.items)) {
      if (!d.n || !d.i || ![2, 3].includes(d.t)) continue;
      const alt = index.get(d.n);
      if (!alt || (!alt.qu && d.qu) || (!alt.xd && d.xd)) index.set(d.n, { ...d, hash: Number(h) });
    }
  }
  return index.get(name);
}

const elementVon = (text) => {
  const t = text || '';
  if (/Light and Darkness|Prismatic|Transcendence/i.test(t)) return ['Prismatic'];
  const els = ELEMENTE.filter((e) => new RegExp(`\\b${e}\\b`, 'i').test(t));
  return els.length ? els : [];
};

// Eine komplette Build-Idee je Exotic-Rüstung, die nicht schon in einem Community-Build steckt.
function ideen(kuratiert) {
  const schon = new Set(kuratiert.flatMap((b) => b.exotics));
  const gesehen = new Set();
  const liste = [];
  for (const [h, d] of Object.entries(defs.items)) {
    if (d.t !== 2 || d.q !== 6 || d.c > 2 || !d.xd || gesehen.has(d.n) || schon.has(d.n)) continue;
    gesehen.add(d.n);
    liste.push(baueIdee(h, d));
  }
  return liste.sort((a, b) => a.name.localeCompare(b.name));
}

// Viele Quellen zum selben Exotic, damit man Auswahl hat.
const quellen = (name) => [
  ['light.gg', `https://www.light.gg/db/search/?q=${encodeURIComponent(name)}`],
  ['Mobalytics', `https://mobalytics.gg/destiny-2/builds?search=${encodeURIComponent(name)}`],
  ['Blueberries', `https://www.blueberries.gg/?s=${encodeURIComponent(name)}`],
  ['D2 Gunsmith', `https://d2gunsmith.com/`],
  ['YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(`destiny 2 ${name} build`)}`],
  ['Reddit', `https://www.reddit.com/r/DestinyTheGame/search/?q=${encodeURIComponent(`${name} build`)}`],
];

const blip = (titel, text) => `<span class="blip" tabindex="0" data-tn="${esc(titel)}" data-td="${esc(text)}">i</span>`;
const quelleText = (d) => { if (!d) return 'Not in the game data.'; const q = quelle(d.hash, d); return q ? `${q.text} (${q.von})` : d.q === 6 ? 'Exotic engrams, Xûr, or the Monument to Lost Lights in the Tower.' : 'No confirmed source yet – check light.gg.'; };

function karte(b, besitz, besitzSets, sets) {
  const auf = offen.has(b.id);
  const haupt = finde(b.exotics[0]);
  const fehlt = b.exotics.filter((e) => !besitz.has(e));
  const els = b.elemente || [SUBCLASS_EL[b.subclass] || (/Prismatic/.test(b.subclass) ? 'Prismatic' : '')].filter(Boolean);
  const kurz = (b.warum || '').length > 150 && !auf ? `${b.warum.slice(0, 150)}…` : b.warum;
  return `<article class="feed-karte ${b.idee ? 'idee' : 'kuratiert'}" data-id="${esc(b.id)}">
    <div class="fk-bild" style="background-image:url(${BILD}${haupt?.i || ''})"></div>
    <div class="fk-text">
      <div class="fk-kopf"><div><h2>${esc(b.name)}</h2><small>${KLASSE[b.klasse]}${b.subclass ? ` · ${esc(b.subclass)}` : ''}${b.aktivitaet?.length && !b.idee ? ` · ${esc(b.aktivitaet.join(', '))}` : ''}</small></div>
        <div class="fk-tags">${els.map((e) => `<span class="eltag el-${e.toLowerCase()}">${e}</span>`).join('')}${b.idee ? '<span class="tag">Idea</span>' : '<span class="tag gold">Community</span>'}<span class="tag ${fehlt.length ? '' : 'gut'}">${fehlt.length ? `${fehlt.length} missing` : 'Ready'}</span></div></div>
      <p class="fk-warum">${esc(kurz)}</p>
      <button class="fk-klapp" data-klapp="${esc(b.id)}" aria-expanded="${auf}">${auf ? 'Less ▴' : 'Details ▾'}</button>
      ${auf ? `<div class="fk-mehr">
        <h3>Exotics</h3>${b.exotics.map((e) => { const d = finde(e); const hat = besitz.has(e); return `<div class="fz ${hat ? 'hat' : 'fehlt'}">${d?.i ? `<i style="background-image:url(${BILD}${d.i})"></i>` : ''}<span>${esc(e)}</span><em>${hat ? 'owned' : 'missing'}</em>${hat ? '' : blip(e, quelleText(d))}${d?.xd && !b.idee ? `<small>${esc(d.xp || '')}: ${esc(d.xd)}</small>` : ''}</div>`; }).join('')}
        ${(b.plan || []).length ? `<h3>Armor set</h3>${b.plan.map((p) => { const info = Object.entries(sets).find(([n]) => p.set.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(p.set.toLowerCase()))?.[1]; const n = besitzSets(p.set); return `<div class="fz ${n >= p.stuecke ? 'hat' : 'fehlt'}"><span><b>${esc(p.set)}</b> · ${p.stuecke} pieces</span><em>${n} owned</em>${blip(`${p.set}: where to farm`, info ? `${info.farm}${info.schnell ? ' · fast farm' : ''}` : 'Drop source not in the list yet.')}<small>${esc(p.grund)}</small></div>`; }).join('')}` : ''}
        ${b.subclass ? `<h3>Subclass</h3><p class="fliste">${esc(b.subclass)}</p>` : ''}
        ${b.faehigkeiten?.length ? `<h3>Super & abilities</h3><p class="fliste">${esc(b.faehigkeiten.join(' · '))}</p>` : ''}
        ${b.aspekte?.length ? `<h3>Aspects</h3><p class="fliste">${esc(b.aspekte.join(' · '))}</p><h3>Fragments</h3><p class="fliste">${esc(b.fragmente.join(' · '))}</p>` : ''}
        ${b.erklaerung?.length ? `<h3>Why these pieces</h3>${b.erklaerung.map((x) => `<p class="fliste klein2">${esc(x)}</p>`).join('')}` : ''}
        ${b.waffen?.length ? `<h3>Weapons</h3><p class="fliste">${esc(b.waffen.join(' · '))}</p>` : ''}
        ${b.mods?.length ? `<h3>Mods</h3><p class="fliste">${esc(b.mods.join(' · '))}</p>` : ''}
        <h3>Stat focus</h3><p class="fliste">${esc(b.stats.join(' › '))}</p>
        <p class="fquelle">Source: ${b.link ? `<a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.quelle || 'Source')} ↗</a>` : esc(b.quelle || '')}</p>
        <h3>More builds with ${esc(b.exotics[0])}</h3><div class="fquellen">${quellen(b.exotics[0]).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${n} ↗</a>`).join('')}</div>
        <div class="fb-fuss"><button class="haupt-knopf" data-opt="${esc(b.id)}">Build it: pick armor & equip all</button></div></div>` : ''}
    </div></article>`;
}

export async function zeigeFinder(haupt, zustand, oeffneOptimizer) {
  haupt.innerHTML = '<h1>Build Finder</h1><p class="leer">Loading builds…</p>';
  const d = await lade();
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  if (wahl.klasse === null) wahl.klasse = chars[0].classType;
  const alle = [...d.builds, ...ideen(d.builds)];
  const merke = () => { try { localStorage.setItem('d2a.finder', JSON.stringify(wahl)); } catch {} };
  let liste = [];
  let gezeigt = 0;
  let besitz, besitzSets, items;

  const filtere = () => {
    items = sammle(zustand.profil).filter((x) => x.d.c === wahl.klasse || x.d.c === 3 || x.d.t === 3);
    besitz = new Set(items.map((x) => x.d.n));
    const setZahl = new Map();
    for (const x of items) if (x.d.e && x.d.t === 2) { const n = (defs.sets?.[x.d.e]?.n || '').toLowerCase(); setZahl.set(n, (setZahl.get(n) || 0) + 1); }
    besitzSets = (name) => [...setZahl].filter(([k]) => k.includes(name.toLowerCase())).reduce((a, [, v]) => a + v, 0);
    const worte = wahl.suche.toLowerCase().split(/\s+/).filter(Boolean);
    liste = alle.filter((b) => {
      if (b.klasse !== wahl.klasse) return false;
      if (wahl.nurKuratiert && b.idee) return false;
      const els = b.elemente || [SUBCLASS_EL[b.subclass] || (/Prismatic/.test(b.subclass) ? 'Prismatic' : '')];
      if (wahl.el.length && !wahl.el.some((e) => els.includes(e))) return false;
      if (wahl.besitz && b.exotics.some((e) => !besitz.has(e))) return false;
      if (!worte.length) return true;
      const text = JSON.stringify(b).toLowerCase() + (finde(b.exotics[0])?.xd || '').toLowerCase();
      return worte.every((w) => text.includes(w));
    });
    // Kuratierte zuerst, dann was du schon besitzt.
    liste.sort((a, b) => (a.idee - b.idee) || (b.exotics.every((e) => besitz.has(e)) - a.exotics.every((e) => besitz.has(e))));
  };

  const kopf = () => `<div class="kopf"><h1>Build Finder</h1><input id="fsuche" type="search" placeholder="Search a niche: turret, freeze, healing, Bubble…" value="${esc(wahl.suche)}"><span class="platz"></span>
      <div class="chips">${chars.map((c) => `<button class="chip" data-kl="${c.classType}" aria-pressed="${c.classType === wahl.klasse}">${KLASSE[c.classType]}</button>`).join('')}</div></div>
    <div class="feed-filter chips">${ELEMENTE.map((e) => `<button class="chip el-chip el-${e.toLowerCase()}" data-el="${e}" aria-pressed="${wahl.el.includes(e)}">${e}</button>`).join('')}
      <button class="chip" data-schalter="besitz" aria-pressed="${wahl.besitz}">Ready to play</button><button class="chip" data-schalter="nurKuratiert" aria-pressed="${wahl.nurKuratiert}">Community only</button>
      <span class="feed-zahl" id="fZahl"></span></div><div id="feed"></div><div id="feedEnde" class="feed-ende"></div>`;

  const mehr = () => {
    const feed = haupt.querySelector('#feed');
    if (!feed || gezeigt >= liste.length) return;
    feed.insertAdjacentHTML('beforeend', liste.slice(gezeigt, gezeigt + PAKET).map((b) => karte(b, besitz, besitzSets, d.sets)).join(''));
    gezeigt = Math.min(liste.length, gezeigt + PAKET);
    haupt.querySelector('#feedEnde').textContent = gezeigt >= liste.length ? (liste.length ? `That's all · ${liste.length} builds` : 'No build matches. Try fewer filters.') : 'Loading more…';
  };
  const neu = () => {
    filtere(); gezeigt = 0;
    haupt.querySelector('#feed').innerHTML = '';
    haupt.querySelector('#fZahl').textContent = `${liste.length} builds`;
    mehr();
  };
  haupt.innerHTML = kopf();
  neu();
  // Endlos scrollen: nachladen, sobald das Ende sichtbar wird.
  const beobachter = new IntersectionObserver((e) => { if (e[0].isIntersecting) mehr(); }, { rootMargin: '600px' });
  beobachter.observe(haupt.querySelector('#feedEnde'));

  const f = haupt.querySelector('#fsuche');
  let t;
  f.oninput = () => { clearTimeout(t); t = setTimeout(() => { wahl.suche = f.value.trim(); merke(); neu(); }, 200); };
  haupt.onclick = (e) => {
    const kl = e.target.closest('[data-kl]');
    if (kl) { wahl.klasse = Number(kl.dataset.kl); merke(); haupt.querySelectorAll('[data-kl]').forEach((x) => x.setAttribute('aria-pressed', x === kl)); return neu(); }
    const el = e.target.closest('[data-el]');
    if (el) { const v = el.dataset.el; wahl.el = wahl.el.includes(v) ? wahl.el.filter((x) => x !== v) : [...wahl.el, v]; el.setAttribute('aria-pressed', wahl.el.includes(v)); merke(); return neu(); }
    const sch = e.target.closest('[data-schalter]');
    if (sch) { const k = sch.dataset.schalter; wahl[k] = !wahl[k]; sch.setAttribute('aria-pressed', wahl[k]); merke(); return neu(); }
    const kp = e.target.closest('[data-klapp]') || (e.target.closest('.fk-warum') && e.target.closest('.feed-karte'));
    if (kp) {
      const id = kp.dataset.klapp || kp.dataset.id;
      if (offen.has(id)) offen.delete(id); else offen.add(id);
      const k = haupt.querySelector(`.feed-karte[data-id="${CSS.escape(id)}"]`);
      k.outerHTML = karte(liste.find((b) => b.id === id), besitz, besitzSets, d.sets);
      return;
    }
    const o = e.target.closest('[data-opt]');
    if (o) {
      const b = liste.find((x) => x.id === o.dataset.opt);
      const exo = items.find((x) => x.d.t === 2 && x.d.q === 6 && b.exotics.includes(x.d.n));
      const ziele = Object.fromEntries(b.stats.slice(0, 2).map((s, i) => [s, i ? 100 : 150]));
      oeffneOptimizer({ klasse: wahl.klasse, exotic: exo?.hash || 0, ziele: b.ziele && Object.keys(b.ziele).length ? b.ziele : ziele,
        build: { name: b.name, subclass: b.subclass, aspekte: b.aspekte || [], fragmente: b.fragmente || [], faehigkeiten: b.faehigkeiten || [], exotics: b.exotics } });
    }
  };
  haupt.onpointerover = (e) => {
    const m = e.target.closest('[data-tn]'); const tp = document.querySelector('#tipp');
    if (!m) { tp.hidden = true; return; }
    tp.innerHTML = `<b>${esc(m.dataset.tn)}</b><p class="tt">${esc(m.dataset.td)}</p>`;
    tp.hidden = false;
    const r = m.getBoundingClientRect(), bx = tp.getBoundingClientRect();
    tp.style.left = `${Math.min(r.right + 8, innerWidth - bx.width - 8)}px`; tp.style.top = `${Math.min(r.top, innerHeight - bx.height - 8)}px`;
  };
}
