// Schnelle Info-Blase für alles mit data-tip (HTML) oder title (Text): erscheint nach kurzem Hover direkt am Element.
// Ersetzt die träge Browser-Blase und funktioniert auch in Dialogen (hängt sich in den offenen Dialog).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let blase = null, timer = 0, quelle = null;
const weg = () => { clearTimeout(timer); quelle = null; if (blase) blase.hidden = true; };
function zeige(el) {
  if (!el.isConnected) return;
  if (!blase) { blase = document.createElement('div'); blase.id = 'minitip'; blase.setAttribute('role', 'tooltip'); }
  const heim = el.closest('dialog[open]') || document.body;
  if (blase.parentElement !== heim) heim.append(blase);
  blase.innerHTML = el.dataset.tip || esc(el.dataset.tipt || '');
  if (!blase.textContent.trim()) return;
  blase.hidden = false;
  const z = window.d2aZ ? window.d2aZ() : 1;
  const r = el.getBoundingClientRect(), b = blase.getBoundingClientRect();
  let x = r.left + r.width / 2 - b.width / 2, y = r.bottom + 8;
  if (y + b.height > innerHeight - 6) y = r.top - b.height - 8;
  x = Math.max(6, Math.min(x, innerWidth - b.width - 6));
  blase.style.left = `${x / z}px`; blase.style.top = `${Math.max(6, y) / z}px`;
}
export function starteTipps() {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.('[data-tip],[data-tipt],[title]');
    if (!el || el === quelle) return;
    if (el.closest('#tipp .it-pk .pkraster')) return; // dort zeigt das Lesefeld im Fenster den Perk
    // title → eigene Blase (Text bleibt für Screenreader als aria-label erhalten).
    if (el.hasAttribute('title')) { const t = el.getAttribute('title'); el.removeAttribute('title'); if (t) { el.dataset.tipt = t; if (!el.hasAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', t); } }
    if (!el.dataset.tip && !el.dataset.tipt) return;
    weg(); quelle = el;
    timer = setTimeout(() => zeige(el), 280);
  });
  document.addEventListener('pointerout', (e) => { if (quelle && !quelle.contains(e.relatedTarget)) weg(); });
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => document.addEventListener(ev, weg, { passive: true, capture: true }));
}
