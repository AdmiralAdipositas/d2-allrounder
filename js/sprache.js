// Sprachumschalter: übersetzt angezeigte Texte, ohne die App-Logik anzufassen (intern bleibt alles Englisch).
// Spieldaten (Namen, Perks, Beschreibungen) kommen aus Bungies eigenen Übersetzungen (data/lang, täglich gebaut),
// App-Texte gibt es auf Deutsch; andere Sprachen zeigen App-Texte vorerst auf Englisch.
// Standard: Sprache des Bungie-Kontos, sonst die des Geräts. Eigene Wahl wird pro Bungie-Konto gemerkt.

export const SPRACHEN = [
  ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'], ['pt-br', 'Português (BR)'],
  ['pl', 'Polski'], ['ru', 'Русский'], ['ja', '日本語'], ['ko', '한국어'], ['zh-chs', '简体中文'],
];
const UI_DE = {
  played: "gespielt", characters: "Charaktere",
  "Look": "Aussehen",
  "Colorful": "Bunt",
  "Calm grey, near-monochrome, like the in-game menus": "Ruhiges Grau, fast farblos, wie die Menüs im Spiel",
  "Violet surfaces and colored navigation (default)": "Violette Flächen und farbige Navigation (Standard)",
  "Welcome, Guardian": "Willkommen, Hüter",
  "Everything for your guardians in one place, on phone and PC.": "Alles für deine Hüter an einem Ort, auf Handy und PC.",
  "Your characters, stats and inventory. Drag items to move or equip them.": "Deine Charaktere, Stats und Inventar. Items ziehen zum Verschieben oder Anlegen.",
  "Every weapon you own, with god roll checks and clean-up help.": "Alle deine Waffen, mit God-Roll-Check und Aufräumhilfe.",
  "Armor by set and stats, duplicates and what can go.": "Rüstung nach Set und Stats, Duplikate und was weg kann.",
  "Your in-game loadouts plus your own, one click to equip.": "Deine Ingame-Loadouts und eigene, mit einem Klick angelegt.",
  "Finds the best armor combination for the stats you want.": "Findet die beste Rüstungskombination für deine Wunsch-Stats.",
  "Proven community builds, matched to what you own.": "Bewährte Community-Builds, abgeglichen mit deinem Inventar.",
  "Where things drop, perks, seals and collections.": "Wo was droppt, Perks, Siegel und Sammlungen.",
  "Animated guides for every raid and dungeon encounter.": "Animierte Guides für jeden Raid- und Dungeon-Encounter.",
  "Clears, fastest runs and your favorite weapons.": "Abschlüsse, schnellste Runs und deine Lieblingswaffen.",
  "Both can be changed anytime under your account (person icon).": "Beides kannst du jederzeit unter deinem Konto ändern (Personen-Symbol).",
  "Guardians": "Hüter",
  "Drag items here (or onto another guardian). Phone: hold an item, then drag.": "Items hierher ziehen (oder auf einen anderen Hüter). Handy: Item gedrückt halten, dann ziehen.",
  "Unofficial fan app. Not made by, affiliated with or endorsed by Bungie.": "Inoffizielle Fan-App. Nicht von Bungie erstellt, mit Bungie verbunden oder unterstützt.",
  "Destiny 2 content and images © Bungie, Inc.": "Inhalte und Bilder aus Destiny 2 © Bungie, Inc.",
  "Mostly built by Claude, Anthropic’s AI, together with Kevin (AdmiralAdipositas).": "Größtenteils gebaut von Claude, der KI von Anthropic, zusammen mit Kevin (AdmiralAdipositas).",
  "Let’s go": "Los geht’s",
  "Show welcome screen": "Willkommen erneut zeigen",
  "Unofficial fan app, not affiliated with Bungie. Destiny content © Bungie, Inc. Mostly built by Claude, Anthropic’s AI.": "Inoffizielle Fan-App, nicht mit Bungie verbunden. Destiny-Inhalte © Bungie, Inc. Größtenteils gebaut von Claude, der KI von Anthropic.",
  "· Unofficial fan app, not affiliated with Bungie. Destiny content © Bungie, Inc. · Mostly built by Claude (Anthropic).": "· Inoffizielle Fan-App, nicht mit Bungie verbunden. Destiny-Inhalte © Bungie, Inc. · Größtenteils gebaut von Claude (Anthropic).",
  Weapons: 'Waffen', Armor: 'Rüstung', Loadouts: 'Loadouts', Optimizer: 'Optimierer', 'Build Finder': 'Build-Finder', Stats: 'Statistik', Wiki: 'Wiki', 'Raid Guide': 'Raid-Guide',
  'This week': 'Diese Woche', Postmaster: 'Postmeister', Account: 'Konto', 'Squad check': 'Squad-Check', 'Side panel': 'Seitenpanel', 'Sign in': 'Anmelden', 'Sign out': 'Abmelden',
  'Sign in with Bungie': 'Mit Bungie anmelden', 'Sign in first.': 'Bitte zuerst anmelden.', 'Sign in with Bungie first.': 'Bitte zuerst mit Bungie anmelden.', Privacy: 'Datenschutz',
  'Your sign-in stays in this browser.': 'Deine Anmeldung bleibt in diesem Browser.', 'Reset app settings': 'App-Einstellungen zurücksetzen', '↻ Reload data from Bungie': '↻ Daten neu von Bungie laden',
  'Bungie profile ↗': 'Bungie-Profil ↗', App: 'App', Language: 'Sprache', 'Hold Shift to pin': 'Shift halten zum Anheften', 'Click for links · Shift to pin': 'Klick für Links · Shift zum Anheften',
  Equip: 'Anlegen', Transfer: 'Holen', 'To Vault': 'In den Tresor', 'In vault': 'Im Tresor', Here: 'Hier', Equipped: 'Angelegt', 'Pull all': 'Alle abholen', '📬 Pull from Postmaster': '📬 Beim Postmeister abholen',
  Apply: 'Übernehmen', Save: 'Speichern', Cancel: 'Abbrechen', Reset: 'Zurücksetzen', Add: 'Hinzufügen', None: 'Keine', Name: 'Name', Icon: 'Symbol', Color: 'Farbe', Share: 'Teilen', 'Clear all': 'Alle entfernen',
  'Vault space': 'Tresorplatz', 'Sort': 'Sortieren', 'By type': 'Nach Typ', 'By set': 'Nach Set', 'Clean-up rules': 'Aufräum-Regeln', 'No duplicates to clean up.': 'Keine Duplikate zum Aufräumen.',
  'Nothing matches these filters.': 'Nichts passt zu diesen Filtern.', Location: 'Ort', Element: 'Element', Ammo: 'Munition', Champion: 'Champion', 'Weapon type': 'Waffentyp', Frame: 'Rahmen', Perks: 'Perks',
  Source: 'Quelle', Rarity: 'Seltenheit', 'Armor set': 'Rüstungsset', Copies: 'Kopien', 'God rolls': 'God Rolls', 'Clean-up': 'Aufräumen', Vault: 'Tresor', Duplicates: 'Duplikate', Single: 'Einzeln',
  'Power / total': 'Power / Summe', 'Best rolls first': 'Beste Rolls zuerst', 'Newest first': 'Neueste zuerst',
  'Best combinations': 'Beste Kombinationen', 'How are these picked?': 'Wie wird ausgewählt?', 'Rank by': 'Sortieren nach', 'Stat mods': 'Stat-Mods', Pieces: 'Teile', 'Second set': 'Zweites Set',
  'Highest total': 'Höchste Summe', 'My stats first': 'Meine Stats zuerst', 'Most set bonuses': 'Meiste Set-Boni', 'Fewest transfers': 'Wenigste Verschiebungen', 'No exotic': 'Kein Exotic',
  'Best exotic (any)': 'Bestes Exotic (beliebig)', 'Compare exotics (1 card each)': 'Exotics vergleichen (je eine Karte)', 'Specific exotic': 'Bestimmtes Exotic',
  'Set bonus': 'Set-Bonus', Aspects: 'Aspekte', Fragments: 'Fragmente', Subclass: 'Unterklasse', 'Armor mods': 'Rüstungsmods', 'Super & abilities': 'Super & Fähigkeiten', 'Stat focus': 'Stat-Fokus',
  'Where it drops': 'Wo es droppt', 'Possible perks': 'Mögliche Perks', 'Loot by encounter': 'Loot pro Encounter', 'Loot table': 'Loot-Tabelle', 'Full pool': 'Kompletter Pool', Feats: 'Feats',
  Exotics: 'Exotics', 'Armor sets': 'Rüstungssets', 'Raids & dungeons': 'Raids & Dungeons', Destinations: 'Orte', Seals: 'Siegel', 'Raid challenges': 'Raid-Challenges', Collections: 'Sammlungen',
  'Farm planner': 'Farm-Planer', Start: 'Start', Results: 'Ergebnisse', 'Current seals': 'Aktuelle Siegel', 'Legacy seals': 'Alte Siegel', 'Not found.': 'Nicht gefunden.',
  'No confirmed source.': 'Keine bestätigte Quelle.', 'Nothing found. Try another name.': 'Nichts gefunden. Versuch einen anderen Namen.', 'Lost Sectors open right now:': 'Gerade offene Lost Sectors:',
  Raids: 'Raids', Dungeons: 'Dungeons', 'Kills by weapon type': 'Kills nach Waffentyp', 'Top weapons': 'Top-Waffen', Clears: 'Abschlüsse', Fastest: 'Schnellste', Time: 'Zeit', Total: 'Summe',
  'Guardian Rank': 'Hüter-Rang', Featured: 'Hervorgehoben', Active: 'Aktiv', 'Daily reset in': 'Täglicher Reset in', 'Coming up · next 4 weeks': 'Demnächst · nächste 4 Wochen',
  'No in-game loadouts on this character.': 'Keine Ingame-Loadouts auf diesem Charakter.', 'Community · tested': 'Community · getestet', 'Idea · auto-built': 'Idee · automatisch gebaut',
  'Not in your inventory.': 'Nicht in deinem Inventar.', 'In the wiki': 'Im Wiki', 'Where to farm': 'Wo farmen', 'Set in the wiki': 'Set im Wiki', 'Raid guide': 'Raid-Guide', 'Loot & encounters': 'Loot & Encounter',
  'Activity modifier': 'Aktivitäts-Modifikator', 'Search the wiki': 'Im Wiki suchen', 'Can go': 'Kann weg', Keeps: 'Bleibt', 'Dismantle suggestion': 'Zerlege-Vorschlag', 'Infusion fuel': 'Infusions-Futter',
  'In a loadout': 'In einem Loadout', Kinetic: 'Kinetisch', Energy: 'Energie', Power: 'Power', Helmet: 'Helm', Arms: 'Arme', Chest: 'Brust', Legs: 'Beine', 'Class Item': 'Klassengegenstand',
};
const PLATZ = { placeholder: 1, title: 1, 'aria-label': 1 };

let karte = null;
export let sprache = 'en';
const schluessel = (k) => `d2a.lang.${k?.membershipId || 'gast'}`;
export function gewaehlt(konto) {
  try { const s = localStorage.getItem(schluessel(konto)); if (s) return s; } catch {}
  const roh = (konto?.locale || navigator.language || 'en').toLowerCase();
  if (roh.startsWith('pt')) return 'pt-br';
  if (roh.startsWith('zh')) return 'zh-chs';
  return SPRACHEN.find(([c]) => roh.startsWith(c))?.[0] || 'en';
}
export function waehle(konto, code) { try { localStorage.setItem(schluessel(konto), code); } catch {} location.reload(); }

const tr = (t) => {
  const roh = t.trim(); if (!roh) return null;
  const neu = karte.get(roh); if (!neu || neu === roh) return null;
  return t.replace(roh, neu);
};
function uebersetze(wurzel) {
  if (wurzel.nodeType === 3) { const n = tr(wurzel.nodeValue); if (n) wurzel.nodeValue = n; return; }
  if (wurzel.nodeType !== 1 || wurzel.closest?.('script,style,textarea,input,[data-roh]')) return;
  const w = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.currentNode; n; n = w.nextNode()) {
    if (n.nodeType === 3) { if (n.parentElement?.closest('[data-roh],script,style')) continue; const t = tr(n.nodeValue); if (t) n.nodeValue = t; continue; }
    if (/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName) || n.closest('[data-roh]')) continue;
    for (const a of Object.keys(PLATZ)) { const v = n.getAttribute?.(a); if (v) { const t = tr(v); if (t) n.setAttribute(a, t); } }
  }
}

// Startet die Übersetzung für das Konto. Englisch = nichts tun.
let gestartet = false;
export async function starte(konto) {
  if (gestartet) return; gestartet = true;
  sprache = gewaehlt(konto);
  document.documentElement.lang = sprache;
  if (sprache === 'en') return;
  karte = new Map();
  try {
    const [k, v] = await Promise.all([fetch('data/lang/keys.json').then((r) => r.json()), fetch(`data/lang/${sprache}.json`).then((r) => r.json())]);
    k.keys.forEach((en, i) => { if (v[i]) karte.set(en, v[i]); });
  } catch { /* Spieldaten-Übersetzung noch nicht gebaut: nur App-Texte */ }
  if (sprache === 'de') for (const [en, de] of Object.entries(UI_DE)) karte.set(en, de);
  if (!karte.size) return;
  uebersetze(document.body);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') { const t = tr(m.target.nodeValue); if (t) m.target.nodeValue = t; continue; }
      m.addedNodes.forEach(uebersetze);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
