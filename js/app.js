// Rahmen der App: Seitenleiste, Tabs, Seitenpanel, Anmeldung.
import { ikon } from './ikonen.js';
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
import { zeigeWiki, setzeWikiSuche, setzeWikiKat } from './wiki.js';
import { zeigeSquad } from './squad.js';
import { zeigeHueter } from './hueter.js';
import { zeigeStart } from './start.js';
import { setzeNav } from './info.js';
import { zeigeCharakter } from './charakter.js';
import { starte as starteSprache, gewaehlt } from './sprache.js';
import { zeigeWillkommen, schonGesehen, zeigeNeues } from './willkommen.js';
import { sammle } from './vault.js';

const $ = (s) => document.querySelector(s);
const rail = $('#rail');
const haupt = $('#haupt');
const panel = $('#panel');
export const zustand = { konto: null, profil: null, tab: 'start', neuLaden: async () => { zustand.alleItems = null;
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
  konto: ['Settings & account', (el) => zeigeKonto(el, zustand, { neuLaden: zustand.neuLaden, abmelden })],
  start: ['Home', (el) => zeigeStart(el, zustand)],
  char: ['Inventory', (el) => zeigeCharakter(el, zustand)],
  vault: ['Weapons', (el) => zeigeVault(el, zustand, 'waffen')],
  armor: ['Armor', (el) => zeigeVault(el, zustand, 'ruestung')],
  loadouts: ['Loadouts', (el) => zeigeLoadouts(el, zustand)],
  optimizer: ['Optimizer', (el) => zeigeOptimizer(el, zustand)],
  finder: ['Build Finder', (el) => zeigeFinder(el, zustand, (w) => { setzeOptimizer(w); wechsle('optimizer'); })],
  stats: ['Stats', (el) => zeigeStats(el, zustand)],
  hueter: ['Guardians', (el) => zeigeHueter(el, zustand)],
  wiki: ['Wiki', (el) => zeigeWiki(el, zustand)],
  squad: ['Squad check', (el) => zeigeSquad(el, zustand)],
  guide: ['Raid Guide', (el) => {
    // Der Guide bringt alles selbst mit: Raid-/Encounter-Wahl, Sprungleiste, Symbole in der Begegnung, Squad-Knopf.
    const ziel = zustand.guideZiel; zustand.guideZiel = null;
    el.innerHTML = `<iframe class="guide" src="guide/index.html?lang=${gewaehlt(zustand.konto) === 'de' ? 'de' : 'en'}${ziel ? `#${ziel}` : ''}" title="Raid briefing"></iframe>`;
  }],
};
// Sprünge aus Info-Karten: Wiki (Suche oder Farm-Planer) und Raid Guide (Begegnung).
setzeNav({
  wiki: (q, art) => { setzeWikiSuche(q, art); wechsle('wiki'); },
  guide: (id) => { zustand.guideZiel = id; wechsle('guide'); },
  items: () => zustand.alleItems || (zustand.profil ? (zustand.alleItems = sammle(zustand.profil)) : []),
});
export const springeGuide = (id) => { zustand.guideZiel = id; wechsle('guide'); };
export const springeWiki = (kat, suche) => { if (suche) setzeWikiSuche(suche); else setzeWikiKat(kat); wechsle('wiki'); };
const TABS = Object.fromEntries(['start', 'char', 'vault', 'armor', 'loadouts', 'optimizer', 'finder', 'wiki', 'guide', 'stats', 'hueter', 'squad'].map((t) => [t, () => ANSICHTEN[t][1](haupt)]));
// Ohne Anmeldung nutzbar: Raid Guide, Wiki, Build Finder (mit leerem Profil, ohne „besitzt du“).
const OEFFENTLICH = ['guide', 'wiki', 'finder'];
let gastLaedt = null;
async function gastStart(tab) {
  haupt.innerHTML = '<div class="start-lade"><i class="spinner gross"></i><p>Loading…</p></div>';
  gastLaedt ??= Promise.all([ladeDefs(), ladeRolls(), ladeQuellen()]);
  await gastLaedt;
  zustand.gast = true; document.documentElement.dataset.gast = '1';
  zustand.profil = { characters: { data: {} }, characterInventories: { data: {} }, characterEquipment: { data: {} }, profileInventory: { data: { items: [] } }, itemComponents: {}, profileRecords: { data: { records: {} } } };
  wechsle(tab);
}
function platzhalter(titel, text) { haupt.innerHTML = `<h1>${titel}</h1><p class="leer">${text}</p>`; haupt.querySelector('[data-anmelden]')?.addEventListener('click', () => bungie.anmelden()); }

// Handy: 5 beschriftete Knöpfe unten, „Mehr“ öffnet ein Blatt mit allem anderen.
const hl = $('#handyLeiste'), mb = $('#mehrBlatt');
hl?.querySelectorAll('[data-ico]').forEach((i) => { const svg = rail.querySelector(`[data-tab="${i.dataset.ico}"] svg`); if (svg) i.innerHTML = svg.outerHTML; });
const MEHR = [['tab:armor', 'Armor'], ['tab:loadouts', 'Loadouts'], ['tab:optimizer', 'Optimizer'], ['tab:stats', 'Stats'], ['tab:hueter', 'Guardians'], ['tab:wiki', 'Wiki'], ['tab:guide', 'Raid Guide'], ['zufall', 'Randomizer'], ['panel:woche', 'This week'], ['panel:xur', 'Xûr'], ['panel:post', 'Postmaster'], ['panel:konto', 'Settings'], ['modus', 'Simple / Detailed']];
const EMO2 = { zufall: ikon('wuerfel'), 'panel:woche': ikon('kalender'), 'panel:xur': ikon('koffer'), 'panel:post': ikon('post'), 'panel:konto': ikon('regler'), modus: ikon('ziel') };
function zeigeMehr() {
  mb.querySelector('.mb-raster').innerHTML = MEHR.map(([z, n]) => { const t = z.startsWith('tab:') ? z.slice(4) : ''; const svg = t ? rail.querySelector(`[data-tab="${t}"] svg`)?.outerHTML : ''; return `<button data-mz="${z}">${svg ? `<i>${svg}</i>` : `<b>${EMO2[z] || '•'}</b>`}<span>${n}</span></button>`; }).join('');
  mb.hidden = false; requestAnimationFrame(() => mb.classList.add('auf'));
}
const schliesseMehr = () => { mb.classList.remove('auf'); setTimeout(() => { mb.hidden = true; }, 200); };
hl?.addEventListener('click', (e) => { const b = e.target.closest('[data-hl]'); if (!b) return; if (b.dataset.hl === 'mehr') return mb.hidden ? zeigeMehr() : schliesseMehr(); schliesseMehr(); schliessePanel(); wechsle(b.dataset.hl); });
mb?.addEventListener('click', (e) => {
  const z = e.target.closest('[data-mz]')?.dataset.mz; if (!z) { if (e.target === mb) schliesseMehr(); return; }
  schliesseMehr();
  if (z.startsWith('tab:')) { schliessePanel(); wechsle(z.slice(4)); }
  else if (z.startsWith('panel:')) oeffnePanel(z.slice(6));
  else if (z === 'zufall') import('./zufall.js').then((m) => m.oeffneZufall(zustand));
  else if (z === 'modus') import('./konto.js').then((m) => { m.setzeModus(m.modus() === 'einfach' ? 'voll' : 'einfach'); });
});
// Andere Module springen über ein Ereignis zu einer Seite (z. B. Hüter → Squad-Check).
$('#panelGriff')?.addEventListener('click', () => oeffnePanel('woche'));
// Ansicht „Einfach / Ausführlich“: Beschriftung in der Leiste und Seite neu zeichnen.
const modusText = () => { const t = rail.querySelector('[data-modustext]'); if (t) t.textContent = document.documentElement.dataset.modus === 'voll' ? 'Detailed view' : 'Simple view'; };
modusText();
window.addEventListener('d2a-modus', () => { modusText(); if (zustand.profil) wechsle(zustand.tab); });
window.addEventListener('d2a-tab', (e) => { if (TABS[e.detail]) wechsle(e.detail); });
function wechsle(tab) {
  zustand.tab = tab;
  hl?.querySelectorAll('[data-hl]').forEach((b) => b.classList.toggle('an', b.dataset.hl === tab || (b.dataset.hl === 'vault' && tab === 'armor')));
  rail.querySelectorAll('[data-tab]').forEach((b) => { const an = b.dataset.tab === tab; b.classList.toggle('an', an); b.setAttribute('aria-selected', an); });
  try { localStorage.setItem('d2a.tab', tab); } catch {}
  try { history.replaceState(null, '', tab === 'start' ? location.pathname : `#${tab}`); } catch {}
  if (!zustand.profil || (zustand.gast && !OEFFENTLICH.includes(tab))) {
    if (OEFFENTLICH.includes(tab)) return gastStart(tab);
    return platzhalter(titelVon(tab), `<span class="gast-hinweis">🔒 This needs your Bungie account. <button class="haupt-knopf" data-anmelden>Sign in with Bungie</button></span>`);
  }
  TABS[tab]();
}
const titelVon = (tab) => rail.querySelector(`[data-tab="${tab}"] span`)?.textContent || ANSICHTEN[tab]?.[0] || '';

rail.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tab) wechsle(b.dataset.tab);
  else if (b.dataset.panel) schaltePanel();
  else if ('modusknopf' in b.dataset) import('./konto.js').then((m) => { m.setzeModus(m.modus() === 'einfach' ? 'voll' : 'einfach'); modusText(); });
  else if ('zufall' in b.dataset) { if (!zustand.profil) meldung('Sign in first – the randomizer uses your own gear.', true); else import('./zufall.js').then((m) => m.oeffneZufall(zustand)).catch((err) => { console.error(err); meldung(`Randomizer: ${err.message}`, true); }); }
  else if (b.id === 'konto') kontoKlick();
  if (matchMedia('(pointer: coarse)').matches) rail.classList.remove('offen');
});

panel.addEventListener('pointerover', (e) => {
  const m = e.target.closest('[data-tn]'); const t = $('#tipp');
  if (!m) return;
  t.innerHTML = `<b>${m.dataset.tn.replace(/</g, '&lt;')}</b><p class="tt">${m.dataset.td.replace(/</g, '&lt;')}</p>`;
  t.hidden = false;
  const r = m.getBoundingClientRect(), b = t.getBoundingClientRect();
  t.style.left = `${(Math.max(8, r.left - b.width - 8)) / d2aZ()}px`; t.style.top = `${(Math.min(r.top, innerHeight - b.height - 8)) / d2aZ()}px`;
});
haupt.addEventListener('click', (e) => { const p = e.target.closest('[data-panelart]'); if (p) oeffnePanel(p.dataset.panelart); });
addEventListener('message', (e) => { if (e.origin === location.origin && e.data?.d2a === 'squad') oeffnePanel('squad'); });
panel.addEventListener('click', (e) => { const r = e.target.closest('[data-part]'); if (r) oeffnePanel(r.dataset.part); });
panel.addEventListener('click', (e) => { const g = e.target.closest('[data-geh]'); if (g) wechsle(g.dataset.geh); const gd = e.target.closest('[data-guide]'); if (gd) springeGuide(gd.dataset.guide); });
panel.addEventListener('click', (e) => { const w = e.target.closest('[data-wiki]'); if (w) { setzeWikiSuche(w.dataset.wiki); wechsle('wiki'); } });
panel.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tn]')) $('#tipp').hidden = true; });

// Seitenpanel: zeigt "This week" oder eine Ansicht nach Wahl; angeheftet bleibt es offen, auch nach Neuladen.
const pz = (() => { try { return { art: 'woche', fest: false, breit: false, ...JSON.parse(localStorage.getItem('d2a.panel') || '{}') }; } catch { return { art: 'woche', fest: false, breit: false }; } })();
const merkePanel = () => { try { localStorage.setItem('d2a.panel', JSON.stringify(pz)); } catch {} };
// Panel-Auswahl: eigenes Menü mit Symbolen statt einer grauen Liste.
const SCHNELL = [['woche', '🗓'], ['xur', '🧳'], ['post', '📮'], ['konto', '⚙']];
const EMO = { squad: '🛡' };
const panelIcon = (k) => { const s = SCHNELL.find(([x]) => x === k); if (s) return `<i class="pm-emo">${s[1]}</i>`; const svg = rail.querySelector(`[data-tab="${k === 'char' ? 'char' : k}"] svg`)?.outerHTML; return svg ? `<i class="pm-ic">${svg}</i>` : `<i class="pm-emo">${EMO[k] || '▫'}</i>`; };
function zeigePanel() {
  panel.hidden = false; document.body.classList.add('panel-offen');
  panel.classList.toggle('lang', Boolean(pz.text));
  if (pz.w && !matchMedia('(max-width: 760px)').matches) panel.style.width = `${pz.w}px`;
  document.body.classList.toggle('panel-fest', pz.fest);
  rail.querySelector('[data-panel]').classList.add('panel-an'); $('#konto').classList.add('panel-an');
  panel.innerHTML = `<div class="pkopf"><button id="pArtKnopf" class="part-knopf" aria-haspopup="true" aria-expanded="false">${panelIcon(pz.art)}<span>${ANSICHTEN[pz.art][0]}</span><em>▾</em></button>
    <div class="pmenue" hidden><small>Quick</small><div class="pm-schnell">${SCHNELL.map(([k, e]) => `<button data-part="${k}" class="${k === pz.art ? 'an' : ''}"><b>${e}</b>${ANSICHTEN[k][0]}</button>`).join('')}</div>
      <small>Open a page here, next to the main view</small><div class="pm-seiten">${Object.keys(ANSICHTEN).filter((k) => !SCHNELL.some(([x]) => x === k)).map((k) => `<button data-part="${k}" class="${k === pz.art ? 'an' : ''}">${panelIcon(k)}<span>${ANSICHTEN[k][0]}</span></button>`).join('')}</div></div>
    <button id="pText" class="pknopf" title="${pz.text ? 'Names only' : 'Show short descriptions (modifiers, challenges)'}" aria-pressed="${Boolean(pz.text)}">${pz.text ? '☰' : 'ⓘ'}</button>
    <button id="pFest" class="pknopf" title="${pz.fest ? 'Unpin' : 'Pin: keep open'}" aria-pressed="${pz.fest}">📌</button>
    <button id="pZu" class="pknopf" title="Close">✕</button></div>
    <div id="pInhalt"></div>`;
  const inhalt = panel.querySelector('#pInhalt');
  if (!zustand.profil) { inhalt.innerHTML = '<p class="leer">Sign in first.</p>'; return; }
  ANSICHTEN[pz.art][1](inhalt);
}
export function oeffnePanel(art) { pz.art = art; merkePanel(); zeigePanel(); }
export const postZahl = () => postAnzahl(zustand.profil);
function schliessePanel() { panel.hidden = true; document.body.classList.remove('panel-offen'); rail.querySelector('[data-panel]').classList.remove('panel-an'); $('#konto').classList.remove('panel-an'); document.body.classList.remove('panel-fest'); }
function schaltePanel() { if (!panel.hidden) { pz.fest = false; merkePanel(); schliessePanel(); } else { pz.art = 'woche'; merkePanel(); zeigePanel(); } }
// Logo = Home: zurück zum ersten Tab, nach oben, Inventar frisch von Bungie laden.
$('#logo').addEventListener('click', async () => {
  const l = $('#logo');
  if (l.classList.contains('dreht')) return;
  l.classList.add('dreht');
  wechsle('start'); scrollTo({ top: 0, behavior: 'smooth' });
  try { if (zustand.profil) await zustand.neuLaden?.(); } finally { l.classList.remove('dreht'); }
});
panel.addEventListener('click', (e) => { const k = e.target.closest('#pArtKnopf'); if (!k) return; const m = panel.querySelector('.pmenue'); m.hidden = !m.hidden; k.setAttribute('aria-expanded', String(!m.hidden)); });
document.addEventListener('pointerdown', (e) => { const m = panel.querySelector('.pmenue'); if (m && !m.hidden && !e.target.closest('.pmenue,#pArtKnopf')) m.hidden = true; });
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
const setzeGriff = () => { const r = panel.getBoundingClientRect(); griff.hidden = panel.hidden || matchMedia('(max-width: 760px)').matches; griff.style.left = `${(r.left - 4) / d2aZ()}px`; };
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
  // PC: Profil und Seitenpanel sind ein Knopf – öffnet immer „This week“, Konto ist ein Reiter im Panel.
  if (zustand.konto) { if (matchMedia('(min-width: 761px)').matches) { if (!panel.hidden && !pz.fest) return schliessePanel(); return oeffnePanel('woche'); } return oeffnePanel('konto'); }
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
    ${bereit ? '<button class="haupt-knopf" id="los">Sign in with Bungie</button>' : '<p>Setup is not finished yet: the Bungie app keys are missing.</p>'}
    <div class="gast-wahl"><small>Look around first – no account needed</small><div>${[['guide', '⭐', 'Raid Guide', 'Animated encounters'], ['wiki', '📖', 'Wiki', 'Drops, perks, seals'], ['finder', '🔎', 'Builds', 'Community builds']].map(([t, e, n, x]) => `<button data-gast="${t}"><b>${e}</b><span>${n}</span><small>${x}</small></button>`).join('')}</div></div><p class="leer klein">Your sign-in stays in this browser. <a href="privacy.html" target="_blank" rel="noopener">Privacy</a></p>
    <p class="leer klein anm-hinweis">Unofficial fan app, not affiliated with Bungie. Destiny content © Bungie, Inc. Mostly built by Claude, Anthropic’s AI.</p></div>`;
  $('#los')?.addEventListener('click', () => bungie.anmelden());
  haupt.querySelectorAll('[data-gast]').forEach((b) => b.addEventListener('click', () => wechsle(b.dataset.gast)));
}

async function start() {
  if ('serviceWorker' in navigator) {
    // Neue Version veröffentlicht: der neue Service Worker übernimmt, die Seite lädt einmal neu.
    const hatte = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hatte && !window.d2aWeg && !sessionStorage.getItem('d2a.neu')) { sessionStorage.setItem('d2a.neu', '1'); location.reload(); } });
    setTimeout(() => sessionStorage.removeItem('d2a.neu'), 30_000);
    // Spieldaten wurden im Hintergrund erneuert: kurz nach dem Start einmal neu laden, später nur Hinweis.
    const startZeit = Date.now();
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.typ !== 'daten-neu' || !/\/data\//.test(e.data.pfad || '')) return;
      if (Date.now() - startZeit < 8_000 && !sessionStorage.getItem('d2a.datenNeu') && !document.querySelector('#willkommen')) { sessionStorage.setItem('d2a.datenNeu', '1'); location.reload(); return; }
      meldung('New game data is available. Reload the page to use it.');
    });
    setTimeout(() => sessionStorage.removeItem('d2a.datenNeu'), 60_000);
    navigator.serviceWorker.register('sw.js').then((r) => { r.update().catch(() => {}); setInterval(() => r.update().catch(() => {}), 15 * 60_000); }).catch(() => {});
  }
  try { await bungie.rueckkehr(); } catch (e) { meldung(e.message, true); }
  const gespeichert = (() => { try { return localStorage.getItem('d2a.tab'); } catch { return null; } })();
  // Start ist immer die Hüter-Übersicht (Startseite).
  void gespeichert;
  // Abgelaufene Anmeldung: Bungie kennt die Freigabe schon und leitet ohne Rückfrage zurück.
  if (bungie.eingerichtet() && !bungie.angemeldet() && bungie.warAngemeldet() && !new URLSearchParams(location.search).has('error') && Date.now() - Number(sessionStorage.getItem('d2a.auto') || 0) > 120_000) {
    sessionStorage.setItem('d2a.auto', String(Date.now())); haupt.innerHTML = '<p class="leer">Renewing your Bungie sign-in…</p>'; return bungie.anmelden(); }
  // Teilen-Links: #guide, #wiki, #finder, #build/<id>
  const link = location.hash.slice(1); const [lTab, lArg] = link.split('/');
  if (lTab === 'build' && lArg) try { localStorage.setItem('d2a.finderFokus', decodeURIComponent(lArg)); } catch {}
  if (lTab === 'guide' && lArg) zustand.guideZiel = decodeURIComponent(link.slice(6));
  const linkTab = lTab === 'build' ? 'finder' : lTab;
  // Link in einem schon offenen Tab (nur der #-Teil ändert sich): direkt hinspringen.
  window.addEventListener('hashchange', () => {
    const l = location.hash.slice(1); const [t, a] = l.split('/');
    if (t === 'build' && a) try { localStorage.setItem('d2a.finderFokus', decodeURIComponent(a)); } catch {}
    if (t === 'guide' && a) zustand.guideZiel = decodeURIComponent(l.slice(6));
    const z = t === 'build' ? 'finder' : t;
    if (TABS[z] && (zustand.profil || OEFFENTLICH.includes(z))) wechsle(z);
  });
  if (!bungie.eingerichtet() || !bungie.angemeldet()) { wechsleNurLeiste(); starteSprache(null); if (OEFFENTLICH.includes(linkTab)) return wechsle(linkTab); return anmeldeSeite(); }
  if (TABS[linkTab]) zustand.linkTab = linkTab;
  haupt.innerHTML = '<div class="start-lade"><i class="spinner gross"></i><p>Loading your guardians…</p><small>Game data and your last inventory come from this device, fresh data from Bungie follows.</small></div>';
  try {
    await Promise.all([ladeDefs(), ladeRolls(), ladeQuellen()]);
    zustand.oeffnePanel = oeffnePanel; zustand.postZahl = postZahl;
    // Jeder Start beginnt mit der Übersicht – außer ein Teilen-Link zeigt woandershin.
    zustand.tab = zustand.linkTab || 'start';
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
    $('#konto').title = 'This week, Xûr, Postmaster & account';
    await ladeProfil();
    // Frisch neu zeichnen, solange du noch nichts angeklickt hast; sonst nur die Daten tauschen.
    if (!alt || !klicks) wechsle(zustand.tab); else meldung('Data refreshed from Bungie.');
    if (pz.fest && !matchMedia('(max-width: 760px)').matches) zeigePanel();
    if (!schonGesehen(zustand.konto)) zeigeWillkommen(zustand.konto);
    else zeigeNeues((ziel) => { if (ziel.build) try { localStorage.setItem('d2a.finderFokus', ziel.build); } catch {} if (ziel.tab) (TABS[ziel.tab] ? wechsle(ziel.tab) : oeffnePanel(ziel.tab)); if (ziel.zufall) import('./zufall.js').then((m) => m.oeffneZufall(zustand)); });
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
