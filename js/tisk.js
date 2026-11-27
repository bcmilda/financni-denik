// Finanční deník · tisk.js · v0.7.0
// Kronika do PDF: měsíc nebo rok jako hezky vysázaný sešit. Na webu přes tisk prohlížeče („Uložit jako PDF“),
// v Android appce přes vlastní plugin Tisk (systémový PrintManager).

import { esc, kc, pd, mk, dnes, vals, MN, MG, DNY, ymLabel, VERZE } from './util.js';
import { INKS } from './data.js';
import { souhrnMesice, monthE, sumT, katObdobi, pravidelneMesic, pocitStat, oceneni, mesice, deser, rokVPuntikach } from './logic.js';
import { grafMesic, grafSloupce } from './charts.js';
import { kresliCil } from './sklenice.js';
import { pecet } from './kronika.js';
import { kat } from './views.js';
import { pocasiSvg, POCASI } from './tyden.js';

const $ = s => document.querySelector(s);
const NATIVNI = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const VOLBY = [['zapisky', 'Zápisky a pohyby den po dni', true], ['tydny', 'Nedělní rituály', true], ['cile', 'Cíle a sklenice', true], ['oceneni', 'Ocenění', true]];

// ---------- stránka Kronika ----------
export function vKronika(S, U) {
  const druh = U.krDruh || 'mesic', ym = mk(U.day), rok = U.rok || dnes().slice(0, 4), v = U.krVolby || {};
  const zap = k => v[k] != null ? v[k] : VOLBY.find(x => x[0] === k)[2];
  const obsah = obsahKroniky(S, druh, ym, rok);
  const L = '<h2 class="pt">Kronika do PDF</h2><p class="ps">Tvůj měsíc nebo rok jako sešit na uložení, tisk nebo poslání rodině.</p>' +
    '<h3 class="sub">Co vytisknout</h3><div class="seg" role="group" aria-label="Období"><button data-act="krdruh" data-id="mesic" class="' + (druh === 'mesic' ? 'on' : '') + '">Měsíc</button><button data-act="krdruh" data-id="rok" class="' + (druh === 'rok' ? 'on' : '') + '">Rok</button></div>' +
    (druh === 'mesic'
      ? '<div class="phead kr-ob"><button class="arw" data-act="mprev" aria-label="Předchozí měsíc">‹</button><div><b class="hand kr-t">' + ymLabel(ym) + '</b></div><button class="arw" data-act="mnext" aria-label="Další měsíc">›</button></div>'
      : '<div class="phead kr-ob"><button class="arw" data-act="rok" data-id="' + (+rok - 1) + '" aria-label="Předchozí rok">‹</button><div><b class="hand kr-t">Rok ' + rok + '</b></div><button class="arw" data-act="rok" data-id="' + (+rok + 1) + '" aria-label="Další rok">›</button></div>') +
    '<h3 class="sub">Co v kronice bude</h3>' + VOLBY.map(([k, n]) => '<label class="f chk"><input type="checkbox" data-act="krvolba" data-k="' + k + '" ' + (zap(k) ? 'checked' : '') + '> ' + n + '</label>').join('') +
    '<p class="note2">Čísla, grafy a kategorie jsou v kronice vždycky. Kniha života (zdraví, očkování) do kroniky nejde – je to citlivé.</p>' +
    '<button class="btn" data-act="tisk">Vytvořit PDF</button>' +
    '<p class="note2">' + (NATIVNI() ? 'Otevře se tisk telefonu – nahoře vyber „Uložit jako PDF“.' : 'Otevře se tisk prohlížeče – jako tiskárnu vyber „Uložit jako PDF“. Zapni „Grafika na pozadí“, ať jsou vidět barvy.') + '</p>';
  const R = '<h3 class="sub" style="margin-top:4px">Obsah</h3><div class="kr-obsah lined">' +
    '<p class="hand">1. Titulní strana</p><p class="hand">2. ' + (druh === 'mesic' ? 'Měsíc v číslech a graf' : 'Rok v číslech, graf a měsíce') + '</p><p class="hand">3. Kam peníze šly</p>' +
    (zap('cile') && obsah.cile ? '<p class="hand">· Cíle (' + obsah.cile + ')</p>' : '') +
    (zap('tydny') && obsah.tydny ? '<p class="hand">· Nedělní rituály (' + obsah.tydny + ')</p>' : '') +
    (zap('oceneni') && obsah.oceneni ? '<p class="hand">· Ocenění (' + obsah.oceneni + ')</p>' : '') +
    (zap('zapisky') && druh === 'mesic' ? '<p class="hand">· Den po dni (' + obsah.dny + ' ' + (obsah.dny === 1 ? 'den' : obsah.dny < 5 && obsah.dny ? 'dny' : 'dní') + ')</p>' : '') +
    (zap('zapisky') && druh === 'rok' ? '<p class="hand">· Zápisky roku (' + obsah.dny + ')</p>' : '') + '</div>' +
    '<div class="kr-ukazka" aria-hidden="true"><div class="kr-titul"><span>Kronika</span><b>' + (druh === 'mesic' ? ymLabel(ym) : 'Rok ' + rok) + '</b><i>Finanční deník</i></div></div>';
  return [L, R];
}
function obsahKroniky(S, druh, ym, rok) {
  const v = druh === 'mesic' ? d => mk(d) === ym : d => d.slice(0, 4) === rok;
  const dny = new Set([...(druh === 'mesic' ? vals(S.e).filter(e => v(e.d)).map(e => e.d) : []), ...Object.keys(S.notes || {}).filter(d => v(d) && S.notes[d])]);
  return { dny: dny.size, tydny: Object.keys(S.tydny || {}).filter(po => v(po) && (S.tydny[po].povedlo || S.tydny[po].pocasi || S.tydny[po].priste)).length, cile: vals(S.cile).length, oceneni: oceneni(S, dnes()).filter(o => o.kdy && v(o.kdy)).length };
}

// ---------- sazba kroniky ----------
function postavit(S, U) {
  const druh = U.krDruh || 'mesic', ym = mk(U.day), rok = U.rok || dnes().slice(0, 4), v = U.krVolby || {};
  const zap = k => v[k] != null ? v[k] : VOLBY.find(x => x[0] === k)[2];
  const titul = druh === 'mesic' ? ymLabel(ym) : 'Rok ' + rok, d0 = new Date();
  let h = '<section class="tk-strana tk-obalka"><div class="tk-kuze"><span class="tk-mala">Kronika</span><h1>' + esc(titul) + '</h1><p>Finanční deník · kniha tvého finančního života</p></div>' +
    '<p class="tk-vytvoreno">Vytvořeno ' + d0.getDate() + '. ' + MG[d0.getMonth()] + ' ' + d0.getFullYear() + '</p></section>';
  const bars = ks => { const mx = ks.length ? ks[0][1] : 1, tot = ks.reduce((a, k) => a + k[1], 0) || 1; return '<div class="tk-bars">' + ks.slice(0, 10).map(([k, x]) => { const o = kat(S, k); return '<div><span>' + esc(o.n) + '</span><i style="--c:' + o.c + ';width:' + Math.max(2, x / mx * 100) + '%"></i><b>' + kc(x) + '</b><small>' + Math.round(x / tot * 100) + ' %</small></div>'; }).join('') + '</div>'; };
  if (druh === 'mesic') {
    const s = souhrnMesice(S, ym), pr = S.pred[ym], pc = pocitStat(S, ym), pv = pravidelneMesic(S, ym);
    h += '<section class="tk-oddil"><h2>Měsíc v číslech</h2><div class="tk-cisla"><div><span>Příjmy</span><b>' + kc(s.inc) + '</b></div><div><span>Výdaje</span><b>' + kc(s.exp) + '</b></div><div><span>Zůstatek</span><b>' + kc(s.zust) + '</b></div></div>' +
      (pr ? '<p class="tk-pozn">Zapsáno perem ' + pd(pr.zapsano).getDate() + '. ' + MG[pd(pr.zapsano).getMonth()] + ': čekaný příjem ' + kc(pr.prijem) + ', plánované výdaje ' + kc(pr.vydaje) + '. Skutečně utraceno ' + Math.round(s.exp / Math.max(1, pr.vydaje) * 100) + ' % plánu.</p>' : '') +
      '<h3>Výdaje den po dni</h3><div class="tk-fig"><svg id="tk-mch"></svg></div>' +
      (pv.length ? '<h3>Pravidelné platby</h3><ul class="tk-list">' + pv.map(({ p, zapl }) => '<li><span>' + esc(p.nazev) + '</span><b>' + kc(zapl ? zapl.kc : p.kc) + '</b><em>' + (zapl ? 'zaplaceno' : 'nezaplaceno') + '</em></li>').join('') + '</ul>' : '') +
      (pc.pocet ? '<p class="tk-pozn">Radost ' + pc.pct('radost') + ' % · nutnosti ' + pc.pct('nutnost') + ' % · impulzy ' + pc.pct('impulz') + ' % (z ' + pc.pocet + ' označených výdajů).</p>' : '') +
      '<h2>Kam peníze šly</h2>' + (s.kats.length ? bars(s.kats) : '<p class="tk-pozn">Žádné výdaje.</p>') + '</section>';
  } else {
    const r = rokVPuntikach(S, +rok, dnes()), inc = r.reduce((a, m) => a + m.inc, 0), exp = r.reduce((a, m) => a + m.exp, 0);
    h += '<section class="tk-oddil"><h2>Rok v číslech</h2><div class="tk-cisla"><div><span>Příjmy</span><b>' + kc(inc) + '</b></div><div><span>Výdaje</span><b>' + kc(exp) + '</b></div><div><span>Zbylo</span><b>' + kc(inc - exp) + '</b></div></div>' +
      '<h3>Příjmy a výdaje po měsících</h3><div class="tk-fig"><svg id="tk-gsl"></svg></div>' +
      '<table class="tk-tab"><thead><tr><th>Měsíc</th><th>Příjmy</th><th>Výdaje</th><th>Zůstatek</th><th></th></tr></thead><tbody>' +
      r.map((m, i) => '<tr><td>' + MN[i] + '</td><td>' + (m.inc ? kc(m.inc) : '–') + '</td><td>' + (m.exp ? kc(m.exp) : '–') + '</td><td>' + (m.inc || m.exp ? kc(m.inc - m.exp) : '–') + '</td><td>' + (m.pecet ? '★ zlatá pečeť' : '') + '</td></tr>').join('') + '</tbody></table>' +
      '<h2>Na co šlo nejvíc</h2>' + bars(katObdobi(S, rok + '-01', rok + '-12')) + '</section>';
  }
  if (zap('cile') && vals(S.cile).length) {
    h += '<section class="tk-oddil"><h2>Cíle</h2><div class="tk-cile">' + vals(S.cile).map(c => { const p = c.cil > 0 ? Math.min(100, Math.round(c.nasporeno / c.cil * 100)) : 0; return '<div><div class="tk-cil-obr">' + kresliCil({ ...c, novy: false }) + '</div><b>' + esc(c.nazev) + '</b><span>' + kc(c.nasporeno) + ' z ' + kc(c.cil) + ' · ' + p + ' %</span></div>'; }).join('') + '</div></section>';
  }
  const vObdobi = druh === 'mesic' ? d => mk(d) === ym : d => d.slice(0, 4) === rok;
  if (zap('tydny')) {
    const t = Object.keys(S.tydny || {}).filter(po => vObdobi(po) || vObdobi(posunDen(po, 6))).sort().map(po => [po, S.tydny[po]]).filter(([, z]) => z.povedlo || z.prekvapilo || z.priste || z.pocasi);
    if (t.length) h += '<section class="tk-oddil"><h2>Nedělní rituály</h2>' + t.map(([po, z]) => { const a = pd(po), b = pd(posunDen(po, 6)); return '<div class="tk-tyden"><div class="tk-tyden-h">' + pocasiSvg(z.pocasi, 30) + '<b>' + a.getDate() + '. ' + MG[a.getMonth()] + ' – ' + b.getDate() + '. ' + MG[b.getMonth()] + '</b>' + (z.pocasi ? '<span>' + (POCASI.find(x => x[0] === z.pocasi) || [0, ''])[1] + ' týden</span>' : '') + '</div>' +
      (z.povedlo ? '<p><em>Povedlo se:</em> <span class="tk-ruka">' + esc(z.povedlo) + '</span></p>' : '') + (z.prekvapilo ? '<p><em>Překvapilo mě:</em> <span class="tk-ruka">' + esc(z.prekvapilo) + '</span></p>' : '') + (z.priste ? '<p><em>Na další týden:</em> <span class="tk-ruka">' + esc(z.priste) + '</span></p>' : '') + '</div>'; }).join('') + '</section>';
  }
  if (zap('oceneni')) {
    const o = oceneni(S, dnes()).filter(x => x.kdy && vObdobi(x.kdy));
    if (o.length) h += '<section class="tk-oddil"><h2>Ocenění</h2><div class="tk-oceneni">' + o.map(x => '<div>' + pecet(x, 58) + '<b>' + esc(x.n) + '</b><span>' + esc(x.p) + '</span></div>').join('') + '</div></section>';
  }
  if (zap('zapisky')) {
    const dny = [...new Set([...vals(S.e).filter(e => vObdobi(e.d)).map(e => e.d), ...Object.keys(S.notes || {}).filter(d => vObdobi(d) && S.notes[d])])].sort();
    const dnyR = druh === 'rok' ? dny.filter(d => S.notes[d]) : dny;
    if (dnyR.length) {
      h += '<section class="tk-oddil tk-denik"><h2>' + (druh === 'mesic' ? 'Den po dni' : 'Zápisky roku') + '</h2>' + dnyR.map(d => {
        const x = pd(d), l = vals(S.e).filter(e => e.d === d).sort((a, b) => (a.ts || 0) - (b.ts || 0));
        return '<div class="tk-den"><h4>' + DNY[x.getDay()] + ' ' + x.getDate() + '. ' + MG[x.getMonth()] + (druh === 'rok' ? ' ' + x.getFullYear() : '') + '</h4>' +
          (S.notes[d] ? '<p class="tk-ruka">' + deser(S.notes[d]) + '</p>' : '') +
          (druh === 'mesic' && l.length ? '<ul class="tk-list">' + l.map(e => '<li><span>' + esc(e.text) + '</span><small>' + esc(kat(S, e.kat).n) + '</small><b class="' + (e.typ === 'p' ? 'p' : '') + '">' + (e.typ === 'p' ? '+' : '−') + kc(e.kc) + '</b></li>').join('') + '</ul>' : '') + '</div>';
      }).join('') + '</section>';
    }
  }
  h += '<p class="tk-konec">Finanční deník ' + VERZE + '</p>';
  return { html: h, titul: 'Kronika – ' + titul, druh, ym, rok };
}
const posunDen = (d, n) => { const x = pd(d); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

// Vysází kroniku do #tisk, nakreslí grafy (světlé barvy papíru) a spustí tisk
export async function tiskni(S, U, ctx) {
  const k = postavit(S, U), el = $('#tisk');
  el.innerHTML = k.html; el.classList.add('kresli');
  const b = document.body, papir = b.dataset.papir, ink = b.style.getPropertyValue('--ink');
  b.dataset.papir = 'kremova'; b.style.setProperty('--ink', (INKS.find(x => x.id === S.nast.ink) || INKS[0]).c[0]);
  try {
    const m = $('#tk-mch'); if (m) grafMesic(m, S, k.ym);
    const g = $('#tk-gsl'); if (g) grafSloupce(g, mesice(S, k.rok + '-12', 12));
    el.querySelectorAll('.tk-fig svg').forEach(s => { s.setAttribute('viewBox', '0 0 ' + s.clientWidth + ' ' + s.clientHeight); s.setAttribute('preserveAspectRatio', 'xMidYMid meet'); });
  } finally { b.dataset.papir = papir; if (ink) b.style.setProperty('--ink', ink); el.classList.remove('kresli'); }
  const puvodni = document.title; document.title = k.titul; // název souboru PDF
  const zpet = () => { document.title = puvodni; };
  if (NATIVNI()) {
    const T = window.Capacitor.Plugins.Tisk || (window.Capacitor.registerPlugin && window.Capacitor.registerPlugin('Tisk'));
    try { await T.tiskni({ nazev: k.titul }); } catch (e) { ctx.toast('Tisk se nepodařilo otevřít. Aktualizuj appku na novou verzi.'); }
    setTimeout(zpet, 4000);
  } else {
    addEventListener('afterprint', zpet, { once: true });
    setTimeout(() => window.print(), 60);
  }
}

export function tiskAkce(a, t, U, ctx) {
  switch (a) {
    case 'krdruh': U.krDruh = t.dataset.id; return true;
    case 'krvolba': U.krVolby = { ...(U.krVolby || {}), [t.dataset.k]: t.checked }; return true;
    case 'tisk': tiskni(ctx.S(), U, ctx); return 'stop';
  }
  return false;
}
