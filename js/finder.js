// Build Finder: Community-Builds gegen dein Inventar, mit Info-Punkt, wo fehlende Teile droppen.
import { defs } from './defs.js';
import { sammle } from './vault.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let daten = null;
let suche = '';

async function lade() {
  if (daten) return daten;
  const [b, s] = await Promise.all([fetch('data/builds.json').then((r) => r.json()), fetch('data/sets.json').then((r) => r.json())]);
  daten = { builds: b.builds.map((x) => ({ klasse: 2, ...x })), stand: b.stand, sets: s.sets, setQuelle: s.quelle };
  return daten;
}

// Bevorzugt Einträge mit Bild und Quelle, weil Namen in den Spieldaten mehrfach vorkommen.
let index = null;
function finde(name) {
  if (!index) {
    index = new Map();
    for (const [h, d] of Object.entries(defs.items)) {
      if (!d.n || !d.i || ![2, 3].includes(d.t)) continue;
      const alt = index.get(d.n);
      if (!alt || (!alt.qu && d.qu)) index.set(d.n, { ...d, hash: Number(h) });
    }
  }
  return index.get(name);
}

const blip = (titel, text) => `<span class="blip" tabindex="0" data-tn="${esc(titel)}" data-td="${esc(text)}">i</span>`;

function quelleText(d) {
  if (!d) return 'Not in the game data.';
  if (d.qu) return d.qu;
  if (d.q === 6) return 'Exotic: Exotic engrams, Xûr, or the Monument to Lost Lights in the Tower.';
  return 'Source unknown.';
}

function exoticZeile(name, besitz) {
  const d = finde(name);
  const hat = besitz.has(name);
  return `<div class="fz ${hat ? 'hat' : 'fehlt'}">${d?.i ? `<i style="background-image:url(${BILD}${d.i})"></i>` : ''}<span>${esc(name)}</span>
    ${hat ? '<em>owned</em>' : `<em>missing</em>${blip(name, quelleText(d))}`}</div>`;
}

function setZeile(p, sets, besitzSets) {
  const info = Object.entries(sets).find(([n]) => p.set.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(p.set.toLowerCase()))?.[1];
  const anzahl = besitzSets.get(p.set.toLowerCase()) || 0;
  const text = info ? `${info.farm}${info.schnell ? ' · fast farm' : ''}` : 'Drop source not in the list yet.';
  return `<div class="fz ${anzahl >= p.stuecke ? 'hat' : 'fehlt'}"><span><b>${esc(p.set)}</b> · ${p.stuecke} pieces (${esc(p.rolle)})</span><em>${anzahl} owned</em>${blip(`${p.set}: where to farm`, text)}<small>${esc(p.grund)}</small></div>`;
}

export async function zeigeFinder(haupt, zustand, oeffneOptimizer) {
  haupt.innerHTML = '<h1>Build Finder</h1><p class="leer">Loading builds…</p>';
  const d = await lade();
  const chars = Object.values(zustand.profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  let klasse = chars[0].classType;
  const zeichne = () => {
    const liste = sammle(zustand.profil).filter((x) => x.d.c === klasse || x.d.c === 3 || x.d.t === 3);
    const besitz = new Set(liste.map((x) => x.d.n));
    const besitzSets = new Map();
    for (const x of liste) if (x.d.e && x.d.t === 2) { const n = (defs.sets?.[x.d.e]?.n || '').toLowerCase(); for (const k of [n]) besitzSets.set(k, (besitzSets.get(k) || 0) + 1); }
    // Teil-Treffer: "Great Hunt" findet "Great Hunt Set".
    for (const [k, v] of [...besitzSets]) for (const b of d.builds) for (const p of b.plan || []) if (k.includes(p.set.toLowerCase())) besitzSets.set(p.set.toLowerCase(), Math.max(besitzSets.get(p.set.toLowerCase()) || 0, v));
    const builds = d.builds.filter((b) => b.klasse === klasse && (!suche || JSON.stringify(b).toLowerCase().includes(suche)));
    haupt.innerHTML = `<div class="kopf"><h1>Build Finder</h1><input id="fsuche" type="search" placeholder="Search build, exotic, aspect…" value="${esc(suche)}"><span class="platz"></span>
      <div class="chips">${chars.map((c) => `<button class="chip" data-kl="${c.classType}" aria-pressed="${c.classType === klasse}">${KLASSE[c.classType]}</button>`).join('')}</div></div>
      ${builds.length ? `<div class="fraster">${builds.map((b, i) => {
        const fehlt = b.exotics.filter((e) => !besitz.has(e)).length;
        return `<article class="fb"><div class="fb-kopf"><div><h2>${esc(b.name)}</h2><small>${esc(b.subclass)} · ${esc(b.aktivitaet.join(', '))}</small></div>
          <span class="tag ${fehlt ? '' : 'gold'}">${fehlt ? `${fehlt} missing` : 'Ready'}</span></div>
          <p class="fw">${esc(b.warum)}</p>
          <h3>Exotics</h3>${b.exotics.map((e) => exoticZeile(e, besitz)).join('')}
          ${(b.plan || []).length ? `<h3>Armor set</h3>${b.plan.map((p) => setZeile(p, d.sets, besitzSets)).join('')}` : ''}
          <h3>Aspects & fragments</h3><p class="fliste">${esc([...b.aspekte, ...b.fragmente].join(' · '))}</p>
          ${b.faehigkeiten?.length ? `<h3>Abilities</h3><p class="fliste">${esc(b.faehigkeiten.join(' · '))}</p>` : ''}
          ${b.mods?.length ? `<h3>Mods</h3><p class="fliste">${esc(b.mods.join(' · '))}</p>` : ''}
          <h3>Stat priority</h3><p class="fliste">${esc(b.stats.join(' › '))}</p>
          <div class="fb-fuss"><button class="haupt-knopf" data-opt="${i}">Optimize armor</button>${b.link ? `<a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.quelle || 'Source')} ↗</a>` : ''}</div></article>`;
      }).join('')}</div>` : `<p class="leer">${suche ? 'No build matches.' : `No community builds for ${KLASSE[klasse]} yet. Builds for all classes are on the list.`}</p>`}
      <p class="leer klein">Builds as of ${esc(d.stand)}. Armor farm spots: <a href="${esc(d.setQuelle)}" target="_blank" rel="noopener">source</a>.</p>`;
    const f = haupt.querySelector('#fsuche');
    f.oninput = () => { suche = f.value.trim().toLowerCase(); const pos = f.selectionStart; zeichne(); const n = haupt.querySelector('#fsuche'); n.focus(); n.setSelectionRange(pos, pos); };
    haupt.onclick = (e) => {
      const kl = e.target.closest('[data-kl]');
      if (kl) { klasse = Number(kl.dataset.kl); return zeichne(); }
      const o = e.target.closest('[data-opt]');
      if (o) {
        const b = builds[Number(o.dataset.opt)];
        const exo = liste.find((x) => x.d.t === 2 && x.d.q === 6 && b.exotics.includes(x.d.n));
        oeffneOptimizer({ klasse, exotic: exo?.hash || 0, ziele: b.ziele || {} });
      }
    };
    haupt.onpointerover = (e) => {
      const m = e.target.closest('[data-tn]'); const t = document.querySelector('#tipp');
      if (!m) { t.hidden = true; return; }
      t.innerHTML = `<b>${esc(m.dataset.tn)}</b><p class="tt">${esc(m.dataset.td)}</p>`;
      t.hidden = false;
      const r = m.getBoundingClientRect(), bx = t.getBoundingClientRect();
      t.style.left = `${Math.min(r.right + 8, innerWidth - bx.width - 8)}px`; t.style.top = `${Math.min(r.top, innerHeight - bx.height - 8)}px`;
    };
    haupt.onfocusin = (e) => { if (e.target.closest('[data-tn]')) haupt.onpointerover({ target: e.target }); };
  };
  zeichne();
}
