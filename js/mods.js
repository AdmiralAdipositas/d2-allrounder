// Rüstungs-Mods (Armor 3.0) planen und stecken: welche Mods auf welches Teil, mit Energie-Grenze.
import { defs } from './defs.js';

export const SLOT_PC = { 3448274439: 'enhancements.v2_head', 3551918588: 'enhancements.v2_arms', 14239492: 'enhancements.v2_chest', 20886954: 'enhancements.v2_legs', 1585787867: 'enhancements.v2_class_item' };
const KOSTEN = 3578062600;
let katalog = null;
function kat() {
  if (katalog) return katalog;
  katalog = new Map();
  for (const [h, d] of Object.entries(defs.items)) {
    if (d.t !== 19 || !/^enhancements\.v2_/.test(d.pc || '') || /deprecated/i.test(d.k || '') || d.n === 'Locked Armor Mod') continue;
    const e = { hash: Number(h), n: d.n, pc: d.pc, i: d.i, d: d.d, kosten: (d.s || []).find(([s]) => s === KOSTEN)?.[1] || 0, leer: /^Empty/.test(d.n) };
    katalog.set(d.pc, [...(katalog.get(d.pc) || []), e]);
  }
  return katalog;
}
export const leerPlug = (pc) => (kat().get(pc) || []).find((m) => m.leer);

// Name aus einem Build ("Siphon", "Surge", "Firepower") auf den echten Mod abbilden, passend zum Element.
export function finde(name, element = '') {
  const alle = [...kat().values()].flat().filter((m) => !m.leer);
  const n = name.toLowerCase();
  const exakt = alle.filter((m) => m.n.toLowerCase() === n);
  if (exakt.length) return exakt[0];
  const teil = alle.filter((m) => m.n.toLowerCase().includes(n));
  if (!teil.length) return null;
  const el = element.toLowerCase();
  return teil.find((m) => el && m.n.toLowerCase().startsWith(el)) || teil.find((m) => /^harmonic/i.test(m.n)) || teil[0];
}

// Standard-Mods für einen Build ohne eigene Mod-Liste, nach Element und Stat-Fokus.
export function vorschlag(element, stats = [], text = '') {
  const el = element && element !== 'Prismatic' ? element : 'Harmonic';
  const t = `${stats.join(' ')} ${text}`.toLowerCase();
  const liste = [`${el} Siphon`, 'Heavy Ammo Finder', `${el} Loader`, `${el} Weapon Surge`, `${el} Weapon Surge`, 'Recuperation', 'Reaper', 'Powerful Attraction', 'Concussive Dampener', `${el} Resistance`];
  if (/grenade/.test(t)) liste.unshift('Firepower', 'Ashes to Assets', 'Bomber', 'Grenade Font');
  if (/melee/.test(t)) liste.unshift('Focusing Strike', 'Heavy Handed', 'Melee Font');
  if (/super/.test(t)) liste.unshift('Hands-On', 'Super Font');
  if (/class/.test(t)) liste.unshift('Distribution', 'Outreach', 'Class Font');
  if (/heal|restor|health/.test(t)) liste.unshift('Better Already', 'Absolution');
  return liste;
}

// Plan pro Teil: Stat-Mod in den allgemeinen Sockel, Build-Mods in die Slot-Sockel, solange Energie reicht.
// teile: [{ id, d:{b}, sockel:[plugHash...], energie }], statMod: Map(id -> mod), wunsch: [Namen]
export function plane(teile, statMod, wunsch, element) {
  const offen = wunsch.map((w) => finde(w, element)).filter(Boolean);
  const plan = [];
  for (const t of teile) {
    const slotPc = SLOT_PC[t.d.b];
    const sockel = t.sockel.map((p, i) => ({ i, pc: defs.items[p]?.pc || '', jetzt: p })).filter((s) => s.pc === 'enhancements.v2_general' || s.pc === slotPc);
    let energie = t.energie || 10;
    const soll = new Map();
    const general = sockel.find((s) => s.pc === 'enhancements.v2_general');
    const sm = statMod.get(t.id);
    if (general && sm) { soll.set(general.i, sm); energie -= kat().get(sm.pc)?.find((m) => m.hash === sm.plug)?.kosten ?? 3; }
    for (const s of sockel.filter((x) => x.pc === slotPc)) {
      const k = offen.findIndex((m) => m.pc === slotPc && m.kosten <= energie && ![...soll.values()].some((x) => (x.hash || x.plug) === m.hash && !/Surge|Siphon/.test(m.n)));
      if (k < 0) continue;
      const m = offen.splice(k, 1)[0];
      soll.set(s.i, m); energie -= m.kosten;
    }
    // Allgemeiner Sockel ohne Stat-Mod: allgemeine Build-Mods.
    if (general && !sm) { const k = offen.findIndex((m) => m.pc === 'enhancements.v2_general' && m.kosten <= energie); if (k >= 0) { soll.set(general.i, offen.splice(k, 1)[0]); } }
    plan.push({ teil: t, sockel, soll });
  }
  return { plan, uebrig: offen.map((m) => m.n) };
}
