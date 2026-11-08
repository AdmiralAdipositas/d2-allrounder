// Statistiken à la raid.report / dungeon.report / guardian.report: alles aus Bungies Spielverlauf, auf Wunsch sehr tief (aufklappbar).
// Quellen: Account-Stats (alle Charaktere inkl. gelöschter), Aktivitätsverlauf, Spielberichte (PGCR, im Browser gecacht),
// Triumphe/Siegel, Kill-Tracker auf eigenen Waffen. Andere Spieler per Bungie-Name ansehen.
import * as bungie from './bungie.js';
import { defs } from './defs.js';
import { CHALLENGES } from './challenges.js';

const BILD = 'https://www.bungie.net';
const TAGE = 14;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const wert = (o, k) => o?.[k]?.basic?.value ?? 0;
const zahl = (n) => Math.round(n || 0).toLocaleString();
const stunden = (s) => `${zahl(s / 3600)} h`;
const dauer = (s) => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const zeitText = (ms) => (ms ? dauer(ms / 1000) : '–');
const datum = (t) => (t ? new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
const vor = (t) => { if (!t) return ''; const d = Math.floor((Date.now() - new Date(t)) / 86400_000); return d < 1 ? 'today' : d === 1 ? '1d' : d < 14 ? `${d}d` : d < 60 ? `${Math.floor(d / 7)}w` : d < 730 ? `${Math.floor(d / 30)}mo` : `${Math.floor(d / 365)}y`; };

// ---------- Bungies Stat-Namen (für „alles andere“ und Medaillen) ----------
let statDefs = null;
async function ladeStatDefs() { if (!statDefs) statDefs = await bungie.get('/Destiny2/Stats/Definition/').catch(() => ({})); return statDefs; }
const statName = (k) => statDefs?.[k]?.statName || k.replace(/^Medals_pvp_medal_/, '').replace(/^medal/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

// ---------- Spielberichte (PGCR): einmal laden, für immer im Browser behalten ----------
const PGCR_KEY = 'd2a.pgcr.v1';
let pgcrCache = null;
const pgcrLies = () => { if (!pgcrCache) { try { pgcrCache = JSON.parse(localStorage.getItem(PGCR_KEY) || '{}'); } catch { pgcrCache = {}; } } return pgcrCache; };
let zuletztGespeichert = 0, speicherT = 0;
const pgcrSpeichern = () => { zuletztGespeichert = Date.now(); try { localStorage.setItem(PGCR_KEY, JSON.stringify(pgcrCache)); } catch {} };
// Spätestens alle 4 s sichern, damit beim Schließen nichts verloren geht.
const pgcrMerke = () => { clearTimeout(speicherT); if (Date.now() - zuletztGespeichert > 4000) pgcrSpeichern(); else speicherT = setTimeout(pgcrSpeichern, 1000); };
// Kurzfassung: von Anfang an (f), Tode gesamt (d), Spieler [Name, Klasse, abgeschlossen].
async function pgcrKurz(id) {
  const c = pgcrLies();
  if (c[id]) return c[id];
  const p = await bungie.pgcr(id);
  const leute = new Map(); let tode = 0;
  for (const e of p.entries || []) {
    const u = e.player?.destinyUserInfo || {};
    const name = u.bungieGlobalDisplayName ? `${u.bungieGlobalDisplayName}#${String(u.bungieGlobalDisplayNameCode || '').padStart(4, '0')}` : u.displayName || '?';
    tode += wert(e.values, 'deaths');
    const alt = leute.get(name);
    leute.set(name, [name, e.player?.characterClass || '', Math.max(alt?.[2] || 0, wert(e.values, 'completed'))]);
  }
  c[id] = { f: p.activityWasStartedFromBeginning ? 1 : 0, d: tode, p: [...leute.values()] };
  pgcrMerke();
  return c[id];
}

// ---------- Daten laden ----------
const caches = new Map();
async function verlaufAlle(k, cid, mode) {
  const out = [];
  for (let page = 0; page < 20; page++) {
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Account/${k.membershipId}/Character/${cid}/Stats/Activities/?mode=${mode}&count=250&page=${page}`).catch(() => null);
    const l = r?.activities || []; out.push(...l);
    if (l.length < 250) break;
  }
  return out;
}
const aktName = (h) => { const d = defs.akt?.[h]; return d ? d.n.split(':')[0].trim().replace(/^The Pantheon$/, 'Pantheon') : ''; };
const istMaster = (h) => /master|epic/i.test(defs.akt?.[h]?.n || '');

async function lade(k, eigenes, zustand) {
  const key = `${k.membershipType}:${k.membershipId}`;
  const c = caches.get(key);
  if (c && Date.now() - c.zeit < 30 * 60_000) return c.daten;
  const basis = `/Destiny2/${k.membershipType}/Account/${k.membershipId}`;
  const [konten] = await Promise.all([bungie.get(`${basis}/Stats/?groups=1,2,3`), ladeStatDefs()]);
  const mg = konten.mergedAllCharacters || {};
  const alle = mg.merged?.allTime || {}, pve = mg.results?.allPvE?.allTime || {}, pvp = mg.results?.allPvP?.allTime || {};
  const chars = konten.characters || [];
  const lebend = chars.filter((x) => !x.deleted).map((x) => x.characterId);
  const aktivitaeten = new Map(), waffen = new Map(), tage = new Map(), laeufe = [], zeitModi = {}, sozial = {};
  let zeitAkt = 0, zeitChars = 0;
  const grenze = Date.now() - TAGE * 86400_000;
  await Promise.all(chars.map(async ({ characterId: cid, deleted }) => {
    const [agg, uw, verlauf, raids, dungeons, modi] = await Promise.all([
      bungie.get(`${basis}/Character/${cid}/Stats/AggregateActivityStats/`).catch(() => null),
      deleted ? null : bungie.get(`${basis}/Character/${cid}/Stats/UniqueWeapons/`).catch(() => null),
      deleted ? null : bungie.get(`${basis}/Character/${cid}/Stats/Activities/?count=250&mode=0&page=0`).catch(() => null),
      verlaufAlle(k, cid, 4), verlaufAlle(k, cid, 82),
      bungie.get(`${basis}/Character/${cid}/Stats/?groups=1&modes=2,3,4,5,6,18,46,63,64,82,84,87,19`).catch(() => null),
    ]);
    for (const [m, v] of Object.entries(modi || {})) zeitModi[m] = (zeitModi[m] || 0) + wert(v.allTime, 'secondsPlayed');
    for (const a of agg?.activities || []) {
      if (!deleted) zeitAkt += wert(a.values, 'activitySecondsPlayed');
      if (defs.soz?.[a.activityHash]) { const sn = defs.soz[a.activityHash]; sozial[sn] = (sozial[sn] || 0) + wert(a.values, 'activitySecondsPlayed'); }
      const d = defs.akt?.[a.activityHash]; if (!d) continue;
      const n = aktName(a.activityHash);
      const e = aktivitaeten.get(n) || { n, g: d.g || '', i: d.i, clears: 0, sek: 0, gestartet: 0 };
      e.clears += wert(a.values, 'activityCompletions'); e.sek += wert(a.values, 'activitySecondsPlayed'); e.gestartet += wert(a.values, 'activityCompletions') + wert(a.values, 'activityAbandons' ) ;
      aktivitaeten.set(n, e);
    }
    for (const w of uw?.weapons || []) {
      const it = defs.items[w.referenceId]; if (!it?.n) continue;
      const e = waffen.get(it.n) || { h: w.referenceId, name: it.n, icon: it.i, kills: 0, praez: 0, exotic: it.q === 6, quelle: 'Bungie' };
      e.kills += wert(w.values, 'uniqueWeaponKills'); e.praez += wert(w.values, 'uniqueWeaponPrecisionKills');
      waffen.set(it.n, e);
    }
    for (const a of verlauf?.activities || []) {
      const t = new Date(a.period); if (t.getTime() < grenze) continue;
      const tag = t.toLocaleDateString('sv'); tage.set(tag, (tage.get(tag) || 0) + wert(a.values, 'timePlayedSeconds'));
    }
    for (const [art, l] of [['raid', raids], ['dungeon', dungeons]]) for (const a of l) {
      const h = a.activityDetails?.referenceId; const n = aktName(h); if (!n) continue;
      laeufe.push({ art, n, h, id: a.activityDetails.instanceId, t: a.period, ok: wert(a.values, 'completed') === 1 && wert(a.values, 'completionReason') === 0, sek: wert(a.values, 'timePlayedSeconds') || wert(a.values, 'activityDurationSeconds'), dauer: wert(a.values, 'activityDurationSeconds'), spieler: wert(a.values, 'playerCount'), tode: wert(a.values, 'deaths'), kills: wert(a.values, 'kills'), master: istMaster(h), cid });
    }
  }));
  // Kill-Tracker auf eigenen Waffen (legendär + exotisch, zählt seit dem Erhalt dieser Kopie).
  if (eigenes) {
    try {
      const p = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=102,201,205,309`);
      const obj = p.itemComponents?.plugObjectives?.data || {};
      const items = [...(p.profileInventory?.data?.items || []), ...Object.values(p.characterInventories?.data || {}).flatMap((x) => x.items), ...Object.values(p.characterEquipment?.data || {}).flatMap((x) => x.items)];
      for (const it of items) {
        const d = defs.items[it.itemHash]; if (!d || d.t !== 3 || !it.itemInstanceId) continue;
        let kills = 0;
        // Nur echte Kill-Tracker-Sockel (PvE + PvP), keine Waffen-Erfahrung oder Muster-Fortschritte.
        for (const [ph, l] of Object.entries(obj[it.itemInstanceId]?.objectivesPerPlug || {})) { if (!/tracker/i.test(defs.items[ph]?.pc || '') && !/Tracker$/.test(defs.items[ph]?.n || '')) continue; for (const o of l) kills += o.progress || 0; }
        const e = waffen.get(d.n) || { h: it.itemHash, name: d.n, icon: d.i, kills: 0, praez: 0, exotic: d.q === 6, quelle: 'Kill tracker', kopien: 0, tracker: 0 };
        e.kopien = (e.kopien || 0) + 1; e.tracker = (e.tracker || 0) + kills;
        if (e.quelle !== 'Bungie') e.kills = e.tracker;
        waffen.set(d.n, e);
      }
    } catch {}
  }
  // Waffentypen: Bungies „Beam Rifle“ ist ein zweiter Trace-Rifle-Zähler; Fähigkeiten getrennt.
  const typRoh = Object.keys(alle).filter((x) => /^weaponKills/.test(x) && !/Precision/.test(x));
  const typen = new Map();
  for (const x of typRoh) {
    const v = wert(alle, x); if (!v) continue;
    const n = x === 'weaponKillsBeamRifle' ? 'Trace Rifle' : statName(x);
    const faehig = /Grenade$|Melee$|Super$|Ability$/.test(x);
    const e = typen.get(n) || { n, kills: 0, praez: 0, faehig, relikt: /Relic$/.test(x) }; e.kills += v; e.praez += wert(alle, x.replace('weaponKills', 'weaponPrecisionKills')); typen.set(n, e);
  }
  const tagListe = [];
  for (let n = TAGE - 1; n >= 0; n--) { const t = new Date(Date.now() - n * 86400_000); const tag = t.toLocaleDateString('sv'); tagListe.push({ tag, kurz: t.toLocaleDateString([], { weekday: 'short' }), s: tage.get(tag) || 0 }); }
  // Siegel/Triumphe (öffentlich).
  let records = {};
  try {
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=900`);
    records = { ...(r.profileRecords?.data?.records || {}) };
    for (const cr of Object.values(r.characterRecords?.data || {})) for (const [h, v] of Object.entries(cr.records || {})) if (!records[h]) records[h] = v;
  } catch {}
  try { const pr = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=200`); for (const c of Object.values(pr.characters?.data || {})) zeitChars += Number(c.minutesPlayedTotal || 0) * 60; } catch {}
  const orbit = zeitChars > zeitAkt ? zeitChars - zeitAkt : 0;
  const daten = { k, zeitModi, sozial, orbit, alle, pve, pvp, chars, lebend, aktivitaeten: [...aktivitaeten.values()], waffen: [...waffen.values()], typen: [...typen.values()].sort((a, b) => b.kills - a.kills), tage: tagListe, laeufe: laeufe.sort((a, b) => new Date(b.t) - new Date(a.t)), records };
  caches.set(key, { zeit: Date.now(), daten });
  if (eigenes) speichereStats(k, daten);
  return daten;
}
// Eigene Stats für den nächsten Start im Browser-Cache: dann steht die Seite sofort, frische Zahlen kommen nach.
const SKEY = (k) => `stats-${k.membershipId}`;
async function speichereStats(k, d) { try { const c = await self.caches.open('d2a-profil'); await c.put(SKEY(k), new Response(JSON.stringify({ zeit: Date.now(), d }))); } catch {} }
async function gespeicherteStats(k) { try { const r = await (await self.caches.open('d2a-profil')).match(SKEY(k)); return r ? (await r.json()).d : null; } catch { return null; } }

// ---------- Auswertung Raids/Dungeons ----------
function auswerten(laeufe) {
  const pc = pgcrLies();
  const m = new Map();
  for (const l of laeufe) {
    const e = m.get(l.n) || { n: l.n, art: l.art, h: l.h, clears: 0, voll: 0, cp: 0, master: 0, flawless: 0, solo: 0, soloFl: 0, trio: 0, duo: 0, schnellste: 0, zuletzt: null, sek: 0, laeufe: [], versuche: 0 };
    e.versuche++; e.sek += l.sek;
    if (!e.zuletzt || new Date(l.t) > new Date(e.zuletzt)) e.zuletzt = l.t;
    if (l.ok) {
      const p = pc[l.id];
      e.clears++; if (l.master) e.master++;
      const voll = p ? p.f === 1 : null;
      if (voll === true) { e.voll++; if (!e.schnellste || l.dauer < e.schnellste) e.schnellste = l.dauer; } else if (voll === false) e.cp++;
      const n = p ? p.p.length : l.spieler;
      const fl = voll && p && p.d === 0;
      if (fl) e.flawless++;
      if (voll && n === 1) { e.solo++; if (fl) e.soloFl++; } else if (voll && n === 2) e.duo++; else if (voll && n === 3) e.trio++;
      e.laeufe.push({ ...l, voll, fl, n, p });
    }
    m.set(l.n, e);
  }
  return [...m.values()].sort((a, b) => b.clears - a.clears);
}
// Siegel zu einem Raid/Dungeon (gleicher Name) und fehlende Challenges.
const sealFuer = (n) => Object.entries(defs.seal || {}).filter(([, s]) => s.n === n).sort((a, b) => /legacy/i.test(a[1].pn) - /legacy/i.test(b[1].pn))[0];
const fertig = (rec, h) => { const r = rec[h]; return Boolean(r) && (r.state & 4) === 0; };

// ---------- Darstellung ----------
const kachel = (titel, gross, klein = '') => `<div class="kpi"><small>${titel}</small><b>${gross}</b>${klein ? `<span>${klein}</span>` : ''}</div>`;
// Aktivitäts-Symbol aus den Spieldaten (Raid-/Dungeon-Name ohne Variante).
const aktIcon = (n) => { const a = Object.values(defs.akt || {}).find((x) => x.i && x.n.split(':')[0].trim() === n && /icons/.test(x.i)) || Object.values(defs.akt || {}).find((x) => x.i && x.n.split(':')[0].trim() === n); return a ? `<img class="raktic" src="${BILD}${a.i}" alt="" loading="lazy" onerror="this.remove()">` : ''; };
const block = (id, titel, sub, inhalt, offen) => `<details class="sblock" data-blk="${id}" ${offen ? 'open' : ''}><summary><h3>${titel}</h3>${sub ? `<small>${sub}</small>` : ''}</summary>${inhalt}</details>`;
let offenStand = {};
try { offenStand = JSON.parse(localStorage.getItem('d2a.statsOffen') || '{}'); } catch {}
const istOffen = (id, std) => (id in offenStand ? offenStand[id] : std);

function punktTip(l) {
  const team = l.p ? l.p.p.map(([n, c, ok]) => `${esc(n)}${c ? ` · ${esc(c)}` : ''}${ok ? '' : ' (left)'}`).join('<br>') : 'Team loads in the background…';
  return `<b>${esc(datum(l.t))}</b> · ${dauer(l.dauer || l.sek)} run · you played ${dauer(l.sek)}<br>${l.voll === null ? 'Checking full / checkpoint…' : l.voll ? 'Full clear' : 'Checkpoint clear'}${l.fl ? ' · <span class=gold>Flawless</span>' : ''}${l.master ? ' · Master/Epic' : ''}<br><small>${team}</small>`;
}
function zeileRaid(e, d) {
  const s = sealFuer(e.n);
  const seal = s ? s[1] : null;
  const sealOk = seal && fertig(d.records, seal.c);
  const recs = seal ? seal.k : [];
  const fehlChal = recs.filter((r) => CHALLENGES[defs.rec?.[r]?.n] && !fertig(d.records, r)).map((r) => defs.rec[r].n);
  const sealTxt = seal ? `${recs.filter((r) => fertig(d.records, r)).length}/${recs.length}` : '';
  const punkte = e.laeufe.slice(0, 120).map((l, i) => `<i class="pkt ${l.voll ? 'voll' : l.voll === false ? 'cp' : ''} ${l.fl ? 'fl' : ''} ${l.master ? 'ms' : ''}" data-tipl="${e.n}|${i}"></i>`).join('');
  return `<details class="rzeile"><summary>
      <span class="rn">${aktIcon(e.n)}${esc(e.n)}${seal ? `<em class="rtitel ${sealOk ? 'ok' : ''}" title="${esc(seal.t)}: ${sealTxt}">${sealOk ? '★' : '☆'} ${esc(seal.t)}</em>` : ''}</span>
      <b title="Full clears + checkpoint clears">${zahl(e.clears)}</b><span>${zahl(e.voll)}<small>full</small></span><span>${zahl(e.master)}<small>master</small></span><span>${zahl(e.flawless)}<small>flawless</small></span>
      ${e.art === 'dungeon' ? `<span>${zahl(e.solo)}<small>solo</small></span><span>${zahl(e.soloFl)}<small>solo fl.</small></span>` : `<span>${zahl(e.trio + e.duo + e.solo)}<small>lowman</small></span>`}
      <span>${zeitText(e.schnellste * 1000)}<small>fastest</small></span><span title="${esc(datum(e.zuletzt))}">${esc(vor(e.zuletzt))}<small>last</small></span></summary>
    <div class="rdetail">
      <p class="leer klein">${zahl(e.clears)} clears (${zahl(e.voll)} full, ${zahl(e.cp)} from a checkpoint${e.clears - e.voll - e.cp > 0 ? `, ${zahl(e.clears - e.voll - e.cp)} still being checked` : ''}) · ${zahl(e.versuche - e.clears)} runs without a clear · ${stunden(e.sek)} in total · last ${esc(datum(e.zuletzt))}.
        ${e.art === 'dungeon' ? `Solo ${zahl(e.solo)} · solo flawless ${zahl(e.soloFl)} · duo ${zahl(e.duo)} · trio ${zahl(e.trio)}.` : `Lowman: trio ${zahl(e.trio)} · duo ${zahl(e.duo)} · solo ${zahl(e.solo)}.`}</p>
      <div class="pkte">${punkte || '<span class="leer klein">No clears yet.</span>'}</div>
      <p class="pleg"><i class="pkt voll"></i>full <i class="pkt cp"></i>checkpoint <i class="pkt voll fl"></i>flawless <i class="pkt voll ms"></i>master/epic · hover or tap a dot for date, time and team</p>
      ${seal ? `<p><b>${esc(seal.t)}</b> ${sealOk ? '<span class="gold">earned</span>' : `· ${sealTxt} triumphs`}${fehlChal.length ? ` · missing challenges: ${fehlChal.map((c) => `<button class="chip klein" data-wikichal="${esc(c)}">${esc(c)}</button>`).join(' ')}` : ''}</p>` : ''}
    </div></details>`;
}
function tabelleLaeufe(titel, liste, d, art) {
  if (!liste.length) return '';
  return `<div class="rkopf ${art}"><span></span><b>Clears</b><span>Full</span><span>Master</span><span>Flawless</span>${art === 'dungeon' ? '<span>Solo</span><span>Solo fl.</span>' : '<span>Lowman</span>'}<span>Fastest</span><span>Last</span></div>${liste.map((e) => zeileRaid(e, d)).join('')}`;
}

// Siegel-Raster: ausgegraut / voll, Hover = was fehlt, Klick = alle Triumphe.
function siegel(d) {
  const proTitel = new Map();
  for (const [h, s] of Object.entries(defs.seal || {})) { const k = s.t || s.n; proTitel.set(k, [...(proTitel.get(k) || []), { h, ...s }]); }
  const liste = [...proTitel.values()].map((vs) => { vs.sort((a, b) => /legacy/i.test(a.pn) - /legacy/i.test(b.pn) || b.k.filter((r) => fertig(d.records, r)).length - a.k.filter((r) => fertig(d.records, r)).length); return { ...vs[0], alt: vs.every((v) => /legacy/i.test(v.pn)) }; })
    .map((s) => { const o = d.records[s.c]?.objectives?.[0]; const ok = fertig(d.records, s.c); const n = o?.completionValue || s.k.length; const done = o ? Math.min(o.progress || 0, n) : s.k.filter((r) => fertig(d.records, r)).length; return { ...s, done: ok ? n : done, n, ok }; })
    .sort((a, b) => b.ok - a.ok || b.done / b.n - a.done / a.n);
  const ok = liste.filter((s) => s.ok).length;
  const jetzt = liste.filter((s) => !s.alt), alt = liste.filter((s) => s.alt);
  const raster = (l) => `<div class="srast">${l.map((s) => `<button class="sseal ${s.ok ? 'ok' : ''}" data-seal="${s.h}" data-tips="${s.h}" style="--anteil:${Math.round((s.done / s.n) * 100)}%"><i style="background-image:url(${BILD}${s.i})"></i><span>${esc(s.t)}</span><small>${s.done}/${s.n}</small></button>`).join('')}</div>`;
  return { ok, n: liste.length, okJetzt: jetzt.filter((s) => s.ok).length, nJetzt: jetzt.length, okAlt: alt.filter((s) => s.ok).length, nAlt: alt.length,
    html: `<h4>Still obtainable <small>${jetzt.filter((s) => s.ok).length} of ${jetzt.length}</small></h4>${raster(jetzt)}${alt.length ? `<h4>Legacy <small>no longer obtainable · ${alt.filter((s) => s.ok).length} of ${alt.length} earned back then</small></h4>${raster(alt)}` : ''}<div class="sealdetail" hidden></div>` };
}
function sealTip(h, d) {
  const s = defs.seal?.[h]; if (!s) return '';
  const nam = new Set();
  const fehlt = fertig(d.records, s.c) ? [] : s.k.filter((r) => !fertig(d.records, r)).filter((r) => { const n = defs.rec?.[r]?.n; if (nam.has(n)) return false; nam.add(n); return true; });
  return `<b>${esc(s.t)}</b> · ${esc(s.n)}<br>${fertig(d.records, s.c) ? '<span class=gold>Title earned</span>' : `${s.k.length - fehlt.length}/${s.k.length} done`}${fehlt.length ? `<br><small>Still needed:</small><br>${fehlt.slice(0, 8).map((r) => `○ ${esc(defs.rec?.[r]?.n || '?')}`).join('<br>')}${fehlt.length > 8 ? `<br>… and ${fehlt.length - 8} more` : ''}` : ''}`;
}
function sealDetail(h, d) {
  const s = defs.seal?.[h]; if (!s) return '';
  return `<h4>${esc(s.t)} <small>${esc(s.n)}</small></h4>${s.d ? `<p class="leer klein">${esc(s.d.split('\n')[0])}</p>` : ''}${fertig(d.records, s.c) ? '<p class="gold">Title earned. Older seals no longer track every single triumph, so some may show open.</p>' : ''}<div class="sschritte">${s.k.map((r) => { const ok = fertig(d.records, r) || fertig(d.records, s.c); const st = d.records[r]; const o = st?.objectives || st?.intervalObjectives || []; const z = o.length === 1 && o[0].completionValue > 1 ? `${Math.min(o[0].progress || 0, o[0].completionValue)}/${o[0].completionValue}` : o.length > 1 ? `${o.filter((x) => x.complete).length}/${o.length}` : ''; return `<div class="sschritt ${ok ? 'ok' : ''}"><span class="sh">${ok ? '✓' : '○'}</span><div><b>${esc(defs.rec?.[r]?.n || '?')}</b>${defs.rec?.[r]?.d ? `<small>${esc(defs.rec[r].d)}</small>` : ''}</div>${z && !ok ? `<em>${z}</em>` : ''}</div>`; }).join('')}</div>`;
}

// Lustige, merkwürdige und negative Werte – nur was Bungie wirklich liefert.
function spass(d) {
  const a = d.alle, w = (k) => wert(a, k);
  const zeilen = [];
  const add = (t, v, x) => { if (v && !/^0( |$)|^0:00$|^0 \/ 0$/.test(String(v))) zeilen.push([t, v, x || '']); };
  const tode = w('deaths'), zeit = w('secondsPlayed');
  add('Deaths', zahl(tode), tode && zeit ? `one every ${dauer(zeit / tode)} of play` : '');
  add('Suicides', zahl(w('suicides')), w('suicides') ? 'falling, your own rockets, the Vex milk…' : '');
  add('Longest single life', dauer(w('longestSingleLife')));
  add('Average life', dauer(w('averageLifespan')));
  add('Longest kill spree', zahl(w('longestKillSpree')));
  add('Most kills in one activity', zahl(w('bestSingleGameKills')));
  add('Most precision kills in one activity', zahl(w('mostPrecisionKills')));
  add('Revives given / received', `${zahl(w('resurrectionsPerformed'))} / ${zahl(w('resurrectionsReceived'))}`, w('resurrectionsReceived') > w('resurrectionsPerformed') ? 'you got picked up more than you picked up' : 'the team medic');
  add('Orbs made / picked up', `${zahl(w('orbsDropped'))} / ${zahl(w('orbsGathered'))}`);
  add('Public events (heroic)', `${zahl(w('publicEventsCompleted'))} (${zahl(w('heroicPublicEventsCompleted'))})`);
  add('Medals earned (PvP)', zahl(w('allMedalsEarned')));
  // Aus dem Aktivitäts-Aggregat: einmal gespielt, nie wieder; meistgespielt.
  const akt = d.aktivitaeten.filter((x) => x.n);
  const einmal = akt.filter((x) => x.clears === 1 && /Exotic|Dungeon|Raid|Story|Mission|Quest/i.test(`${x.g} ${x.n}`)).sort((x, y) => x.n.localeCompare(y.n));
  const meist = akt.slice().sort((x, y) => y.sek - x.sek).slice(0, 8);
  const ohne = akt.filter((x) => x.clears === 0 && x.sek > 1800).sort((x, y) => y.sek - x.sek).slice(0, 10);
  return `<div class="fun">${zeilen.map(([t, v, x]) => `<div><small>${esc(t)}</small><b>${esc(v)}</b>${x ? `<span>${esc(x)}</span>` : ''}</div>`).join('')}</div>
    <div class="zwei">      <div><h4>One and done <small>cleared exactly once, never again</small></h4>${einmal.length ? `<div class="chips">${einmal.slice(0, 40).map((x) => `<span class="chip">${esc(x.n)}</span>`).join('')}</div>` : '<p class="leer klein">Nothing – you finish what you start.</p>'}
      ${ohne.length ? `<h4>Time sinks without a clear</h4>${ohne.map((x) => `<div class="tbar"><span>${esc(x.n)}</span><i><b style="width:${(x.sek / Math.max(1, ohne[0].sek)) * 100}%"></b></i><em>${stunden(x.sek)}</em></div>`).join('')}` : ''}</div></div>`;
}

const TYP_HILFE = {
  'Ability Kills': 'Kills by abilities that are not grenade, melee or super (class abilities, aspects, fragments and similar).',
  Relics: 'Kills with carried objects such as raid relics and swords you pick up in activities.',
  'Trace Rifle': 'Includes Bungie\'s older “Beam Rifle” counter, which also counts Trace Rifles.',
  Super: 'Kills with your super.', Grenade: 'Grenade kills.', Melee: 'Melee kills.',
};


// ---------- Wohin die Zeit ging: Ring-Diagramm nach Spielbereich, aufklappbar mit Details ----------
const FARB = ['#e8c35a', '#9b7bff', '#7fd5ff', '#ff8a2a', '#3fe08f', '#ff6fae', '#5aa8ff', '#c9b98a', '#8d949e'];
function zeitBlock(d, raids, dungeons) {
  const m = d.zeitModi || {};
  const pve = wert(d.pve, 'secondsPlayed');
  const kat = [
    ['Raids', m.raid || 0, raids.map((e) => [e.n, e.sek])],
    ['Dungeons', m.dungeon || 0, dungeons.map((e) => [e.n, e.sek])],
    ['Strikes & Nightfalls', m.allStrikes || 0, [['Nightfalls', m.scored_nightfall || 0], ['Strikes', m.strike || 0]]],
    ['Crucible', m.allPvP || 0, [['Trials of Osiris', m.trials_of_osiris || 0], ['Iron Banner', m.ironBanner || 0], ['Other Crucible', Math.max(0, (m.allPvP || 0) - (m.trials_of_osiris || 0) - (m.ironBanner || 0))]]],
    ['Gambit', m.allPvECompetitive || 0, []],
    ['Story & campaigns', m.story || 0, []],
    ['Patrol & open world', m.patrol || 0, []],
    ['Lost Sectors', m.lost_sector || 0, []],
  ];
  const bekannt = kat.reduce((a, k) => a + k[1], 0) - (m.allPvP || 0);
  const soz = Object.entries(d.sozial || {}); const sozSum = soz.reduce((a, x) => a + x[1], 0);
  kat.push(['Social spaces (Tower, H.E.L.M. …)', sozSum, soz]);
  kat.push(['Everything else (seasonal, events…)', Math.max(0, pve - bekannt - sozSum), []]);
  if (d.orbit > 0) kat.push(['Orbit & menus (estimate)', d.orbit, [['Total time on your current characters minus all time inside activities', d.orbit]]]);
  const liste = kat.filter((k) => k[1] > 0).sort((a, b) => b[1] - a[1]);
  const summe = liste.reduce((a, k) => a + k[1], 0) || 1;
  let w = -Math.PI / 2;
  const ring = liste.map(([n, v], i) => { const a = (v / summe) * 2 * Math.PI; const p = (x) => `${80 + 64 * Math.cos(x)} ${80 + 64 * Math.sin(x)}`; const pfad = `<path d="M${p(w)} A64 64 0 ${a > Math.PI ? 1 : 0} 1 ${p(w + a - 0.004)}" stroke="${FARB[i % FARB.length]}" stroke-width="22" fill="none"><title>${esc(n)}: ${stunden(v)}</title></path>`; w += a; return pfad; }).join('');
  const zeile = ([n, v, sub], i) => `<details class="zkat"><summary><i style="background:${FARB[i % FARB.length]}"></i><span>${esc(n)}</span><b>${stunden(v)}</b><em>${Math.round((v / summe) * 100)}%</em></summary>${sub.filter((x) => x[1] > 0).length ? sub.filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map(([sn, sv]) => `<div class="tbar"><span>${esc(sn)}</span><i><b style="width:${(sv / Math.max(1, ...sub.map((x) => x[1]))) * 100}%;background:${FARB[i % FARB.length]}"></b></i><em>${stunden(sv)}</em></div>`).join('') : '<p class="leer klein">No finer split from Bungie.</p>'}</details>`;
  return `<div class="zeitring"><svg viewBox="0 0 160 160" aria-hidden="true">${ring}<text x="80" y="76" text-anchor="middle" class="zr-z">${zahl(summe / 3600)}</text><text x="80" y="94" text-anchor="middle" class="zr-t">hours</text></svg><div class="zlegende">${liste.map(zeile).join('')}</div></div>`;
}

// ---------- Einsatztrupp, Mitspieler, Favoriten, Vergleich ----------
const FAV_KEY = 'd2a.statsFav', NAME_KEY = 'd2a.statsNamen';
const favs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } };
const setzeFavs = (l) => { try { localStorage.setItem(FAV_KEY, JSON.stringify(l)); } catch {} };
let namenCache = null;
const namen = () => { if (!namenCache) { try { namenCache = JSON.parse(localStorage.getItem(NAME_KEY) || '{}'); } catch { namenCache = {}; } } return namenCache; };
async function loeseName(name) {
  const c = namen(); if (c[name]) return c[name];
  const m = name.match(/^(.+)#(\d{1,4})$/); if (!m) throw new Error('Use the full Bungie name, e.g. Name#1234');
  const r = await bungie.post('/Destiny2/SearchDestinyPlayerByBungieName/-1/', { displayName: m[1], displayNameCode: Number(m[2]) });
  const x = (r || []).find((y) => !y.crossSaveOverride || y.crossSaveOverride === y.membershipType) || r?.[0];
  if (!x) throw new Error(`Nobody found: ${name}`);
  c[name] = { membershipType: x.membershipType, membershipId: x.membershipId, name: `${x.bungieGlobalDisplayName}#${String(x.bungieGlobalDisplayNameCode).padStart(4, '0')}` };
  try { localStorage.setItem(NAME_KEY, JSON.stringify(c)); } catch {}
  return c[name];
}
let trupp = null, truppAkt = '', truppKey = '', truppInfo = {}, truppTimer = 0;
let truppAuto = (() => { try { return localStorage.getItem('d2a.truppAuto') !== '0'; } catch { return true; } })();
async function aktuellerTrupp(k) {
  try {
    const r = await bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=1000,204`);
    const leute = r.profileTransitoryData?.data?.partyMembers || [];
    // Was gerade gespielt wird (falls Bungie es verrät).
    const ca = Object.values(r.characterActivities?.data || {}).sort((a, b) => new Date(b.dateActivityStarted) - new Date(a.dateActivityStarted))[0];
    const ah = ca?.currentActivityHash; truppAkt = ah ? (defs.akt?.[ah]?.n || (await bungie.get(`/Destiny2/Manifest/DestinyActivityDefinition/${ah}/`).catch(() => null))?.displayProperties?.name || '') : '';
    const out = [];
    for (const p of leute) {
      if (p.membershipId === k.membershipId) continue;
      const l = await bungie.get(`/Destiny2/-1/Profile/${p.membershipId}/LinkedProfiles/`).catch(() => null);
      const pr = (l?.profiles || []).find((x) => x.membershipId === p.membershipId) || l?.profiles?.[0];
      if (pr?.bungieGlobalDisplayName) { const name = `${pr.bungieGlobalDisplayName}#${String(pr.bungieGlobalDisplayNameCode).padStart(4, '0')}`; namen()[name] = { membershipType: pr.membershipType, membershipId: pr.membershipId, name }; out.push(name); }
    }
    return out;
  } catch { return []; }
}
// Kurzprofil je Mitspieler: aktueller Charakter, Licht, Subclass, angelegte Exotics, Kills/KD/Raids – alles öffentlich.
const KL = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
async function truppKarte(name) {
  if (truppInfo[name]?.zeit > Date.now() - 5 * 60e3) return truppInfo[name];
  const k = await loeseName(name);
  const [pr, st] = await Promise.all([
    bungie.get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=100,200,205`).catch(() => null),
    bungie.get(`/Destiny2/${k.membershipType}/Account/${k.membershipId}/Stats/?groups=1`).catch(() => null),
  ]);
  const c = Object.values(pr?.characters?.data || {}).sort((a, b) => new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed))[0];
  const eq = c ? pr.characterEquipment?.data?.[c.characterId]?.items || [] : [];
  const sub = eq.map((i) => defs.items[i.itemHash]).find((x) => x?.b === 3284755031);
  const exo = eq.map((i) => defs.items[i.itemHash]).filter((x) => x?.q === 6 && (x.t === 2 || x.t === 3));
  const a = st?.mergedAllCharacters?.merged?.allTime || {};
  const pve = st?.mergedAllCharacters?.results?.allPvE?.allTime || {};
  const v = (o, x) => o?.[x]?.basic?.value || 0;
  truppInfo[name] = { zeit: Date.now(), k, privat: !pr?.characters?.data, klasse: c ? KL[c.classType] : '', licht: c?.light || 0, emblem: c?.emblemBackgroundPath || '', sub, exo,
    std: v(a, 'secondsPlayed') / 3600, kills: v(a, 'kills'), kd: v(a, 'killsDeathsRatio'), pveKd: v(pve, 'killsDeathsRatio'), clears: v(pve, 'activitiesCleared') };
  return truppInfo[name];
}
function truppKartenHtml() {
  if (!trupp?.length) return '';
  return `<div class="tkarten">${trupp.map((n) => { const t = truppInfo[n]; if (!t) return `<div class="tkarte"><b>${esc(n.split('#')[0])}</b><small>Loading…</small></div>`;
    return `<div class="tkarte" style="${t.emblem ? `--emb:url(${BILD}${t.emblem})` : ''}"><div class="tk-kopf"><b>${esc(n.split('#')[0])}</b><span>${esc(t.klasse)} ${t.licht ? `✦ ${t.licht}` : ''}</span></div>
      ${t.privat ? '<small>Profile is private – only account stats.</small>' : `<div class="tk-zeile">${t.sub ? `<i class="wic" style="background-image:url(${BILD}${t.sub.i})" title="${esc(t.sub.n)}"></i>` : ''}${t.exo.map((x) => `<i class="wic" style="background-image:url(${BILD}${x.i})" title="${esc(x.n)}"></i>`).join('')}<small>${esc([t.sub?.n, ...t.exo.map((x) => x.n)].filter(Boolean).join(' · '))}</small></div>`}
      <div class="tk-werte"><span><b>${zahl(t.std)}</b> h</span><span><b>${zahl(t.kills)}</b> kills</span><span>K/D <b>${t.kd.toFixed(2)}</b></span><span>PvE K/D <b>${t.pveKd.toFixed(2)}</b></span><span><b>${zahl(t.clears)}</b> clears</span></div></div>`; }).join('')}</div>`;
}
// Einsatztrupp verfolgen: übernimmt alle Mitglieder in den Vergleich, lädt Kurzprofile und den großen Vergleich.
async function truppVerfolgen(haupt, k, erzwingen) {
  const t = await aktuellerTrupp(k); trupp = t;
  const key = [...t].sort().join('|');
  const neu = key !== truppKey; truppKey = key;
  if (t.length && (erzwingen || (truppAuto && neu))) {
    vergleich = new Set(t); truppNeu(haupt);
    await Promise.all(t.map((n) => truppKarte(n).catch(() => null)));
    truppNeu(haupt);
    const box = haupt.querySelector('.vglbox'); if (box) vergleichZeigen(box, tipDaten.ich, tipDaten.k);
  } else truppNeu(haupt);
}
function mitspieler(d, ich) {
  const z = new Map();
  for (const l of d.laeufe) { const p = pgcrLies()[l.id]; if (!p) continue; for (const [n] of p.p) if (n !== ich) z.set(n, (z.get(n) || 0) + 1); }
  return [...z].sort((a, b) => b[1] - a[1]);
}
let vergleich = new Set();
let truppNeu = () => {};
let vglHtml = '';
function truppBlock(d, ich, eigen) {
  const fav = favs();
  const mit = mitspieler(d, ich);
  const chip = (n, extra = '') => `<span class="pchip ${vergleich.has(n) ? 'an' : ''}"><button data-ansehen="${esc(n)}" title="View stats">${esc(n.split('#')[0])}<small>#${esc(n.split('#')[1] || '')}</small>${extra}</button><button data-fav="${esc(n)}" title="Favorite">${fav.includes(n) ? '★' : '☆'}</button><button data-vgl="${esc(n)}" title="Compare">⇄</button></span>`;
  return `${eigen ? `<h4>Fireteam right now ${truppAkt ? `<small>· ${esc(truppAkt)}</small>` : ''}</h4><div class="trupp-steuer"><button class="haupt-knopf" data-truppjetzt-los>⟳ Track my fireteam now</button><label class="zf-cb"><input type="checkbox" data-truppauto ${truppAuto ? 'checked' : ''}> automatic (checks every minute)</label></div>${truppKartenHtml()}<div class="chips" data-truppjetzt>${trupp == null ? '<span class="leer klein">Checking…</span>' : trupp.length ? trupp.map((n) => chip(n)).join('') : '<span class="leer klein">Not in a fireteam (or offline).</span>'}</div>` : ''}
    ${fav.length ? `<h4>Favorites</h4><div class="chips">${fav.map((n) => chip(n)).join('')}</div>` : ''}
    <h4>Played with most <small>top ${Math.min(8, mit.filter(([, c]) => c >= 3).length)} · <a href="#" data-zuhueter>all guardians, friends & groups ↗</a></small></h4><div class="chips">${mit.filter(([, c]) => c >= 3).slice(0, 8).map(([n, c]) => chip(n, `<span class="hz-info" data-info="${c} raid & dungeon runs together">${c}×</span>`)).join('') || '<span class="leer klein">Appears once your reports are loaded.</span>'}</div>
    ${vergleich.size ? `<p><button class="haupt-knopf" data-vergleich>Compare ${vergleich.size + 1} guardians</button> <button class="chip klein" data-vglweg>clear</button></p>` : '<p class="leer klein">⇄ adds a guardian to the comparison.</p>'}
    <div class="vglbox">${vglHtml}</div>`;
}
// Großer Vergleich: alle Kennzahlen nebeneinander, Bestwert hervorgehoben.
async function vergleichZeigen(box, ich, kIch) {
  const setze = (h) => { vglHtml = h; const b = document.querySelector('.vglbox'); if (b) b.innerHTML = h; };
  setze('<p class="leer pgcrstand">Loading every guardian… (raid & dungeon histories take a moment)</p>');
  const wer = [{ name: ich, k: kIch }];
  for (const n of vergleich) { try { wer.push({ name: n, k: await loeseName(n) }); } catch (e) { wer.push({ name: n, fehler: e.message }); } }
  const daten = await Promise.all(wer.map(async (w) => (w.fehler ? w : { ...w, d: await lade(w.k, false).catch((e) => ({ fehler: e.message })) })));
  const ok = daten.filter((x) => x.d && !x.d.fehler);
  const wv = (d, k) => wert(d.alle, k);
  const ausw = new Map(ok.map((x) => [x.name, auswerten(x.d.laeufe)]));
  const sum = (x, art, f) => ausw.get(x.name).filter((e) => e.art === art).reduce((a, e) => a + e[f], 0);
  const seals = (x) => siegel(x.d).okJetzt;
  const zeilen = [
    ['Overview'],
    ['Time played', (x) => wv(x.d, 'secondsPlayed') / 3600, (v) => `${zahl(v)} h`],
    ['Kills', (x) => wv(x.d, 'kills'), zahl], ['Deaths', (x) => wv(x.d, 'deaths'), zahl, true], ['K/D', (x) => wv(x.d, 'killsDeathsRatio'), (v) => v.toFixed(2)],
    ['Precision kills %', (x) => (wv(x.d, 'precisionKills') / Math.max(1, wv(x.d, 'kills'))) * 100, (v) => `${v.toFixed(0)}%`],
    ['Activities cleared', (x) => wv(x.d, 'activitiesCleared'), zahl], ['Titles earned (obtainable)', seals, zahl],
    ['Longest kill spree', (x) => wv(x.d, 'longestKillSpree'), zahl], ['Longest single life', (x) => wv(x.d, 'longestSingleLife'), dauer],
    ['Revives given', (x) => wv(x.d, 'resurrectionsPerformed'), zahl], ['Suicides', (x) => wv(x.d, 'suicides'), zahl, true],
    ['Raids'],
    ['Raid clears', (x) => sum(x, 'raid', 'clears'), zahl], ['Raid full clears', (x) => sum(x, 'raid', 'voll'), zahl], ['Raid flawless', (x) => sum(x, 'raid', 'flawless'), zahl], ['Raid master', (x) => sum(x, 'raid', 'master'), zahl], ['Raid lowman', (x) => sum(x, 'raid', 'trio') + sum(x, 'raid', 'duo') + sum(x, 'raid', 'solo'), zahl],
    ['Dungeons'], ['Dungeon clears', (x) => sum(x, 'dungeon', 'clears'), zahl], ['Dungeon flawless', (x) => sum(x, 'dungeon', 'flawless'), zahl], ['Dungeon solo', (x) => sum(x, 'dungeon', 'solo'), zahl], ['Dungeon solo flawless', (x) => sum(x, 'dungeon', 'soloFl'), zahl],
    ['PvP'],
    ['PvP K/D', (x) => wert(x.d.pvp, 'killsDeathsRatio'), (v) => v.toFixed(2)], ['PvP KDA', (x) => wert(x.d.pvp, 'killsDeathsAssists'), (v) => v.toFixed(2)],
    ['Matches', (x) => wert(x.d.pvp, 'activitiesEntered'), zahl], ['Win rate', (x) => (wert(x.d.pvp, 'activitiesWon') / Math.max(1, wert(x.d.pvp, 'activitiesEntered'))) * 100, (v) => `${v.toFixed(0)}%`],
    ['Kills by type'],
    ...['Super', 'Grenade', 'Melee', 'Hand Cannon', 'Auto Rifle', 'Pulse Rifle', 'Scout Rifle', 'Submachine Gun', 'Sidearm', 'Bow', 'Shotgun', 'Sniper Rifle', 'Fusion Rifle', 'Trace Rifle', 'Grenade Launcher', 'Rocket Launcher', 'Machine Gun', 'Sword', 'Glaive'].map((t) => [t, (x) => x.d.typen.find((y) => y.n === t)?.kills || 0, zahl]),
  ];
  const raidNamen = [...new Set(ok.flatMap((x) => ausw.get(x.name).map((e) => `${e.art}|${e.n}`)))].sort();
  const proArt = (art) => raidNamen.filter((rn) => rn.startsWith(`${art}|`)).map((rn) => { const n = rn.split('|')[1]; return [n, (x) => ausw.get(x.name).find((e) => e.art === art && e.n === n)?.clears || 0, zahl]; });
  zeilen.push(['Clears per raid'], ...proArt('raid'), ['Clears per dungeon'], ...proArt('dungeon'));
  setze(`<div class="vgl"><table class="vtab"><thead><tr><th></th>${daten.map((x) => `<th>${esc(x.name.split('#')[0])}${x.fehler || x.d?.fehler ? `<small>${esc(x.fehler || x.d.fehler)}</small>` : ''}</th>`).join('')}</tr></thead><tbody>
    ${zeilen.map((z) => { if (z.length === 1) return `<tr class="vgruppe"><td colspan="${daten.length + 1}">${esc(z[0])}</td></tr>`; const [t, f, fmt, weniger] = z; const werte = daten.map((x) => (x.d && !x.d.fehler ? f(x) : null)); const gut = werte.filter((v) => v != null); const best = gut.length ? (weniger ? Math.min(...gut) : Math.max(...gut)) : null; const max = Math.max(1, ...gut); return `<tr><td>${esc(t)}</td>${werte.map((v) => `<td class="${v === best && gut.length > 1 && v > 0 ? 'best' : ''}">${v == null ? '–' : fmt(v)}<i style="width:${(v / max) * 100}%"></i></td>`).join('')}</tr>`; }).join('')}</tbody></table></div>`);
}

let fremd = null; // { membershipType, membershipId, name }
let tipDaten = null;

// ---------- Schnittstellen für den Hüter-Tab ----------
let fremdWunsch = null, autoVergleich = false;
export function zeigeFremd(name) { fremdWunsch = name; }
export function vergleicheMit(namen) { vergleich = new Set(namen); autoVergleich = true; fremd = null; }
export async function aktuellerTruppNamen(k) { return aktuellerTrupp(k); }
// Wie oft du mit wem Raids/Dungeons gespielt hast (aus den Spielberichten); lädt fehlende Berichte nach und meldet Zwischenstände.
export async function mitspielerVon(zustand, zwischendurch) {
  const k = zustand.konto, ich = k.name || '';
  let d = caches.get(`${k.membershipType}:${k.membershipId}`)?.daten || await gespeicherteStats(k);
  const frisch = lade(k, true, zustand);
  if (!d) d = await frisch; else frisch.then((x) => { d = x; zwischendurch?.(); }).catch(() => {});
  const zaehle = () => {
    const z = new Map(); let fehlt = 0;
    for (const l of d.laeufe) { const p = pgcrLies()[l.id]; if (!p) { if (l.ok) fehlt++; continue; }
      for (const [n] of p.p) if (n && n !== ich) { const e = z.get(n) || { name: n, mal: 0, zuletzt: '' }; e.mal++; if (!e.zuletzt || l.t > e.zuletzt) e.zuletzt = l.t; z.set(n, e); } }
    const l = [...z.values()]; l.laedt = fehlt > 0; return l;
  };
  const erst = zaehle();
  if (erst.laedt) { const h = { dataset: { lauf: 'hueter' } }; pgcrNachladen(d, () => zwischendurch?.(), 'hueter', h).then(() => zwischendurch?.()); }
  return zaehle; // aufrufen für den aktuellen Stand
}

export async function zeigeStats(haupt, zustand) {
  if (fremdWunsch) { const n = fremdWunsch; fremdWunsch = null; try { fremd = await loeseName(n); } catch (e) { fremd = null; } }
  const lauf = (haupt.dataset.lauf = String(Number(haupt.dataset.lauf || 0) + 1));
  const k = fremd || zustand.konto;
  const name = fremd ? fremd.name : 'you';
  haupt.innerHTML = `<h1>Stats</h1><div class="kpis lade-skelett">${'<div class="kpi"><small>&nbsp;</small><b>&nbsp;</b><span>&nbsp;</span></div>'.repeat(6)}</div><p class="leer lade-zeile"><i class="spinner"></i> Reading ${fremd ? esc(fremd.name) + '’s' : 'your'} history from Bungie… (first time takes a few seconds, then it’s instant)</p>`;
  let d = null, ausCache = false;
  const imSpeicher = caches.get(`${k.membershipType}:${k.membershipId}`);
  const frisch = lade(k, !fremd, zustand);
  if (!fremd && !imSpeicher) { const [g] = await Promise.all([gespeicherteStats(k), ladeStatDefs()]); if (g) { d = g; ausCache = true; } }
  if (!d) { try { d = await frisch; } catch (e) { haupt.innerHTML = `<h1>Stats</h1>${suchzeile()}<p class="leer">${esc(e.message)}</p>`; verbinde(haupt, zustand); return; } }
  if (haupt.dataset.lauf !== lauf) return;
  const zeichne = () => {
    const ws = auswerten(d.laeufe);
    const raids = ws.filter((e) => e.art === 'raid'), dungeons = ws.filter((e) => e.art === 'dungeon');
    tipDaten = { d, ws, ich: fremd ? fremd.name : (zustand.konto.name || ''), k };
    const maxTag = Math.max(1, ...d.tage.map((t) => t.s));
    const waffenT = d.typen.filter((t) => !t.faehig), faehig = d.typen.filter((t) => t.faehig);
    const maxTyp = Math.max(1, ...waffenT.map((t) => t.kills));
    const sieg = wert(d.pvp, 'activitiesEntered') ? Math.round((wert(d.pvp, 'activitiesWon') / wert(d.pvp, 'activitiesEntered')) * 100) : 0;
    const killsAlle = wert(d.alle, 'kills');
    const ichName = tipDaten.ich;
    const sg = siegel(d);
    const exo = d.waffen.filter((w) => w.exotic).sort((a, b) => b.kills - a.kills);
    const leg = d.waffen.filter((w) => !w.exotic && w.kills > 0).sort((a, b) => b.kills - a.kills);
    const staub = d.waffen.filter((w) => !w.exotic && w.kopien && !w.tracker).slice(0, 24);
    const meist = [...d.waffen].sort((a, b) => b.kills - a.kills)[0];
    const offen = pgcrOffen(d);
    const wkachel = (w) => `<div class="tw ${w.exotic ? 'exo' : ''}"><i data-ih="${w.h}" style="background-image:url(${BILD}${w.icon})"></i><div><b>${esc(w.name)}</b><small>${zahl(w.kills)} kills${w.praez ? ` · ${Math.round((w.praez / Math.max(1, w.kills)) * 100)}% precision` : ''}${w.quelle === 'Kill tracker' ? ' · tracker' : ''}</small></div></div>`;
    haupt.innerHTML = `<div class="kopf"><h1>Stats</h1><span class="platz"></span><small class="leer">${fremd ? `Viewing <b>${esc(fremd.name)}</b> · <button class="chip" data-ich>back to me</button>` : 'All characters, including deleted ones'}</small></div>
      ${suchzeile()}
      <div class="kpis">${kachel('Time played', stunden(wert(d.alle, 'secondsPlayed')), `PvE ${stunden(wert(d.pve, 'secondsPlayed'))} · PvP ${stunden(wert(d.pvp, 'secondsPlayed'))}`)}
        ${kachel('Kills', zahl(killsAlle), `PvE ${zahl(wert(d.pve, 'kills'))} · PvP ${zahl(wert(d.pvp, 'kills'))}`)}
        ${kachel('Deaths', zahl(wert(d.alle, 'deaths')), `K/D ${wert(d.alle, 'killsDeathsRatio').toFixed(2)} · ${Math.round((wert(d.alle, 'precisionKills') / Math.max(1, killsAlle)) * 100)}% precision`)}
        ${kachel('Activities cleared', zahl(wert(d.alle, 'activitiesCleared')), `${zahl(wert(d.alle, 'activitiesEntered'))} entered`)}
        ${kachel('Seals', `${sg.okJetzt}/${sg.nJetzt}`, `obtainable titles · +${sg.okAlt} legacy`)}
        ${kachel('PvP', `${sieg}% wins`, `K/D ${wert(d.pvp, 'killsDeathsRatio').toFixed(2)} · ${zahl(wert(d.pvp, 'activitiesEntered'))} matches`)}</div>
      ${offen ? `<p class="leer klein pgcrstand">Checking ${zahl(offen)} raid/dungeon reports for full clears, flawless and teams… (saved in this browser, only once)</p>` : ''}
      ${block('trupp', 'Fireteam & compare', 'view or compare everyone you play with', truppBlock(d, ichName, !fremd), istOffen('trupp', true))}
      ${block('seal', 'Seals & titles', `${sg.okJetzt}/${sg.nJetzt} obtainable · ${sg.okAlt}/${sg.nAlt} legacy · hover for what's missing, click for all triumphs`, sg.html, istOffen('seal', true))}
      <div class="sbreit">${block('raid', 'Raids', `${zahl(raids.reduce((a, e) => a + e.clears, 0))} clears · click a raid for every run`, tabelleLaeufe('Raids', raids, d, 'raid'), istOffen('raid', true))}
      ${block('dungeon', 'Dungeons', `${zahl(dungeons.reduce((a, e) => a + e.clears, 0))} clears`, tabelleLaeufe('Dungeons', dungeons, d, 'dungeon'), istOffen('dungeon', true))}</div>
      ${block('waffen', 'Weapons', meist ? `most used: ${esc(meist.name)}` : '', `<div class="zwei"><div><h4>Top exotics <small>Bungie counts every kill</small></h4><div class="twaffen">${exo.slice(0, 12).map(wkachel).join('')}</div></div>
          <div><h4>Top legendaries <small>${fremd ? 'only visible for your own account' : 'from the kill trackers on copies you own'}</small></h4><div class="twaffen">${leg.slice(0, 12).map(wkachel).join('') || '<p class="leer klein">No kill trackers found.</p>'}</div></div></div>
          ${staub.length ? `<h4>Collecting dust <small>legendaries you keep but never got a kill with (on these copies)</small></h4><div class="chips">${staub.map((w) => `<span class="chip" data-ih="${w.h}">${esc(w.name)}</span>`).join('')}</div>` : ''}`, istOffen('waffen', true))}
      ${block('typen', 'Kills by weapon type', `${zahl(waffenT.reduce((a, t) => a + t.kills, 0))} weapon + ${zahl(faehig.reduce((a, t) => a + t.kills, 0))} ability + ${zahl(Math.max(0, killsAlle - d.typen.reduce((a, t) => a + t.kills, 0)))} other (relics, vehicles, turrets…) = ${zahl(killsAlle)} kills`, `<div class="zwei"><div>${waffenT.map((t) => `<div class="tbar" ${TYP_HILFE[t.n] ? `title="${esc(TYP_HILFE[t.n])}"` : ''}><span>${esc(t.n)}${TYP_HILFE[t.n] ? ' ⓘ' : ''}</span><i><b style="width:${(t.kills / maxTyp) * 100}%"></b></i><em>${zahl(t.kills)}${t.praez ? `<small> · ${Math.round((t.praez / t.kills) * 100)}% prec.</small>` : ''}</em></div>`).join('')}</div>
          <div><h4>Abilities</h4>${faehig.map((t) => `<div class="tbar" title="${esc(TYP_HILFE[t.n] || '')}"><span>${esc(t.n.replace(' Kills', ''))}${TYP_HILFE[t.n] ? ' ⓘ' : ''}</span><i><b style="width:${(t.kills / Math.max(1, faehig[0]?.kills || 1)) * 100}%"></b></i><em>${zahl(t.kills)}</em></div>`).join('')}</div></div>`, istOffen('typen', false))}
      ${block('zeit', 'Where your time went', `${stunden(wert(d.alle, 'secondsPlayed'))} in activities${d.orbit ? ` + ~${stunden(d.orbit)} orbit & menus` : ''} · click a category for details`, zeitBlock(d, raids, dungeons), istOffen('zeit', true))}
      <button class="mehr-leiste nur-einfach" data-alles>▸ Show everything – weapons, time, fun stats, all numbers</button>
      ${block('spass', 'Fun & odd stats', 'the stuff nobody asked for', spass(d), istOffen('spass', false))}
      ${block('tage', `Last ${TAGE} days`, `${(d.tage.reduce((a, t) => a + t.s, 0) / 3600).toFixed(1)} h played`, `<div class="tage">${d.tage.map((t) => { const h = t.s / 3600; const lbl = `${new Date(t.tag).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}: ${h ? `${h.toFixed(1)} h` : 'not played'}`; return `<div tabindex="0" data-h="${lbl}" aria-label="${lbl}"><em>${h >= 0.1 ? h.toFixed(1) : ''}</em><i style="height:${(t.s / maxTag) * 100}%"></i><small>${t.kurz}</small></div>`; }).join('')}</div>`, istOffen('tage', false))}
      ${block('rest', 'Everything else Bungie tracks', 'all remaining account stats and PvP medals', rest(d), istOffen('rest', false))}
      <div id="stip" class="stip" hidden></div>`;
  };
  zeichne();
  verbinde(haupt, zustand);
  // Aus dem Speicher gezeigt: frische Zahlen leise nachziehen (Scroll-Position und offene Blöcke bleiben).
  if (ausCache) frisch.then((x) => { if (haupt.dataset.lauf !== lauf) return; d = x; const y = scrollY; zeichne(); scrollTo({ top: y }); }).catch(() => {});
  truppNeu = (h) => { const b = h.querySelector('[data-blk=trupp]'); if (!b) return; const sum = b.querySelector('summary').outerHTML; b.innerHTML = sum + truppBlock(d, tipDaten.ich, !fremd); };
  if (autoVergleich && !fremd) { autoVergleich = false; setTimeout(() => { const b = haupt.querySelector('[data-blk=trupp]'); if (b) { b.open = true; b.scrollIntoView({ block: 'start' }); const box = b.querySelector('.vglbox'); if (box) vergleichZeigen(box, tipDaten.ich, tipDaten.k); } }, 50); }
  clearInterval(truppTimer);
  if (!fremd) {
    truppVerfolgen(haupt, k, false);
    truppTimer = setInterval(() => { if (haupt.dataset.lauf !== lauf || !haupt.querySelector('[data-blk=trupp]')) { clearInterval(truppTimer); return; } if (truppAuto && !document.hidden) truppVerfolgen(haupt, k, false); }, 60e3);
  }
  // Spielberichte im Hintergrund nachladen, Ansicht ab und zu auffrischen.
  pgcrNachladen(d, () => { if (haupt.dataset.lauf !== lauf) return; const offen = [...haupt.querySelectorAll('details.rzeile[open] .rn')].map((x) => x.firstChild?.textContent); const y = scrollY; zeichne(); haupt.querySelectorAll('details.rzeile').forEach((z) => { if (offen.includes(z.querySelector('.rn')?.firstChild?.textContent)) z.open = true; }); scrollTo({ top: y }); }, lauf, haupt);
}
const suchzeile = () => `<form class="ssuche" data-suche><input name="n" placeholder="View another Guardian: Name#1234" autocomplete="off" aria-label="Bungie name"><button class="chip">View</button></form>`;
// Nur Werte mit klarer Bedeutung und Einheit; Bungies Summen über alle Mitspieler o. Ä. bleiben weg.
const REST = [
  ['assists', 'Assists', 'kills you helped with'], ['opponentsDefeated', 'Opponents defeated', 'kills + assists'],
  ['efficiency', 'Efficiency', '(kills + assists) per death', 'r'], ['objectivesCompleted', 'Objectives completed', 'times'],
  ['fireteamActivities', 'Activities in a fireteam', 'activities'], ['activitiesEntered', 'Activities started', 'activities'],
  ['orbsDropped', 'Orbs of Power made', 'orbs'], ['orbsGathered', 'Orbs of Power picked up', 'orbs'],
  ['publicEventsCompleted', 'Public events completed', 'events'], ['heroicPublicEventsCompleted', 'Heroic public events', 'events'],
  ['resurrectionsPerformed', 'Revives given', 'revives'], ['resurrectionsReceived', 'Revives received', 'revives'],
  ['suicides', 'Self-kills', 'deaths'], ['weaponBestType', 'Best weapon type', '', 't'],
];
function rest(d) {
  const z = ([k, n, e, art]) => { const v = d.alle[k]; if (!v?.basic?.value && art !== 't') return ''; const w = art === 't' ? (v?.basic?.displayValue || '') : art === 'r' ? v.basic.value.toFixed(2) : zahl(v.basic.value); return w ? `<tr><td>${esc(n)}${e ? `<small> · ${esc(e)}</small>` : ''}</td><td>${esc(w)}</td></tr>` : ''; };
  const medal = Object.keys(d.alle).filter((k) => /^medal/i.test(k) && wert(d.alle, k));
  return `<div class="zwei"><table class="stab links">${REST.map(z).join('')}</table><div><h4>PvP medals <small>times earned</small></h4><table class="stab links">${medal.sort((a, b) => wert(d.alle, b) - wert(d.alle, a)).map((k) => `<tr><td>${esc(statName(k))}</td><td>${zahl(wert(d.alle, k))}×</td></tr>`).join('')}</table></div></div>`;
}
const pgcrOffen = (d) => { const c = pgcrLies(); return d.laeufe.filter((l) => l.ok && !c[l.id]).length; };
let ladeLauf = null;
async function pgcrNachladen(d, auffrischen, lauf, haupt) {
  if (ladeLauf === lauf) return; ladeLauf = lauf;
  const c = pgcrLies();
  // Kandidaten für Flawless zuerst (eigene Tode 0), dann der Rest – neueste zuerst.
  const offen = d.laeufe.filter((l) => l.ok && !c[l.id]).sort((a, b) => (a.tode === 0 ? 0 : 1) - (b.tode === 0 ? 0 : 1));
  let i = 0, seit = 0;
  const arbeiter = async () => {
    while (i < offen.length && haupt.dataset.lauf === lauf) {
      const l = offen[i++];
      try { await pgcrKurz(l.id); } catch { await new Promise((r) => setTimeout(r, 1500)); }
      if (++seit >= 25) { seit = 0; auffrischen(); }
    }
  };
  await Promise.all(Array.from({ length: 12 }, arbeiter));
  if (haupt.dataset.lauf === lauf && offen.length) auffrischen();
}

function verbinde(haupt, zustand) {
  const tip = () => haupt.querySelector('#stip');
  const zeige = (el, html) => { const t = tip(); if (!t) return; t.innerHTML = html; t.hidden = false; const r = el.getBoundingClientRect(); const w = Math.min(320, innerWidth - 16); const z = d2aZ(); t.style.width = `${w / z}px`; t.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) / z}px`; const h = t.getBoundingClientRect().height; t.style.top = `${(r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8) / z}px`; };
  const inhalt = (el) => {
    if (!tipDaten) return '';
    if (el.dataset.tipl) { const [n, i] = el.dataset.tipl.split('|'); const e = tipDaten.ws.find((x) => x.n === n); return e ? punktTip(e.laeufe[Number(i)]) : ''; }
    if (el.dataset.tips) return sealTip(el.dataset.tips, tipDaten.d);
    return '';
  };
  haupt.onmouseover = (e) => { const el = e.target.closest('[data-tipl],[data-tips]'); if (el) zeige(el, inhalt(el)); };
  haupt.onmouseout = (e) => { if (e.target.closest('[data-tipl],[data-tips]') && tip()) tip().hidden = true; };
  haupt.onclick = (e) => {
    const p = e.target.closest('[data-tipl]'); if (p) { zeige(p, inhalt(p)); return; }
    const s = e.target.closest('[data-seal]');
    if (s) { const box = s.closest('details').querySelector('.sealdetail'); const gleich = box.dataset.h === s.dataset.seal && !box.hidden; box.hidden = gleich; box.dataset.h = s.dataset.seal; if (!gleich) { box.innerHTML = sealDetail(s.dataset.seal, tipDaten.d); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } return; }
    const wc = e.target.closest('[data-wikichal]');
    if (wc) { import('./app.js').then((m) => m.springeWiki('chal', wc.dataset.wikichal)); return; }
    if (e.target.closest('[data-ich]')) { fremd = null; zeigeStats(haupt, zustand); return; }
    const an = e.target.closest('[data-ansehen]');
    if (an) { loeseName(an.dataset.ansehen).then((x) => { fremd = x; scrollTo({ top: 0 }); zeigeStats(haupt, zustand); }).catch((err) => { an.title = err.message; an.classList.add('fehler'); }); return; }
    const fv = e.target.closest('[data-fav]');
    if (fv) { const l = favs(); const n = fv.dataset.fav; setzeFavs(l.includes(n) ? l.filter((x) => x !== n) : [...l, n]); fv.textContent = favs().includes(n) ? '★' : '☆'; return; }
    const vg = e.target.closest('[data-vgl]');
    if (vg) { const n = vg.dataset.vgl; vergleich.has(n) ? vergleich.delete(n) : vergleich.add(n); truppNeu(haupt); return; }
    if (e.target.closest('[data-alles]')) { import('./konto.js').then((m) => m.setzeModus('voll')); return; }
    if (e.target.closest('[data-zuhueter]')) { e.preventDefault(); window.dispatchEvent(new CustomEvent('d2a-tab', { detail: 'hueter' })); return; }
    if (e.target.closest('[data-vglweg]')) { vergleich.clear(); truppNeu(haupt); return; }
    if (e.target.matches('[data-truppauto]')) { truppAuto = e.target.checked; try { localStorage.setItem('d2a.truppAuto', truppAuto ? '1' : '0'); } catch {} if (truppAuto) { truppKey = ''; truppVerfolgen(haupt, tipDaten.k, false); } return; }
    const tj = e.target.closest('[data-truppjetzt-los]');
    if (tj) { tj.disabled = true; tj.textContent = 'Checking fireteam…'; truppVerfolgen(haupt, tipDaten.k, true).then(() => { if (!trupp?.length) { const b = haupt.querySelector('[data-truppjetzt-los]'); if (b) b.textContent = 'Not in a fireteam right now'; } }); return; }
    if (e.target.closest('[data-vergleich]')) { vergleichZeigen(haupt.querySelector('.vglbox'), tipDaten.ich, tipDaten.k); return; }
    if (!e.target.closest('#stip') && tip()) tip().hidden = true;
  };
  haupt.addEventListener('toggle', (e) => { const b = e.target.closest?.('[data-blk]'); if (b && e.target === b) { offenStand[b.dataset.blk] = b.open; try { localStorage.setItem('d2a.statsOffen', JSON.stringify(offenStand)); } catch {} } }, true);
  const f = haupt.querySelector('[data-suche]');
  f?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roh = f.n.value.trim(); const m = roh.match(/^(.+)#(\d{1,4})$/);
    if (!m) { f.n.value = ''; f.n.placeholder = 'Use the full Bungie name, e.g. Name#1234'; return; }
    try {
      const r = await bungie.post('/Destiny2/SearchDestinyPlayerByBungieName/-1/', { displayName: m[1], displayNameCode: Number(m[2]) });
      const x = (r || []).find((y) => !y.crossSaveOverride || y.crossSaveOverride === y.membershipType) || r?.[0];
      if (!x) { f.n.value = ''; f.n.placeholder = 'Nobody found with that name'; return; }
      fremd = { membershipType: x.membershipType, membershipId: x.membershipId, name: `${x.bungieGlobalDisplayName}#${String(x.bungieGlobalDisplayNameCode).padStart(4, '0')}` };
      zeigeStats(haupt, zustand);
    } catch (err) { f.n.value = ''; f.n.placeholder = err.message; }
  });
}
