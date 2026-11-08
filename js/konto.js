import { SPRACHEN, sprache, waehle } from './sprache.js';
import { themaKnoepfe, verbindeThema, zoomKnoepfe, verbindeZoom } from './thema.js';
import { zeigeWillkommen } from './willkommen.js';
// Konto: Bungie-Name, Plattform, Charaktere mit Emblem, Spielzeit, Abmelden, App-Einstellungen.
import { defs } from './defs.js';
import { rolls } from './rolls.js';
import * as bungie from './bungie.js';

// Eigene Shader: Sammlungs-Einträge, die freigeschaltet sind (Zustand ohne Bit 1 = „nicht erhalten“).
export async function eigeneShader(k) {
  try {
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=800`);
    const c = r.profileCollectibles?.data?.collectibles || {};
    return new Set(Object.entries(c).filter(([, v]) => !(v.state & 1)).map(([h]) => Number(h)));
  } catch { return null; }
}

const BILD = 'https://www.bungie.net';
const KLASSE = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const RASSE = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
const PLATTFORM = { 1: 'Xbox', 2: 'PlayStation', 3: 'Steam', 5: 'Stadia', 6: 'Epic Games' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const zeit = (min) => `${Math.round(min / 60).toLocaleString()} h`;
const vor = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };

// Einstellungen: ein Ort, fünf Reiter. Ansicht „Einfach / Ausführlich“ gilt für die ganze App.
const EINST = [['look', '🎨 Look'], ['groesse', '🔍 Size'], ['sprache', '🌐 Language'], ['neu', '✨ New'], ['daten', '💾 Data']];
const einstTab = () => { try { return localStorage.getItem('d2a.einstTab') || 'look'; } catch { return 'look'; } };
export const modus = () => { try { return localStorage.getItem('d2a.modus') || 'einfach'; } catch { return 'einfach'; } };
export function setzeModus(m) { try { localStorage.setItem('d2a.modus', m); } catch {} document.documentElement.dataset.modus = m; window.dispatchEvent(new CustomEvent('d2a-modus')); }
export function zeigeKonto(el, zustand, aktionen) {
  const k = zustand.konto;
  const p = zustand.profil;
  const prof = p.profile?.data || {};
  const chars = Object.values(p.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed));
  const gesamt = chars.reduce((a, c) => a + Number(c.minutesPlayedTotal || 0), 0);
  const plattformen = (prof.userInfo?.applicableMembershipTypes || [k.membershipType]).map((t) => PLATTFORM[t]).filter(Boolean);
  el.innerHTML = `<div class="konto-kopf" style="background-image:linear-gradient(90deg,color-mix(in srgb,var(--bg) 93%,transparent),color-mix(in srgb,var(--bg) 40%,transparent)),url(${BILD}${chars[0]?.emblemBackgroundPath || ''})">
      <h1>${esc(k.name)}</h1><small>${esc(PLATTFORM[k.membershipType] || 'Bungie')}${plattformen.length > 1 ? ` · Cross Save: ${esc(plattformen.join(', '))}` : ''}</small>
      <div class="konto-zahlen"><span><b>${zeit(gesamt)}</b>played</span><span><b>${prof.currentGuardianRank || '–'}</b>Guardian Rank</span><span><b>${chars.length}</b>characters</span></div></div>
    ${chars.map((c) => `<div class="kchar" style="background-image:linear-gradient(90deg,color-mix(in srgb,var(--bg) 87%,transparent),color-mix(in srgb,var(--bg) 33%,transparent)),url(${BILD}${c.emblemBackgroundPath || ''})">
      <i style="background-image:url(${BILD}${c.emblemPath || ''})"></i><div><b>${KLASSE[c.classType]}</b><small>${RASSE[c.raceType] || ''} · ${zeit(c.minutesPlayedTotal || 0)} · last played ${vor(c.dateLastPlayed)}</small></div><span class="klicht">${c.light}</span></div>`).join('')}
    <h2 class="einst-titel">⚙ Settings</h2>
    <div class="einst-reiter" role="tablist">${EINST.map(([k, t]) => `<button data-einst="${k}" aria-selected="${k === einstTab()}">${t}</button>`).join('')}</div>
    <section class="karte konto-modus" data-teil="look"><h3>View</h3><div class="modus-wahl">${['einfach', 'voll'].map((m) => `<button data-modus="${m}" class="${modus() === m ? 'an' : ''}"><b>${m === 'einfach' ? '◎' : '◉'}</b>${m === 'einfach' ? 'Simple' : 'Detailed'}<small>${m === 'einfach' ? 'Calm pages, the key numbers first' : 'Everything open, all filters'}</small></button>`).join('')}</div></section>
    <section class="karte konto-look" data-teil="look"><h3>Look</h3>${themaKnoepfe()}</section>
    <section class="karte konto-zoom" data-teil="groesse"><h3>Size</h3>${zoomKnoepfe()}</section>
    <section class="karte konto-sprache" data-teil="sprache"><h3>Language</h3><select id="sprachWahl" aria-label="Language" data-roh>${SPRACHEN.map(([c, n]) => `<option value="${c}" ${c === sprache ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <p class="leer klein">Item names, perks and descriptions use Bungie's own translations. App texts are available in English and German. Saved for this Bungie account.</p></section>
    <section class="karte konto-neu" data-teil="neu"><h3>What’s new</h3><div class="neu-liste"><p class="leer">Loading…</p></div></section>
    <section class="karte konto-app" data-teil="daten"><h3>Data & app</h3>
      <p>Game data: ${esc(String(defs.version || '').slice(0, 24))}<br>God rolls: ${Object.keys(rolls.items || {}).length.toLocaleString()} weapons, updated ${esc((rolls.erstellt || '').slice(0, 10) || '–')}</p>
      <div class="konto-knoepfe"><button data-k="neu">↻ Reload data from Bungie</button><a class="knopf-link" href="https://www.bungie.net/7/en/User/Profile/${k.membershipType}/${k.membershipId}" target="_blank" rel="noopener">Bungie profile ↗</a>
      <button data-k="willkommen">Show welcome screen</button><button data-k="backup">⬇ Backup settings & marks</button><label class="knopf-link datei-knopf">⬆ Restore backup<input type="file" accept="application/json" data-k-import hidden></label><button data-k="reset">Reset app settings</button><button data-k="ab" class="rot-knopf">Sign out</button></div>
      <p class="leer klein">Install on your phone: open this page in Safari or Chrome → Share → “Add to Home Screen”.</p>
      <p class="leer klein"><a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · Unofficial fan app, not affiliated with Bungie. Destiny content © Bungie, Inc. · Mostly built by Claude (Anthropic).</p></section>`;
  const zeigeTeil = (t) => { el.querySelectorAll('[data-teil]').forEach((x) => { x.hidden = x.dataset.teil !== t; }); el.querySelectorAll('[data-einst]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.einst === t))); try { localStorage.setItem('d2a.einstTab', t); } catch {} };
  zeigeTeil(einstTab());
  fetch(`data/neu.json?t=${Date.now()}`).then((r) => r.json()).then((j) => { const box = el.querySelector('.neu-liste'); if (box) box.innerHTML = (j.eintraege || []).map((e) => `<div class="neu-zeile"><b>${e.art === 'build' ? '🛠' : '✨'}</b><div><b>${esc(e.titel)}</b><small>${esc(e.datum || '')} · ${esc(e.text)}</small></div></div>`).join('') + '<button data-k="neuzeigen" class="chip">Show the “What’s new” window again</button>'; }).catch(() => {});
  verbindeThema(el.querySelector('.konto-look'), () => eigeneShader(k));
  verbindeZoom(el.querySelector('.konto-zoom'));
  el.querySelector('#sprachWahl')?.addEventListener('change', (e) => waehle(k, e.target.value));
  el.querySelector('[data-k-import]')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (j.app !== 'd2-allrounder' || !j.daten) throw new Error('not a D2 Allrounder backup');
      for (const [key, v] of Object.entries(j.daten)) if (key.startsWith('d2a.') && !/token/i.test(key)) localStorage.setItem(key, v);
      location.reload(); } catch (err) { alert(`Restore failed: ${err.message}`); }
  });
  el.onclick = (e) => {
    const et = e.target.closest('[data-einst]'); if (et) return zeigeTeil(et.dataset.einst);
    const mo = e.target.closest('[data-modus]'); if (mo) { setzeModus(mo.dataset.modus); el.querySelectorAll('[data-modus]').forEach((x) => x.classList.toggle('an', x === mo)); return; }
    const b = e.target.closest('[data-k]');
    if (!b) return;
    if (b.dataset.k === 'neu') aktionen.neuLaden();
    if (b.dataset.k === 'willkommen') zeigeWillkommen(k);
    if (b.dataset.k === 'neuzeigen') { try { localStorage.removeItem('d2a.neuGesehen'); } catch {} import('./willkommen.js').then((m) => m.zeigeNeues((z) => { if (z.tab) window.dispatchEvent(new CustomEvent('d2a-tab', { detail: z.tab })); })); }
    if (b.dataset.k === 'ab') aktionen.abmelden();
    if (b.dataset.k === 'backup') {
      // Alles, was die App im Browser merkt (Loadout-Würfe, Futter-Markierung, Favoriten, Aussehen …) – ohne Anmeldedaten.
      const daten = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key.startsWith('d2a.') && !/token|warDa|pgcr/i.test(key)) daten[key] = localStorage.getItem(key); }
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'd2-allrounder', erstellt: new Date().toISOString(), daten }, null, 1)], { type: 'application/json' }));
      a.download = `d2-allrounder-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return;
    }
    if (b.dataset.k === 'reset') {
      if (b.dataset.sicher !== '1') { b.dataset.sicher = '1'; b.textContent = 'Click again to reset'; return; }
      try { Object.keys(localStorage).filter((x) => x.startsWith('d2a.') && x !== 'd2a.token' && x !== 'd2a.warDa').forEach((x) => localStorage.removeItem(x)); } catch {}
      location.reload();
    }
  };
}
