// Willkommen: einmal nach der ersten Anmeldung (pro Bungie-Konto). Kurz zeigen, was die App kann,
// wo man Aussehen und Sprache ändert, und den Hinweis „inoffiziell, nicht von Bungie“.
import { themaKnoepfe, verbindeThema } from './thema.js';
import { SPRACHEN, sprache, waehle } from './sprache.js';

const TEILE = [
  ['char', 'Inventory', 'All characters and the vault side by side. Drag items to move or equip them.'],
  ['vault', 'Weapons', 'Every weapon you own, with god roll checks and clean-up help.'],
  ['armor', 'Armor', 'Armor by set and stats, duplicates and what can go.'],
  ['loadouts', 'Loadouts', 'Your in-game loadouts plus your own, one click to equip.'],
  ['optimizer', 'Optimizer', 'Finds the best armor combination for the stats you want.'],
  ['finder', 'Build Finder', 'Proven community builds, matched to what you own.'],
  ['wiki', 'Wiki', 'Where things drop, perks, seals and collections.'],
  ['guide', 'Raid Guide', 'Animated guides for every raid and dungeon encounter.'],
  ['stats', 'Stats', 'Clears, flawless runs, time played, your fireteam compared.'],
  ['zufall', 'Randomizer', 'Lucky wheel and random loadouts – let fate pick.'],
];
// Kleine animierte Vorschau je Bereich (reines SVG + CSS, läuft in Schleife), damit man sofort sieht, was passiert.
export const VORSCHAU = {
  char: '<svg viewBox="0 0 120 64"><rect x="4" y="8" width="44" height="48" rx="4" class="v-rahmen"/><rect x="72" y="8" width="44" height="48" rx="4" class="v-rahmen"/><rect x="12" y="16" width="12" height="12" rx="2" class="v-item v-zieh"/><rect x="28" y="16" width="12" height="12" rx="2" class="v-item2"/><rect x="80" y="16" width="12" height="12" rx="2" class="v-item2"/><path d="M52 32h16" class="v-pfeil"/></svg>',
  vault: '<svg viewBox="0 0 120 64"><g class="v-zeilen"><rect x="8" y="8" width="104" height="10" rx="2"/><rect x="8" y="22" width="104" height="10" rx="2"/><rect x="8" y="36" width="104" height="10" rx="2"/><rect x="8" y="50" width="104" height="10" rx="2"/></g><rect x="8" y="22" width="104" height="10" rx="2" class="v-mark"/><text x="100" y="30" class="v-stern">★</text></svg>',
  armor: '<svg viewBox="0 0 120 64">' + [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${10 + i * 18}" y="10" width="10" height="46" rx="2" class="v-spur"/><rect x="${10 + i * 18}" y="10" width="10" height="46" rx="2" class="v-balken" style="animation-delay:${i * 0.15}s"/>`).join('') + '</svg>',
  loadouts: '<svg viewBox="0 0 120 64">' + [0, 1, 2].map((i) => `<rect x="${8 + i * 38}" y="10" width="30" height="44" rx="4" class="v-karte" style="animation-delay:${i * 0.6}s"/>`).join('') + '</svg>',
  optimizer: '<svg viewBox="0 0 120 64">' + [0, 1, 2, 3, 4, 5].map((i) => `<rect x="8" y="${6 + i * 9}" width="104" height="5" rx="2" class="v-spur"/><rect x="8" y="${6 + i * 9}" width="104" height="5" rx="2" class="v-quer" style="animation-delay:${i * 0.12}s"/>`).join('') + '<path d="M86 4v58" class="v-ziel"/></svg>',
  finder: '<svg viewBox="0 0 120 64"><g class="v-zeilen"><rect x="6" y="10" width="32" height="44" rx="3"/><rect x="44" y="10" width="32" height="44" rx="3"/><rect x="82" y="10" width="32" height="44" rx="3"/></g><g class="v-lupe"><circle cx="0" cy="0" r="9"/><path d="M6 6l8 8"/></g></svg>',
  wiki: '<svg viewBox="0 0 120 64"><rect x="20" y="4" width="80" height="56" rx="4" class="v-rahmen"/>' + [0, 1, 2, 3, 4].map((i) => `<rect x="28" y="${12 + i * 9}" width="${64 - (i % 2) * 18}" height="4" rx="2" class="v-text" style="animation-delay:${i * 0.25}s"/>`).join('') + '</svg>',
  guide: '<svg viewBox="0 0 120 64"><ellipse cx="60" cy="32" rx="54" ry="27" class="v-rahmen"/><circle r="4" class="v-dot v-d1"/><circle r="4" class="v-dot v-d2"/><circle r="4" class="v-dot v-d3"/><circle cx="60" cy="32" r="7" class="v-boss"/></svg>',
  stats: '<svg viewBox="0 0 120 64"><circle cx="34" cy="32" r="22" class="v-spur-r"/><circle cx="34" cy="32" r="22" class="v-ring"/>' + [0, 1, 2, 3].map((i) => `<rect x="${68 + i * 12}" y="12" width="8" height="40" rx="2" class="v-balken" style="animation-delay:${i * 0.2}s"/>`).join('') + '</svg>',
  zufall: '<svg viewBox="0 0 120 64"><g class="v-rad"><circle cx="60" cy="32" r="26" class="v-rahmen"/>' + [0, 1, 2, 3, 4, 5].map((i) => `<path d="M60 32L${60 + 26 * Math.cos(i * Math.PI / 3)} ${32 + 26 * Math.sin(i * Math.PI / 3)}" class="v-speiche"/>`).join('') + '</g><path d="M60 2l-4 6h8z" class="v-zeiger"/></svg>',
  build: '<svg viewBox="0 0 120 64"><circle cx="60" cy="32" r="20" class="v-rahmen v-puls"/><path d="M60 16l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" class="v-stern2"/></svg>',
};
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
    <div class="wk-teile">${TEILE.map(([t, n, x]) => `<div class="wk-teil"><div class="wk-vor">${VORSCHAU[t] || ''}</div><b>${n}</b><small>${x}</small></div>`).join('')}</div>
    <div class="wk-einst">
      <section><h3>Look</h3>${themaKnoepfe()}</section>
      <section><h3>Language</h3><select id="wkSprache" aria-label="Language" data-roh>${SPRACHEN.map(([c, n]) => `<option value="${c}" ${c === sprache ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <p class="leer klein">Both can be changed anytime under your account (person icon).</p></section>
    </div>
    <div class="wk-hinweis"><p>Unofficial fan app. Not made by, affiliated with or endorsed by Bungie.</p><p>Destiny 2 content and images © Bungie, Inc.</p><p>Mostly built by Claude, Anthropic’s AI, together with Kevin (AdmiralAdipositas).</p></div>
    <button class="haupt-knopf" id="wkLos">Let’s go</button>
  </div>`;
  document.body.append(d);
  verbindeThema(d, () => import('./konto.js').then((m) => m.eigeneShader(konto)));
  // Wer die App gerade erst kennenlernt, bekommt danach kein „Neu seit deinem letzten Besuch“ mit alten Einträgen.
  const zu = () => { try { localStorage.setItem(schluessel(konto), String(Date.now())); } catch {} d.remove(); fetch('data/neu.json').then((r) => r.json()).then((j) => { try { const g = new Set(JSON.parse(localStorage.getItem('d2a.neuGesehen') || '[]')); (j.eintraege || []).forEach((e) => g.add(e.id)); localStorage.setItem('d2a.neuGesehen', JSON.stringify([...g])); } catch {} }).catch(() => {}); };
  d.querySelector('#wkSprache').addEventListener('change', (e) => { zu(); waehle(konto, e.target.value); });
  d.querySelector('#wkLos').addEventListener('click', zu);
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
  d.querySelector('#wkLos').focus({ preventScroll: true }); d.querySelector('.wk-box').scrollTop = 0;
}

// ---------- Neu seit dem letzten Besuch: große Vorschau statt Push-Meldung, man entscheidet selbst ----------
const GESEHEN = 'd2a.neuGesehen', WEG = 'd2a.buildsWeg';
const lies = (k, s) => { try { return JSON.parse(localStorage.getItem(k)) ?? s; } catch { return s; } };
export async function zeigeNeues(geheZu) {
  let daten; try { daten = await (await fetch(`data/neu.json?t=${Date.now()}`)).json(); } catch { return; }
  const gesehen = new Set(lies(GESEHEN, []));
  const liste = (daten.eintraege || []).filter((e) => !gesehen.has(e.id)).slice(0, 8);
  if (!liste.length || document.querySelector('#willkommen')) return;
  const { defs } = await import('./defs.js');
  const exoIcons = (e) => (e.exotics || []).map((n) => Object.values(defs.items || {}).find((d) => d.n === n && d.q === 6)).filter(Boolean).map((d) => `<i style="background-image:url(https://www.bungie.net${d.i})" title="${d.n}"></i>`).join('');
  const d = document.createElement('div'); d.id = 'willkommen'; d.className = 'neues'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<div class="wk-box"><p class="wk-kicker">New since your last visit</p><h1>What’s new</h1>
    <div class="neu-karten">${liste.map((e) => `<div class="neu-karte" data-id="${e.id}"><div class="wk-vor gross">${VORSCHAU[e.vorschau || (e.art === 'build' ? 'build' : 'char')] || ''}<div class="neu-exo">${exoIcons(e)}</div></div>
      <div class="neu-text"><small>${e.art === 'build' ? `New build · ${e.klasse || ''}` : 'New in the app'} · ${e.datum || ''}</small><b>${e.titel}</b><p>${e.text}</p>
      <div class="konto-knoepfe">${e.ziel ? '<button class="haupt-knopf" data-ansehen>Show me</button>' : ''}${e.art === 'build' ? '<button data-ausblenden>Not for me – hide this build</button>' : ''}</div></div></div>`).join('')}</div>
    <button class="haupt-knopf" id="wkLos">Got it</button></div>`;
  document.body.append(d);
  const zu = () => { try { localStorage.setItem(GESEHEN, JSON.stringify([...gesehen, ...liste.map((e) => e.id)])); } catch {} d.remove(); };
  d.addEventListener('click', (ev) => {
    const k = ev.target.closest('.neu-karte'); const e = k && liste.find((x) => x.id === k.dataset.id);
    if (ev.target.closest('[data-ansehen]') && e) { zu(); geheZu(e.ziel); return; }
    if (ev.target.closest('[data-ausblenden]') && e) { const w = new Set(lies(WEG, [])); w.add(e.build || e.id); try { localStorage.setItem(WEG, JSON.stringify([...w])); } catch {} k.classList.add('weg'); k.querySelector('.konto-knoepfe').innerHTML = '<small>Hidden from the Build Finder.</small>'; return; }
    if (ev.target.id === 'wkLos' || ev.target === d) zu();
  });
  d.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') zu(); });
}
