// Finanční deník · kniha.js · v0.7.0
// Kniha na stole: zavřené desky při startu, otáčení listů (animace + šustění), listování prstem a šipkami.

import { pd, MG } from './util.js';

const $ = s => document.querySelector(s);
const klid = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const jednaStrana = () => matchMedia('(max-width: 1000px)').matches;

// ---------- zavřená kniha ----------
export function ukazZavrenou(S, jmeno, onOtevrit, zvuk) {
  const el = $('#zavrena'); if (!el) { onOtevrit(); return; }
  const rok = new Date().getFullYear(), zal = S.ucet && S.ucet.vytvoreno ? new Date(S.ucet.vytvoreno) : null;
  el.innerHTML = '<button class="zk" id="zkBtn" aria-label="Otevřít Finanční deník">' +
    '<span class="zk-list" aria-hidden="true"><span class="zk-l1">Tento deník patří</span><span class="zk-jm hand">' + (jmeno ? escH(jmeno) : '……………………') + '</span>' +
      (zal ? '<span class="zk-l2">Začato ' + zal.getDate() + '. ' + MG[zal.getMonth()] + ' ' + zal.getFullYear() + '</span>' : '') + '<span class="zk-l3 hand">Malé kroky, velké výsledky.</span></span>' +
    '<span class="zk-desky" aria-hidden="true"><span class="zk-ram"></span>' +
      '<svg class="zk-logo" viewBox="0 0 64 64"><g fill="none" stroke="#f3e3bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 58V34M32 44l-8-7M32 40l9-8M26 58h12"/><circle cx="32" cy="22" r="10"/><circle cx="20" cy="27" r="8"/><circle cx="44" cy="27" r="8"/><circle cx="25" cy="14" r="6"/><circle cx="40" cy="13" r="6"/></g></svg>' +
      '<b class="zk-t">Finanční deník</b><i class="zk-p">kniha tvého finančního života</i><span class="zk-rok">' + rok + '</span></span>' +
    '<span class="zk-gumicka" aria-hidden="true"></span><span class="zk-zalozka" aria-hidden="true"></span></button>' +
    '<p class="zk-tip">Klepni na knihu a otevři ji</p>';
  el.hidden = false; document.body.classList.add('zavreno');
  const b = $('#zkBtn');
  // Enter / mezerník otevře knihu i bez myši
  const klav = ev => { if (el.hidden) { removeEventListener('keydown', klav); return; } if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); b.click(); } };
  addEventListener('keydown', klav);
  b.addEventListener('click', () => {
    if (el.classList.contains('otevira')) return;
    zvuk('list');
    if (klid()) { zavrit(); return; }
    el.classList.add('otevira');
    setTimeout(zavrit, 1150);
  }, { once: false });
  function zavrit() { el.hidden = true; el.classList.remove('otevira'); el.innerHTML = ''; document.body.classList.remove('zavreno'); onOtevrit(); }
}
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- otočení listu ----------
// smer 1 = dopředu (list se otáčí zprava doleva), -1 = dozadu. stare = HTML stránek před změnou.
export function listuj(smer, stare) {
  const book = $('#book'), pL = $('#pL'), pR = $('#pR');
  if (!smer || !stare || !stare.L || klid()) return;
  book.querySelectorAll('.lf-scena').forEach(x => x.remove());
  if (jednaStrana()) {
    book.classList.remove('slide-f', 'slide-b'); void book.offsetWidth; book.classList.add(smer > 0 ? 'slide-f' : 'slide-b');
    return;
  }
  const strana = smer > 0 ? pR : pL, pod = smer > 0 ? pL : pR;
  const rB = book.getBoundingClientRect(), rs = strana.getBoundingClientRect(), rp = pod.getBoundingClientRect();
  // Kus knihy, který je vidět (stránky bývají dlouhé – animuje se jen viditelná část)
  const top = Math.max(0, -rB.top - 20), vys = Math.min(rs.height - top, innerHeight + 40);
  const scena = document.createElement('div'); scena.className = 'lf-scena'; scena.setAttribute('aria-hidden', 'true'); scena.inert = true;
  const kus = (cls, html, r) => {
    const d = document.createElement('div'); d.className = cls;
    Object.assign(d.style, { left: (r.left - rB.left) + 'px', top: (r.top - rB.top + top) + 'px', width: r.width + 'px', height: vys + 'px' });
    if (html != null) { d.innerHTML = '<div class="lf-in" style="margin-top:' + (-top) + 'px">' + html + '</div>'; }
    return d;
  };
  const cisti = d => { d.querySelectorAll('[id]:not(filter):not(linearGradient):not(radialGradient):not(pattern):not(clipPath)').forEach(e => e.removeAttribute('id')); return d; };
  // Pod listem zůstane stará protější stránka, dokud ji nový list nepřikryje
  const kryt = cisti(kus('page lf-kryt ' + (smer > 0 ? 'L' : 'R'), smer > 0 ? stare.L : stare.R, rp));
  const list = kus('lf-list ' + (smer > 0 ? 'dopredu' : 'dozadu'), null, rs);
  const lic = cisti(kus('page lf-lic ' + (smer > 0 ? 'R' : 'L'), smer > 0 ? stare.R : stare.L, rs));
  const rub = cisti(kus('page lf-rub ' + (smer > 0 ? 'L' : 'R'), (smer > 0 ? pL : pR).innerHTML, rs));
  [lic, rub].forEach(x => { x.style.left = '0'; x.style.top = '0'; });
  list.append(lic, rub);
  scena.append(kryt, list);
  book.appendChild(scena);
  const uhel = smer > 0 ? -180 : 180;
  const an = list.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(' + (uhel * 0.5) + 'deg) translateZ(30px)', offset: 0.5 }, { transform: 'rotateY(' + uhel + 'deg)' }], { duration: 780, easing: 'cubic-bezier(.45,.05,.35,1)' });
  const stin = document.createElement('div'); stin.className = 'lf-stin'; lic.appendChild(stin);
  stin.animate([{ opacity: 0 }, { opacity: 0.55 }], { duration: 390, easing: 'ease-in', fill: 'forwards' });
  const stin2 = document.createElement('div'); stin2.className = 'lf-stin'; rub.appendChild(stin2);
  stin2.animate([{ opacity: 0.55 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0 }], { duration: 780, fill: 'forwards' });
  an.onfinish = an.oncancel = () => scena.remove();
}

// ---------- listování prstem a šipkami ----------
// Dopředu/dozadu: šipky v hlavičce stránky (den, týden, měsíc, rok), jinak další stránka v menu.
export function initListovani(dalsi) {
  let t0 = null;
  const book = $('#book');
  const vynech = el => el.closest('input,textarea,select,[contenteditable="true"],.nal,.fig,.trkkal,.kal,.zuby,.vyber,.arch');
  book.addEventListener('touchstart', ev => {
    if (ev.touches.length !== 1 || vynech(ev.target)) { t0 = null; return; }
    const t = ev.touches[0]; t0 = { x: t.clientX, y: t.clientY, cas: Date.now() };
  }, { passive: true });
  book.addEventListener('touchend', ev => {
    if (!t0) return;
    const t = ev.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y, rychle = Date.now() - t0.cas < 700;
    t0 = null;
    if (rychle && Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) * 0.55) dalsi(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', ev => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight')) return;
    const a = document.activeElement;
    if (a && (a.matches('input,textarea,select,[contenteditable="true"]') || a.closest('.nal,.vyber,[role=tablist],[role=group],.kal,.trkkal'))) return;
    if (!$('#app') || $('#app').hidden || !$('#zavrena').hidden || !$('#blocek').hidden || !$('#arch').hidden) return;
    ev.preventDefault();
    dalsi(ev.key === 'ArrowRight' ? 1 : -1);
  });
}
// Najde v hlavičce stránky tlačítko „Předchozí…“ / „Další…“
export function sipkaStranky(smer) {
  const b = [...document.querySelectorAll('#book .phead .arw')].find(x => (x.getAttribute('aria-label') || '').startsWith(smer > 0 ? 'Další' : 'Předchozí'));
  return b || null;
}
export const datumTitul = d => { const x = pd(d); return x.getDate() + '. ' + MG[x.getMonth()]; };
