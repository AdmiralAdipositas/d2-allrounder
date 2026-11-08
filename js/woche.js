// "This week": Raids, Dungeons und Portal von Bungie, mit Featured, Loot-Stufe, Challenges und Modifiern.
import { guideId } from './guidelinks.js';
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { CHALLENGES as LISTE } from './challenges.js';
import { zeigeXur } from './xur.js';
const CH = Object.fromEntries(Object.entries(LISTE).map(([k, v]) => [k.toLowerCase(), v]));
const CHALLENGES = new Proxy({}, { get: (_, n) => CH[String(n).toLowerCase()] });
const ALLGEMEIN = /^(Weekly Raid Challenge|Weekly Dungeon Challenge|All encounters completed)$/;

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const RESET = 17;
const IM_GUIDE = ['Root of Nightmares', "King's Fall", 'Last Wish', "Salvation's Edge", 'Vault of Glass', 'Equilibrium'];
let cache = null;

export function resets(jetzt = new Date()) {
  const t = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate(), RESET));
  if (t <= jetzt) t.setUTCDate(t.getUTCDate() + 1);
  const w = new Date(t);
  while (w.getUTCDay() !== 2) w.setUTCDate(w.getUTCDate() + 1);
  return { taeglich: t, woechentlich: w };
}
export const dauer = (bis) => {
  const m = Math.max(0, Math.round((bis - Date.now()) / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${h}h` : `${h}h ${m % 60}m`;
};
const uhr = (d) => d.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export const letzterChar = (profil) => Object.values(profil.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed))[0];

async function lade(zustand) {
  if (cache && Date.now() - cache.zeit < 30 * 60_000) return cache.gruppen;
  const k = zustand.konto;
  const c = letzterChar(zustand.profil);
  const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/Character/${c.characterId}/?components=204`);
  const gruppen = {};
  const nachName = new Map();
  for (const a of r.activities?.data?.availableActivities || []) {
    const d = defs.akt?.[a.activityHash];
    if (!d || a.isVisible === false) continue;
    if (/^(Featured |Pantheon|Quickplay|Vanguard Ops$)/.test(d.n) || /: Customize$/.test(d.n)) continue;
    const portal = d.g === 'Portal';
    const name = portal ? d.n : d.n.split(':')[0].trim();
    const stufe = portal ? '' : (d.n.split(':')[1] || '').trim();
    let e = nachName.get(`${d.g}|${name}`);
    if (!e) {
      e = { name, icon: d.i, text: d.d, stufen: [], featured: false, tier: 0, challenges: [], mods: [] };
      nachName.set(`${d.g}|${name}`, e);
      (gruppen[d.g] = gruppen[d.g] || []).push(e);
    }
    if (stufe && !e.stufen.includes(stufe)) e.stufen.push(stufe);
    if (a.isFocusedActivity || (a.challenges || []).length) e.featured = true;
    for (const ch of a.challenges || []) {
      const z = defs.ziel?.[ch.objective?.objectiveHash];
      if (z && !ALLGEMEIN.test(z.n) && !e.challenges.some((x) => x.n === z.n)) e.challenges.push(z);
    }
    // Raid-Challenges stecken als Modifier drin ("A challenge awaits…"); Text kommt aus unserer Liste.
    for (const m of a.modifierHashes || []) {
      const md = defs.mod?.[m];
      if (!md || !(CHALLENGES[md.n] || /challenge awaits/i.test(md.d)) || e.challenges.some((x) => x.n === md.n)) continue;
      const [enc, text] = CHALLENGES[md.n] || ['', ''];
      e.challenges.push({ n: md.n, enc, d: text });
    }
    // Master gibt immer die höchste Stufe; aussagekräftig ist die Stufe ohne Master.
    const hashes = JSON.stringify(a.visibleRewards || []).match(/"itemHash":(\d+)/g) || [];
    for (const x of hashes) {
      const t = Number((defs.items[x.split(':')[1]]?.k || '').match(/Tier (\d)/)?.[1] || 0);
      if (!/Master/.test(stufe) && t > e.tier) e.tier = t;
    }
    if (portal || /Master/.test(stufe)) {
      for (const m of a.modifierHashes || []) {
        const md = defs.mod?.[m];
        if (md && !CHALLENGES[md.n] && !/challenge awaits|\{var:/i.test(md.d) && !e.mods.some((x) => x.n === md.n)) e.mods.push(md);
      }
    }
  }
  // Challenges zählen nur in der Featured-Aktivität.
  for (const l of Object.values(gruppen)) for (const e of l) if (!e.featured) e.challenges = [];
  for (const l of Object.values(gruppen)) l.sort((a, b) => b.featured - a.featured || b.tier - a.tier || a.name.localeCompare(b.name));
  cache = { zeit: Date.now(), gruppen };
  return gruppen;
}

function karte(e) {
  return `<article class="akt ${e.featured ? 'feat' : ''}">
    <div class="akt-kopf">${e.icon ? `<i style="background-image:url(${BILD}${e.icon})"></i>` : ''}<b>${esc(e.name)}</b>
      ${e.featured ? '<span class="tag gold">Featured</span>' : ''}${guideId(e.name.split(':')[0].trim()) ? `<button class="tag guide-link" data-guide="${guideId(e.name.split(':')[0].trim())}" title="Open the raid guide">Guide ↗</button>` : ''}${e.tier ? `<span class="tag">Tier ${e.tier}</span>` : ''}</div>
    ${e.stufen.length ? `<small>${esc(e.stufen.join(' · '))}</small>` : ''}
    ${e.challenges.length ? `<div class="chals">${e.challenges.map((c) => `<p class="chal">${c.enc ? `<em>${esc(c.enc)}${guideId(c.enc, e.name.split(':')[0].trim()) ? ` <button class="mini-link" data-guide="${guideId(c.enc, e.name.split(':')[0].trim())}">guide ↗</button>` : ''}</em>` : ''}<b>${esc(c.n)}</b>${c.d ? `<span>${esc(c.d)}</span>` : ''}</p>`).join('')}</div>` : ''}
    ${e.mods.length ? `<div class="mods">${e.mods.slice(0, 12).map((m) => `<span class="modz" data-tn="${esc(m.n)}" data-td="${esc(m.d)}"><i style="background-image:url(${BILD}${m.i})"></i><span class="modt"><b>${esc(m.n)}</b><small>${esc(String(m.d || '').split(/(?<=\.)\s/)[0])}</small></span></span>`).join('')}</div>` : ''}
  </article>`;
}

export async function zeigeWoche(panel, zustand, xur) {
  const r = resets();
  // Xûr: Freitag-Reset bis Dienstag-Reset. Statt Text: Symbol, Balken für seine Zeit, Countdown.
  const fr = new Date(r.woechentlich); fr.setUTCDate(fr.getUTCDate() - 4); // Freitag vor dem nächsten Dienstag-Reset
  const da = Date.now() >= fr.getTime();
  const anteil = da ? Math.min(100, ((Date.now() - fr) / (r.woechentlich - fr)) * 100) : 0;
  const zeitleiste = (bis, tl) => `<span class="rz"><i style="--p:${Math.max(3, 100 - ((bis - Date.now()) / (tl * 3600e3)) * 100)}%"></i></span>`;
  panel.innerHTML = `<h2>This week</h2>
    <div class="resets"><span title="Daily reset ${uhr(r.taeglich)}">☀ <b>${dauer(r.taeglich)}</b>${zeitleiste(r.taeglich, 24)}</span><span title="Weekly reset ${uhr(r.woechentlich)}">🗓 <b>${dauer(r.woechentlich)}</b>${zeitleiste(r.woechentlich, 168)}</span></div>
    ${da ? `<details class="xur-box"><summary class="xur-knopf"><b class="xur-sym">🧳</b><span>Xûr</span><i class="xur-bar" title="Here Fri–Tue"><b style="width:${anteil}%"></b></i><span class="xur-rest" title="Leaves ${uhr(r.woechentlich)}">⏳ ${dauer(r.woechentlich)}</span><em class="klick-pfeil">›</em></summary><div class="xur-inhalt"><p class="leer">Loading…</p></div></details>`
      : `<div class="xur-box aus" title="Xûr arrives ${uhr(fr > Date.now() ? fr : new Date(fr.getTime() + 7 * 864e5))}"><span class="xur-knopf"><b class="xur-sym">🧳</b><span>Xûr</span><span class="xur-rest">↩ ${dauer(fr > Date.now() ? fr : new Date(fr.getTime() + 7 * 864e5))}</span></span></div>`}<div id="wInhalt"><p class="leer">Loading activities…</p></div>`;
  const xb = panel.querySelector('.xur-box');
  if (xb) xb.addEventListener('toggle', () => { if (xb.open && !xb.dataset.da) { xb.dataset.da = '1'; zeigeXur(xb.querySelector('.xur-inhalt'), zustand, true); } });
  if (!zustand.profil) { panel.querySelector('#wInhalt').innerHTML = '<p class="leer">Sign in first.</p>'; return; }
  // Was die nächsten Wochen featured ist (Vorschau ohne Details; Klick öffnet den Raid im Wiki).
  fetch('data/rotation.json').then((r) => r.json()).then((rot) => {
    const heute = new Date();
    const kommend = rot.wochen.filter((w) => new Date(`${w.ab}T17:00:00Z`) > heute).slice(0, 4);
    if (!kommend.length) return;
    const box = document.createElement('details');
    box.className = 'kommend';
    box.innerHTML = `<summary>Coming up · next ${kommend.length} weeks</summary>${kommend.map((w) => `<div class="kw"><b>${new Date(`${w.ab}T17:00:00Z`).toLocaleDateString([], { day: 'numeric', month: 'short' })}</b><span>${[...w.raids, ...w.dungeons].map((n, i) => `<button class="kwn ${i < w.raids.length ? 'raid' : ''}" data-wiki="${esc(n)}">${esc(n)}</button>`).join('')}</span></div>`).join('')}<small class="leer">${esc(rot.quelle)}</small>`;
    panel.querySelector('#wInhalt')?.before(box);
  }).catch(() => {});
  try {
    const g = await lade(zustand);
    panel.querySelector('#wInhalt').innerHTML = ['Raids', 'Dungeons', 'Lost Sectors', 'Portal'].filter((n) => g[n]?.length)
      .map((n) => `<h3>${n}</h3>${g[n].map(karte).join('')}`).join('') || '<p class="leer">Bungie sent no activities.</p>';
  } catch (e) {
    panel.querySelector('#wInhalt').innerHTML = `<p class="leer">${esc(e.message)}</p>`;
  }
}
