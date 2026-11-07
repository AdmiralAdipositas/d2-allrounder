// Raid-Symbole und Callouts (DE/EN) als Übersicht. Bilder der Symbole zeigen die verlinkten Quellen;
// die App nennt Namen, Callouts und Regeln, Formen von Salvation's Edge sind schlichte Geometrie.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const LW_VAULT = [
  ['🐟', 'Fish', [['Fish Left', 'Fisch links'], ['69 Fish', '69-Fisch'], ['Down Fish', 'Fisch unten'], ['Up Fish', 'Fisch oben']]],
  ['🐍', 'Snake', [['Infinity Snake', 'Unendlich-Schlange'], ['8 Snake', '8-Schlange'], ['Down Snake', 'Schlange unten'], ['Cloud Snake', 'Wolken-Schlange']]],
  ['🐉', 'Dragon', [['Dragon Fire Left', 'Drache Feuer links'], ['Dragon Fire Right', 'Drache Feuer rechts'], ['Spear Dragon (aka "Stripper Dragon")', 'Speer-Drache'], ['Dead Dragon', 'Toter Drache']]],
  ['🦅', 'Bird', [['Diving Bird', 'Stürzender Vogel'], ['Flying Bird Left', 'Fliegender Vogel links'], ['Bird on Branch', 'Vogel auf Ast'], ['Standing Bird', 'Stehender Vogel']]],
];
const VOW = ['Activate', 'Ascendant Plane (Throne World)', 'Black Garden', 'Black Heart', 'Darkness', 'Drink', 'Earth', 'Enter', 'Fleet', 'Give', 'Grieve', 'Guardian', 'Hive', 'Kill', 'Light', 'Love', 'Pyramid', 'Redacted', 'Remember', 'Savathûn', 'Scorn', 'Stop', 'Tower', 'Traveler', 'Witness', 'Worm', 'Worship'];
const VOW_DE = { Activate: 'Aktivieren', 'Ascendant Plane (Throne World)': 'Aszendentenebene (Thronwelt)', 'Black Garden': 'Schwarzer Garten', 'Black Heart': 'Schwarzes Herz', Darkness: 'Dunkelheit', Drink: 'Trinken', Earth: 'Erde', Enter: 'Eintreten', Fleet: 'Flotte', Give: 'Geben', Grieve: 'Trauern', Guardian: 'Hüter', Hive: 'Schar', Kill: 'Töten', Light: 'Licht', Love: 'Liebe', Pyramid: 'Pyramide', Redacted: 'Geschwärzt', Remember: 'Erinnern', 'Savathûn': 'Savathûn', Scorn: 'Verachtung', Stop: 'Stopp', Tower: 'Turm', Traveler: 'Reisender', Witness: 'Zeuge', Worm: 'Wurm', Worship: 'Anbeten' };

// Salvation's Edge (Verity): zwei 2D-Formen ergeben eine 3D-Form.
const FORM = { circle: '<circle cx="16" cy="16" r="11"/>', square: '<rect x="5" y="5" width="22" height="22"/>', triangle: '<path d="M16 4 L28 27 H4 Z"/>' };
const svg = (k) => `<svg viewBox="0 0 32 32" class="form">${FORM[k]}</svg>`;
const SE = [
  ['circle', 'circle', 'Sphere', 'Kugel'], ['square', 'square', 'Cube', 'Würfel'], ['triangle', 'triangle', 'Pyramid', 'Pyramide'],
  ['circle', 'square', 'Cylinder', 'Zylinder'], ['circle', 'triangle', 'Cone', 'Kegel'], ['square', 'triangle', 'Prism', 'Prisma'],
];

export function zeigeSymbole(el) {
  el.innerHTML = `<div class="sym">
  <section class="karte"><h2>Last Wish · The Vault</h2>
    <p class="leer">Each screen (Rock, Tree, Entrance) shows three symbols. Call out the <b>middle</b> one. If its match sits on the <b>right</b> → Antumbra cleanse, on the <b>left</b> → Penumbra. Callouts below are the community names.</p>
    <div class="symgrid">${LW_VAULT.map(([ic, fam, l]) => `<div class="symfam"><h3>${ic} ${fam}</h3>${l.map(([en, de]) => `<div class="symz"><b>${esc(en)}</b><span>${esc(de)}</span></div>`).join('')}</div>`).join('')}</div>
    <p class="leer klein">Symbol pictures: <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=2726215607" target="_blank" rel="noopener">Kav's Last Wish guide (Steam) ↗</a> · <a href="https://assistcity.gitbook.io/destiny/raid-guides/last-wish/encounters/the-vault" target="_blank" rel="noopener">Assist City: The Vault ↗</a></p></section>

  <section class="karte"><h2>Vow of the Disciple · 27 symbols</h2>
    <p class="leer">Official names used as callouts in Acquisition, Caretaker and Exhibition. German is a help for the voice chat, the in-game names are English.</p>
    <table class="symtab"><thead><tr><th>English (call)</th><th>Deutsch</th></tr></thead><tbody>${VOW.map((n) => `<tr><td><b>${esc(n)}</b></td><td>${esc(VOW_DE[n])}</td></tr>`).join('')}</tbody></table>
    <p class="leer klein">Symbol pictures: <a href="https://sportskeeda.com/esports/all-vow-disciple-raid-symbol-callouts-destiny-2" target="_blank" rel="noopener">Sportskeeda ↗</a> · <a href="https://primagames.com/tips/all-destiny-2-vow-of-the-disciple-symbols-and-callouts" target="_blank" rel="noopener">Prima Games ↗</a> · <a href="https://progameguides.com/destiny/vow-of-the-disciple-raid-in-destiny-2-symbols-and-callouts/" target="_blank" rel="noopener">Pro Game Guides ↗</a></p></section>

  <section class="karte"><h2>Salvation's Edge · Verity shapes</h2>
    <p class="leer">Two 2D shapes held by a statue make one 3D shape. Callouts in both languages.</p>
    <table class="symtab"><thead><tr><th>2D + 2D</th><th>3D (EN)</th><th>3D (DE)</th></tr></thead><tbody>${SE.map(([a, b, en, de]) => `<tr><td>${svg(a)} + ${svg(b)}</td><td><b>${en}</b></td><td>${de}</td></tr>`).join('')}</tbody></table>
    <p class="leer klein">2D: circle (Kreis), square (Quadrat), triangle (Dreieck).</p></section>
  </div>`;
}
