// Start: alles Wichtige auf einen Blick, jede Karte führt per Klick weiter.
// Reset, Xûr, Einsatztrupp, Neues, Postmaster, letzter Hüter, Schnellzugriffe.
import { resets, dauer } from './woche.js';
import { aktuellerTruppNamen } from './stats.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const POST = 215593132;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lies = (k, s) => { try { return JSON.parse(localStorage.getItem(k)) ?? s; } catch { return s; } };
const tab = (t) => window.dispatchEvent(new CustomEvent('d2a-tab', { detail: t }));

let truppCache = null;

export function zeigeStart(el, zustand) {
  const p = zustand.profil;
  const chars = Object.values(p.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const c = chars[0];
  const r = resets();
  const fr = new Date(r.woechentlich); fr.setUTCDate(fr.getUTCDate() - 4);
  const xurDa = Date.now() >= fr.getTime();
  const xurAnteil = xurDa ? Math.min(100, ((Date.now() - fr) / (r.woechentlich - fr)) * 100) : 0;
  const post = chars.map((x) => ({ k: KLASSE[x.classType], n: (p.characterInventories?.data?.[x.characterId]?.items || []).filter((i) => i.bucketHash === POST).length }));
  const postMax = Math.max(0, ...post.map((x) => x.n));
  const balken = (bis, std) => `<i class="st-bar"><b style="width:${Math.max(3, 100 - ((bis - Date.now()) / (std * 3600e3)) * 100)}%"></b></i>`;
  const karte = (cls, ziel, inhalt, titel) => `<button class="st-karte ${cls}" data-ziel="${ziel}" title="${esc(titel || '')}">${inhalt}<em class="st-pfeil">›</em></button>`;
  const zeichne = (neuZahl) => {
    el.innerHTML = `<div class="start">
      ${c ? `<button class="st-held" data-ziel="tab:char" style="--emb:url(${BILD}${c.emblemBackgroundPath || ''})"><div><small>Welcome back</small><b>${esc(zustand.konto?.name?.split('#')[0] || 'Guardian')}</b><span>${KLASSE[c.classType]} · ✦ ${c.light}</span></div><span class="st-los">Inventory <em>›</em></span></button>` : ''}
      <div class="st-raster">
        ${karte('st-reset', 'panel:woche', `<span class="st-ic">🗓</span><small>This week</small><div class="st-zeilen"><span>☀ <b>${dauer(r.taeglich)}</b>${balken(r.taeglich, 24)}</span><span>⟳ <b>${dauer(r.woechentlich)}</b>${balken(r.woechentlich, 168)}</span></div>`, 'Daily and weekly reset')}
        ${karte(`st-xur ${xurDa ? 'da' : 'weg'}`, 'panel:xur', `<span class="st-ic">🧳</span><small>Xûr</small><b>${xurDa ? `⏳ ${dauer(r.woechentlich)}` : `↩ ${dauer(fr > Date.now() ? fr : new Date(fr.getTime() + 7 * 864e5))}`}</b>${xurDa ? `<i class="st-bar"><b style="width:${xurAnteil}%"></b></i>` : '<span class="st-klein">back on Friday</span>'}`, xurDa ? 'Xûr is here until the Tuesday reset' : 'Xûr is away until Friday')}
        ${karte('st-trupp', 'tab:hueter', `<span class="st-ic">👥</span><small>Fireteam</small>${truppCache == null ? '<b class="st-puls">…</b>' : truppCache.length ? `<b>👥 ${truppCache.length + 1}</b><span class="st-klein">${esc(truppCache.map((n) => n.split('#')[0]).join(' · '))}</span>` : '<b>Solo</b><span class="st-klein">Guardians, friends & groups</span>'}`)}
        ${karte(`st-neu ${neuZahl ? 'heiss' : ''}`, 'neu', `<span class="st-ic">✨</span><small>New</small><b>${neuZahl == null ? '…' : neuZahl ? `${neuZahl} new` : 'Up to date'}</b><span class="st-klein">builds & features</span>`)}
        ${karte(`st-post ${postMax >= 18 ? 'warn' : ''}`, 'panel:post', `<span class="st-ic">📮</span><small>Postmaster</small><div class="st-post">${post.map((x) => `<span class="${x.n >= 18 ? 'voll' : ''}" title="${x.k}">${x.k[0]} <b>${x.n}</b>/21</span>`).join('')}</div>${postMax >= 18 ? '<span class="st-klein warn">⚠ almost full</span>' : ''}`)}
      </div>
      <div class="st-schnell">
        ${[['zufall', '🎲', 'Randomizer'], ['tab:optimizer', '🎚', 'Optimizer'], ['tab:finder', '🔎', 'Build Finder'], ['tab:guide', '⭐', 'Raid Guide'], ['tab:stats', '📈', 'Stats'], ['tab:wiki', '📖', 'Wiki']].map(([z, e, t]) => `<button class="st-quick" data-ziel="${z}"><b>${e}</b><span>${t}</span></button>`).join('')}
      </div></div>`;
  };
  // Neu-Zähler aus data/neu.json (was du noch nicht gesehen hast).
  let neuZahl = null;
  zeichne(neuZahl);
  fetch(`data/neu.json?t=${Date.now()}`).then((x) => x.json()).then((j) => { const g = new Set(lies('d2a.neuGesehen', [])); neuZahl = (j.eintraege || []).filter((e) => !g.has(e.id)).length; zeichne(neuZahl); }).catch(() => { neuZahl = 0; zeichne(0); });
  aktuellerTruppNamen(zustand.konto).then((t) => { truppCache = t; if (el.querySelector('.start')) zeichne(neuZahl); }).catch(() => { truppCache = []; });
  el.onclick = (e) => {
    const z = e.target.closest('[data-ziel]')?.dataset.ziel; if (!z) return;
    if (z.startsWith('tab:')) return tab(z.slice(4));
    if (z.startsWith('panel:')) return zustand.oeffnePanel?.(z.slice(6));
    if (z === 'zufall') return import('./zufall.js').then((m) => m.oeffneZufall(zustand));
    if (z === 'neu') { if (!neuZahl) try { localStorage.removeItem('d2a.neuGesehen'); } catch {} return import('./willkommen.js').then((m) => m.zeigeNeues((ziel) => { if (ziel.build) try { localStorage.setItem('d2a.finderFokus', ziel.build); } catch {} if (ziel.tab) tab(ziel.tab); })); }
  };
}
