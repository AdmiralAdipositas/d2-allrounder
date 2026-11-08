// Such-Sprache für Waffen & Rüstung – die Schreibweise, die erfahrene Spieler aus anderen Tools kennen:
//   is:exotic  is:dupe  is:locked  is:godroll  is:masterwork  is:crafted  is:vault  is:solar …
//   perk:incandescent  name:"fatebringer"  type:"hand cannon"  frame:aggressive  set:"smoke jumper"
//   power:>=2000  stat:weapons:>=20  stat:total:>=70  tier:>=4  class:titan  tag:keep  note:pvp
//   -is:locked / not:is:locked = Gegenteil · „or“ verbindet Alternativen · Leerzeichen = und
import { defs } from './defs.js';

const KLASSE = { titan: 0, hunter: 1, warlock: 2 };
const lies = (k, s) => { try { return JSON.parse(localStorage.getItem(k)) ?? s; } catch { return s; } };

// Markierungen und Notizen (Vorschlag E) – liegen lokal, damit die Suche sie findet.
export const TAGS = [['fav', '★', 'Favorite'], ['keep', '🛡', 'Keep'], ['junk', '🗑', 'Junk'], ['futter', '🔥', 'Infusion fodder']];
export const tags = () => lies('d2a.tags', {});
export const notizen = () => lies('d2a.notizen', {});
export function setzeTag(id, tag) {
  const t = tags(); if (!tag || t[id] === tag) delete t[id]; else t[id] = tag;
  try { localStorage.setItem('d2a.tags', JSON.stringify(t)); } catch {}
  // altes 🔥-Futter bleibt synchron
  const f = new Set(lies('d2a.futter', [])); if (t[id] === 'futter') f.add(id); else f.delete(id);
  try { localStorage.setItem('d2a.futter', JSON.stringify([...f])); } catch {}
}
export function setzeNotiz(id, text) { const n = notizen(); if (text) n[id] = text; else delete n[id]; try { localStorage.setItem('d2a.notizen', JSON.stringify(n)); } catch {} }

// Für die Vorschläge beim Tippen.
export const VORSCHLAEGE = [
  'is:exotic', 'is:legendary', 'is:dupe', 'is:locked', 'is:unlocked', 'is:godroll', 'is:goodroll', 'is:masterwork', 'is:crafted',
  'is:vault', 'is:equipped', 'is:postmaster', 'is:junk', 'is:weapon', 'is:armor',
  'is:kinetic', 'is:solar', 'is:arc', 'is:void', 'is:stasis', 'is:strand', 'is:primary', 'is:special', 'is:heavy',
  'tag:fav', 'tag:keep', 'tag:junk', 'tag:futter', 'is:tagged', 'note:',
  'perk:', 'name:', 'type:', 'frame:', 'set:', 'class:titan', 'class:hunter', 'class:warlock',
  'power:>=', 'tier:>=', 'stat:total:>=', 'stat:weapons:>=', 'stat:health:>=', 'stat:melee:>=', 'stat:grenade:>=', 'stat:super:>=', 'stat:class:>=',
];

// Text in Wörter zerlegen, "Anführungszeichen" bleiben zusammen.
function woerter(q) { return (q.match(/-?[a-z]+:(?:[a-z]+:)?(?:[<>=]*)"[^"]*"|-?"[^"]*"|\S+/gi) || []).map((w) => w.replace(/"/g, '')); }

const vergleich = (wert, ausdruck) => {
  const m = /^(>=|<=|>|<|=)?(\d+)$/.exec(ausdruck || ''); if (!m) return true;
  const z = Number(m[2]); switch (m[1]) { case '>=': return wert >= z; case '<=': return wert <= z; case '>': return wert > z; case '<': return wert < z; default: return wert === z; }
};

function teil(x, w, ctx) {
  const plugNamen = () => x.plugs.map((p) => defs.items[p]?.n || '').join(' ').toLowerCase();
  const [k, ...rest] = w.split(':'); const v = rest.join(':');
  if (!rest.length) return `${x.d.n} ${x.d.k} ${plugNamen()} ${Object.values(x.m || {}).flat().join(' ')} ${ctx.notizen[x.id] || ''}`.toLowerCase().includes(w);
  switch (k) {
    case 'is': switch (v) {
      case 'exotic': return x.d.q === 6; case 'legendary': return x.d.q === 5;
      case 'dupe': case 'duplicate': return (ctx.anzahl.get(x.hash) || 0) > 1;
      case 'locked': return x.locked; case 'unlocked': return !x.locked;
      case 'godroll': case 'god': return /god/.test(x.m?.roll || ''); case 'goodroll': return /good|god/.test(x.m?.roll || '');
      case 'masterwork': case 'mw': return x.mw; case 'crafted': return x.crafted;
      case 'vault': return x.ort === 'tresor'; case 'equipped': return x.angelegt; case 'postmaster': return x.ort.startsWith('post:');
      case 'junk': return x.junk || ctx.tags[x.id] === 'junk'; case 'tagged': return !!ctx.tags[x.id];
      case 'weapon': return x.d.t === 3; case 'armor': return x.d.t === 2;
      case 'primary': case 'special': case 'heavy': return (x.m?.ammo || '').toLowerCase() === v;
      default: return (x.m?.element || '').toLowerCase() === v;
    }
    case 'tag': return ctx.tags[x.id] === v || (v === 'futter' && ctx.tags[x.id] === 'fodder');
    case 'note': return (ctx.notizen[x.id] || '').toLowerCase().includes(v) && (!!v || !!ctx.notizen[x.id]);
    case 'perk': return plugNamen().includes(v);
    case 'name': return x.d.n.toLowerCase().includes(v);
    case 'type': return (x.d.k || '').toLowerCase().includes(v);
    case 'frame': return (x.m?.frame || '').toLowerCase().includes(v);
    case 'set': return (x.m?.set || '').toLowerCase().includes(v);
    case 'class': return x.d.c === KLASSE[v];
    case 'power': return vergleich(x.power, v);
    case 'tier': return vergleich(x.tier, v);
    case 'stat': { const [n, a] = [rest[0], rest.slice(1).join(':')]; if (!x.st) return false; const key = Object.keys(x.st).find((s) => s.toLowerCase() === n); return key ? vergleich(x.st[key], a) : false; }
    default: return `${x.d.n} ${x.d.k}`.toLowerCase().includes(w);
  }
}

// Baut aus dem Suchtext eine Prüf-Funktion. ctx: { anzahl: Map(hash → Kopien) }
export function baueSuche(q, alle) {
  q = (q || '').trim().toLowerCase(); if (!q) return () => true;
  const anzahl = new Map(); for (const x of alle || []) anzahl.set(x.hash, (anzahl.get(x.hash) || 0) + 1);
  const ctx = { anzahl, tags: tags(), notizen: notizen() };
  // „or“ trennt Gruppen, innerhalb einer Gruppe muss alles passen.
  const gruppen = []; let g = [];
  for (const w of woerter(q)) { if (w === 'or') { if (g.length) gruppen.push(g); g = []; } else if (w !== 'and') g.push(w); }
  if (g.length) gruppen.push(g);
  return (x) => gruppen.some((gr) => gr.every((w) => {
    const nicht = w.startsWith('-') || w.startsWith('not:'); const roh = w.replace(/^-|^not:/, '');
    return roh ? teil(x, roh, ctx) !== nicht : true;
  }));
}

// Vorschläge beim Tippen: das letzte Wort wird ergänzt (Klick, Tab oder Enter).
export function verbindeVorschlaege(input, nachher) {
  const box = document.createElement('div'); box.className = 'such-vor'; box.hidden = true;
  input.parentElement.style.position ||= 'relative';
  input.after(box);
  let wahl = 0, liste = [];
  const letztes = () => input.value.slice(0, input.selectionStart ?? input.value.length).split(/\s+/).pop().toLowerCase();
  const zeige = () => {
    const w = letztes().replace(/^-/, '');
    liste = w.length >= 2 ? VORSCHLAEGE.filter((v) => v.startsWith(w) && v !== w).slice(0, 7) : [];
    if (!liste.length) { box.hidden = true; return; }
    wahl = 0; box.hidden = false;
    box.style.left = `${input.offsetLeft}px`; box.style.top = `${input.offsetTop + input.offsetHeight + 4}px`;
    box.innerHTML = liste.map((v, i) => `<button type="button" data-v="${v}" class="${i === wahl ? 'an' : ''}"><b>${v.slice(0, w.length)}</b>${v.slice(w.length)}</button>`).join('') + '<small>Tab ↹ to complete · <a href="#" data-hilfe>all filters</a></small>';
  };
  const nimm = (v) => {
    const pos = input.selectionStart ?? input.value.length; const vor = input.value.slice(0, pos); const nach = input.value.slice(pos);
    const minus = /(^|\s)-\S*$/.test(vor) ? '-' : '';
    input.value = vor.replace(/\S*$/, minus + v) + (v.endsWith(':') || v.endsWith('=') ? '' : ' ') + nach.trimStart();
    input.focus(); box.hidden = true; nachher();
    if (v.endsWith(':') || v.endsWith('=')) zeige();
  };
  input.addEventListener('input', zeige);
  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Tab' || (e.key === 'Enter' && liste.length)) { e.preventDefault(); nimm(liste[wahl]); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); wahl = (wahl + (e.key === 'ArrowDown' ? 1 : liste.length - 1)) % liste.length; box.querySelectorAll('button').forEach((b, i) => b.classList.toggle('an', i === wahl)); }
    else if (e.key === 'Escape') box.hidden = true;
  });
  input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
  box.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const b = e.target.closest('[data-v]'); if (b) return nimm(b.dataset.v);
    if (e.target.closest('[data-hilfe]')) { box.innerHTML = `<div class="such-hilfe">${VORSCHLAEGE.map((v) => `<button type="button" data-v="${v}">${v}</button>`).join('')}<small>-word or not: = without · <b>or</b> = either · "quotes" keep words together</small></div>`; }
  });
}
