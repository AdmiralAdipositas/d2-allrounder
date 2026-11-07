// Squad-Check: Bungie-Namen eintragen und sehen, was jeder angelegt hat (Subclass, Exotics, Waffen, Champion-Abdeckung).
// Nutzt nur öffentliche Profildaten; wer seine Ausrüstung privat stellt, erscheint ohne Details.
import * as bungie from './bungie.js';
import { defs, champion, CHAMP_NAME } from './defs.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lies = () => { try { return JSON.parse(localStorage.getItem('d2a.squad') || '[]'); } catch { return []; } };
const merke = (l) => { try { localStorage.setItem('d2a.squad', JSON.stringify(l)); } catch {} };
const cache = new Map();

async function spieler(name) {
  if (cache.has(name)) return cache.get(name);
  const [n, code] = name.split('#');
  const treffer = await bungie.post('/Destiny2/SearchDestinyPlayerByBungieName/-1/', { displayName: n, displayNameCode: Number(code) });
  const m = treffer.find((x) => x.crossSaveOverride === x.membershipType) || treffer[0];
  if (!m) throw new Error('not found');
  const p = await bungie.get(`/Destiny2/${m.membershipType}/Profile/${m.membershipId}/?components=200,205,300,305`);
  cache.set(name, p);
  return p;
}

function karte(name, p) {
  if (!p) return `<article class="sq"><b>${esc(name)}</b><p class="leer klein">Loading…</p></article>`;
  if (p.fehler) return `<article class="sq"><b>${esc(name)}</b><p class="rot klein">${esc(p.fehler)}</p></article>`;
  const chars = Object.values(p.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const c = chars[0];
  const eq = p.characterEquipment?.data?.[c?.characterId]?.items || [];
  if (!c || !eq.length) return `<article class="sq"><b>${esc(name)}</b><p class="leer klein">Gear is private or not available.</p></article>`;
  const sockel = p.itemComponents?.sockets?.data || {};
  const inst = p.itemComponents?.instances?.data || {};
  const teile = eq.map((i) => ({ i, d: defs.items[i.itemHash] })).filter((x) => x.d);
  const sub = teile.find((x) => x.d.t === 16);
  const waffen = teile.filter((x) => x.d.t === 3);
  const exo = teile.filter((x) => x.d.q === 6 && [2, 3].includes(x.d.t));
  const champs = new Set(waffen.map((x) => champion(x.i.itemHash, (sockel[x.i.itemInstanceId]?.sockets || []).map((s) => s.plugHash).filter(Boolean), inst[x.i.itemInstanceId]?.breakerType)).filter(Boolean).map((ch) => CHAMP_NAME[ch.n] || ch.n));
  return `<article class="sq"><div class="sq-kopf"><b>${esc(name)}</b><small>${KLASSE[c.classType]} · ${c.light} · last played ${new Date(c.dateLastPlayed).toLocaleDateString()}</small><button class="chip" data-weg="${esc(name)}" title="Remove">✕</button></div>
    <div class="sq-zeile">${sub ? `<span class="sq-sub" title="${esc(sub.d.n)}"><i style="background-image:url(${BILD}${sub.d.i})"></i>${esc(sub.d.n)}</span>` : ''}</div>
    <div class="sq-zeile">${waffen.map((x) => `<i class="sq-ic ${x.d.q === 6 ? 'exo' : ''}" title="${esc(x.d.n)}" style="background-image:url(${BILD}${x.d.i})"></i>`).join('')}${exo.filter((x) => x.d.t === 2).map((x) => `<i class="sq-ic exo" title="${esc(x.d.n)}" style="background-image:url(${BILD}${x.d.i})"></i>`).join('')}</div>
    <div class="sq-champs">${['Barrier', 'Overload', 'Unstoppable'].map((n) => `<span class="${champs.has(n) ? 'hat' : 'fehlt'}">${champs.has(n) ? '✓' : '✕'} ${n}</span>`).join('')}</div></article>`;
}

export function zeigeSquad(el, zustand) {
  const zeichne = () => {
    const namen = lies();
    const summe = { Barrier: 0, Overload: 0, Unstoppable: 0 };
    for (const n of namen) { const p = cache.get(n); if (p && !p.fehler) { const tmp = document.createElement('div'); tmp.innerHTML = karte(n, p); tmp.querySelectorAll('.sq-champs .hat').forEach((s) => { const k = s.textContent.replace('✓ ', ''); summe[k] += 1; }); } }
    el.innerHTML = `<div class="kopf"><h1>Squad check</h1></div>
      <form class="sq-form"><input id="sqName" placeholder="Bungie name, e.g. Guardian#1234" autocomplete="off"><button class="haupt-knopf">Add</button></form>
      ${namen.length ? `<div class="sq-summe">Team covers: ${Object.entries(summe).map(([k, v]) => `<span class="${v ? 'hat' : 'fehlt'}">${k} ${v}</span>`).join('')}</div>` : '<p class="leer">Add your fireteam to see what everyone has equipped and which champions you can stun.</p>'}
      <div class="sq-liste">${namen.map((n) => karte(n, cache.get(n))).join('')}</div>
      <p class="leer klein">Uses public Bungie data of each player's most recently played character.</p>`;
    el.querySelector('.sq-form').onsubmit = (e) => {
      e.preventDefault();
      const v = el.querySelector('#sqName').value.trim();
      if (!/^.+#\d{1,4}$/.test(v)) return import('./app.js').then((m) => m.meldung('Use the full Bungie name with #number.', true));
      const l = lies(); if (!l.includes(v)) { l.push(v); merke(l); }
      zeichne(); lade(v);
    };
  };
  const lade = (n) => spieler(n).then(() => zeichne()).catch((e) => { cache.set(n, { fehler: e.message === 'not found' ? 'Player not found.' : e.message }); zeichne(); });
  el.onclick = (e) => { const w = e.target.closest('[data-weg]'); if (w) { merke(lies().filter((x) => x !== w.dataset.weg)); zeichne(); } };
  zeichne();
  lies().filter((n) => !cache.has(n)).forEach(lade);
}
