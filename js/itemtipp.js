// Hover-Ansicht wie im Spiel: Kopf in Seltenheitsfarbe, Stat-Tabelle mit Balken, Perks nach Spalten,
// Rüstungs-Mods mit Energie, Stat-Mod, Set-Bonus und Exotic-Perk. Genutzt im Tresor und auf der Hüter-Seite.
import { defs } from './defs.js';
import { ARMOR_STATS } from './vault.js';
import { rollWert, rollBalken } from './rolls.js';
import { katBlock } from './katalysator.js';
import { perkRaster, perkSpalten, alleOptionen, PERK_LEGENDE, wendePerkAn } from './perks.js';

const BILD = 'https://www.bungie.net';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const satz = (t) => esc(String(t || '').split(/(?<=\.)\s/)[0]);
// Waffen-Stats in Spiel-Reihenfolge; Zahlen-Stats (ohne Balken) extra.
const WSTATS = ['Impact', 'Blast Radius', 'Velocity', 'Draw Time', 'Charge Time', 'Accuracy', 'Range', 'Stability', 'Handling', 'Reload Speed', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Recoil Direction', 'Swing Speed', 'Guard Efficiency', 'Guard Resistance', 'Charge Rate', 'Ammo Capacity', 'Shield Duration', 'Heat Generated', 'Vent Speed', 'Persistence'];
const ZAHLEN = ['Rounds Per Minute', 'Magazine'];
const ENERGIE = 3578062600;

// Was ein Waffen-Stat bewirkt – für die Hover-Infos an jeder Stat-Zeile.
export const STAT_INFO = {
  Impact: 'Damage per hit. Mostly fixed by the weapon frame.', Range: 'How far the weapon keeps full damage and aim assist before falloff.', Stability: 'Less recoil kick and screen shake while firing.',
  Handling: 'How fast you ready, stow and aim down sights.', 'Reload Speed': 'How fast the weapon reloads.', 'Aim Assistance': 'How strongly shots are pulled towards targets (bullet magnetism).',
  'Airborne Effectiveness': 'Accuracy and aim assist while you are in the air.', Zoom: 'Magnification while aiming; also stretches range a little.', 'Recoil Direction': 'How vertical the recoil is. Values ending in 0 or 5 (and close to 100) kick straight up.',
  'Rounds Per Minute': 'Fire rate.', Magazine: 'Shots before reloading.', 'Blast Radius': 'Size of the explosion.', Velocity: 'Projectile speed.', 'Charge Time': 'Time to charge a shot (lower = faster, slightly less damage).',
  'Draw Time': 'Time to fully draw the bow (lower = faster).', Accuracy: 'How precisely arrows fly and how forgiving the aim is.', 'Swing Speed': 'Sword attack speed.', 'Guard Efficiency': 'How little energy guarding costs.',
  'Guard Resistance': 'Damage reduction while guarding.', 'Charge Rate': 'How fast sword energy recharges.', 'Ammo Capacity': 'Reserve ammo you can carry.', 'Shield Duration': 'How long a glaive shield lasts.', 'Ammo Generation': 'How quickly this weapon creates special/heavy ammo progress.',
  Health: 'More health and flinch resistance; orbs heal you.', Melee: 'Melee ability recharges faster; above 100 it also hits harder.', Grenade: 'Grenade recharges faster; above 100 it also hits harder.',
  Super: 'Super charges faster; above 100 it also deals more damage.', Class: 'Class ability recharges faster; above 100 you gain an overshield on use.', Weapons: 'Faster reload and handling, more weapon damage; above 100 extra ammo and boss damage.',
};
let sIcons = null;
export const statIcon = (n) => { if (!sIcons) { sIcons = {}; for (const v of Object.values(defs.stats || {})) if (v.i && !sIcons[v.n]) sIcons[v.n] = v.i; } return sIcons[n] ? `<img class="sti" src="${BILD}${sIcons[n]}" alt="">` : ''; };
const ti = (n) => (STAT_INFO[n] ? ` data-tip="${esc(`<b>${n}</b><br>${STAT_INFO[n]}`)}"` : '');
// Urteil (behalten / weg / Infusion) als Zeile mit Begründung.
export const URTEIL_NAME = { junk: 'Can go', infuse: 'Infusion fuel', best: 'Best copy', keep: 'Keep', frei: 'No verdict' };
export const urteilZeile = (it) => (it.urteil?.grund ? `<div class="urteil u-${it.urteil.art}" data-tip="${esc('This is the app’s clean-up suggestion. It only ever marks true duplicates or clearly outclassed pieces – you decide. Rules: Weapons → filter “Clean-up”.')}"><b>${URTEIL_NAME[it.urteil.art] || 'Keep'}</b><span>${esc(it.urteil.grund)}</span></div>` : '');

export function itemTipp(it, profil) {
  const d = it.d;
  const st = profil?.itemComponents?.stats?.data?.[it.id]?.stats || {};
  const name = (h) => defs.stats?.[h]?.n;
  const plugs = (it.sockel || it.plugs || []).filter(Boolean).map((p) => [p, defs.items[p]]).filter(([, x]) => x);
  const klasse = d.q === 6 ? 'exo' : d.q === 5 ? 'leg' : 'sel';
  const wo = it.ort ? (it.ort === 'tresor' ? 'Vault' : it.ort.startsWith('post:') ? 'Postmaster' : it.m?.ort || 'Character') + (it.angelegt ? ' · equipped' : '') : '';
  let html = `<div class="itwrap"><div class="it-kopf ${klasse}"><b class="zuwiki" data-zuwiki="${it.hash}" data-tip="Open ${esc(d.n)} in the wiki">${esc(d.n)}</b><span>${esc(d.k)}${d.t === 3 && d.a ? ` · ${['', 'Primary', 'Special', 'Heavy'][d.a]} ammo` : ''}${it.tier ? ` · Tier ${it.tier}` : ''}${wo ? ` · ${esc(wo)}` : ''}${it.locked ? ' · locked' : ''}</span>${it.power ? `<em>${it.power}</em>` : ''}</div><div class="it-rumpf">${urteilZeile(it)}${it.kills ? `<div class="it-kills"><b>${it.kills.toLocaleString()}</b> kills <small>kill tracker</small></div>` : ''}`;
  if (d.t === 3) {
    const werte = Object.values(st).map((s) => [name(s.statHash), s.value]).filter(([n]) => n);
    const balken = WSTATS.map((n) => werte.find(([w]) => w === n)).filter(Boolean);
    const zahl = ZAHLEN.map((n) => werte.find(([w]) => w === n)).filter(Boolean);
    const sp = perkSpalten(it, profil);
    if (d.q !== 6) html += rollBalken(rollWert(it.hash, it.plugs || [], alleOptionen(it, profil)));
    if (sp.length) html += `<div class="it-pk">${perkRaster(it, profil)}<div class="it-desc" data-leer="Move the mouse onto a perk to read it. Click a dimmed perk to switch to it."></div>${d.q !== 6 ? PERK_LEGENDE : ''}</div>`;
    if (d.xd) html += `<p class="tt"><b class="tgold">${esc(d.xp || 'Exotic perk')}</b> ${esc(d.xd)}</p>`;
    if (d.q === 6) html += katBlock(it.hash, it, profil, { kurz: true });
    const mods = plugs.filter(([, x]) => /^v400\.weapon\.mod_|weapon\.mod_|^masterworks/.test(x.pc || '') && x.i && !/^Empty/.test(x.n) && !/ Catalyst$/.test(x.n));
    if (mods.length) html += `<div class="it-mods">${mods.map(([, x]) => `<span data-tip="${esc(`<b>${x.n}</b><br>${x.d || ''}`)}"><i style="background-image:url(${BILD}${x.i})"></i>${esc(x.n)}</span>`).join('')}</div>`;
    if (balken.length || zahl.length) html += `<div class="it-stats zweisp">${balken.map(([n, v]) => `<div${ti(n)}><small>${esc(n)}</small><i><u style="width:${Math.min(100, v)}%"></u></i><b>${v}</b></div>`).join('')}${zahl.map(([n, v]) => `<div class="zahl"${ti(n)}><small>${esc(n)}</small><b>${v}</b></div>`).join('')}</div>`;
  } else if (d.t === 2) {
    if (it.tippExtra) html += it.tippExtra;
    if (it.st) html += `<div class="it-stats mitic">${ARMOR_STATS.map((n) => `<div${ti(n)}><small>${statIcon(n)}${n}</small><i><u style="width:${Math.min(100, (it.st[n] || 0) / 0.45)}%"></u></i><b>${it.st[n] || 0}</b></div>`).join('')}<div class="zahl"><small>Total</small><b>${it.st.Total}</b></div></div>`;
    if (d.xd) html += `<p class="tt"><b class="tgold">${esc(d.xp || 'Exotic perk')}</b> ${esc(d.xd)}</p>`;
    const mods = plugs.filter(([, x]) => /^enhancements\.v2_/.test(x.pc || ''));
    const kosten = mods.reduce((a, [, x]) => a + ((x.s || []).find(([h]) => Number(h) === ENERGIE)?.[1] || 0), 0);
    if (mods.length) html += `<div class="it-energie"><small>Armor energy</small><span>${Array.from({ length: Math.max(it.energie || 0, kosten) }, (_, i) => `<i class="${i < kosten ? 'voll' : ''}"></i>`).join('')}</span><b>${kosten}/${it.energie || '?'}</b></div>
      <div class="it-perks">${mods.map(([, x]) => { const leer = /^Empty|Mod Socket$/.test(x.n); const c = (x.s || []).find(([h]) => Number(h) === ENERGIE)?.[1]; return `<div class="${leer ? 'leer' : ''}"><i style="background-image:url(${BILD}${x.i})"></i><span><b>${leer ? 'Empty mod slot' : esc(x.n)}</b>${!leer && x.d ? ` <small>${esc(x.d)}</small>` : ''}</span>${c ? `<em>${c}</em>` : ''}</div>`; }).join('')}</div>`;
    const set = d.e ? defs.sets?.[d.e] : null;
    if (set) html += `<div class="tset"><b>${esc(set.n)}</b>${set.p.map((p) => `<span><em>${p.c}-piece · ${esc(p.n)}</em> ${esc(p.d)}</span>`).join('')}</div>`;
  }
  html += `<small class="thint">${it.tippExtra ? 'Click the piece to lock or exclude it' : d.t === 3 ? 'Move the mouse down into this window: hover a perk to read it, click it to switch · click the item for all actions' : 'Click the item for all actions'}</small></div></div>`;
  return html;
}

// Das Hover-Fenster ist „greifbar“: Maus hineinbewegen, Perks anfahren und lesen. Es schließt erst, wenn die Maus es verlässt.
function greifbar(tipp) {
  if (tipp._greif) return; tipp._greif = true;
  const roh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
  let t = 0;
  Object.defineProperty(tipp, 'hidden', { configurable: true, get() { return roh.get.call(this); }, set(v) {
    clearTimeout(t);
    if (!v || !this.querySelector('.itwrap')) return roh.set.call(this, v);
    t = setTimeout(() => { if (!this.matches(':hover')) roh.set.call(this, true); }, 160);
  } });
  tipp.addEventListener('pointerleave', () => { clearTimeout(t); if (tipp.querySelector('.itwrap')) roh.set.call(tipp, true); });
  tipp.addEventListener('pointerover', (e) => {
    const pk = e.target.closest('.pk'); const box = tipp.querySelector('.it-desc'); if (!pk || !box) return;
    const p = defs.items[pk.dataset.ph]; if (!p) return;
    tipp.querySelectorAll('.pk.zeig').forEach((x) => x.classList.remove('zeig')); pk.classList.add('zeig');
    box.innerHTML = `<b>${esc(p.n)}</b>${/Enhanced/i.test(p.k || '') ? ' <em>Enhanced</em>' : ''}${pk.classList.contains('an') ? ' <em class="akt">active</em>' : pk.dataset.s ? ' <em class="klick">click to switch</em>' : ''}<span>${esc(p.d || 'No description.')}</span>`;
  });
  // Klick auf einen Perk im Fenster: direkt im Spiel einsetzen, Fenster bleibt offen und zeigt den neuen Stand.
  tipp.addEventListener('click', async (e) => {
    const pk = e.target.closest('.pk[data-s]'); const it = tipp._it;
    if (!pk || !it || pk.classList.contains('an') || tipp.querySelector('.pk.laedt')) return;
    pk.classList.add('laedt');
    if (await wendePerkAn(it, tipp._profil, Number(pk.dataset.s), Number(pk.dataset.ph))) { if (tipp._it === it) tipp.innerHTML = itemTipp(it, tipp._profil); } else pk.classList.remove('laedt');
  });
  // Versehentliches Scrollen im Fenster soll die Seite dahinter nicht bewegen (sonst wäre das Fenster sofort weg).
  tipp.addEventListener('wheel', (e) => { if (tipp.scrollHeight <= tipp.clientHeight + 1) e.preventDefault(); }, { passive: false });
  tipp._zu = () => { clearTimeout(t); roh.set.call(tipp, true); };
}

// Tooltip zeigen. Mit el (die Kachel) dockt er direkt an die Kachel an, damit die Maus ohne Lücke hinüberkommt.
export function zeigeItemTipp(it, profil, x, y, el) {
  const tipp = document.querySelector('#tipp');
  if (!tipp || !it) return;
  greifbar(tipp);
  tipp._it = it; tipp._profil = profil;
  tipp.innerHTML = itemTipp(it, profil);
  tipp.hidden = false;
  const r = tipp.getBoundingClientRect();
  let links = x + 14, oben = y + 14;
  if (el) {
    // Unter der Kachel andocken (sonst darüber): Nachbar-Kacheln links/rechts bleiben frei anklickbar, nach unten geht es lückenlos ins Fenster.
    const k = el.getBoundingClientRect();
    links = k.left; oben = k.bottom - 2;
    if (oben + r.height > innerHeight - 8) oben = k.top - r.height + 2;
    if (oben < 8) { oben = Math.max(8, Math.min(k.top, innerHeight - r.height - 8)); links = k.right - 2; if (links + r.width > innerWidth - 8) links = k.left - r.width + 2; }
  }
  tipp.style.left = `${(Math.max(8, Math.min(links, innerWidth - r.width - 8))) / d2aZ()}px`;
  tipp.style.top = `${(Math.max(8, Math.min(oben, innerHeight - r.height - 8))) / d2aZ()}px`;
}
