// Anmeldung und Zugriff auf die Bungie-API direkt aus dem Browser (öffentliche Bungie-App, kein Geheimschlüssel).
import { CONFIG } from './config.js';

const BASIS = 'https://www.bungie.net';
const SPEICHER = 'd2a.token';
export const KOMPONENTEN = '100,102,200,201,205,206,300,304,305';

const lies = () => { try { return JSON.parse(localStorage.getItem(SPEICHER) || 'null'); } catch { return null; } };
const schreib = (t) => { try { localStorage.setItem(SPEICHER, JSON.stringify(t)); } catch {} };

export const eingerichtet = () => Boolean(CONFIG.apiKey && CONFIG.clientId);
export const angemeldet = () => { const t = lies(); return Boolean(t && t.bis > Date.now() + 60_000); };
export const abmelden = (bewusst = false) => { try { localStorage.removeItem(SPEICHER); if (bewusst) localStorage.removeItem('d2a.warDa'); } catch {} };
// War schon einmal angemeldet und hat sich nicht selbst abgemeldet: dann still neu anmelden, wenn das Token abläuft.
export const warAngemeldet = () => { try { return localStorage.getItem('d2a.warDa') === '1'; } catch { return false; } };

export function anmelden() {
  window.d2aWeg = true;
  const state = crypto.randomUUID();
  try { sessionStorage.setItem('d2a.state', state); } catch {}
  location.href = `${BASIS}/en/OAuth/Authorize?client_id=${encodeURIComponent(CONFIG.clientId)}&response_type=code&state=${state}`;
}

// Nach der Rückkehr von Bungie den Code gegen ein Token tauschen.
export async function rueckkehr() {
  const p = new URLSearchParams(location.search);
  const code = p.get('code');
  if (!code) return false;
  let erwartet = null;
  try { erwartet = sessionStorage.getItem('d2a.state'); } catch {}
  history.replaceState(null, '', location.pathname);
  if (erwartet && p.get('state') !== erwartet) throw new Error('Sign-in did not match. Try again.');
  const r = await fetch(`${BASIS}/platform/app/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': CONFIG.apiKey },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: CONFIG.clientId }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`Bungie sign-in failed: ${d.error_description || r.status}`);
  schreib({ token: d.access_token, bis: Date.now() + d.expires_in * 1000, mitglied: d.membership_id });
  try { localStorage.setItem('d2a.warDa', '1'); } catch {}
  return true;
}

async function anfrage(pfad, optionen = {}) {
  const t = lies();
  const headers = { 'X-API-Key': CONFIG.apiKey, ...(optionen.body ? { 'Content-Type': 'application/json' } : {}) };
  if (t && t.bis > Date.now()) headers.Authorization = `Bearer ${t.token}`;
  const r = await fetch(`${BASIS}/Platform${pfad}`, { ...optionen, headers });
  const d = await r.json().catch(() => null);
  if (r.status === 401) { abmelden(); throw new Error('Session expired. Sign in again.'); }
  if (!r.ok || !d || d.ErrorCode !== 1) throw new Error(`Bungie says: ${d?.Message || `HTTP ${r.status}`}`);
  return d.Response;
}
export const get = (pfad) => anfrage(pfad);
export const post = (pfad, inhalt) => anfrage(pfad, { method: 'POST', body: JSON.stringify(inhalt) });

export async function konto() {
  const d = await get('/User/GetMembershipsForCurrentUser/');
  const k = d.destinyMemberships.find((x) => x.membershipId === d.primaryMembershipId)
    || d.destinyMemberships.find((x) => x.crossSaveOverride === x.membershipType) || d.destinyMemberships[0];
  if (!k) throw new Error('No Destiny profile on this Bungie account.');
  return { ...k, name: d.bungieNetUser?.uniqueName || k.bungieGlobalDisplayName || k.displayName };
}
export const profil = (k) => get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/?components=${KOMPONENTEN}`);

// Einzelnes Item mit Sockeln und allen wählbaren Plugs pro Sockel.
export const item = (k, id) => get(`/Destiny2/${k.membershipType}/Profile/${k.membershipId}/Item/${id}/?components=300,304,305,310`);
const aktion = (pfad, k, inhalt) => post(`/Destiny2/Actions/Items/${pfad}/`, { ...inhalt, membershipType: k.membershipType });
export const verschiebe = (k, it, charId, inTresor) => aktion('TransferItem', k, { itemReferenceHash: it.hash, stackSize: 1, transferToVault: inTresor, itemId: it.id, characterId: charId });
export const abholen = (k, it, charId) => aktion('PullFromPostmaster', k, { itemReferenceHash: it.hash, stackSize: it.menge || 1, itemId: it.id, characterId: charId });
export const ausruesten = (k, it, charId) => aktion('EquipItem', k, { itemId: it.id, characterId: charId });
export const plugSetzen = (k, it, charId, sockel, plug) => aktion('InsertSocketPlugFree', k, { plug: { socketIndex: sockel, socketArrayType: 0, plugItemHash: plug }, itemId: it.id, characterId: charId });
export const ausruestenAlle = (k, ids, charId) => aktion('EquipItems', k, { itemIds: ids, characterId: charId });
