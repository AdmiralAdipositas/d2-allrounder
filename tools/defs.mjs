// Baut aus Bungies Spieldaten eine kompakte Datei (data/defs.json) für die App.
// Läuft täglich als GitHub Action. Der API-Schlüssel kommt aus js/config.js (öffentlich, wie bei jeder Browser-App).
import fs from 'node:fs';

const config = fs.readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const apiKey = process.env.BUNGIE_API_KEY || (config.match(/apiKey:\s*'([^']*)'/) || [])[1];
if (!apiKey) { console.log('No API key yet. Fill in js/config.js.'); process.exit(0); }
const BASIS = 'https://www.bungie.net';
const holen = async (pfad) => { const r = await fetch(BASIS + pfad, { headers: { 'X-API-Key': apiKey } }); if (!r.ok) throw new Error(`${pfad}: ${r.status}`); return r.json(); };

const manifest = (await holen('/Platform/Destiny2/Manifest/')).Response;
const pfade = manifest.jsonWorldComponentContentPaths.en;
const alt = fs.existsSync('data/defs.json') ? JSON.parse(fs.readFileSync('data/defs.json', 'utf8')) : null;
if (alt?.version === manifest.version && alt?.schema === 19) { console.log('Game data unchanged.'); process.exit(0); }

const [items, sandbox, sammlung, stats, sets, breaker, schaden, aktivitaeten, typen, modifier, ziele, loNamen, loIcons, loFarben, knoten, records, ziele2, statGruppen, checklisten] = await Promise.all([
  'DestinyInventoryItemDefinition', 'DestinySandboxPerkDefinition', 'DestinyCollectibleDefinition', 'DestinyStatDefinition',
  'DestinyEquipableItemSetDefinition', 'DestinyBreakerTypeDefinition', 'DestinyDamageTypeDefinition',
  'DestinyActivityDefinition', 'DestinyActivityTypeDefinition', 'DestinyActivityModifierDefinition', 'DestinyObjectiveDefinition',
  'DestinyLoadoutNameDefinition', 'DestinyLoadoutIconDefinition', 'DestinyLoadoutColorDefinition',
  'DestinyPresentationNodeDefinition', 'DestinyRecordDefinition', 'DestinyDestinationDefinition', 'DestinyStatGroupDefinition', 'DestinyChecklistDefinition',
].map((n) => (pfade[n] ? holen(pfade[n]) : {})));

const text = (item) => item.displayProperties?.description || (item.perks || []).map((p) => sandbox[p.perkHash]?.displayProperties?.description).find(Boolean) || '';
const aus = { schema: 19, soz: {}, wtyp: {}, cl: {}, seal: {}, rec: {}, lo: { n: {}, i: {}, f: {} }, akt: {}, mod: {}, ziel: {}, version: manifest.version, erstellt: new Date().toISOString(), items: {}, stats: {}, sets: {}, breaker: {}, schaden: {} };
for (const [hash, it] of Object.entries(items)) {
  const n = it.displayProperties?.name;
  // Nur, was die App braucht: Waffen, Rüstung, Subclasses, Plugs, Artefakte.
  // Dazu: Belohnungs-Platzhalter mit Stufe ("Gear Tier 3"), Engramme und Währungen für Händler.
  const extra = /Tier \d|Engram|Currency|Material/.test(it.itemTypeDisplayName || '') || it.itemType === 8 || [800069450].includes(Number(hash));
  if (!n || ![2, 3, 16, 19].includes(it.itemType) && it.inventory?.bucketTypeHash !== 1506418338 && ![4023194814, 2025709351, 284967655, 4274335291].includes(it.inventory?.bucketTypeHash) && !extra) continue;
  const e = { n, i: it.displayProperties.icon || '', t: it.itemType, q: it.inventory?.tierType || 0, c: it.classType ?? 3, b: it.inventory?.bucketTypeHash || 0, k: it.itemTypeDisplayName || '' };
  if (it.itemType === 3) { e.a = it.equippingBlock?.ammoType || 0; e.d0 = it.defaultDamageType || 0; e.qu = sammlung[it.collectibleHash]?.sourceString || ''; e.br = it.breakerType || 0; }
  // Wiki-Details: Basis-Stats (wie im Spiel angezeigt, Reihenfolge der Stat-Gruppe), Flavor-Text.
  if (it.itemType === 3 && e.q >= 5) {
    const sichtbar = (statGruppen[it.stats?.statGroupHash]?.scaledStats || []).map((x) => x.statHash);
    const werte = it.stats?.stats || {};
    const ws = [...sichtbar, 4284893193, 3871231066, 2961396640, 447667954, 1931675084].filter((x, i, l) => l.indexOf(x) === i && werte[x]?.value).map((x) => [x, werte[x].value]);
    if (ws.length) e.ws = ws;
    if (it.flavorText) e.fl = it.flavorText;
  }
  // Frame (intrinsischer Perk) für die Filter im Wiki.
  if (it.itemType === 3 && e.q >= 5) for (const se of it.sockets?.socketEntries || []) { const pl = items[se.singleInitialItemHash]; if (/intrinsics/.test(pl?.plug?.plugCategoryIdentifier || '') && pl?.displayProperties?.name) { e.fr = pl.displayProperties.name; break; } }
  if (it.itemType === 2) e.e = it.equippingBlock?.equipableItemSetHash || 0;
  // Exotics: Name und Text des Exotic-Perks (für Build-Ideen und Tooltips).
  if (e.q === 6 && [2, 3].includes(it.itemType)) {
    for (const se of it.sockets?.socketEntries || []) {
      const pl = items[se.singleInitialItemHash];
      const pc = pl?.plug?.plugCategoryIdentifier || '';
      if (pl?.displayProperties?.name && /intrinsics/.test(pc) && !/Frame$/.test(pl.displayProperties.name)) { e.xp = pl.displayProperties.name; e.xd = text(pl); break; }
    }
  }
  if (it.itemType === 19) {
    e.pc = it.plug?.plugCategoryIdentifier || '';
    e.d = text(it);
    const st = (it.investmentStats || []).filter((v) => v.value).map((v) => [v.statTypeHash, v.value]);
    if (st.length) e.s = st;
    // Aspekte: wie viele Fragment-Plätze sie öffnen (für Loadouts, die keine Socket-Freigabe mitliefern).
    const cap = it.plug?.energyCapacity?.capacityValue; if (cap && /aspects|totems|trinkets/.test(e.pc)) e.ec = cap;
  }
  // Shader: Sammlungs-Eintrag, damit die App die eigenen Shader findet (Aussehen „Mein Shader“).
  if (e.pc === 'shader' && it.collectibleHash) e.co = it.collectibleHash;
  if (it.iconWatermark) e.w = it.iconWatermark;
  aus.items[hash] = e;
}
for (const [h, s] of Object.entries(stats)) if (s.displayProperties?.name) aus.stats[h] = { n: s.displayProperties.name, i: s.displayProperties.icon || '' };
for (const [h, s] of Object.entries(sets)) aus.sets[h] = { n: s.displayProperties?.name || '', p: (s.setPerks || []).map((p) => ({ c: p.requiredSetCount, n: sandbox[p.sandboxPerkHash]?.displayProperties?.name || '', d: sandbox[p.sandboxPerkHash]?.displayProperties?.description || '', i: sandbox[p.sandboxPerkHash]?.displayProperties?.icon || '' })) };
for (const b of Object.values(breaker)) aus.breaker[b.enumValue] = { n: b.displayProperties?.name || '', i: b.displayProperties?.icon || '' };
for (const d of Object.values(schaden)) aus.schaden[d.enumValue] = { n: d.displayProperties?.name || '', i: d.displayProperties?.icon || '', f: d.color ? `rgb(${d.color.red},${d.color.green},${d.color.blue})` : '' };
// Aktivitäten für "This week": Raids, Dungeons und Portal mit Challenges und Modifiern.
const GRUPPE = { Raid: 'Raids', Dungeon: 'Dungeons', Nightfall: 'Portal', 'Solo Ops': 'Portal', 'Vanguard Op': 'Portal', 'Fireteam Ops': 'Portal', 'Pinnacle Ops': 'Portal', 'Lost Sector': 'Lost Sectors' };
for (const [h, a] of Object.entries(aktivitaeten)) {
  // Soziale Räume (Turm, H.E.L.M., Farm …) für „Wohin die Zeit ging“.
  if (/^(The )?Tower\b|H\.E\.L\.M|^The Farm$|^Eternity$|Hall of Champions|^The Pale Heart: Landing|^Social/i.test(a.displayProperties?.name || '')) { aus.soz[h] = a.displayProperties?.name || ziele2[a.destinationHash]?.displayProperties?.name || 'Social space'; continue; }
  const istLS = a.directActivityModeType === 87 || (a.activityModeTypes || []).includes(87) || /lost sector/i.test(typen[a.activityTypeHash]?.displayProperties?.name || '');
  const g = istLS ? 'Lost Sectors' : GRUPPE[typen[a.activityTypeHash]?.displayProperties?.name] || ({ 4: 'Raids', 82: 'Dungeons' })[a.directActivityModeType];
  if (!g || !a.displayProperties?.name) continue;
  aus.akt[h] = { n: a.displayProperties.name, i: a.displayProperties.icon || a.pgcrImage || '', d: a.displayProperties.description || '', g, o: ziele2[a.destinationHash]?.displayProperties?.name || '' };
  // Echte Modifier dieser Aktivität (für das Glücksrad).
  { const m = [...new Set((a.modifiers || []).map((x) => x.activityModifierHash).filter((x) => modifier[x]?.displayProperties?.name && modifier[x].displayProperties.icon))]; if (m.length) aus.akt[h].m = m.slice(0, 40); }
  for (const c of a.challenges || []) {
    const z = ziele[c.objectiveHash];
    if (z) aus.ziel[c.objectiveHash] = { n: z.displayProperties?.name || z.progressDescription || '', d: z.displayProperties?.description || '' };
  }
}
for (const [h, m] of Object.entries(modifier)) if (m.displayProperties?.name && m.displayProperties.icon) aus.mod[h] = { n: m.displayProperties.name, i: m.displayProperties.icon, d: m.displayProperties.description || '' };
for (const [h, x] of Object.entries(loNamen)) aus.lo.n[h] = x.name || '';
for (const [h, x] of Object.entries(loIcons)) aus.lo.i[h] = x.iconImagePath || '';
for (const [h, x] of Object.entries(loFarben)) aus.lo.f[h] = x.colorImagePath || '';
// Seals (Titel) mit ihren Triumphs, für Fortschritt im Wiki.
for (const [h, n] of Object.entries(knoten)) {
  const titelRec = records[n.completionRecordHash];
  if (!n.completionRecordHash || !titelRec || !n.displayProperties?.name) continue;
  const kinder = (n.children?.records || []).map((r) => r.recordHash).filter((r) => records[r]);
  if (!kinder.length) continue;
  aus.seal[h] = { n: n.displayProperties.name, i: n.displayProperties.icon || '', t: titelRec.titleInfo?.titlesByGender?.Male || titelRec.displayProperties?.name || '', d: n.displayProperties.description || '', k: kinder, c: n.completionRecordHash, g: titelRec.titleInfo?.gildingTrackingRecordHash || 0, pn: (n.parentNodeHashes || []).map((p) => knoten[p]?.displayProperties?.name).find(Boolean) || '' };
  for (const r of kinder) aus.rec[r] = { n: records[r].displayProperties?.name || '', d: records[r].displayProperties?.description || '' };
}
// Triumphe je Raid/Dungeon (alles, was Titel/Siegel verlangt, plus übrige Triumphe dieser Aktivität) für Wiki-Karten.
{ aus.dtri = {};
  const namen = new Set(Object.values(aus.akt).filter((x) => x.g === 'Raids' || x.g === 'Dungeons').map((x) => x.n.split(':')[0].trim()));
  for (const name of namen) {
    const gl = (x) => String(x || '').replace(/^the /i, '').trim() === name.replace(/^the /i, '').trim();
    const seal = Object.entries(aus.seal).find(([, sl]) => gl(sl.n) && !/legacy/i.test(sl.pn)) || Object.entries(aus.seal).find(([, sl]) => gl(sl.n));
    let beste = [];
    const ohne = (x) => String(x || '').replace(/^the /i, '').trim();
    for (const n of Object.values(knoten)) { if (ohne(n.displayProperties?.name) !== ohne(name)) continue; const r = (n.children?.records || []).map((x) => x.recordHash).filter((x) => records[x]?.displayProperties?.name); if (r.length > beste.length) beste = r; }
    const k = [...new Set([...(seal ? seal[1].k : []), ...beste])];
    if (!k.length) continue;
    aus.dtri[name] = { s: seal ? Number(seal[0]) : 0, k };
    for (const r of k) if (!aus.rec[r]) aus.rec[r] = { n: records[r].displayProperties?.name || '', d: records[r].displayProperties?.description || '' };
  } }
// Checklisten (Corrupted Eggs, Ahamkara-Knochen, Katzen …): Einträge mit Ort und Bereich, Fortschritt kommt live vom Konto.
for (const [h, c] of Object.entries(checklisten)) {
  if (!c.displayProperties?.name || !(c.entries || []).length) continue;
  aus.cl[h] = { n: c.displayProperties.name, d: c.displayProperties.description || '', i: c.displayProperties.icon || '', s: c.scope ?? 0,
    e: c.entries.map((x) => { const z = ziele2[x.destinationHash]; const b = (z?.bubbles || []).find((y) => y.hash === x.bubbleHash); return [x.hash, x.displayProperties?.name || '', z?.displayProperties?.name || '', b?.displayProperties?.name || '', x.displayProperties?.description || '']; }) };
}
// Waffentyp-Symbole aus den Sammlungs-Knoten („Auto Rifles“ usw.) für die Tresor-Ansicht.
{ const typen = new Set(Object.values(aus.items).filter((e) => e.t === 3 && e.k).map((e) => e.k));
  for (const n of Object.values(knoten)) { const name = n.displayProperties?.name || ''; const ic = n.displayProperties?.icon; if (!ic) continue;
    for (const t of typen) if (!aus.wtyp[t] && (name === t || name === `${t}s` || name === `${t}es`)) aus.wtyp[t] = ic; } }
fs.writeFileSync('data/defs.json', JSON.stringify(aus));
console.log(`Wrote data/defs.json with ${Object.keys(aus.items).length} items.`);
