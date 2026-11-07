// "This week": Raids, Dungeons und Portal von Bungie, mit Featured, Loot-Stufe, Challenges und Modifiern.
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
      ${e.featured ? '<span class="tag gold">Featured</span>' : ''}${e.tier ? `<span class="tag">Tier ${e.tier}</span>` : ''}</div>
    ${e.stufen.length ? `<small>${esc(e.stufen.join(' · '))}</small>` : ''}
    ${e.challenges.length ? `<div class="chals">${e.challenges.map((c) => `<p class="chal">${c.enc ? `<em>${esc(c.enc)}</em>` : ''}<b>${esc(c.n)}</b>${c.d ? `<span>${esc(c.d)}</span>` : ''}</p>`).join('')}</div>` : ''}
    ${e.mods.length ? `<div class="mods">${e.mods.slice(0, 12).map((m) => `<i data-tn="${esc(m.n)}" data-td="${esc(m.d)}" style="background-image:url(${BILD}${m.i})"></i>`).join('')}</div>` : ''}
  </article>`;
}

export async function zeigeWoche(panel, zustand, xur) {
  const r = resets();
  panel.innerHTML = `<h2>This week</h2><p class="reset">Daily reset in <b>${dauer(r.taeglich)}</b> (${uhr(r.taeglich)}) · Weekly in <b>${dauer(r.woechentlich)}</b></p>
    ${xur ? `<details class="xur-box"><summary class="xur-knopf">Xûr is here · stock refreshes ${uhr(xur)}</summary><div class="xur-inhalt"><p class="leer">Loading…</p></div></details>` : ''}<div id="wInhalt"><p class="leer">Loading activities…</p></div>`;
  const xb = panel.querySelector('.xur-box');
  if (xb) xb.addEventListener('toggle', () => { if (xb.open && !xb.dataset.da) { xb.dataset.da = '1'; zeigeXur(xb.querySelector('.xur-inhalt'), zustand, true); } });
  if (!zustand.profil) { panel.querySelector('#wInhalt').innerHTML = '<p class="leer">Sign in first.</p>'; return; }
  try {
    const g = await lade(zustand);
    panel.querySelector('#wInhalt').innerHTML = ['Raids', 'Dungeons', 'Portal'].filter((n) => g[n]?.length)
      .map((n) => `<h3>${n}</h3>${g[n].map(karte).join('')}`).join('') || '<p class="leer">Bungie sent no activities.</p>';
  } catch (e) {
    panel.querySelector('#wInhalt').innerHTML = `<p class="leer">${esc(e.message)}</p>`;
  }
}
