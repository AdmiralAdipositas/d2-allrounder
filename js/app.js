// Rahmen der App: Seitenleiste, Tabs, Seitenpanel, Anmeldung.
import * as bungie from './bungie.js';
import { ladeDefs } from './defs.js';
import { zeigeVault } from './vault.js';
import { zeigeWoche } from './woche.js';
import { zeigeLoadouts } from './loadouts.js';
import { zeigeOptimizer } from './optimizer.js';
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

const TABS = {
  vault: () => zeigeVault(haupt, zustand, 'waffen'),
  armor: () => zeigeVault(haupt, zustand, 'ruestung'),
  xur: () => zeigeXur(haupt, zustand),
  loadouts: () => zeigeLoadouts(haupt, zustand),
  optimizer: () => zeigeOptimizer(haupt, zustand),
  finder: () => platzhalter('Build Finder', 'Finds builds from what you own. Comes in the next patch.'),
  stats: () => platzhalter('Stats', 'Your activity and weapon statistics. Comes in the next patch.'),
};
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
  else if (b.dataset.panel) schaltePanel(b);
  else if (b.id === 'konto') kontoKlick();
  if (matchMedia('(pointer: coarse)').matches) rail.classList.remove('offen');
});

panel.addEventListener('click', (e) => { const g = e.target.closest('[data-geh]'); if (g) wechsle(g.dataset.geh); });
panel.addEventListener('pointerover', (e) => {
  const m = e.target.closest('[data-tn]'); const t = $('#tipp');
  if (!m) { t.hidden = true; return; }
  t.innerHTML = `<b>${m.dataset.tn.replace(/</g, '&lt;')}</b><p class="tt">${m.dataset.td.replace(/</g, '&lt;')}</p>`;
  t.hidden = false;
  const r = m.getBoundingClientRect(), b = t.getBoundingClientRect();
  t.style.left = `${Math.max(8, r.left - b.width - 8)}px`; t.style.top = `${Math.min(r.top, innerHeight - b.height - 8)}px`;
});
panel.addEventListener('pointerleave', () => { $('#tipp').hidden = true; });
// Panels liegen neben dem aktiven Tab und lassen ihn unberührt.
function schaltePanel(b) {
  const offen = !panel.hidden && panel.dataset.art === b.dataset.panel;
  rail.querySelectorAll('[data-panel]').forEach((x) => x.classList.remove('panel-an'));
  if (offen) { panel.hidden = true; return; }
  panel.dataset.art = b.dataset.panel;
  b.classList.add('panel-an');
  panel.hidden = false;
  zeigeWoche(panel, zustand, zustand.xur);
}

function kontoKlick() {
  if (!bungie.eingerichtet()) return meldung('The app is not connected to Bungie yet.', true);
  if (zustand.konto) {
    bungie.abmelden();
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
  if (!bungie.eingerichtet() || !bungie.angemeldet()) { wechsleNurLeiste(); return anmeldeSeite(); }
  haupt.innerHTML = '<p class="leer">Loading your guardians…</p>';
  try {
    await ladeDefs();
    zustand.konto = await bungie.konto();
    $('#kontoName').textContent = zustand.konto.name;
    $('#konto').title = 'Sign out';
    await ladeProfil();
    if (zustand.tab === 'xur') zustand.tab = 'vault';
    wechsle(zustand.tab);
    // Xûr-Tab nur zeigen, wenn er da ist.
    xurDa(zustand).then((bis) => {
      zustand.xur = bis;
      rail.querySelector('[data-tab="xur"]').hidden = !bis;
      if (!panel.hidden && panel.dataset.art === 'woche') zeigeWoche(panel, zustand, bis);
    });
  } catch (e) {
    meldung(e.message, true);
    if (!bungie.angemeldet()) anmeldeSeite();
    else haupt.innerHTML = `<p class="leer">${e.message}</p>`;
  }
}
function wechsleNurLeiste() { rail.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('an', b.dataset.tab === zustand.tab)); }

start();
