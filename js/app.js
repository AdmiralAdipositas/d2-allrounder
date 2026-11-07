// Rahmen der App: Seitenleiste, Tabs, Seitenpanel, Anmeldung.
import * as bungie from './bungie.js';
import { ladeDefs } from './defs.js';
import { ladeRolls } from './rolls.js';
import { zeigeVault } from './vault.js';
import { zeigeWoche } from './woche.js';
import { zeigeLoadouts } from './loadouts.js';
import { zeigeOptimizer, setzeOptimizer } from './optimizer.js';
import { zeigeFinder } from './finder.js';
import { zeigeStats } from './stats.js';
import { zeigeXur, xurDa } from './xur.js';

const $ = (s) => document.querySelector(s);
const rail = $('#rail');
const haupt = $('#haupt');
const panel = $('#panel');
export const zustand = { konto: null, profil: null, tab: 'vault', neuLaden: async () => {
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

// Auf Touch-Geräten klappt Antippen die Leiste aus, ein Tipp daneben schließt sie.
rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !rail.classList.contains('offen')) rail.classList.add('offen'); });
document.addEventListener('pointerdown', (e) => { if (!rail.contains(e.target)) rail.classList.remove('offen'); });

// Jede Ansicht kann im Hauptbereich oder im Seitenpanel laufen.
const ANSICHTEN = {
  woche: ['This week', (el) => zeigeWoche(el, zustand, zustand.xur)],
  xur: ['Xûr', (el) => zeigeXur(el, zustand)],
  vault: ['Weapons', (el) => zeigeVault(el, zustand, 'waffen')],
  armor: ['Armor', (el) => zeigeVault(el, zustand, 'ruestung')],
  loadouts: ['Loadouts', (el) => zeigeLoadouts(el, zustand)],
  optimizer: ['Optimizer', (el) => zeigeOptimizer(el, zustand)],
  finder: ['Build Finder', (el) => zeigeFinder(el, zustand, (w) => { setzeOptimizer(w); wechsle('optimizer'); })],
  stats: ['Stats', (el) => zeigeStats(el, zustand)],
};
const TABS = Object.fromEntries(['vault', 'armor', 'loadouts', 'optimizer', 'finder', 'stats'].map((t) => [t, () => ANSICHTEN[t][1](haupt)]));
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
panel.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tn]')) $('#tipp').hidden = true; });

// Seitenpanel: zeigt "This week" oder eine Ansicht nach Wahl; angeheftet bleibt es offen, auch nach Neuladen.
const pz = (() => { try { return { art: 'woche', fest: false, breit: false, ...JSON.parse(localStorage.getItem('d2a.panel') || '{}') }; } catch { return { art: 'woche', fest: false, breit: false }; } })();
const merkePanel = () => { try { localStorage.setItem('d2a.panel', JSON.stringify(pz)); } catch {} };
function zeigePanel() {
  panel.hidden = false;
  panel.classList.toggle('breit', pz.breit);
  document.body.classList.toggle('panel-fest', pz.fest);
  rail.querySelector('[data-panel]').classList.add('panel-an');
  panel.innerHTML = `<div class="pkopf"><select id="pArt" aria-label="Panel content">${Object.entries(ANSICHTEN).map(([k, [n]]) => `<option value="${k}" ${k === pz.art ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <button id="pBreit" class="pknopf" title="${pz.breit ? 'Narrow' : 'Wide'}" aria-pressed="${pz.breit}">⇔</button>
    <button id="pFest" class="pknopf" title="${pz.fest ? 'Unpin' : 'Pin: keep open'}" aria-pressed="${pz.fest}">📌</button>
    <button id="pZu" class="pknopf" title="Close">✕</button></div><div id="pInhalt"></div>`;
  const inhalt = panel.querySelector('#pInhalt');
  if (!zustand.profil) { inhalt.innerHTML = '<p class="leer">Sign in first.</p>'; return; }
  ANSICHTEN[pz.art][1](inhalt);
}
function schliessePanel() { panel.hidden = true; rail.querySelector('[data-panel]').classList.remove('panel-an'); document.body.classList.remove('panel-fest'); }
function schaltePanel() { if (!panel.hidden) { pz.fest = false; merkePanel(); schliessePanel(); } else zeigePanel(); }
panel.addEventListener('change', (e) => { if (e.target.id === 'pArt') { pz.art = e.target.value; merkePanel(); zeigePanel(); } });
panel.addEventListener('click', (e) => {
  const id = e.target.closest('button')?.id;
  if (id === 'pZu') { pz.fest = false; merkePanel(); schliessePanel(); }
  if (id === 'pFest') { pz.fest = !pz.fest; merkePanel(); zeigePanel(); meldung(pz.fest ? 'Panel pinned. It stays open.' : 'Panel unpinned.'); }
  if (id === 'pBreit') { pz.breit = !pz.breit; merkePanel(); zeigePanel(); }
});

function kontoKlick() {
  if (!bungie.eingerichtet()) return meldung('The app is not connected to Bungie yet.', true);
  if (zustand.konto) {
    bungie.abmelden(true);
    zustand.konto = zustand.profil = null;
    $('#kontoName').textContent = 'Sign in';
    return wechsle(zustand.tab);
  }
  bungie.anmelden();
}

export async function ladeProfil() {
  zustand.profil = await bungie.profil(zustand.konto);
  return zustand.profil;
}

function anmeldeSeite() {
  const bereit = bungie.eingerichtet();
  haupt.innerHTML = `<div class="anmelden karte"><h1>D2 Allrounder</h1>
    <p>Vault, loadouts, armor optimizer and weekly rotation for every class, on phone and PC.</p>
    ${bereit ? '<button class="haupt-knopf" id="los">Sign in with Bungie</button>' : '<p>Setup is not finished yet: the Bungie app keys are missing.</p>'}</div>`;
  $('#los')?.addEventListener('click', () => bungie.anmelden());
}

async function start() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await bungie.rueckkehr(); } catch (e) { meldung(e.message, true); }
  const gespeichert = (() => { try { return localStorage.getItem('d2a.tab'); } catch { return null; } })();
  if (gespeichert && TABS[gespeichert]) zustand.tab = gespeichert;
  // Abgelaufene Anmeldung: Bungie kennt die Freigabe schon und leitet ohne Rückfrage zurück.
  if (bungie.eingerichtet() && !bungie.angemeldet() && bungie.warAngemeldet() && !new URLSearchParams(location.search).has('error') && Date.now() - Number(sessionStorage.getItem('d2a.auto') || 0) > 120_000) {
    sessionStorage.setItem('d2a.auto', String(Date.now())); haupt.innerHTML = '<p class="leer">Renewing your Bungie sign-in…</p>'; return bungie.anmelden(); }
  if (!bungie.eingerichtet() || !bungie.angemeldet()) { wechsleNurLeiste(); return anmeldeSeite(); }
  haupt.innerHTML = '<p class="leer">Loading your guardians…</p>';
  try {
    await Promise.all([ladeDefs(), ladeRolls()]);
    zustand.konto = await bungie.konto();
    $('#kontoName').textContent = zustand.konto.name;
    $('#konto').title = 'Sign out';
    await ladeProfil();
    if (!TABS[zustand.tab]) zustand.tab = 'vault';
    wechsle(zustand.tab);
    if (pz.fest && !matchMedia('(max-width: 760px)').matches) zeigePanel();
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
