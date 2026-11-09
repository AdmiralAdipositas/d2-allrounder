// Eigener Icon-Satz (Linien, 24er Raster) statt Emoji-Mix – ein Strich-Stil überall.
const P = {
  kalender: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  sonne: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  koffer: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V5h6v3M4 13h16"/>',
  trupp: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 15.5c3 0 6 1.8 6 4.5"/>',
  funke: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  post: '<path d="M4 8l8 6 8-6"/><rect x="4" y="6" width="16" height="13" rx="2"/>',
  wuerfel: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
  regler: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  lupe: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M11 8v6M8 11h6"/>',
  stern: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  kurve: '<path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M16 6h4v4"/>',
  buch: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>',
  pokal: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8"/>',
  ziel: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>',
  flamme: '<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3-1-3 0-6 0-8z"/>',
  schild: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  schwerter: '<path d="M5 3l9 9M3 5l2-2M14 12l2 2-2 2-2-2M19 3l-9 9M21 5l-2-2M10 12l-2 2 2 2 2-2M7 17l-3 3M17 17l3 3"/>',
  planet: '<circle cx="12" cy="12" r="6"/><path d="M3 15c3 2 15-1 18-5"/>',
  orden: '<circle cx="12" cy="15" r="5"/><path d="M8 3l4 7 4-7M10 15l1.5 1.5L14 13"/>',
  stapel: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/>',
  haken: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
  aehre: '<path d="M12 21V8"/><path d="M12 8c-3 0-4-3-4-5 3 0 4 2 4 5zM12 8c3 0 4-3 4-5-3 0-4 2-4 5zM12 13c-3 0-4-3-4-5 3 0 4 2 4 5zM12 13c3 0 4-3 4-5-3 0-4 2-4 5z"/>',
  kamera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
};
export const ikon = (n, k = '') => `<svg class="ikon-svg ${k}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

// Lebendige Mini-Vorschau der App (Landing + Willkommen): Tresor, Würfel, Raid-Läufer, Optimizer-Leisten.
export const vorschauKarten = (k = '') => `<div class="l-vorschau ${k}" aria-hidden="true">
    <div class="lv-karte lv-vault"><small>Vault</small><div class="lv-raster">${['mw exo', '', 'mw', 'el-a', '', 'mw el-s', 'exo', '', 'el-v', 'mw', '', 'el-a'].map((x) => `<i class="lv-k ${x}"></i>`).join('')}</div><span class="lv-such">is:dupe <em>perk:</em></span></div>
    <div class="lv-karte lv-zufall"><small>Randomizer</small><div class="lv-wuerfel">${ikon('wuerfel')}</div><b>Random loadout</b></div>
    <div class="lv-karte lv-raid"><small>Raid guide</small><div class="lv-platten"><i></i><i></i><i></i><i></i><span class="lv-laeufer"></span></div><b>Cataclysm</b></div>
    <div class="lv-karte lv-opt"><small>Optimizer</small>${[78, 52, 90, 64, 40, 70].map((w, n) => `<i class="lv-bar" style="--w:${w}%;--d:${n * 0.15}s"></i>`).join('')}</div>
  </div>`;

// ---------- Emoji → eigene Linien-Icons, automatisch überall (auch in später gerenderten Seiten) ----------
const MEHR = {
  rad: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.5"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7"/>',
  schloss: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  offen: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  pin: '<path d="M9 3h6l-1 6 3 3H7l3-3z"/><path d="M12 12v9"/>',
  punkt: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
  balken: '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>',
  pinsel: '<path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12c-2 2-3 5-3 8 3 0 6-1 8-3"/>',
  globus: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  speichern: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  muell: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  verbot: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  warn: '<path d="M12 3l10 17H2z"/><path d="M12 10v4M12 17v.5"/>',
  kette: '<path d="M10 14a4 4 0 0 1 0-5.6l2-2a4 4 0 0 1 5.6 5.6l-1 1"/><path d="M14 10a4 4 0 0 1 0 5.6l-2 2a4 4 0 0 1-5.6-5.6l1-1"/>',
  werkzeug: '<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 0-2-2z"/>',
  sanduhr: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>',
  notiz: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  uhr: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4"/>',
  ei: '<path d="M12 3c4 0 7 7 7 11a7 7 0 0 1-14 0c0-4 3-11 7-11z"/>',
  dokument: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  rucksack: '<path d="M7 8a5 5 0 0 1 10 0v12H7z"/><path d="M10 4h4M7 13h10M10 13v3h4v-3"/>',
  schaedel: '<path d="M5 11a7 7 0 0 1 14 0v4l-2 1v3H7v-3l-2-1z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>',
  klee: '<circle cx="9" cy="9" r="3"/><circle cx="15" cy="9" r="3"/><circle cx="12" cy="14" r="3"/><path d="M12 17v4"/>',
  megafon: '<path d="M4 10v4h3l8 4V6L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M3 15h18M8 5v4M16 5v4M8 15v4M16 15v4"/>',
  klemmbrett: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8 11h8M8 15h6"/>',
  fisch: '<path d="M3 12c4-5 10-5 14 0-4 5-10 5-14 0zM17 12l4-3v6z"/><circle cx="8" cy="11" r=".8" fill="currentColor"/>',
  schlange: '<path d="M4 18c4 0 4-4 8-4s4 4 8 4M6 8c0-2 2-3 4-3s3 2 3 3-1 3-3 3"/>',
  drache: '<path d="M4 18l5-7 4 3 7-9-3 8-5-2-4 7z"/>',
  adler: '<path d="M2 9c4 0 7 1 10 4 3-3 6-4 10-4-3 3-5 6-10 8C7 15 5 12 2 9z"/>',
  symbole: '<path d="M4 4h6v6H4zM14 4l3 6h-6zM4 14l6 6M10 14l-6 6"/><circle cx="17" cy="17" r="3"/>',
};
const KARTE = { '🎲': 'wuerfel', '🔥': 'flamme', '🛡': 'schild', '📸': 'kamera', '✨': 'funke', '🎉': 'funke', '🎡': 'rad', '🔒': 'schloss', '🔓': 'offen', '🧳': 'koffer', '⚙': 'zahnrad', '📌': 'pin', '👥': 'trupp', '⚔': 'schwerter', '📬': 'post', '📮': 'post', '🗓': 'kalender', '🟢': 'punkt', '📊': 'balken', '🎨': 'pinsel', '🔍': 'lupe', '🔎': 'lupe', '🌐': 'globus', '💾': 'speichern', '🗑': 'muell', '⛔': 'verbot', '⚠': 'warn', '⛓': 'kette', '🛠': 'werkzeug', '🎯': 'ziel', '☀': 'sonne', '⏳': 'sanduhr', '🪐': 'planet', '🌾': 'aehre', '⭐': 'stern', '📝': 'notiz', '🔗': 'kette', '⏱': 'uhr', '☑': 'haken', '🥚': 'ei', '🔣': 'symbole', '🏆': 'pokal', '📄': 'dokument', '🎒': 'rucksack', '🎚': 'regler', '📖': 'buch', '📈': 'kurve', '🔫': 'ziel', '☠': 'schaedel', '☘': 'klee', '📣': 'megafon', '🎬': 'film', '📋': 'klemmbrett', '🐟': 'fisch', '🐍': 'schlange', '🐉': 'drache', '🦅': 'adler', '🎖': 'orden', '📚': 'stapel', '🖼': 'dokument', '⚡': 'funke' };
Object.assign(P, MEHR);
const MUSTER = new RegExp(`(${Object.keys(KARTE).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\uFE0F?`, 'u');
const MUSTER_G = new RegExp(MUSTER.source, 'gu');
function ersetzeIn(knoten) {
  const w = document.createTreeWalker(knoten, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (MUSTER.test(n.nodeValue) && !n.parentElement?.closest('script,style,textarea,input,option,svg,title') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const liste = []; while (w.nextNode()) liste.push(w.currentNode);
  for (const t of liste) {
    const tmp = document.createElement('span');
    tmp.innerHTML = t.nodeValue.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`).replace(MUSTER_G, (m, e) => ikon(KARTE[e], 'emo'));
    t.replaceWith(...tmp.childNodes);
  }
}
// Auch Attribut-Texte (title) säubern, damit Tooltips keine Emojis zeigen.
export function starteEmojiErsatz(wurzel = document.body) {
  ersetzeIn(wurzel);
  let geplant = false;
  new MutationObserver(() => { if (geplant) return; geplant = true; requestAnimationFrame(() => { geplant = false; ersetzeIn(wurzel); }); }).observe(wurzel, { childList: true, subtree: true, characterData: true });
}
export const ohneEmoji = (s) => String(s).replace(MUSTER_G, '').replace(/\s{2,}/g, ' ').trim();
