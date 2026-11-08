// Start: alles Wichtige auf einen Blick, jede Karte führt per Klick weiter.
// Reset, Xûr, Einsatztrupp, Neues, Postmaster, letzter Hüter, Schnellzugriffe.
import { resets, dauer } from './woche.js';
import { aktuellerTruppNamen } from './stats.js';
import { defs } from './defs.js';
import { guideId } from './guidelinks.js';

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const POST = 215593132;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lies = (k, s) => { try { return JSON.parse(localStorage.getItem(k)) ?? s; } catch { return s; } };
const tab = (t) => window.dispatchEvent(new CustomEvent('d2a-tab', { detail: t }));

let truppCache = null;
let rotCache = null, xurCache = null;

// Tagesaufgabe: jeden Tag eine andere, für alle gleich (aus dem Datum gewürfelt).
const tagKey = (d = new Date()) => new Date(d.getTime() - 17 * 3600e3).toISOString().slice(0, 10); // Tag wechselt mit dem Reset (17 Uhr UTC)
function tagesAufgabe(profil) {
  const k = tagKey(); let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const el = ['Solar', 'Arc', 'Void', 'Stasis', 'Strand', 'Prismatic'];
  const alle = [...(profil.profileInventory?.data?.items || []), ...Object.values(profil.characterInventories?.data || {}).flatMap((c) => c.items || []), ...Object.values(profil.characterEquipment?.data || {}).flatMap((c) => c.items || [])];
  const exos = [...new Set(alle.map((i) => defs.items?.[i.itemHash]).filter((d) => d?.q === 6 && d.t === 3).map((d) => d.n))].sort();
  const vorlagen = [
    ['🎨', `${el[h % el.length]} only`, 'Subclass and all weapons in one element.'],
    ['🔫', 'Primaries only', 'No special ammo – heavy is allowed.'],
    ['🟦', 'No exotic armor', 'Legendary armor only, your build has to carry.'],
    ['⚔', 'Melee day', 'Sword or glaive as heavy, melee build.'],
    ...(exos.length ? [['✨', exos[h % exos.length], 'Dust it off and run it all day.']] : []),
    ['🎲', 'Let the dice decide', 'Spin the randomizer and play what it says.'],
  ];
  return vorlagen[(h >>> 3) % vorlagen.length];
}
const serie = () => { const s = lies('d2a.serie', { tag: '', n: 0 }); const gestern = tagKey(new Date(Date.now() - 864e5)); return { ...s, n: s.tag === tagKey() || s.tag === gestern ? s.n : 0, heute: s.tag === tagKey() }; };
function serieWeiter() { const s = serie(); if (s.heute) return; try { localStorage.setItem('d2a.serie', JSON.stringify({ tag: tagKey(), n: s.n + 1 })); } catch {} }

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
  const besitzNamen = () => { const a = [...(p.profileInventory?.data?.items || []), ...Object.values(p.characterInventories?.data || {}).flatMap((x) => x.items || []), ...Object.values(p.characterEquipment?.data || {}).flatMap((x) => x.items || [])]; return new Set(a.map((i) => defs.items?.[i.itemHash]?.n).filter(Boolean)); };
  const heute = () => {
    const [ae, at, ad] = tagesAufgabe(p); const s = serie();
    const woche = rotCache?.wochen?.filter((w) => new Date(`${w.ab}T17:00:00Z`) <= new Date()).pop();
    const fehlt = (xurCache || []).filter((x) => !besitzNamen().has(x.d.n) && (x.d.t === 3 || x.d.c == null || x.d.c === c?.classType));
    const ziel = (n) => guideId(n) ? `guide:${guideId(n)}` : `wiki:${n}`;
    return `<section class="st-heute"><h2 class="st-h">Today</h2><div class="st-heute-reihe">
      ${woche ? `<div class="st-tag st-feat"><small>🏆 Featured this week</small><div class="st-chips">${woche.raids.map((n) => `<button class="st-chip raid" data-ziel="${esc(ziel(n))}">${esc(n)}</button>`).join('')}${woche.dungeons.map((n) => `<button class="st-chip" data-ziel="${esc(ziel(n))}">${esc(n)}</button>`).join('')}</div><span class="st-klein">Tap → raid guide</span></div>` : ''}
      <div class="st-tag st-auf ${s.heute ? 'ok' : ''}"><small>🎯 Daily challenge</small><div class="st-auf-z"><span class="st-auf-ic">${ae}</span><span><b>${esc(at)}</b><span class="st-klein">${esc(ad)}</span></span></div>
        <div class="st-auf-knoepfe"><button class="st-chip" data-ziel="zufall">🎲 Randomizer</button><button class="st-chip ${s.heute ? 'an' : ''}" data-ziel="serie">${s.heute ? '✓ Done' : 'Mark done'}</button><span class="st-serie" title="Days in a row">🔥 ${s.n + (s.heute ? 0 : 0)}</span></div></div>
      ${fehlt.length ? `<button class="st-tag st-xurfehlt" data-ziel="panel:xur"><small>🧳 Xûr has · not in your vault</small><div class="st-exos">${fehlt.length ? fehlt.slice(0, 6).map((x) => `<i title="${esc(x.d.n)}" style="background-image:url(${BILD}${x.d.i})"></i>`).join('') : '<span class="st-klein">You already have everything he sells ✓</span>'}</div>${fehlt.length ? `<span class="st-klein">${esc(fehlt.slice(0, 3).map((x) => x.d.n).join(' · '))}${fehlt.length > 3 ? ' …' : ''}</span>` : ''}</button>` : ''}
    </div></section>`;
  };
  const zeichne = (neuZahl) => {
    el.innerHTML = `<div class="start">
      ${c ? `<button class="st-held" data-ziel="tab:char" style="--emb:url(${BILD}${c.emblemBackgroundPath || ''})"><div><small>Welcome back</small><b>${esc(zustand.konto?.name?.split('#')[0] || 'Guardian')}</b><span>${KLASSE[c.classType]} · ✦ ${c.light}</span></div><span class="st-los">Inventory <em>›</em></span></button>` : ''}
      ${heute()}
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
  const neu = () => { if (el.querySelector('.start')) zeichne(neuZahl); };
  if (!rotCache) fetch('data/rotation.json').then((x) => x.json()).then((j) => { rotCache = j; neu(); }).catch(() => {});
  if (xurDa && !xurCache && !zustand.gast) import('./xur.js').then(async (m) => { if (await m.xurDa(zustand)) { xurCache = m.xurExotics(); neu(); } }).catch(() => {});
  aktuellerTruppNamen(zustand.konto).then((t) => { truppCache = t; if (el.querySelector('.start')) zeichne(neuZahl); }).catch(() => { truppCache = []; });
  el.onclick = (e) => {
    const z = e.target.closest('[data-ziel]')?.dataset.ziel; if (!z) return;
    if (z.startsWith('tab:')) return tab(z.slice(4));
    if (z.startsWith('panel:')) return zustand.oeffnePanel?.(z.slice(6));
    if (z.startsWith('guide:')) { zustand.guideZiel = z.slice(6); return tab('guide'); }
    if (z.startsWith('wiki:')) return import('./wiki.js').then((m) => { m.setzeWikiSuche(z.slice(5)); tab('wiki'); });
    if (z === 'serie') { serieWeiter(); return zeichne(neuZahl); }
    if (z === 'zufall') return import('./zufall.js').then((m) => m.oeffneZufall(zustand));
    if (z === 'neu') { if (!neuZahl) try { localStorage.removeItem('d2a.neuGesehen'); } catch {} return import('./willkommen.js').then((m) => m.zeigeNeues((ziel) => { if (ziel.build) try { localStorage.setItem('d2a.finderFokus', ziel.build); } catch {} if (ziel.tab) tab(ziel.tab); })); }
  };
}
