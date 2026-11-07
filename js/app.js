// Rahmen der App: Seitenleiste, Tabs, Seitenpanel, Anmeldung.
import * as bungie from './bungie.js';
import { ladeDefs } from './defs.js';
import { ladeRolls } from './rolls.js';
import { ladeQuellen } from './quellen.js';
import { zeigeVault } from './vault.js';
import { zeigeWoche } from './woche.js';
import { zeigeLoadouts } from './loadouts.js';
import { zeigeOptimizer, setzeOptimizer } from './optimizer.js';
import { zeigeFinder } from './finder.js';
import { zeigeStats } from './stats.js';
import { zeigeXur, xurDa } from './xur.js';
import { zeigePost, postAnzahl } from './post.js';
import { zeigeKonto } from './konto.js';
import { zeigeWiki, setzeWikiSuche } from './wiki.js';
import { zeigeSquad } from './squad.js';
import { setzeNav } from './info.js';
import { zeigeCharakter } from './charakter.js';
import { starte as starteSprache } from './sprache.js';
import { zeigeWillkommen, schonGesehen } from './willkommen.js';
import { sammle } from './vault.js';

const $ = (s) => document.querySelector(s);
const rail = $('#rail');
const haupt = $('#haupt');
const panel = $('#panel');
export const zustand = { konto: null, profil: null, tab: 'char', neuLaden: async () => { zustand.alleItems = null;
  meldung('Loading from Bungie…');
  try { await ladeProfil(); TABS[zustand.tab](); meldung('Up to date.'); } catch (e) { meldung(e.message, true); }
} };

export function meldung(text, fehler = false) {
  const m = $('#meldung');
  m.textContent = text;
  m.className = fehler ? 'fehler' : '';
  m.style.display = 'block';
  clearTimeout(meldung.t);
  meldung.t = setTimeout(() => { m.style.display = 'none'; }, fehler ? 7000 : 3500);
}

// Shift heftet den gerade sichtbaren Tooltip an: er bleibt stehen, lässt sich lesen und scrollen. Esc, ✕ oder Klick daneben schließt ihn.
document.addEventListener('keydown', (e) => {
  const t = $('#tipp');
  if (e.key === 'Escape') $('#tippFest')?.remove();
  if (e.key !== 'Shift' || t.hidden || !t.innerHTML) return;
  $('#tippFest')?.remove();
  const f = document.createElement('div');
  f.id = 'tippFest';
  f.innerHTML = `<button class="tf-zu" aria-label="Close">✕</button>${t.innerHTML}`;
  f.style.left = t.style.left; f.style.top = t.style.top;
  document.body.append(f);
  t.hidden = true;
});
document.addEventListener('pointerdown', (e) => { const f = $('#tippFest'); if (f && (!f.contains(e.target) || e.target.closest('.tf-zu'))) f.remove(); });

// Auf Touch-Geräten klappt Antippen die Leiste aus, ein Tipp daneben schließt sie.
rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !rail.classList.contains('offen')) rail.classList.add('offen'); });
document.addEventListener('pointerdown', (e) => { if (!rail.contains(e.target)) rail.classList.remove('offen'); });

// Jede Ansicht kann im Hauptbereich oder im Seitenpanel laufen.
const ANSICHTEN = {
  woche: ['This week', (el) => zeigeWoche(el, zustand, zustand.xur)],
  xur: ['Xûr', (el) => zeigeXur(el, zustand)],
  post: ['Postmaster', (el) => zeigePost(el, zustand)],
  konto: ['Account', (el) => zeigeKonto(el, zustand, { neuLaden: zustand.neuLaden, abmelden })],
  char: ['Guardians', (el) => zeigeCharakter(el, zustand)],
  vault: ['Weapons', (el) => zeigeVault(el, zustand, 'waffen')],
  armor: ['Armor', (el) => zeigeVault(el, zustand, 'ruestung')],
  loadouts: ['Loadouts', (el) => zeigeLoadouts(el, zustand)],
  optimizer: ['Optimizer', (el) => zeigeOptimizer(el, zustand)],
  finder: ['Build Finder', (el) => zeigeFinder(el, zustand, (w) => { setzeOptimizer(w); wechsle('optimizer'); })],
  stats: ['Stats', (el) => zeigeStats(el, zustand)],
  wiki: ['Wiki', (el) => zeigeWiki(el, zustand)],
  squad: ['Squad check', (el) => zeigeSquad(el, zustand)],
  guide: ['Raid Guide', (el) => {
    // Der Guide bringt alles selbst mit: Raid-/Encounter-Wahl, Sprungleiste, Symbole in der Begegnung, Squad-Knopf.
    const ziel = zustand.guideZiel; zustand.guideZiel = null;
    el.innerHTML = `<iframe class="guide" src="guide/index.html${ziel ? `#${ziel}` : ''}" title="Raid briefing"></iframe>`;
  }],
};
// Sprünge aus Info-Karten: Wiki (Suche oder Farm-Planer) und Raid Guide (Begegnung).
setzeNav({
  wiki: (q, art) => { setzeWikiSuche(q, art); wechsle('wiki'); },
  guide: (id) => { zustand.guideZiel = id; wechsle('guide'); },
  items: () => zustand.alleItems || (zustand.profil ? (zustand.alleItems = sammle(zustand.profil)) : []),
});
export const springeGuide = (id) => { zustand.guideZiel = id; wechsle('guide'); };
const TABS = Object.fromEntries(['char', 'vault', 'armor', 'loadouts', 'optimizer', 'finder', 'wiki', 'guide', 'stats'].map((t) => [t, () => ANSICHTEN[t][1](haupt)]));
function platzhalter(titel, text) { haupt.innerHTML = `<h1>${titel}</h1><p class="leer">${text}</p>`; }

function wechsle(tab) {
  zustand.tab = tab;
  rail.querySelectorAll('[data-tab]').forEach((b) => { const an = b.dataset.tab === tab; b.classList.toggle('an', an); b.setAttribute('aria-selected', an); });
  try { localStorage.setItem('d2a.tab', tab); } catch {}
  if (!zustand.profil) return platzhalter(titelVon(tab), 'Sign in with Bungie first.');
  TABS[tab]();
}
const titelVon = (tab) => rail.querySelector(`[data-tab="${tab}"] span`).textContent;

rail.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tab) wechsle(b.dataset.tab);
  else if (b.dataset.panel) schaltePanel();
  else if (b.id === 'konto') kontoKlick();
  if (matchMedia('(pointer: coarse)').matches) rail.classList.remove('offen');
});

panel.addEventListener('pointerover', (e) => {
  const m = e.target.closest('[data-tn]'); const t = $('#tipp');
  if (!m) return;
  t.innerHTML = `<b>${m.dataset.tn.replace(/</g, '&lt;')}</b><p class="tt">${m.dataset.td.replace(/</g, '&lt;')}</p>`;
  t.hidden = false;
  const r = m.getBoundingClientRect(), b = t.getBoundingClientRect();
  t.style.left = `${Math.max(8, r.left - b.width - 8)}px`; t.style.top = `${Math.min(r.top, innerHeight - b.height - 8)}px`;
});
haupt.addEventListener('click', (e) => { const p = e.target.closest('[data-panelart]'); if (p) oeffnePanel(p.dataset.panelart); });
addEventListener('message', (e) => { if (e.origin === location.origin && e.data?.d2a === 'squad') oeffnePanel('squad'); });
panel.addEventListener('click', (e) => { const g = e.target.closest('[data-geh]'); if (g) wechsle(g.dataset.geh); const gd = e.target.closest('[data-guide]'); if (gd) springeGuide(gd.dataset.guide); });
panel.addEventListener('click', (e) => { const w = e.target.closest('[data-wiki]'); if (w) { setzeWikiSuche(w.dataset.wiki); wechsle('wiki'); } });
panel.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tn]')) $('#tipp').hidden = true; });

// Seitenpanel: zeigt "This week" oder eine Ansicht nach Wahl; angeheftet bleibt es offen, auch nach Neuladen.
const pz = (() => { try { return { art: 'woche', fest: false, breit: false, ...JSON.parse(localStorage.getItem('d2a.panel') || '{}') }; } catch { return { art: 'woche', fest: false, breit: false }; } })();
const merkePanel = () => { try { localStorage.setItem('d2a.panel', JSON.stringify(pz)); } catch {} };
function zeigePanel() {
  panel.hidden = false;
  panel.classList.toggle('lang', Boolean(pz.text));
  if (pz.w && !matchMedia('(max-width: 760px)').matches) panel.style.width = `${pz.w}px`;
  document.body.classList.toggle('panel-fest', pz.fest);
  rail.querySelector('[data-panel]').classList.add('panel-an');
  panel.innerHTML = `<div class="pkopf"><select id="pArt" aria-label="Panel content">${Object.entries(ANSICHTEN).map(([k, [n]]) => `<option value="${k}" ${k === pz.art ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <button id="pText" class="pknopf" title="${pz.text ? 'Names only' : 'Show short descriptions (modifiers, challenges)'}" aria-pressed="${Boolean(pz.text)}">${pz.text ? '☰' : 'ⓘ'}</button>
    <button id="pFest" class="pknopf" title="${pz.fest ? 'Unpin' : 'Pin: keep open'}" aria-pressed="${pz.fest}">📌</button>
    <button id="pZu" class="pknopf" title="Close">✕</button></div><div id="pInhalt"></div>`;
  const inhalt = panel.querySelector('#pInhalt');
  if (!zustand.profil) { inhalt.innerHTML = '<p class="leer">Sign in first.</p>'; return; }
  ANSICHTEN[pz.art][1](inhalt);
}
export function oeffnePanel(art) { pz.art = art; merkePanel(); zeigePanel(); }
export const postZahl = () => postAnzahl(zustand.profil);
function schliessePanel() { panel.hidden = true; rail.querySelector('[data-panel]').classList.remove('panel-an'); document.body.classList.remove('panel-fest'); }
function schaltePanel() { if (!panel.hidden) { pz.fest = false; merkePanel(); schliessePanel(); } else zeigePanel(); }
// Logo = Home: zurück zum ersten Tab, nach oben, Inventar frisch von Bungie laden.
$('#logo').addEventListener('click', async () => {
  const l = $('#logo');
  if (l.classList.contains('dreht')) return;
  l.classList.add('dreht');
  wechsle('char'); scrollTo({ top: 0, behavior: 'smooth' });
  try { if (zustand.profil) await zustand.neuLaden?.(); } finally { l.classList.remove('dreht'); }
});
panel.addEventListener('change', (e) => { if (e.target.id === 'pArt') { pz.art = e.target.value; merkePanel(); zeigePanel(); } });
panel.addEventListener('click', (e) => {
  const id = e.target.closest('button')?.id;
  if (id === 'pZu') { pz.fest = false; merkePanel(); schliessePanel(); }
  if (id === 'pFest') { pz.fest = !pz.fest; merkePanel(); zeigePanel(); meldung(pz.fest ? 'Panel pinned. It stays open.' : 'Panel unpinned.'); }
  if (id === 'pText') { pz.text = !pz.text; merkePanel(); panel.classList.toggle('lang', pz.text); const b = panel.querySelector('#pText'); b.setAttribute('aria-pressed', pz.text); b.textContent = pz.text ? '☰' : 'ⓘ'; b.title = pz.text ? 'Names only' : 'Show short descriptions (modifiers, challenges)'; }
});
// Breite per Ziehen am linken Rand (unsichtbarer Griff, Cursor zeigt ihn). Doppelklick = Standardbreite.
const griff = document.createElement('div');
griff.className = 'pgriff'; griff.title = 'Drag to resize · double-click to reset';
document.body.append(griff);
const setzeGriff = () => { const r = panel.getBoundingClientRect(); griff.hidden = panel.hidden || matchMedia('(max-width: 760px)').matches; griff.style.left = `${r.left - 4}px`; };
new MutationObserver(setzeGriff).observe(panel, { attributes: true, attributeFilter: ['hidden', 'style'] });
addEventListener('resize', setzeGriff);
griff.onpointerdown = (e) => {
  e.preventDefault(); griff.setPointerCapture(e.pointerId); document.body.classList.add('ziehe');
  griff.onpointermove = (ev) => { pz.w = Math.round(Math.max(300, Math.min(innerWidth * 0.7, innerWidth - ev.clientX))); panel.style.width = `${pz.w}px`; setzeGriff(); };
  griff.onpointerup = () => { griff.onpointermove = griff.onpointerup = null; document.body.classList.remove('ziehe'); merkePanel(); };
};
griff.ondblclick = () => { delete pz.w; panel.style.width = ''; merkePanel(); setzeGriff(); };

function kontoKlick() {
  if (!bungie.eingerichtet()) return meldung('The app is not connected to Bungie yet.', true);
  if (zustand.konto) return oeffnePanel('konto');
  bungie.anmelden();
}
function abmelden() {
  {
    schliessePanel();
    bungie.abmelden(true);
    try { caches.delete('d2a-profil'); localStorage.removeItem('d2a.letztes'); } catch {}
    zustand.konto = zustand.profil = null;
    $('#kontoName').textContent = 'Sign in';
    return wechsle(zustand.tab);
  }
}

export async function ladeProfil() {
  zustand.profil = await bungie.profil(zustand.konto);
  // Für den nächsten Start zwischenspeichern: dann ist der Tresor sofort da.
  try { const c = await caches.open('d2a-profil'); await c.put(`profil-${zustand.konto.membershipId}`, new Response(JSON.stringify({ konto: zustand.konto, profil: zustand.profil, zeit: Date.now() }))); localStorage.setItem('d2a.letztes', zustand.konto.membershipId); } catch {}
  return zustand.profil;
}
async function gespeichertesProfil() {
  try { const id = localStorage.getItem('d2a.letztes'); if (!id) return null; const r = await (await caches.open('d2a-profil')).match(`profil-${id}`); return r ? r.json() : null; } catch { return null; }
}

function anmeldeSeite() {
  const bereit = bungie.eingerichtet();
  haupt.innerHTML = `<div class="anmelden karte"><h1>D2 Allrounder</h1>
    <p>Vault, loadouts, armor optimizer and weekly rotation for every class, on phone and PC.</p>
    ${bereit ? '<button class="haupt-knopf" id="los">Sign in with Bungie</button>' : '<p>Setup is not finished yet: the Bungie app keys are missing.</p>'}<p class="leer klein">Your sign-in stays in this browser. <a href="privacy.html" target="_blank" rel="noopener">Privacy</a></p>
    <p class="leer klein anm-hinweis">Unofficial fan app, not affiliated with Bungie. Destiny content © Bungie, Inc. Mostly built by Claude, Anthropic’s AI.</p></div>`;
  $('#los')?.addEventListener('click', () => bungie.anmelden());
}

async function start() {
  if ('serviceWorker' in navigator) {
    // Neue Version veröffentlicht: der neue Service Worker übernimmt, die Seite lädt einmal neu.
    const hatte = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hatte && !window.d2aWeg && !sessionStorage.getItem('d2a.neu')) { sessionStorage.setItem('d2a.neu', '1'); location.reload(); } });
    setTimeout(() => sessionStorage.removeItem('d2a.neu'), 30_000);
    navigator.serviceWorker.register('sw.js').then((r) => { r.update().catch(() => {}); setInterval(() => r.update().catch(() => {}), 15 * 60_000); }).catch(() => {});
  }
  try { await bungie.rueckkehr(); } catch (e) { meldung(e.message, true); }
  const gespeichert = (() => { try { return localStorage.getItem('d2a.tab'); } catch { return null; } })();
  // Start ist immer die Hüter-Übersicht (Startseite).
  void gespeichert;
  // Abgelaufene Anmeldung: Bungie kennt die Freigabe schon und leitet ohne Rückfrage zurück.
  if (bungie.eingerichtet() && !bungie.angemeldet() && bungie.warAngemeldet() && !new URLSearchParams(location.search).has('error') && Date.now() - Number(sessionStorage.getItem('d2a.auto') || 0) > 120_000) {
    sessionStorage.setItem('d2a.auto', String(Date.now())); haupt.innerHTML = '<p class="leer">Renewing your Bungie sign-in…</p>'; return bungie.anmelden(); }
  if (!bungie.eingerichtet() || !bungie.angemeldet()) { wechsleNurLeiste(); starteSprache(null); return anmeldeSeite(); }
  haupt.innerHTML = '<p class="leer">Loading your guardians…</p>';
  try {
    await Promise.all([ladeDefs(), ladeRolls(), ladeQuellen()]);
    zustand.oeffnePanel = oeffnePanel; zustand.postZahl = postZahl;
    if (!TABS[zustand.tab]) zustand.tab = 'char';
    // Schnellstart: letztes Profil sofort zeigen, frische Daten kommen im Hintergrund.
    const alt = await gespeichertesProfil();
    let klicks = 0;
    if (alt) {
      await starteSprache(alt.konto);
      zustand.konto = alt.konto; zustand.profil = alt.profil;
      $('#kontoName').textContent = alt.konto.name;
      wechsle(zustand.tab);
      document.addEventListener('pointerdown', () => { klicks += 1; }, { once: true });
    }
    zustand.konto = await bungie.konto();
    await starteSprache(zustand.konto);
    $('#kontoName').textContent = zustand.konto.name;
    $('#konto').title = 'Account';
    await ladeProfil();
    // Frisch neu zeichnen, solange du noch nichts angeklickt hast; sonst nur die Daten tauschen.
    if (!alt || !klicks) wechsle(zustand.tab); else meldung('Data refreshed from Bungie.');
    if (pz.fest && !matchMedia('(max-width: 760px)').matches) zeigePanel();
    if (!schonGesehen(zustand.konto)) zeigeWillkommen(zustand.konto);
    // Xûr steckt im This-week-Panel, sobald Bungie sagt, dass er da ist.
    xurDa(zustand).then((bis) => {
      zustand.xur = bis;
      if (!panel.hidden && pz.art === 'woche') zeigePanel();
    });
  } catch (e) {
    meldung(e.message, true);
    if (!bungie.angemeldet()) anmeldeSeite();
    else haupt.innerHTML = `<p class="leer">${e.message}</p>`;
  }
}
function wechsleNurLeiste() { rail.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('an', b.dataset.tab === zustand.tab)); }

start();
