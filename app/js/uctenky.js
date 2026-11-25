// Finanční deník · uctenky.js · v0.6.0
// Vlepení účtenky z fotky a její přečtení přes AI (worker /uctenka): obchod, datum, celkem, položky, kategorie.
// Do databáze jde jen malá fotka (480 px); pro AI se drží větší verze jen v paměti, dokud je appka otevřená.

import { uid, vals } from './util.js';
import { AI_WORKER } from './config.js';
import { st, zapis } from './store.js';

const vetsi = new Map(); // id účtenky → větší fotka pro AI (nepersistuje se)
export const aiZapnute = () => !!(AI_WORKER && st.mode === 'cloud' && st.token);

function nacti(file) {
  return new Promise((ok, chyba) => {
    const rd = new FileReader(); rd.onerror = chyba;
    rd.onload = () => { const im = new Image(); im.onerror = chyba; im.onload = () => ok(im); im.src = rd.result; };
    rd.readAsDataURL(file);
  });
}
function zmensit(im, maxW, maxH, q) {
  const k = Math.min(1, maxW / im.width, maxH / im.height), cv = document.createElement('canvas');
  cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', q);
}

// Vlepí fotku účtenky ke dni; když je AI zapnutá, rovnou ji začne číst
export async function vlepitFotku(file, den, U, ctx) {
  const im = await nacti(file), id = uid();
  const male = zmensit(im, 480, 4000, 0.6);
  vetsi.set(id, zmensit(im, 1100, 1568, 0.78));
  zapis(['stk', id], { id, d: den, img: male.length < 149000 ? male : zmensit(im, 360, 3000, 0.5), obchod: '' });
  ctx.render();
  if (aiZapnute()) precti(id, U, ctx);
}

export async function precti(id, U, ctx) {
  const s = (st.S.stk || {})[id]; if (!s) return;
  if (!aiZapnute()) {
    ctx.toast(AI_WORKER ? 'Čtení účtenek funguje po přihlášení. Zatím doplň částku ručně.' : 'Čtení účtenek přes AI zatím není zapnuté. Doplň částku ručně.');
    return;
  }
  U.rcCte = id; ctx.render();
  try {
    const kats = vals(st.S.kats).filter(k => k.t === 'v').map(k => [k.id, k.n]);
    const r = await fetch(AI_WORKER.replace(/\/$/, '') + '/uctenka', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await st.token() },
      body: JSON.stringify({ img: vetsi.get(id) || s.img, kats }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.chyba || 'http_' + r.status);
    const pol = (d.polozky || []).filter(p => p[0] && isFinite(p[1])).slice(0, 60).map(p => [String(p[0]).slice(0, 80), Math.round(+p[1] * 100) / 100]);
    if (d.obchod) zapis(['stk', id, 'obchod'], String(d.obchod).slice(0, 120));
    if (pol.length) zapis(['stk', id, 'pol'], pol);
    zapis(['stk', id, 'ai'], { celkem: +d.celkem > 0 ? +d.celkem : null, kat: d.kat || '', datum: d.datum || '', jistota: d.jistota || '' });
    ctx.toast(+d.celkem > 0 ? 'Účtenka přečtená. Zkontroluj částku a zapiš.' : 'Částku se nepodařilo přečíst – doplň ji prosím.');
  } catch (e) {
    const m = String(e.message || e);
    ctx.toast(m === 'neprihlasen' ? 'Přihlášení vypršelo, přihlas se znovu.' : m === 'limit' ? 'Na dnešek je čtení účtenek vyčerpané. Zkus to zítra.' : 'Účtenku se nepodařilo přečíst. Zkus ostřejší fotku, nebo doplň částku ručně.');
  } finally { U.rcCte = ''; ctx.render(); }
}
