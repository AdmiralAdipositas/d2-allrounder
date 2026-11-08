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
