// Sprachumschalter: übersetzt angezeigte Texte, ohne die App-Logik anzufassen (intern bleibt alles Englisch).
// Spieldaten (Namen, Perks, Beschreibungen) kommen aus Bungies eigenen Übersetzungen (data/lang, täglich gebaut),
// App-Texte gibt es auf Deutsch; andere Sprachen zeigen App-Texte vorerst auf Englisch.
// Standard: Sprache des Bungie-Kontos, sonst die des Geräts. Eigene Wahl wird pro Bungie-Konto gemerkt.

export const SPRACHEN = [
  ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'], ['pt-br', 'Português (BR)'],
  ['pl', 'Polski'], ['ru', 'Русский'], ['ja', '日本語'], ['ko', '한국어'], ['zh-chs', '简体中文'],
];
const UI_DE = {
  'Gear': 'Ausrüstung', 'Builds': 'Builds', 'More': 'Mehr', 'Settings': 'Einstellungen', 'Simple / Detailed': 'Einfach / Ausführlich', 'Look around first – no account needed': 'Erst umschauen – ohne Konto', 'Animated encounters': 'Animierte Encounter', 'Drops, perks, seals': 'Drops, Perks, Siegel', 'Community builds': 'Community-Builds',
  'View': 'Ansicht', 'What’s new': 'Neuigkeiten', 'Data & app': 'Daten & App',
  'Today': 'Heute', 'Featured this week': 'Diese Woche featured', 'Daily challenge': 'Tagesaufgabe', 'Xûr has · not in your vault': 'Xûr hat · fehlt dir', 'Randomizer': 'Randomizer', 'Tap → raid guide': 'Tippen → Raid Guide', '🎯 Daily challenge': '🎯 Tagesaufgabe', 'Mark done': 'Erledigt', '✓ Done': '✓ Geschafft', '🎲 Randomizer': '🎲 Randomizer', '🧳 Xûr has · not in your vault': '🧳 Xûr hat · fehlt dir',
  'Primaries only': 'Nur Primärwaffen', 'No special ammo – heavy is allowed.': 'Keine Spezialmunition – schwere ist erlaubt.', 'No exotic armor': 'Keine exotische Rüstung', 'Legendary armor only, your build has to carry.': 'Nur legendäre Rüstung – dein Build muss tragen.', 'Melee day': 'Nahkampf-Tag', 'Sword or glaive as heavy, melee build.': 'Schwert oder Gleve als schwere Waffe, Nahkampf-Build.', 'Dust it off and run it all day.': 'Abstauben und den ganzen Tag spielen.', 'Let the dice decide': 'Der Würfel entscheidet', 'Spin the randomizer and play what it says.': 'Randomizer drehen und spielen, was rauskommt.', 'Subclass and all weapons in one element.': 'Unterklasse und alle Waffen in einem Element.', 'Solar only': 'Nur Solar', 'Arc only': 'Nur Arkus', 'Void only': 'Nur Leere', 'Stasis only': 'Nur Stasis', 'Strand only': 'Nur Strang', 'Prismatic only': 'Nur Prismatisch',
  'Home': 'Start', 'Welcome back': 'Willkommen zurück', 'This week': 'Diese Woche', 'Fireteam': 'Einsatztrupp', 'New': 'Neu', 'Up to date': 'Alles gesehen', 'builds & features': 'Builds & Funktionen', 'back on Friday': 'ab Freitag wieder da', 'Solo': 'Solo', 'Guardians, friends & groups': 'Hüter, Freunde & Gruppen', '⚠ almost full': '⚠ fast voll', 'Simple view': 'Einfache Ansicht', 'Detailed view': 'Ausführliche Ansicht', 'View: Simple': 'Ansicht: Einfach', 'View: Detailed': 'Ansicht: Ausführlich', 'Simple view: only the key cards, numbers and filters.': 'Einfache Ansicht: nur die wichtigsten Karten, Zahlen und Filter.', 'Detailed view: all cards, numbers, filters and options.': 'Ausführliche Ansicht: alle Karten, Zahlen, Filter und Optionen.', '⚙ Settings': '⚙ Einstellungen', '🎨 Look': '🎨 Aussehen', '🔍 Size': '🔍 Größe', '🌐 Language': '🌐 Sprache', '✨ New': '✨ Neu', '💾 Data': '💾 Daten', 'Simple': 'Einfach', 'Detailed': 'Ausführlich', 'Calm pages, the key numbers first': 'Ruhige Seiten, das Wichtigste zuerst', 'Everything open, all filters': 'Alles offen, alle Filter', 'Settings & account': 'Einstellungen & Konto',
  'Guardians': 'Hüter', '🟢 Fireteam now': '🟢 Einsatztrupp jetzt', '👥 Friends': '👥 Freunde', '★ Favorites': '★ Favoriten', '⚔ Played with': '⚔ Gespielt mit', '＋ Group': '＋ Gruppe', '📊 Stats': '📊 Stats', '⇄ Compare with me': '⇄ Mit mir vergleichen', '🛡 Squad check': '🛡 Squad-Check', '＋ Add to…': '＋ Hinzufügen zu …', 'friend': 'Freund', 'online': 'online', 'in your fireteam': 'in deinem Trupp', 'Delete group': 'Gruppe löschen', '★ Favorites ': '★ Favoriten',
  '⟳ Track my fireteam now': '⟳ Meinen Einsatztrupp jetzt tracken', 'automatic (checks every minute)': 'automatisch (prüft jede Minute)', 'Checking fireteam…': 'Prüfe Einsatztrupp…', 'Not in a fireteam right now': 'Gerade in keinem Einsatztrupp', 'Profile is private – only account stats.': 'Profil ist privat – nur Konto-Stats.',
  '⬇ Backup settings & marks': '⬇ Einstellungen & Markierungen sichern', '⬆ Restore backup': '⬆ Sicherung laden', '🔥 Mark fodder': '🔥 Futter markieren', '🔥 Fodder': '🔥 Futter',
  'Weapons & armor': 'Waffen & Rüstung',
  "Check before equipping": "Vor dem Anlegen prüfen",
  "Nothing happens until you confirm. Untick what should stay as it is.": "Es passiert nichts, bis du bestätigst. Nimm den Haken weg bei allem, was bleiben soll.",
  "Equip selected": "Ausgewähltes anlegen",
  "Cancel": "Abbrechen",
  "already equipped": "schon angelegt",
  "Artifact perks": "Artefakt-Perks",
  "🎲 Randomizer & wheel": "🎲 Zufall & Glücksrad",
  "🎲 Loadout randomizer": "🎲 Loadout-Zufall",
  "🎡 Lucky wheel": "🎡 Glücksrad",
  "Allow exotic weapon": "Exotic-Waffe erlaubt",
  "Allow exotic armor": "Exotic-Rüstung erlaubt",
  "Always include an exotic weapon": "Immer eine Exotic-Waffe",
  "Random subclass": "Zufällige Subclass",
  "🎲 Roll": "🎲 Würfeln",
  "Reroll": "Neu würfeln",
  "Equip all on this guardian": "Alles an diesem Hüter anlegen",
  "Only uses items you own. Respects the one-exotic-weapon / one-exotic-armor rule.": "Nimmt nur Items, die du besitzt. Hält die Regel ein: eine Exotic-Waffe, eine Exotic-Rüstung.",
  "🎡 Spin": "🎡 Drehen",
  "Fun challenges": "Spaß-Challenges",
  "Subclasses": "Subclasses",
  "Weapon types": "Waffentypen",
  "Your exotic weapons": "Deine Exotic-Waffen",
  "My own list": "Eigene Liste",
  "One entry per line": "Ein Eintrag pro Zeile",
  "Pick at least one entry.": "Wähl mindestens einen Eintrag.",
  "Nothing fits these settings.": "Nichts passt zu diesen Einstellungen.",
  "Guardian": "Hüter",
  "List": "Liste",
  "Inventory": "Inventar",
  "General": "Allgemein",
  "Weapon list & filters": "Waffenliste & Filter",
  "Armor list & stats": "Rüstungsliste & Stats",
  "Highlight: name or type…": "Hervorheben: Name oder Typ …",
  "Nothing of this kind in the vault.": "Nichts davon im Tresor.",
  "Drag any weapon or armor piece onto another guardian, the vault, or a guardian's equipped slot to move or equip it. Phone: hold an item, then drag; the narrow guardian strips open under your finger. Click for details.": "Zieh eine Waffe oder Rüstung auf einen anderen Hüter, den Tresor oder ein angelegtes Feld, um sie zu verschieben oder anzulegen. Handy: Item gedrückt halten, dann ziehen; die schmalen Hüter-Streifen klappen unter dem Finger auf. Klick für Details.",
  "App size": "App-Größe",
  "Also works: pinch with two fingers, or Ctrl + mouse wheel / Ctrl + plus.": "Geht auch: mit zwei Fingern ziehen oder Strg + Mausrad / Strg + Plus.",
  "New game data is available. Reload the page to use it.": "Neue Spieldaten sind da. Lade die Seite neu, um sie zu nutzen.",
  "Checklists": "Checklisten",
  "Only missing": "Nur fehlende",
  "↻ Refresh": "↻ Aktualisieren",
  "← Checklists": "← Checklisten",
  "Location unknown": "Ort unbekannt",
  "Progress could not be read": "Fortschritt nicht lesbar",
  "Dungeon The Shattered Throne": "Dungeon The Shattered Throne",
  "Ascendant Challenge (rotates weekly)": "Aufgestiegene Herausforderung (wechselt wöchentlich)",
  "This list counts per character (the one selected on the Guardians page).": "Diese Liste zählt pro Charakter (der auf der Hüter-Seite gewählte).",
  "All found. 🎉": "Alles gefunden. 🎉",
  "My shader": "Mein Shader",
  "Pick one of your shaders, the whole app takes on all its colors": "Wähl einen deiner Shader, die ganze App übernimmt alle seine Farben",
  "Search your shaders…": "Deine Shader durchsuchen …",
  "Loading your shaders…": "Lade deine Shader …",
  "Tap one: the whole app takes on its colors.": "Tippe einen an: Die ganze App übernimmt seine Farben.",
  "Your collection could not be read, showing all shaders.": "Deine Sammlung ließ sich nicht lesen, es werden alle Shader gezeigt.",
  "By source": "Nach Quelle",
  "By weapon type": "Nach Waffentyp",
  "All": "Alle",
  "Base stats": "Basis-Stats",
  "Without perks, mods or masterwork, as Bungie lists them.": "Ohne Perks, Mods oder Meisterwerk, so wie Bungie sie listet.",
  "Frame": "Rahmen",
  "Damage type": "Schadensart",
  "Ammo": "Munition",
  "Owned": "Besitz",
  "In my inventory": "In meinem Inventar",
  "Not owned": "Nicht im Besitz",
  "Reset filters": "Filter zurücksetzen",
  "Back": "Zurück",
  "No weapon matches these filters.": "Keine Waffe passt zu diesen Filtern.",
  "Primary": "Primär",
  "Special": "Spezial",
  "Heavy": "Schwer",
  "Exotic mission “Dual Destiny” in the Pale Heart (The Final Shape), fireteam of exactly two. Your first one only comes from there; replays and the weekly challenge give more. Also: Pale Heart Overthrow chests and Xûr.": "Exotic-Mission „Dual Destiny“ im Bleichen Herz (The Final Shape), Einsatztrupp aus genau zwei Hütern. Das erste gibt es nur dort; Wiederholungen und die Wochen-Challenge geben weitere. Außerdem: Overthrow-Truhen im Bleichen Herz und Xûr.",
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
// Angezeigter Name in der gewählten Sprache (für Sortierung und Suche).
export function anzeige(t) { return (karte && karte.get(String(t || '').trim())) || t; }
export function vergleiche(a, b) { return String(anzeige(a)).localeCompare(String(anzeige(b)), sprache); }
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
