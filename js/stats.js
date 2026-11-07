// Statistiken aus Bungies Spielverlauf: Spielzeit, PvE/PvP, Raids, Dungeons, Waffen, letzte 14 Tage.
import * as bungie from './bungie.js';
import { defs } from './defs.js';

const BILD = 'https://www.bungie.net';
const TAGE = 14;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const wert = (o, k) => o?.[k]?.basic?.value ?? 0;
const zahl = (n) => Math.round(n).toLocaleString();
const stunden = (s) => `${zahl(s / 3600)} h`;
const zeitText = (ms) => { if (!ms) return '–'; const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const lesbar = (k) => k.replace(/^weaponKills/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace('Submachinegun', 'SMG').replace('Side Arm', 'Sidearm');
let cache = null;

async function lade(zustand) {
  if (cache && Date.now() - cache.zeit < 60 * 60_000) return cache.daten;
  const k = zustand.konto;
  const basis = `/Destiny2/${k.membershipType}/Account/${k.membershipId}`;
  const konten = await bungie.get(`${basis}/Stats/?groups=1`);
  const pve = konten.mergedAllCharacters?.results?.allPvE?.allTime || {};
  const pvp = konten.mergedAllCharacters?.results?.allPvP?.allTime || {};
  const chars = (konten.characters || []).filter((c) => !c.deleted).map((c) => c.characterId);
  const raids = new Map(), dungeons = new Map(), waffen = new Map(), tage = new Map();
  const grenze = Date.now() - TAGE * 86400_000;
  const zusammen = (m, name, icon, a) => {
    const e = m.get(name) || { name, icon, clears: 0, schnellste: 0, sekunden: 0 };
    e.clears += wert(a.values, 'activityCompletions');
    e.sekunden += wert(a.values, 'activitySecondsPlayed');
    const ms = wert(a.values, 'fastestCompletionMsForActivity');
    if (ms > 0 && (!e.schnellste || ms < e.schnellste)) e.schnellste = ms;
    if (!e.icon && icon) e.icon = icon;
    m.set(name, e);
  };
  await Promise.all(chars.map(async (cid) => {
    const [agg, uw, verlauf] = await Promise.all([
      bungie.get(`${basis}/Character/${cid}/Stats/AggregateActivityStats/`).catch(() => null),
      bungie.get(`${basis}/Character/${cid}/Stats/UniqueWeapons/`).catch(() => null),
      bungie.get(`/Destiny2/${k.membershipType}/Account/${k.membershipId}/Character/${cid}/Stats/Activities/?count=250&mode=0&page=0`).catch(() => null),
    ]);
    for (const a of agg?.activities || []) {
      const d = defs.akt?.[a.activityHash];
      if (!d || !wert(a.values, 'activityCompletions')) continue;
      const name = d.n.split(':')[0].trim().replace(/^The Pantheon$/, 'Pantheon');
      const icon = d.i && !/missing_icon/.test(d.i) && !/pgcr/.test(d.i) ? d.i : '';
      if (d.g === 'Raids') zusammen(raids, name, icon, a);
      else if (d.g === 'Dungeons') zusammen(dungeons, name, icon, a);
    }
    for (const w of uw?.weapons || []) {
      const it = defs.items[w.referenceId];
      if (!it?.n) continue;
      const e = waffen.get(it.n) || { name: it.n, icon: it.i, kills: 0, praez: 0, exotic: it.q === 6 };
      e.kills += wert(w.values, 'uniqueWeaponKills');
      e.praez += wert(w.values, 'uniqueWeaponPrecisionKills');
      waffen.set(it.n, e);
    }
    for (const a of verlauf?.activities || []) {
      const t = new Date(a.period);
      if (t.getTime() < grenze) continue;
      const tag = t.toLocaleDateString('sv');
      tage.set(tag, (tage.get(tag) || 0) + wert(a.values, 'timePlayedSeconds'));
    }
  }));
  const tagListe = [];
  for (let n = TAGE - 1; n >= 0; n--) { const t = new Date(Date.now() - n * 86400_000); const tag = t.toLocaleDateString('sv'); tagListe.push({ tag, kurz: t.toLocaleDateString([], { weekday: 'short' }), s: tage.get(tag) || 0 }); }
  const typen = Object.keys(pve).filter((x) => /^weaponKills/.test(x) && !/Precision/.test(x)).map((x) => ({ name: lesbar(x), kills: wert(pve, x) + wert(pvp, x) })).filter((x) => x.kills > 0).sort((a, b) => b.kills - a.kills);
  const sort = (m) => [...m.values()].sort((a, b) => b.clears - a.clears);
  const daten = {
    zeit: wert(pve, 'secondsPlayed') + wert(pvp, 'secondsPlayed'),
    pve: { kills: wert(pve, 'kills'), kd: wert(pve, 'killsDeathsRatio'), clears: wert(pve, 'activitiesCleared'), praez: wert(pve, 'precisionKills'), zeit: wert(pve, 'secondsPlayed') },
    pvp: { kills: wert(pvp, 'kills'), kd: wert(pvp, 'killsDeathsRatio'), kda: wert(pvp, 'killsDeathsAssists'), spiele: wert(pvp, 'activitiesEntered'), siege: wert(pvp, 'activitiesWon'), zeit: wert(pvp, 'secondsPlayed') },
    raids: sort(raids), dungeons: sort(dungeons), typen, waffen: [...waffen.values()].sort((a, b) => b.kills - a.kills).slice(0, 18), tage: tagListe,
  };
  cache = { zeit: Date.now(), daten };
  return daten;
}

const kachel = (titel, gross, klein = '') => `<div class="kpi"><small>${titel}</small><b>${gross}</b>${klein ? `<span>${klein}</span>` : ''}</div>`;
const tabelle = (titel, liste) => liste.length ? `<section class="karte"><h3>${titel}</h3><table class="stab"><thead><tr><th></th><th>Clears</th><th>Fastest</th><th>Time</th></tr></thead><tbody>
  ${liste.map((r) => `<tr><td>${r.icon ? `<i style="background-image:url(${BILD}${r.icon})"></i>` : ''}${esc(r.name)}</td><td><b>${zahl(r.clears)}</b></td><td>${zeitText(r.schnellste)}</td><td>${stunden(r.sekunden)}</td></tr>`).join('')}</tbody></table></section>` : '';

export async function zeigeStats(haupt, zustand) {
  haupt.innerHTML = '<h1>Stats</h1><p class="leer">Reading your history from Bungie…</p>';
  let d;
  try { d = await lade(zustand); } catch (e) { haupt.innerHTML = `<h1>Stats</h1><p class="leer">${esc(e.message)}</p>`; return; }
  if (zustand.tab !== 'stats') return;
  const maxTag = Math.max(1, ...d.tage.map((t) => t.s));
  const maxTyp = Math.max(1, ...d.typen.map((t) => t.kills));
  const sieg = d.pvp.spiele ? Math.round((d.pvp.siege / d.pvp.spiele) * 100) : 0;
  haupt.innerHTML = `<div class="kopf"><h1>Stats</h1><span class="platz"></span><small class="leer">All characters · updates hourly</small></div>
    <div class="kpis">${kachel('Time played', stunden(d.zeit), `PvE ${stunden(d.pve.zeit)} · PvP ${stunden(d.pvp.zeit)}`)}
      ${kachel('PvE kills', zahl(d.pve.kills), `K/D ${d.pve.kd.toFixed(2)} · ${Math.round((d.pve.praez / Math.max(1, d.pve.kills)) * 100)}% precision`)}
      ${kachel('Activities cleared', zahl(d.pve.clears))}
      ${kachel('PvP K/D', d.pvp.kd.toFixed(2), `KDA ${d.pvp.kda.toFixed(2)} · ${zahl(d.pvp.kills)} kills`)}
      ${kachel('PvP win rate', `${sieg}%`, `${zahl(d.pvp.siege)} of ${zahl(d.pvp.spiele)} matches`)}</div>
    <section class="karte"><h3>Last ${TAGE} days</h3><div class="tage">${d.tage.map((t) => `<div title="${t.tag}: ${(t.s / 3600).toFixed(1)} h"><i style="height:${(t.s / maxTag) * 100}%"></i><small>${t.kurz}</small></div>`).join('')}</div></section>
    <div class="zwei">${tabelle('Raids', d.raids)}${tabelle('Dungeons', d.dungeons)}</div>
    <div class="zwei"><section class="karte"><h3>Kills by weapon type</h3>${d.typen.map((t) => `<div class="tbar"><span>${esc(t.name)}</span><i><b style="width:${(t.kills / maxTyp) * 100}%"></b></i><em>${zahl(t.kills)}</em></div>`).join('')}</section>
      <section class="karte"><h3>Top weapons</h3><div class="twaffen">${d.waffen.map((w) => `<div class="tw ${w.exotic ? 'exo' : ''}"><i style="background-image:url(${BILD}${w.icon})"></i><div><b>${esc(w.name)}</b><small>${zahl(w.kills)} kills · ${Math.round((w.praez / Math.max(1, w.kills)) * 100)}% precision</small></div></div>`).join('')}</div></section></div>`;
}
