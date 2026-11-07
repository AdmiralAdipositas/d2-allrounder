// Willkommen: einmal nach der ersten Anmeldung (pro Bungie-Konto). Kurz zeigen, was die App kann,
// wo man Aussehen und Sprache ändert, und den Hinweis „inoffiziell, nicht von Bungie“.
import { themaKnoepfe, verbindeThema } from './thema.js';
import { SPRACHEN, sprache, waehle } from './sprache.js';

const TEILE = [
  ['char', 'Guardians', 'Your characters, stats and inventory. Drag items to move or equip them.'],
  ['vault', 'Weapons', 'Every weapon you own, with god roll checks and clean-up help.'],
  ['armor', 'Armor', 'Armor by set and stats, duplicates and what can go.'],
  ['loadouts', 'Loadouts', 'Your in-game loadouts plus your own, one click to equip.'],
  ['optimizer', 'Optimizer', 'Finds the best armor combination for the stats you want.'],
  ['finder', 'Build Finder', 'Proven community builds, matched to what you own.'],
  ['wiki', 'Wiki', 'Where things drop, perks, seals and collections.'],
  ['guide', 'Raid Guide', 'Animated guides for every raid and dungeon encounter.'],
  ['stats', 'Stats', 'Clears, fastest runs and your favorite weapons.'],
];
const schluessel = (k) => `d2a.willkommen.${k?.membershipId || 'gast'}`;
export function schonGesehen(k) { try { return Boolean(localStorage.getItem(schluessel(k))); } catch { return true; } }

export function zeigeWillkommen(konto) {
  document.querySelector('#willkommen')?.remove();
  const icon = (t) => document.querySelector(`#rail [data-tab="${t}"] svg`)?.outerHTML || '';
  const d = document.createElement('div');
  d.id = 'willkommen'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'wkTitel');
  d.innerHTML = `<div class="wk-box">
    <p class="wk-kicker">D2 Allrounder</p>
    <h1 id="wkTitel">Welcome, Guardian</h1>
    <p class="wk-lede">Everything for your guardians in one place, on phone and PC.</p>
    <div class="wk-teile">${TEILE.map(([t, n, x]) => `<div class="wk-teil">${icon(t)}<b>${n}</b><small>${x}</small></div>`).join('')}</div>
    <div class="wk-einst">
      <section><h3>Look</h3>${themaKnoepfe()}</section>
      <section><h3>Language</h3><select id="wkSprache" aria-label="Language" data-roh>${SPRACHEN.map(([c, n]) => `<option value="${c}" ${c === sprache ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <p class="leer klein">Both can be changed anytime under your account (person icon).</p></section>
    </div>
    <div class="wk-hinweis"><p>Unofficial fan app. Not made by, affiliated with or endorsed by Bungie.</p><p>Destiny 2 content and images © Bungie, Inc.</p><p>Mostly built by Claude, Anthropic’s AI, together with Kevin (AdmiralAdipositas).</p></div>
    <button class="haupt-knopf" id="wkLos">Let’s go</button>
  </div>`;
  document.body.append(d);
  verbindeThema(d);
  const zu = () => { try { localStorage.setItem(schluessel(konto), String(Date.now())); } catch {} d.remove(); };
  d.querySelector('#wkSprache').addEventListener('change', (e) => { zu(); waehle(konto, e.target.value); });
  d.querySelector('#wkLos').addEventListener('click', zu);
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
  d.querySelector('#wkLos').focus({ preventScroll: true }); d.querySelector('.wk-box').scrollTop = 0;
}
