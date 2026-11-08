import { SPRACHEN, sprache, waehle } from './sprache.js';
import { themaKnoepfe, verbindeThema } from './thema.js';
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
    <section class="karte konto-look"><h3>Look</h3>${themaKnoepfe()}</section>
    <section class="karte konto-sprache"><h3>Language</h3><select id="sprachWahl" aria-label="Language" data-roh>${SPRACHEN.map(([c, n]) => `<option value="${c}" ${c === sprache ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <p class="leer klein">Item names, perks and descriptions use Bungie's own translations. App texts are available in English and German. Saved for this Bungie account.</p></section>
    <section class="karte konto-app"><h3>App</h3>
      <p>Game data: ${esc(String(defs.version || '').slice(0, 24))}<br>God rolls: ${Object.keys(rolls.items || {}).length.toLocaleString()} weapons, updated ${esc((rolls.erstellt || '').slice(0, 10) || '–')}</p>
      <div class="konto-knoepfe"><button data-k="neu">↻ Reload data from Bungie</button><a class="knopf-link" href="https://www.bungie.net/7/en/User/Profile/${k.membershipType}/${k.membershipId}" target="_blank" rel="noopener">Bungie profile ↗</a>
      <button data-k="willkommen">Show welcome screen</button><button data-k="reset">Reset app settings</button><button data-k="ab" class="rot-knopf">Sign out</button></div>
      <p class="leer klein">Install on your phone: open this page in Safari or Chrome → Share → “Add to Home Screen”.</p>
      <p class="leer klein"><a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · Unofficial fan app, not affiliated with Bungie. Destiny content © Bungie, Inc. · Mostly built by Claude (Anthropic).</p></section>`;
  verbindeThema(el.querySelector('.konto-look'), () => eigeneShader(k));
  el.querySelector('#sprachWahl')?.addEventListener('change', (e) => waehle(k, e.target.value));
  el.onclick = (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    if (b.dataset.k === 'neu') aktionen.neuLaden();
    if (b.dataset.k === 'willkommen') zeigeWillkommen(k);
    if (b.dataset.k === 'ab') aktionen.abmelden();
    if (b.dataset.k === 'reset') {
      if (b.dataset.sicher !== '1') { b.dataset.sicher = '1'; b.textContent = 'Click again to reset'; return; }
      try { Object.keys(localStorage).filter((x) => x.startsWith('d2a.') && x !== 'd2a.token' && x !== 'd2a.warDa').forEach((x) => localStorage.removeItem(x)); } catch {}
      location.reload();
    }
  };
}
