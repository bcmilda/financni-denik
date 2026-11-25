// Finanční deník · kronika.js · v0.6.0
// Stránky „finanční kroniky“: Přehled, Pokladní kniha, Grafy a statistiky, Cíle a úkoly, Ocenění, Vzhled a nastavení.

import { esc, kc, nf, num, pd, mk, dim, dnes, uid, vals, MN, MG, ymLabel, datKratce, VERZE } from './util.js';
import { DESKY, STUL, PAPIR, LINKY, FONTS, INKS, REZIMY } from './data.js';
import { souhrnMesice, posunYm, stavKDatu, oceneni, katObdobi, sumT, monthE, rokVPuntikach, pocitStat } from './logic.js';
import { st, zapis } from './store.js';
import { kat, taskHTML } from './views.js';
import { kresliCil, VZHLEDY_CILE } from './sklenice.js';
import { ritualCeka } from './tyden.js';

const $ = s => document.querySelector(s);
const pct = z => (z == null ? '' : '<span class="zm ' + (z > 0 ? 'nah' : z < 0 ? 'dol' : '') + '">' + (z > 0 ? '↑ +' : z < 0 ? '↓ ' : '') + z + ' %</span>');
const mHead = (U, titul) => '<div class="phead"><button class="arw" data-act="mprev" aria-label="Předchozí měsíc">‹</button><div><h2 class="pt">' + titul + '</h2><p class="ps">' + ymLabel(mk(U.day)) + '</p></div><button class="arw" data-act="mnext" aria-label="Další měsíc">›</button></div>';

// Malé kreslené ikonky (vlastní, jednou čarou)
const IK = {
  prijmy: '<path d="M4 9h16v10H4zM4 9l3-4h10l3 4M15 14h3"/>', vydaje: '<path d="M3 5h2l2 10h11l2-7H6"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  zustatek: '<path d="M5 12a7 6 0 0 1 13-2h2v4h-2a7 6 0 0 1-3 4v2h-3v-1H9v1H6v-3a6 6 0 0 1-1-5z"/><circle cx="15" cy="11" r=".8"/>',
  dovolena: '<path d="M3 14l8-2 5-7 2 1-3 7 5 1 1 2-7 0-4 4-2-1 2-4-6-1z"/>', rezerva: '<path d="M5 12a7 6 0 0 1 13-2h2v4h-2a7 6 0 0 1-3 4v2h-3v-1H9v1H6v-3a6 6 0 0 1-1-5z"/>',
  auto: '<path d="M3 15l2-5h14l2 5v3H3zM7 10l2-3h6l2 3"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>',
  dum: '<path d="M3 11l9-7 9 7v9H3zM9 20v-6h6v6"/>', jine: '<path d="M12 3l2.6 6 6.4.5-5 4.2 1.6 6.3L12 16.6 6.4 20l1.6-6.3-5-4.2 6.4-.5z"/>',
};
const ikona = (k, c) => '<svg class="ik" viewBox="0 0 24 24" aria-hidden="true" style="--c:' + (c || 'currentColor') + '"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (IK[k] || IK.jine) + '</g></svg>';
// Pečeť ocenění: voskový kruh s vlnitým okrajem a jednoduchým znakem
const ZNAK = {
  pero: '<path d="M-7 7l10-10 4 4-10 10h-4zM1-1l4 4"/>', kalendar: '<rect x="-8" y="-7" width="16" height="15" rx="2"/><path d="M-8-2h16M-4-10v5M4-10v5M-3 3l2 2 4-4"/>',
  mince: '<circle r="8"/><path d="M0-5v10M-3-3h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5"/>', fajfka: '<path d="M-8 0l5 5 11-11"/>', vlajka: '<path d="M-6 9V-9M-6-8h11l-3 4 3 4h-11"/>',
  hora: '<path d="M-10 8l7-12 4 6 3-4 6 10z"/>', auto: '<path d="M-9 3l2-5h14l2 5v3h-18zM-5-2l2-3h6l2 3"/>', uctenka: '<path d="M-6-9h12v18l-3-2-3 2-3-2-3 2zM-3-4h6M-3 0h6M-3 4h4"/>',
  kniha: '<path d="M-9-7h8a2 2 0 0 1 1 2V8a2 2 0 0 0-1-1h-8zM9-7H1a2 2 0 0 0-1 2V8a2 2 0 0 1 1-1h8z"/>', hvezda: '<path d="M0-9l2.6 6 6.4.5-5 4.2 1.6 6.3L0 4.6l-5.6 3.4 1.6-6.3-5-4.2 6.4-.5z"/>',
};
export function pecet(o, size) {
  const zub = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = i % 2 ? 30 : 33; zub.push((Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1)); }
  return '<svg class="pecet' + (o.kdy ? '' : ' zatim') + '" width="' + (size || 76) + '" height="' + (size || 76) + '" viewBox="-36 -36 72 72" aria-hidden="true">' +
    '<polygon points="' + zub.join(' ') + '" fill="' + o.c + '"/><circle r="24" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.5"/>' +
    '<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ZNAK[o.i] || ZNAK.hvezda) + '</g></svg>';
}

// ---------- Přehled ----------
export function vPrehled(S, U) {
  const ym = mk(U.day), s = souhrnMesice(S, ym), N = dim(ym), now = dnes(), cur = mk(now) === ym;
  const cast = cur ? pd(now).getDate() / N : ym < mk(now) ? 1 : 0, pr = S.pred[ym];
  const karta = (k, n, v, z, cls) => '<div class="kpi ' + cls + '">' + ikona(k) + '<span class="kl">' + n + '</span><b>' + kc(v) + '</b>' + pct(z) + '</div>';
  // Shrnutí měsíce: jen fakta, nic neodsuzuje
  const fakta = [];
  if (s.zExp != null) fakta.push(s.zExp <= 0 ? 'Výdaje jsou o ' + Math.abs(s.zExp) + ' % nižší než minulý měsíc.' : 'Výdaje jsou o ' + s.zExp + ' % vyšší než minulý měsíc.');
  if (s.kats[0] && s.exp) fakta.push('Nejvíc šlo na ' + kat(S, s.kats[0][0]).n.toLowerCase() + ' (' + Math.round(s.kats[0][1] / s.exp * 100) + ' %).');
  if (pr) fakta.push('Z plánu je utraceno ' + Math.round(s.exp / Math.max(1, pr.vydaje) * 100) + ' %' + (cur ? ', uplynulo ' + Math.round(cast * 100) + ' % měsíce.' : '.'));
  const pc = pocitStat(S, ym);
  if (pc.pocet >= 3) fakta.push('Na radost šlo ' + pc.pct('radost') + ' % označených výdajů, na impulzy ' + pc.pct('impulz') + ' %.');
  const uk = vals(S.ukoly).filter(u => u.mesic === ym || (u.mesic < ym && !u.hotovo));
  if (uk.length) fakta.push('Splněno ' + uk.filter(u => u.hotovo).length + ' z ' + uk.length + ' úkolů.');
  const L = mHead(U, 'Přehled') +
    '<div class="kpis">' + karta('prijmy', 'Příjmy', s.inc, s.zInc, 'zel') + karta('vydaje', 'Výdaje', s.exp, s.zExp, 'cer') + karta('zustatek', 'Zůstatek', s.zust, s.zZust, 'mod') + '</div>' +
    '<div class="dvoj"><div><h3 class="sub">Plán měsíce</h3>' + (pr ? '<div class="fig budik"><svg id="gbud" role="img" aria-label="Kolik z plánu je utraceno"></svg></div><p class="note2">Čárkovaná ryska = kolik měsíce uplynulo.</p>' : '<p class="empty">Plán na tento měsíc ještě není zapsaný. <a href="#mesic">Zapsat plán</a></p>') + '</div>' +
    '<div class="lepik zluty"><h4>Shrnutí měsíce</h4>' + (fakta.length ? '<ul>' + fakta.map(f => '<li>' + esc(f) + '</li>').join('') + '</ul>' : '<p>Zatím málo zápisů na shrnutí.</p>') + '</div></div>' +
    '<h3 class="sub">Příjmy a výdaje <span class="leg"><i style="--c:#4c9a5a"></i>Příjmy <i style="--c:#ef8a3c"></i>Výdaje</span></h3><div class="fig"><svg id="gsl" role="img" aria-label="Příjmy a výdaje za posledních 6 měsíců"></svg></div>';
  const tot = s.exp, ks = s.kats.slice(0, 6);
  const cile = vals(S.cile).sort((a, b) => (a.do || '9').localeCompare(b.do || '9')).slice(0, 3);
  const dnesUk = vals(S.ukoly).filter(u => !u.hotovo && u.mesic <= mk(now)).sort((a, b) => (a.termin || '9').localeCompare(b.termin || '9')).slice(0, 4);
  const posl = oceneni(S, now).filter(o => o.kdy).sort((a, b) => b.kdy.localeCompare(a.kdy))[0];
  const rit = ritualCeka(S, now);
  const R = (rit ? '<a href="#tyden" class="lepik ruzovy ritual" data-act="gotyden" data-id="' + rit + '"><h4>Nedělní rituál</h4><p>Pět minut ohlédnutí za týdnem. Otevřít týdenní list →</p></a>' : '') +
    '<h3 class="sub" style="margin-top:4px">Kategorie výdajů</h3>' + (tot ? '<div class="kolac"><div class="fig kf"><svg id="gkol" role="img" aria-label="Výdaje podle kategorií"></svg></div><ul class="legenda">' +
    ks.map(([k, v]) => { const o = kat(S, k); return '<li data-act="kslice" data-id="' + k + '" class="' + (U.ksel === k ? 'on' : '') + '"><i style="--c:' + o.c + '"></i>' + esc(o.n) + '<b>' + Math.round(v / tot * 100) + ' %</b></li>'; }).join('') + '</ul></div>' : '<p class="empty">V tomto měsíci zatím žádné výdaje.</p>') +
    '<div class="dvoj"><div><h3 class="sub">Moje cíle <a href="#cile" class="mini-l">+ Nový cíl</a></h3>' + (cile.length ? cile.map(cilHTML).join('') : '<p class="empty">Žádný cíl. <a href="#cile">Přidat první</a></p>') + '</div>' +
    '<div><div class="lepik zluty"><h4>Úkoly (' + dnesUk.length + ')</h4>' + (dnesUk.length ? dnesUk.map(u => '<label class="lu"><input type="checkbox" data-act="tdone" data-id="' + u.id + '">' + esc(u.text) + '</label>').join('') : '<p>Všechno hotovo.</p>') + '</div>' +
    '<div class="lepik bily"><h4>Ocenění</h4>' + (posl ? '<div class="oc1">' + pecet(posl, 64) + '<p><b>' + esc(posl.n) + '</b><br>' + esc(posl.p) + '</p></div>' : '<p>První ocenění přijde s prvním zápisem.</p>') + '<a href="#oceneni" class="mini-l">Všechna ocenění</a></div></div></div>';
  return [L, R];
}
export function cilHTML(c) {
  const p = c.cil > 0 ? Math.min(100, Math.round(c.nasporeno / c.cil * 100)) : 0, barva = { dovolena: '#4c9a5a', rezerva: '#ef8a3c', auto: '#3d7ea6', dum: '#7b5ea7' }[c.typ] || '#d1495b';
  return '<div class="cil">' + ikona(c.typ, barva) + '<div><b>' + esc(c.nazev) + '</b><div class="pastelka"><i style="--c:' + barva + ';width:' + p + '%"></i></div><small>' + p + ' % · ' + kc(c.nasporeno) + ' z ' + kc(c.cil) + (c.do ? ' · do ' + (+c.do.slice(5, 7)) + '/' + c.do.slice(0, 4) : '') + '</small></div></div>';
}

// ---------- Pokladní kniha ----------
export function vPokladni(S, U) {
  const ym = mk(U.day), pen = U.kpen || '', od = ym + '-01', N = dim(ym);
  const l = monthE(S, ym).filter(e => !pen || (e.pen || 'ucet') === pen).sort((a, b) => a.d.localeCompare(b.d) || (a.ts || 0) - (b.ts || 0));
  let zust = stavKDatu(S, od, pen || undefined);
  const start = zust;
  const rows = l.map((e, i) => { zust += e.typ === 'p' ? e.kc : -e.kc; return '<tr><td>' + datKratce(e.d) + '</td><td class="c">' + (i + 1) + '</td><td class="po">' + esc(e.text) + '<small>' + esc(kat(S, e.kat).n) + '</small></td><td class="pr">' + (e.typ === 'p' ? nf(e.kc, 2) : '') + '</td><td class="vy">' + (e.typ === 'v' ? nf(e.kc, 2) : '') + '</td><td class="zu">' + nf(zust, 2) + '</td></tr>'; });
  const inc = sumT(l, 'p'), exp = sumT(l, 'v');
  const L = mHead(U, 'Pokladní kniha') + '<div class="vchips"><button class="vchip ' + (!pen ? 'on' : '') + '" data-act="kpen" data-id="">Všechny peněženky</button>' + vals(S.pen).map(p => '<button class="vchip ' + (pen === p.id ? 'on' : '') + '" data-act="kpen" data-id="' + p.id + '">' + esc(p.n) + '</button>').join('') + '</div>' +
    '<div class="scroll"><table class="kniha-tab"><thead><tr><th>Datum</th><th class="c">Č.</th><th class="po">Popis</th><th>Příjem</th><th>Výdaj</th><th>Zůstatek</th></tr></thead><tbody>' +
    '<tr class="prevod"><td>' + datKratce(od) + '</td><td></td><td class="po">Převod z minulého měsíce</td><td></td><td></td><td class="zu">' + nf(start, 2) + '</td></tr>' + rows.join('') +
    '</tbody><tfoot><tr><td colspan="3" class="po">Součet ' + MG[+ym.slice(5) - 1] + '</td><td class="pr">' + nf(inc, 2) + '</td><td class="vy">' + nf(exp, 2) + '</td><td class="zu">' + nf(zust, 2) + '</td></tr></tfoot></table></div>';
  const R = '<h3 class="sub" style="margin-top:4px">Uzávěrka měsíce</h3><dl class="kv"><dt>Počáteční stav k 1. ' + (+ym.slice(5)) + '.</dt><dd>' + kc(start) + '</dd><dt>Příjmy</dt><dd>+ ' + kc(inc) + '</dd><dt>Výdaje</dt><dd>− ' + kc(exp) + '</dd><dt>Konečný stav k ' + N + '. ' + (+ym.slice(5)) + '.</dt><dd><b>' + kc(zust) + '</b></dd></dl>' +
    '<p class="note2">Stav vychází z počátečních stavů peněženek (Kategorie → Peněženky) a ze všech zápisů.</p>' +
    '<h3 class="sub">Stav peněženek dnes</h3><dl class="kv">' + vals(S.pen).map(p => '<dt>' + esc(p.n) + '</dt><dd>' + kc(stavKDatu(S, '9999-12-31', p.id)) + '</dd>').join('') + '</dl>' +
    '<h3 class="sub">Kategorie v měsíci</h3><dl class="kv">' + katObdobi(S, ym, ym).map(([k, v]) => '<dt>' + esc(kat(S, k).n) + '</dt><dd>' + kc(v) + '</dd>').join('') + '</dl>' +
    '<p class="note2">Nový zápis uděláš na stránce <a href="#den">Den</a> nebo přes rychlý bloček.</p>';
  return [L, R];
}

// ---------- Grafy a statistiky ----------
const OBD = [['1', '1M'], ['3', '3M'], ['6', '6M'], ['12', '1R']];
export function vGrafy(S, U) {
  const ym = mk(U.day), n = +(U.obd || 6), od = posunYm(ym, -(n - 1)), ks = katObdobi(S, od, ym), tot = ks.reduce((a, x) => a + x[1], 0);
  const prevKs = Object.fromEntries(katObdobi(S, posunYm(od, -n), posunYm(od, -1)));
  // Srovnání jen když předchozí období má výdaje v každém měsíci (jinak by procenta lhala)
  const srovnat = Array.from({ length: n }, (_, i) => posunYm(od, -(i + 1))).every(m => monthE(S, m).some(e => e.typ === 'v'));
  const L = mHead(U, 'Grafy a statistiky') + '<div class="seg" role="group" aria-label="Období">' + OBD.map(([v, t]) => '<button data-act="obd" data-id="' + v + '" class="' + (String(n) === v ? 'on' : '') + '">' + t + '</button>').join('') + '</div>' +
    '<h3 class="sub">Výdaje podle kategorií</h3>' + (tot ? '<div class="kolac"><div class="fig kf"><svg id="gkol" role="img" aria-label="Výdaje podle kategorií"></svg></div><ul class="legenda">' + ks.slice(0, 8).map(([k, v]) => { const o = kat(S, k); return '<li data-act="kslice" data-id="' + k + '" class="' + (U.ksel === k ? 'on' : '') + '"><i style="--c:' + o.c + '"></i>' + esc(o.n) + '<b>' + Math.round(v / tot * 100) + ' %</b></li>'; }).join('') + '</ul></div>' : '<p class="empty">Za toto období nejsou výdaje.</p>') +
    '<h3 class="sub">Příjmy a výdaje po měsících <span class="leg"><i style="--c:#4c9a5a"></i>Příjmy <i style="--c:#ef8a3c"></i>Výdaje</span></h3><div class="fig"><svg id="gsl" role="img" aria-label="Příjmy a výdaje po měsících"></svg></div>';
  const R = '<h3 class="sub" style="margin-top:4px">Kategorie a změna</h3><p class="note2">Za ' + (n === 1 ? 'měsíc' : n + ' měsíců') + ' proti stejně dlouhému období předtím.</p><div class="scroll"><table><thead><tr><th>Kategorie</th><th>Kč</th><th>Podíl</th><th>Změna</th></tr></thead><tbody>' +
    ks.map(([k, v]) => { const p = prevKs[k], z = srovnat && p ? Math.round((v - p) / p * 100) : null; return '<tr><td><i class="dot" style="--c:' + kat(S, k).c + '"></i>' + esc(kat(S, k).n) + '</td><td>' + Math.round(v).toLocaleString('cs-CZ') + '</td><td>' + Math.round(v / tot * 100) + ' %</td><td>' + (z == null ? 'nové' : pct(z)) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<h3 class="sub">Měsíc den po dni</h3><div class="fig"><svg id="mch" role="img" aria-label="Výdaje den po dni proti plánu"></svg></div>';
  return [L, R];
}
export const grafyObdobi = U => +(U.obd || 6);

// ---------- Cíle a úkoly ----------
export function vCile(S, U) {
  const cile = vals(S.cile).sort((a, b) => (a.do || '9').localeCompare(b.do || '9'));
  const ym = mk(U.day), all = vals(S.ukoly), act = all.filter(u => !u.hotovo && u.mesic <= ym), done = all.filter(u => u.hotovo && u.mesic === ym);
  const karta = c => {
    const p = c.cil > 0 ? Math.min(100, Math.round((c.nasporeno || 0) / c.cil * 100)) : 0, vk = Object.values(c.vklady || {}).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 3);
    return '<article class="cilkarta">' + '<div class="cilobr">' + kresliCil({ ...c, novy: U.novyCil === c.id }) + '</div><div class="cilinfo"><h4>' + esc(c.nazev) + '</h4>' +
      '<p class="cilcis"><b>' + kc(c.nasporeno || 0) + '</b> z ' + kc(c.cil) + ' · ' + p + ' %</p>' +
      (c.do ? '<p class="ps">do ' + (+c.do.slice(5, 7)) + '/' + c.do.slice(0, 4) + (c.cil > (c.nasporeno || 0) ? ' · chybí ' + kc(c.cil - (c.nasporeno || 0)) : '') + '</p>' : '') +
      '<div class="cilakce"><input class="inp mini" inputmode="decimal" id="vk-' + c.id + '" placeholder="Kč" aria-label="Částka k připsání do ' + esc(c.nazev) + '"><button class="btn" data-act="cvklad" data-id="' + c.id + '">Vhodit</button></div>' +
      (vk.length ? '<ul class="vklady">' + vk.map(v => '<li>' + datKratce(v.d) + ' <b>' + (v.kc > 0 ? '+' : '') + kc(v.kc) + '</b></li>').join('') + '</ul>' : '') +
      '<div class="cilvz">' + VZHLEDY_CILE.map(([v, n]) => '<button class="tg ' + ((c.vzhled || 'sklenice') === v ? 'on' : '') + '" data-act="cvzhled" data-id="' + c.id + '" data-v="' + v + '">' + n + '</button>').join('') +
      '<button class="del" data-act="cdel" data-id="' + c.id + '" aria-label="Smazat cíl ' + esc(c.nazev) + '">×</button></div></div></article>';
  };
  const L = '<h2 class="pt">Cíle</h2><p class="ps">Na co šetříš. Odloženou částku „vhoď“ do sklenice, teploměru nebo zdi.</p>' +
    (cile.length ? cile.map(karta).join('') : '<p class="empty">Zatím žádný cíl.</p>') +
    '<h3 class="sub">Nový cíl</h3><div class="row"><label class="f">Název<input id="cn" placeholder="např. Dovolená v Itálii"></label><label class="f">Kolik, Kč<input id="cc" inputmode="numeric"></label><label class="f">Do kdy<input type="month" id="cd"></label></div>' +
    '<div class="row"><label class="f">Druh<select id="ct"><option value="dovolena">Dovolená</option><option value="rezerva">Rezerva</option><option value="auto">Auto</option><option value="dum">Bydlení</option><option value="jine">Jiné</option></select></label>' +
    '<label class="f">Kreslit jako<select id="cv">' + VZHLEDY_CILE.map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('') + '</select></label><label class="f">Už mám našetřeno, Kč<input id="cs" inputmode="numeric" value="0"></label></div><button class="btn" data-act="cadd">Přidat cíl</button>';
  const R = '<h3 class="sub" style="margin-top:4px">Úkoly · ' + ymLabel(ym).toLowerCase() + '</h3>' + (act.length ? act.map(u => taskHTML(S, U, u)).join('') : '<p class="empty">Všechno hotovo.</p>') +
    '<input id="un" class="line hand" placeholder="nový úkol – např. zavolat do pojišťovny" autocomplete="off" style="margin-top:12px"><div class="row" style="margin-top:10px"><label class="f">Termín (nepovinný)<input type="date" id="ut"></label></div><button class="btn" data-act="uadd">Přidat úkol</button>' +
    '<h3 class="sub">Splněno</h3>' + (done.length ? done.map(u => taskHTML(S, U, u)).join('') : '<p class="empty">Zatím nic odškrtnutého.</p>');
  return [L, R];
}

// ---------- Ocenění ----------
export function vOceneni(S) {
  const o = oceneni(S, dnes()), z = o.filter(x => x.kdy);
  const karta = x => '<div class="ocen' + (x.kdy ? '' : ' zatim') + '">' + pecet(x) + '<b>' + esc(x.n) + '</b><small>' + esc(x.p) + '</small><em>' + (x.kdy ? 'získáno ' + datKratce(x.kdy) + ' ' + x.kdy.slice(0, 4) : 'zatím ne') + '</em></div>';
  const L = '<h2 class="pt">Ocenění</h2><p class="ps">Pečeti za to, co se ti v deníku povedlo. Nic se nebere zpátky a nic tě netrestá.</p><p class="big">' + z.length + ' z ' + o.length + '</p><div class="oceneni">' + z.map(karta).join('') + '</div>';
  const R = '<h3 class="sub" style="margin-top:4px">Ještě tě čeká</h3><div class="oceneni">' + o.filter(x => !x.kdy).map(karta).join('') + '</div>';
  return [L, R];
}

// ---------- Roční bilance ----------
export function vRok(S, U) {
  const now = dnes(), rok = +(U.rok || now.slice(0, 4)), data = rokVPuntikach(S, rok, now);
  const inc = data.reduce((s, m) => s + m.inc, 0), exp = data.reduce((s, m) => s + m.exp, 0);
  const ok = data.reduce((s, m) => s + m.dny.filter(d => d.st === 'ok').length, 0), nad = data.reduce((s, m) => s + m.dny.filter(d => d.st === 'nad').length, 0);
  const plus = data.filter(m => m.inc > m.exp && m.inc > 0), best = data.filter(m => m.inc || m.exp).sort((a, b) => (b.inc - b.exp) - (a.inc - a.exp))[0];
  const ks = katObdobi(S, rok + '-01', rok + '-12'), pecetiN = data.filter(m => m.pecet).length;
  const mesic = m => {
    const prvni = (pd(m.ym + '-01').getDay() + 6) % 7;
    return '<div class="rm"><h4>' + MN[+m.ym.slice(5) - 1] + (m.pecet ? pecetMala() : '') + '</h4><div class="tecky">' + '<i class="nic skryta"></i>'.repeat(prvni) +
      m.dny.map(d => '<i class="' + d.st + '" title="' + datKratce(d.d) + (d.st === 'nic' ? '' : ' · volné výdaje ' + kc(d.kc)) + '"></i>').join('') + '</div></div>';
  };
  const L = '<div class="phead"><button class="arw" data-act="rok" data-id="' + (rok - 1) + '" aria-label="Předchozí rok">‹</button><div><h2 class="pt">Roční bilance ' + rok + '</h2><p class="ps">Rok v puntících: každý den jedna tečka</p></div><button class="arw" data-act="rok" data-id="' + (rok + 1) + '" aria-label="Další rok">›</button></div>' +
    '<p class="leg2"><i class="ok"></i> v denním limitu <i class="nad"></i> nad limitem <i class="nic"></i> bez zápisů nebo budoucnost' + ' · <span class="pec-l">' + pecetMala() + '</span> měsíc v plusu a v plánu</p>' +
    '<div class="rokmrizka">' + data.map(mesic).join('') + '</div>' +
    '<p class="note2">Počítají se jen volné výdaje (bez bydlení, předplatného a pravidelných plateb). Denní limit = plán měsíce bez pravidelných plateb rozdělený na dny; bez plánu průměr posledních 3 měsíců.</p>';
  const R = '<h3 class="sub" style="margin-top:4px">Rok v číslech</h3><div class="kpis"><div class="kpi zel"><span class="kl">Příjmy</span><b>' + kc(inc) + '</b></div><div class="kpi cer"><span class="kl">Výdaje</span><b>' + kc(exp) + '</b></div><div class="kpi mod"><span class="kl">Zbylo</span><b>' + kc(inc - exp) + '</b></div></div>' +
    '<dl class="kv"><dt>Dní v limitu</dt><dd>' + ok + ' z ' + (ok + nad) + (ok + nad ? ' (' + Math.round(ok / (ok + nad) * 100) + ' %)' : '') + '</dd><dt>Měsíců v plusu</dt><dd>' + plus.length + '</dd><dt>Zlatých pečetí</dt><dd>' + pecetiN + '</dd>' +
    (best ? '<dt>Nejlepší měsíc</dt><dd>' + MN[+best.ym.slice(5) - 1] + ' (' + kc(best.inc - best.exp) + ')</dd>' : '') + '</dl>' +
    '<h3 class="sub">Příjmy a výdaje po měsících</h3><div class="fig"><svg id="gsl" role="img" aria-label="Příjmy a výdaje po měsících roku"></svg></div>' +
    '<h3 class="sub">Na co šlo nejvíc</h3>' + (ks.length ? '<div class="bars">' + ks.slice(0, 6).map(([kk, v]) => { const o = kat(S, kk); return '<div class="b"><span>' + esc(o.n) + '</span><div class="tr"><div class="fl" style="--c:' + o.c + ';width:' + Math.max(3, v / ks[0][1] * 100) + '%"></div></div><span class="v">' + kc(v) + '</span></div>'; }).join('') + '</div>' : '<p class="empty">V tomto roce zatím nic.</p>');
  return [L, R];
}
const pecetMala = () => '<svg class="pecet-m" viewBox="-12 -12 24 24" aria-label="zlatá pečeť"><circle r="10.5" fill="#d9a520" stroke="#a87b0f" stroke-dasharray="2 1.2"/><path d="M-4 0l3 3 6-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';

// ---------- Vzhled a nastavení ----------
export function vVzhled(S, U, ctx) {
  const n = S.nast, f = FONTS.find(x => x.id === n.font) || FONTS[0];
  const vyb = (pole, klic, arr, render) => '<div class="vyber">' + arr.map(x => '<button class="vb ' + (n[klic] === x.id ? 'on' : '') + '" data-act="nast" data-k="' + klic + '" data-id="' + x.id + '" aria-pressed="' + (n[klic] === x.id) + '">' + render(x) + '</button>').join('') + '</div>';
  const L = '<h2 class="pt">Vzhled a nastavení</h2><p class="ps">Všechno se projeví hned. Data zůstávají stejná, mění se jen podoba knihy.</p>' +
    '<h3 class="sub">Režim knihy</h3><div class="rezimy">' + REZIMY.map(r => '<button class="rz ' + (n.rezim === r.id ? 'on' : '') + '" data-act="nast" data-k="rezim" data-id="' + r.id + '"><i class="rz-' + r.id + '"></i><b>' + r.n + '</b><small>' + r.p + '</small></button>').join('') + '</div>' +
    '<h3 class="sub">Desky</h3>' + vyb(0, 'desky', DESKY, x => '<i class="sw-d" style="--c:' + x.c + ';--c2:' + x.c2 + '"></i><small>' + x.n + '</small>') +
    '<h3 class="sub">Stůl</h3>' + vyb(0, 'stul', STUL, x => '<i class="sw-s stul-' + x.id + '"></i><small>' + x.n + '</small>');
  const R = '<h3 class="sub" style="margin-top:4px">Barva stránek</h3>' + vyb(0, 'papir', PAPIR, x => '<i class="sw-p" style="--c:' + x.c + '"></i><small>' + x.n + '</small>') +
    '<h3 class="sub">Linky</h3>' + vyb(0, 'linky', LINKY, x => '<i class="sw-l lin-' + x.id + '"></i><small>' + x.n + '</small>') +
    '<h3 class="sub">Písmo</h3>' + vyb(0, 'font', FONTS, x => '<span class="fs" style="font-family:' + x.f + ';font-size:' + Math.min(x.s, 22) + 'px">Káva 65 Kč</span><small>' + x.n + '</small>') +
    '<h3 class="sub">Barva písma</h3>' + vyb(0, 'ink', INKS, x => '<i class="sw-i" style="--c:' + x.c[0] + '"></i><small>' + x.n + '</small>') +
    '<h3 class="sub">Kniha</h3><label class="f chk"><input type="checkbox" data-act="nastb" data-k="zavrena" ' + (n.zavrena !== false ? 'checked' : '') + '> Při spuštění ukázat zavřenou knihu</label>' +
    '<label class="f chk"><input type="checkbox" data-act="zvuk" ' + (n.zvuk ? 'checked' : '') + '> Zvuky: šustění listů, razítko, cinknutí mince</label>' +
    '<p class="note2">Listovat můžeš i prstem (tah doleva/doprava) nebo šipkami na klávesnici.</p>' +
    '<div class="ukazka lined"><span class="hand">Tak takhle bude vypadat tvůj zápis: oběd s kolegy 289 Kč</span></div>' +
    '<h3 class="sub">Účet</h3>' + ctx.ucet + '<p class="note2">Finanční deník ' + VERZE + '</p>';
  return [L, R];
}

// ---------- akce ----------
const h = id => ($('#' + id) ? $('#' + id).value.trim() : '');
export function kronikaAkce(a, t, U, ctx) {
  const id = t.dataset.id;
  switch (a) {
    case 'kslice': U.ksel = U.ksel === id ? '' : id; return true;
    case 'kpen': U.kpen = id; return true;
    case 'obd': U.obd = id; return true;
    case 'rok': U.rok = id; return true;
    case 'zvuk': zapis(['nast', 'zvuk'], t.checked); return true;
    case 'gotyden': U.tyden = id; return false;
    case 'nastb': zapis(['nast', t.dataset.k], t.checked); return true;
    case 'nast': zapis(['nast', t.dataset.k], id); if (t.dataset.k === 'rezim') { const r = REZIMY.find(x => x.id === id); if (r) ctx.toast('Režim: ' + r.n.replace('Režim ', '').replace(' režim', '') + '. Úvodní stránka a menu se přizpůsobily.'); } return true;
    case 'cadd': {
      const nazev = h('cn'), cil = num(h('cc'));
      if (!nazev) { $('#cn').focus(); return 'stop'; }
      if (!(cil > 0)) { $('#cc').focus(); return 'stop'; }
      const zac = Math.max(0, num(h('cs')) || 0), c = { id: uid(), nazev, cil, nasporeno: zac, do: h('cd') ? h('cd') + '-28' : '', typ: $('#ct').value, vzhled: $('#cv').value, vklady: zac ? { v0: { d: dnes(), kc: zac } } : {} };
      zapis(['cile', c.id], c); return true;
    }
    case 'cvklad': {
      const c = st.S.cile[id], v = num(h('vk-' + id));
      if (!c || !v) { const el = $('#vk-' + id); if (el) el.focus(); return 'stop'; }
      const nove = Math.max(0, (c.nasporeno || 0) + v);
      zapis(['cile', id, 'nasporeno'], nove);
      const vid = uid(); zapis(['cile', id, 'vklady', vid], { d: dnes(), kc: v });
      U.novyCil = id; setTimeout(() => { U.novyCil = ''; }, 1500);
      if (ctx.zvuk) ctx.zvuk('mince');
      if (nove >= c.cil && (c.nasporeno || 0) < c.cil) ctx.toast('Cíl „' + c.nazev + '“ je splněný! Nová pečeť v Oceněních.');
      return true;
    }
    case 'cdel': zapis(['cile', id], null); return true;
    case 'cvzhled': zapis(['cile', id, 'vzhled'], t.dataset.v); return true;
    default: return false;
  }
}
