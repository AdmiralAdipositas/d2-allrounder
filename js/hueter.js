// Hüter: alle Leute an einem Ort – Einsatztrupp jetzt, Freunde (Bungie), Favoriten, eigene Gruppen und
// „oft zusammen gespielt“ (aus deinen Raid-/Dungeon-Berichten, Einmal-Begegnungen ausgeblendet).
// Von hier aus: Stats ansehen, vergleichen, Squad-Check, „Hinzufügen zu …“.
import * as bungie from './bungie.js';
import { mitspielerVon, vergleicheMit, zeigeFremd, aktuellerTruppNamen } from './stats.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lies = (k, s) => { try { return JSON.parse(localStorage.getItem(k)) ?? s; } catch { return s; } };
const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const FAV = 'd2a.statsFav', GRP = 'd2a.gruppen', OPT = 'd2a.hueterOpt';
const datum = (t) => (t ? new Date(t).toLocaleDateString() : '');
const geh = (tab) => window.dispatchEvent(new CustomEvent('d2a-tab', { detail: tab }));

let freunde = null, freundeFehler = '', trupp = null, mit = null;
let auswahl = new Set();

async function ladeFreunde() {
  if (freunde) return;
  try {
    const r = await bungie.get('/Social/Friends/');
    freunde = (r.friends || []).map((f) => ({ name: f.bungieGlobalDisplayName ? `${f.bungieGlobalDisplayName}#${String(f.bungieGlobalDisplayNameCode).padStart(4, '0')}` : (f.bungieNetUser?.uniqueName || ''), online: f.onlineStatus === 1, titel: f.onlineTitle || 0 })).filter((f) => f.name);
  } catch (e) { freunde = []; freundeFehler = 'Bungie didn’t share your friends list with this app (sign out and in again may help).'; }
}

export async function zeigeHueter(el, zustand) {
  const opt = lies(OPT, { ansicht: 'alle', min: 3, mehr: 30 });
  el.innerHTML = '<div class="kopf"><h1>Guardians</h1></div><p class="leer">Loading your people…</p>';
  // Alles parallel; was fertig ist, wird gezeigt.
  const neu = () => zeichne();
  ladeFreunde().then(neu);
  aktuellerTruppNamen(zustand.konto).then((t) => { trupp = t; neu(); });
  let zaehle = null;
  mitspielerVon(zustand, () => { if (zaehle) { mit = zaehle(); neu(); } }).then((z) => { zaehle = z; mit = z(); neu(); }).catch(() => { mit = []; neu(); });

  function personen() {
    const fav = new Set(lies(FAV, [])), grp = lies(GRP, {});
    const map = new Map();
    const p = (n) => { if (!map.has(n)) map.set(n, { name: n, mal: 0, zuletzt: '', fav: fav.has(n), freund: false, online: false, trupp: false, gruppen: [] }); return map.get(n); };
    for (const x of mit || []) Object.assign(p(x.name), { mal: x.mal, zuletzt: x.zuletzt });
    for (const f of freunde || []) Object.assign(p(f.name), { freund: true, online: f.online });
    for (const n of trupp || []) p(n).trupp = true;
    for (const n of fav) p(n);
    for (const [g, l] of Object.entries(grp)) for (const n of l) p(n).gruppen.push(g);
    return [...map.values()];
  }
  function zeichne() {
    const grp = lies(GRP, {});
    const alle = personen();
    const filter = {
      alle: (x) => x.trupp || x.fav || x.freund || x.gruppen.length || x.mal >= opt.min,
      trupp: (x) => x.trupp, freunde: (x) => x.freund, fav: (x) => x.fav, oft: (x) => x.mal >= opt.min,
      ...Object.fromEntries(Object.keys(grp).map((g) => [`g:${g}`, (x) => x.gruppen.includes(g)])),
    };
    const f = filter[opt.ansicht] || filter.alle;
    const sort = (a, b) => b.trupp - a.trupp || b.online - a.online || b.fav - a.fav || b.mal - a.mal || a.name.localeCompare(b.name);
    const liste = alle.filter(f).sort(sort);
    const einmal = alle.filter((x) => x.mal > 0 && x.mal < opt.min && !x.fav && !x.freund && !x.gruppen.length && !x.trupp).length;
    const zaehl = (k) => alle.filter(filter[k]).length;
    const chips = [['alle', 'All'], ['trupp', '🟢 Fireteam now'], ['freunde', '👥 Friends'], ['fav', '★ Favorites'], ['oft', '⚔ Played with'], ...Object.keys(grp).map((g) => [`g:${g}`, `# ${g}`])];
    const zeile = (x) => `<div class="hz ${auswahl.has(x.name) ? 'an' : ''}">
        <label class="hz-wahl" title="Select for compare / squad check"><input type="checkbox" data-wahl="${esc(x.name)}" ${auswahl.has(x.name) ? 'checked' : ''}></label>
        <div class="hz-name"><b>${esc(x.name.split('#')[0])}</b><small>#${esc(x.name.split('#')[1] || '')}</small>
          <span class="hz-marken">${x.trupp ? '<em class="m-trupp">in your fireteam</em>' : ''}${x.online && !x.trupp ? '<em class="m-on">online</em>' : ''}${x.freund ? '<em>friend</em>' : ''}${x.gruppen.map((g) => `<em class="m-grp">${esc(g)}</em>`).join('')}</span></div>
        <span class="hz-info" tabindex="0" data-info="${x.mal ? `${x.mal} raid & dungeon runs together${x.zuletzt ? ` · last ${datum(x.zuletzt)}` : ''}` : 'No shared raid or dungeon report yet'}">${x.mal ? `${x.mal}×` : 'i'}</span>
        <div class="hz-akt"><button class="chip klein" data-stats="${esc(x.name)}" title="Open their stats">📊 Stats</button><button class="chip klein ${x.fav ? 'an' : ''}" data-fav="${esc(x.name)}" title="Favorite">${x.fav ? '★' : '☆'}</button><button class="chip klein" data-add="${esc(x.name)}" title="Add to…">＋</button></div>
      </div>`;
    el.innerHTML = `<div class="kopf"><h1>Guardians</h1><form class="hz-suche"><input id="hzName" placeholder="Add someone: Name#1234" autocomplete="off"><button class="chip">Add</button></form></div>
      <div class="wsub hz-chips">${chips.map(([k, t]) => `<button class="chip" data-ansicht="${esc(k)}" aria-pressed="${opt.ansicht === k}">${esc(t)} <small>${zaehl(k)}</small></button>`).join('')}<button class="chip klein" data-neugruppe title="Create a group like “Raid squad”">＋ Group</button></div>
      ${opt.ansicht === 'freunde' && freundeFehler ? `<p class="leer klein">${esc(freundeFehler)}</p>` : ''}
      ${opt.ansicht.startsWith('g:') ? `<p class="leer klein"><button class="chip klein" data-gruppeweg="${esc(opt.ansicht.slice(2))}">Delete group</button></p>` : ''}
      <div class="hz-liste">${liste.slice(0, opt.mehr).map(zeile).join('') || `<p class="leer">${mit == null ? 'Loading…' : 'Nobody here yet.'}</p>`}</div>
      ${liste.length > opt.mehr ? `<button class="chip" data-mehr>Show ${Math.min(30, liste.length - opt.mehr)} more (${liste.length - opt.mehr} left)</button>` : ''}
      <p class="leer klein hz-fuss">“Played with” counts guardians from at least <select data-min>${[2, 3, 5, 10].map((n) => `<option ${n === opt.min ? 'selected' : ''}>${n}</option>`).join('')}</select> shared raid/dungeon runs${einmal ? ` – ${einmal} quick encounters (LFG, one-off help) are hidden` : ''}.${mit?.laedt ? ' Still reading reports…' : ''}</p>
      ${auswahl.size ? `<div class="hz-leiste"><b>${auswahl.size} selected</b><button class="haupt-knopf" data-vergleich>⇄ Compare with me</button><button class="chip" data-squad>🛡 Squad check</button><button class="chip" data-addalle>＋ Add to…</button><button class="chip klein" data-wahlweg>clear</button></div>` : ''}`;
  }
  // „Hinzufügen zu …“: Favoriten, vorhandene Gruppen, neue Gruppe.
  function addMenue(knopf, namen) {
    document.querySelector('.hz-menue')?.remove();
    const grp = lies(GRP, {});
    const m = document.createElement('div'); m.className = 'hz-menue';
    m.innerHTML = `<button data-ziel="fav">★ Favorites</button>${Object.keys(grp).map((g) => `<button data-ziel="g:${esc(g)}"># ${esc(g)}${namen.every((n) => grp[g].includes(n)) ? ' ✓' : ''}</button>`).join('')}<button data-ziel="neu">＋ New group…</button>`;
    const r = knopf.getBoundingClientRect(), z = window.d2aZ?.() || 1;
    m.style.left = `${Math.min(r.left / z, innerWidth / z - 200)}px`; m.style.top = `${r.bottom / z + 4}px`;
    document.body.append(m);
    const weg = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', weg, true); } };
    setTimeout(() => document.addEventListener('pointerdown', weg, true));
    m.onclick = (e) => {
      const z2 = e.target.closest('[data-ziel]')?.dataset.ziel; if (!z2) return;
      if (z2 === 'fav') { const f = new Set(lies(FAV, [])); namen.forEach((n) => f.add(n)); schreib(FAV, [...f]); }
      else {
        const g = lies(GRP, {}); let name = z2.slice(2);
        if (z2 === 'neu') { name = prompt('Name of the group (e.g. Raid squad)')?.trim(); if (!name) return; }
        const l = new Set(g[name] || []); const drin = namen.every((n) => l.has(n)); namen.forEach((n) => (drin ? l.delete(n) : l.add(n))); g[name] = [...l]; schreib(GRP, g);
      }
      m.remove(); zeichne();
    };
  }
  el.onclick = (e) => {
    const a = e.target.closest('[data-ansicht]'); if (a) { opt.ansicht = a.dataset.ansicht; opt.mehr = 30; schreib(OPT, opt); return zeichne(); }
    if (e.target.closest('[data-mehr]')) { opt.mehr += 30; return zeichne(); }
    const s = e.target.closest('[data-stats]'); if (s) { zeigeFremd(s.dataset.stats); return geh('stats'); }
    const fv = e.target.closest('[data-fav]'); if (fv) { const f = new Set(lies(FAV, [])); const n = fv.dataset.fav; f.has(n) ? f.delete(n) : f.add(n); schreib(FAV, [...f]); return zeichne(); }
    const ad = e.target.closest('[data-add]'); if (ad) return addMenue(ad, [ad.dataset.add]);
    if (e.target.closest('[data-addalle]')) return addMenue(e.target.closest('[data-addalle]'), [...auswahl]);
    if (e.target.closest('[data-wahlweg]')) { auswahl.clear(); return zeichne(); }
    if (e.target.closest('[data-vergleich]')) { vergleicheMit([...auswahl]); return geh('stats'); }
    if (e.target.closest('[data-squad]')) { schreib('d2a.squad', [...auswahl]); return geh('squad'); }
    if (e.target.closest('[data-neugruppe]')) { const n = prompt('Name of the group (e.g. Raid squad)')?.trim(); if (n) { const g = lies(GRP, {}); g[n] = g[n] || [...auswahl]; schreib(GRP, g); opt.ansicht = `g:${n}`; schreib(OPT, opt); } return zeichne(); }
    const gw = e.target.closest('[data-gruppeweg]'); if (gw) { if (gw.dataset.sicher !== '1') { gw.dataset.sicher = '1'; gw.textContent = 'Click again to delete'; return; } const g = lies(GRP, {}); delete g[gw.dataset.gruppeweg]; schreib(GRP, g); opt.ansicht = 'alle'; schreib(OPT, opt); return zeichne(); }
  };
  el.onchange = (e) => {
    const w = e.target.closest('[data-wahl]'); if (w) { w.checked ? auswahl.add(w.dataset.wahl) : auswahl.delete(w.dataset.wahl); return zeichne(); }
    if (e.target.matches('[data-min]')) { opt.min = Number(e.target.value); schreib(OPT, opt); return zeichne(); }
  };
  el.onsubmit = (e) => {
    e.preventDefault(); const v = el.querySelector('#hzName').value.trim();
    if (!/^.+#\d{1,4}$/.test(v)) return import('./app.js').then((m) => m.meldung('Use the full Bungie name with #number.', true));
    const f = new Set(lies(FAV, [])); f.add(v); schreib(FAV, [...f]); opt.ansicht = 'fav'; schreib(OPT, opt); zeichne();
  };
}
