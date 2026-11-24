// Finanční deník · views.js · v0.2.0
// Každá stránka vrací [levá strana, pravá strana] jako HTML. Žádné zápisy dat – ty dělá app.js.

import { esc, kc, kc2, nf, pd, iso, mk, dim, dnes, DNY, MG, MN, ymLabel, datKratce, vals } from './util.js';
import { HL } from './data.js';
import { tankStats, sumT, monthE, deser, zustatek, hledej, plain } from './logic.js';

export const kat = (S, id) => (S.kats || {})[id] || { id: '', n: 'Bez kategorie', c: '#999', t: 'v' };
const katsSorted = (S, t) => vals(S.kats).filter(k => !t || k.t === t).sort((a, b) => (a.ord ?? 99) - (b.ord ?? 99) || a.n.localeCompare(b.n, 'cs'));
const pens = S => vals(S.pen).sort((a, b) => (a.id === 'ucet' ? -1 : b.id === 'ucet' ? 1 : a.n.localeCompare(b.n, 'cs')));
const vozy = S => vals(S.vozy).sort((a, b) => a.n.localeCompare(b.n, 'cs'));
const tagsHTML = e => (e.tagy || []).map(t => '<span class="tag">#' + esc(t) + '</span>').join('');
const sortE = l => l.sort((a, b) => (a.d.localeCompare(b.d)) || ((a.ts || 0) - (b.ts || 0)));

export function entHTML(S, e, sDatem) {
  const k = kat(S, e.kat);
  let extra = '';
  if (e.tema === 'tank') {
    const v = (S.vozy || {})[e.pole.voz];
    extra = '<span>Tankování · ' + esc(v ? v.n : 'vozidlo smazáno') + ' · ' + nf(e.pole.litry, 1) + ' l' + (e.pole.tach ? ' · ' + e.pole.tach.toLocaleString('cs-CZ') + ' km' : '') + '</span>';
  }
  const pen = (S.pen || {})[e.pen || 'ucet'];
  return '<li class="ent"><span class="t">' + esc(e.text) + '</span><span class="a ' + (e.typ === 'p' ? 'p' : '') + '">' + (e.typ === 'p' ? '+' : '') + kc(e.kc) + '</span>' +
    '<button class="del" data-act="del" data-id="' + e.id + '" aria-label="Smazat zápis">×</button>' +
    '<span class="meta">' + (sDatem ? '<a href="#den" data-act="goday" data-id="' + e.d + '">' + datKratce(e.d) + '</a>' : '') +
    '<span><i class="dot" style="--c:' + k.c + '"></i>' + esc(k.n) + '</span>' + extra + (pen && e.pen && e.pen !== 'ucet' ? '<span>' + esc(pen.n) + '</span>' : '') + tagsHTML(e) + '</span></li>';
}

function rcHTML(S, s) {
  const ent = vals(S.e).find(e => e.rc === s.id);
  if (s.img) {
    return '<figure class="rcpt foto"><img src="' + s.img + '" alt="Vlepená účtenka">' + (ent
      ? '<figcaption class="dt">' + esc(ent.text) + ' · ' + kc(ent.kc) + '</figcaption>'
      : '<div class="f2"><span>Čtení účtenky přes AI přijde v další verzi. Zatím doplň:</span><input class="inp" id="rcO" placeholder="Obchod" value="' + esc(s.obchod) + '"><input class="inp" id="rcK" inputmode="decimal" placeholder="Částka v Kč"><button class="btn" data-act="rcok" data-id="' + s.id + '">Zapsat výdaj</button><button class="btn ghost" data-act="rcdel" data-id="' + s.id + '">Odlepit</button></div>') + '</figure>';
  }
  const pol = s.pol || [], tot = pol.reduce((a, p) => a + p[1], 0), d = pd(s.d);
  return '<div class="rcpt"><h5>' + esc(s.obchod) + '</h5>' + pol.map(p => '<div class="it"><span>' + esc(p[0]) + '</span><span>' + nf(p[1], 2) + '</span></div>').join('') +
    '<div class="it tot"><span>Celkem</span><span>' + kc2(tot) + '</span></div><div class="dt">' + d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear() + '</div></div>';
}

export function taskHTML(S, U, u) {
  const ym = mk(U.day), carry = u.mesic < ym && !u.hotovo;
  const info = (carry ? 'přeneseno z ' + MG[+u.mesic.slice(5) - 1] + (u.termin ? ' · ' : '') : '') + (u.termin ? 'termín ' + datKratce(u.termin) : '');
  return '<div class="task ' + (u.hotovo ? 'done' : '') + '"><input type="checkbox" data-act="tdone" data-id="' + u.id + '" ' + (u.hotovo ? 'checked' : '') + ' aria-label="Splněno: ' + esc(u.text) + '">' +
    '<span class="t">' + esc(u.text) + (info ? '<small' + (carry ? ' class="carry"' : '') + '>' + info + '</small>' : '') + '</span>' +
    '<button class="del" data-act="tdel" data-id="' + u.id + '" aria-label="Smazat úkol">×</button></div>';
}

const mHead = (titul, pod) => '<div class="phead"><button class="arw" data-act="mprev" aria-label="Předchozí měsíc">‹</button><div><h2 class="pt">' + titul + '</h2><p class="ps">' + pod + '</p></div><button class="arw" data-act="mnext" aria-label="Další měsíc">›</button></div>';

export function vDen(S, U, Q, mic) {
  const d = U.day, dt = pd(d), ym = mk(d);
  const list = sortE(vals(S.e).filter(e => e.d === d)), stk = vals(S.stk).filter(s => s.d === d);
  const ex = sumT(list, 'v'), inc = sumT(list, 'p');
  const L = '<div class="phead"><button class="arw" data-act="dprev" aria-label="Předchozí den">‹</button><div><h2 class="pt">' + DNY[dt.getDay()] + ' ' + dt.getDate() + '. ' + MG[dt.getMonth()] + '</h2><p class="ps">' + ymLabel(ym) + (d === dnes() ? ' · dnes' : ' · <a href="#den" data-act="today">zpět na dnešek</a>') + '</p></div><button class="arw" data-act="dnext" aria-label="Další den">›</button></div>' +
    '<div class="hlbar"><span>Zvýrazňovač: označ slova a vyber barvu</span>' + HL.map(h => '<button class="hlb" data-hl="' + h.c + '" style="--h:' + h.h + '" aria-label="Zvýraznit ' + h.n + '"></button>').join('') + '<button class="hlb x" data-hl="x">Smazat zvýraznění</button>' + (mic ? '<button class="hlb x mic2" data-act="mic" data-id="note">Diktovat zápisek</button>' : '') + '</div><p class="hint" id="hlHint"></p>' +
    '<div id="note" class="note hand" contenteditable="true" spellcheck="false" role="textbox" aria-multiline="true" aria-label="Zápisek dne" data-ph="Co se dnes stalo…">' + deser(S.notes[d]) + '</div>' +
    '<h3 class="sub">Zapsané pohyby</h3>' + (list.length ? '<ul class="list">' + list.map(e => entHTML(S, e)).join('') + '</ul><p class="note2">Výdaje dne <b>' + kc(ex) + '</b>' + (inc ? ' · příjmy <b>' + kc(inc) + '</b>' : '') + '</p>' : '<p class="empty">Zatím nic. Zapiš první výdaj ' + (window.innerWidth > 900 ? 'vpravo' : 'níž') + '.</p>');
  const pr = S.pred[ym], mE = monthE(S, ym), left = (pr ? pr.prijem : sumT(mE, 'p')) - sumT(mE, 'v'), daysLeft = dim(ym) - dt.getDate() + 1;
  const tasks = vals(S.ukoly).filter(u => u.termin === d && !u.hotovo);
  const vz = vozy(S);
  const R = '<h3 class="sub" style="margin-top:4px">Zápis</h3><div class="seg" role="group" aria-label="Druh zápisu"><button data-act="typ" data-v="v" class="' + (Q.typ === 'v' ? 'on' : '') + '">Výdaj</button><button data-act="typ" data-v="p" class="' + (Q.typ === 'p' ? 'on' : '') + '">Příjem</button></div>' +
    '<div class="qrow"><input id="q" class="line hand" autocomplete="off" aria-label="Co jsi koupil a za kolik" placeholder="např. káva 65 #práce" value="' + esc(Q.text) + '">' + (mic ? '<button class="mic" data-act="mic" aria-label="Diktovat zápis">' + MIC + '</button>' : '') + '</div><p class="prev" id="qprev"></p>' +
    '<div class="row"><label class="f">Kategorie<select id="qkat">' + katsSorted(S, Q.typ).map(k => '<option value="' + k.id + '">' + esc(k.n) + '</option>').join('') + '</select></label>' +
    '<label class="f">Peněženka<select id="qpen">' + pens(S).map(p => '<option value="' + p.id + '"' + (p.id === Q.pen ? ' selected' : '') + '>' + esc(p.n) + '</option>').join('') + '</select></label>' +
    '<label class="f">Téma<select id="qtema"><option value="">Bez tématu</option><option value="tank">Tankování</option></select></label></div>' +
    '<div class="row" id="qtank" hidden>' + (vz.length ? '<label class="f">Vozidlo<select id="qvoz">' + vz.map(v => '<option value="' + v.id + '"' + (v.id === U.voz ? ' selected' : '') + '>' + esc(v.n) + (v.typ === 'moto' ? ' (moto)' : ' (auto)') + '</option>').join('') + '</select></label>' : '<p class="note2" style="grid-column:1/-1">Nejdřív si na stránce <a href="#tankovani">Tankování</a> přidej auto nebo motorku.</p>') +
    '<label class="f">Litry<input id="ql" inputmode="decimal"></label><label class="f">Tachometr, km<input id="qkm" inputmode="numeric"></label></div>' +
    '<button class="btn" data-act="add">Zapsat do deníku</button>' +
    '<h3 class="sub">Vlepené účtenky</h3>' + (stk.length ? '<div class="stk">' + stk.map(s => rcHTML(S, s)).join('') + '</div>' : '<p class="empty">Žádná účtenka. Vyfoť ji a vlep sem.</p>') +
    '<label class="btn ghost" for="rcf">Vlepit účtenku z fotky</label><input type="file" id="rcf" accept="image/*" hidden>' +
    '<h3 class="sub">Do konce měsíce</h3><dl class="kv"><dt>Zbývá z ' + (pr ? 'plánovaného příjmu' : 'příjmů') + '</dt><dd>' + kc(left) + '</dd><dt>Na každý den (' + daysLeft + ' ' + (daysLeft === 1 ? 'den' : daysLeft < 5 ? 'dny' : 'dní') + ')</dt><dd>' + kc(Math.max(0, left) / Math.max(1, daysLeft)) + '</dd></dl>' +
    (tasks.length ? '<h3 class="sub">Úkoly na dnes</h3>' + tasks.map(u => taskHTML(S, U, u)).join('') : '');
  return [L, R];
}
const MIC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

export function vMesic(S, U) {
  const ym = mk(U.day), N = dim(ym), list = monthE(S, ym), pr = S.pred[ym], inc = sumT(list, 'p'), ex = sumT(list, 'v');
  const now = dnes(), cur = mk(now) === ym;
  const byK = {};
  list.filter(e => e.typ === 'v').forEach(e => { byK[e.kat] = (byK[e.kat] || 0) + e.kc; });
  const ks = Object.entries(byK).sort((a, b) => b[1] - a[1]), mx = ks.length ? ks[0][1] : 1;
  const prev = [1, 2, 3].map(i => { const d = pd(ym + '-01'); d.setMonth(d.getMonth() - i); return sumT(monthE(S, mk(iso(d))), 'v'); }).filter(x => x > 0);
  const defV = prev.length ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length / 100) * 100 : '';
  const L = mHead(ymLabel(ym), 'Levá strana: co čekám · pravá: jak to dopadlo') +
    '<h3 class="sub">Co čekám</h3>' + (pr
      ? '<dl class="kv"><dt>Zapsáno perem</dt><dd>' + pd(pr.zapsano).getDate() + '. ' + MG[pd(pr.zapsano).getMonth()] + '</dd><dt>Očekávaný příjem</dt><dd>' + kc(pr.prijem) + '</dd><dt>Plánované výdaje</dt><dd>' + kc(pr.vydaje) + '</dd><dt>Má zbýt</dt><dd>' + kc(pr.prijem - pr.vydaje) + '</dd></dl><p class="note2">Zapsaná predikce se už nemění. Skutečnost vpravo se počítá sama ze zápisů.</p>'
      : '<p class="note2">Na začátku měsíce si zapiš, co čekáš. Výdaje předvyplním průměrem posledních měsíců.</p><div class="row"><label class="f">Očekávaný příjem, Kč<input id="pp" inputmode="numeric" value="' + (inc || '') + '"></label><label class="f">Plánované výdaje, Kč<input id="pv" inputmode="numeric" value="' + defV + '"></label></div><button class="btn" data-act="pred">Zapsat perem</button>') +
    '<h3 class="sub">Kam peníze šly</h3>' + (ks.length ? '<div class="bars">' + ks.map(([k, v]) => { const o = kat(S, k); return '<div class="b"><span>' + esc(o.n) + '</span><div class="tr"><div class="fl" style="--c:' + o.c + ';width:' + Math.max(3, v / mx * 100) + '%"></div></div><span class="v">' + kc(v) + '</span></div>'; }).join('') + '</div>' : '<p class="empty">V tomto měsíci zatím žádné výdaje.</p>');
  const diff = pr ? Math.round((ex - pr.vydaje * (cur ? pd(now).getDate() / N : 1)) / Math.max(1, pr.vydaje) * 100) : null;
  const top = list.filter(e => e.typ === 'v').sort((a, b) => b.kc - a.kc).slice(0, 5);
  const R = '<h3 class="sub" style="margin-top:4px">Jak to dopadlo' + (cur ? ' (zatím)' : '') + '</h3><div class="figs"><div><b>' + kc(inc) + '</b><span>příjmy</span></div><div><b>' + kc(ex) + '</b><span>výdaje</span></div><div><b>' + kc(inc - ex) + '</b><span>zůstatek</span></div></div>' +
    (pr && (cur || ym < mk(now)) ? '<p class="note2">' + (diff <= 0 ? 'Utrácíš o ' + Math.abs(diff) + ' % méně' : 'Utrácíš o ' + diff + ' % víc') + ', než odpovídá plánu' + (cur ? ' k dnešku' : '') + '.</p>' : '') +
    '<div class="fig"><svg id="mch" role="img" aria-label="Výdaje den po dni proti plánu"></svg></div>' +
    '<h3 class="sub">Pět největších výdajů</h3>' + (top.length ? '<ul class="list">' + top.map(e => entHTML(S, e, true)).join('') + '</ul>' : '<p class="empty">Nic tu není.</p>');
  return [L, R];
}

export function vTank(S, U) {
  const vz = vozy(S), v = (S.vozy || {})[U.voz] || vz[0];
  const list = v ? vals(S.e).filter(e => e.tema === 'tank' && e.pole && e.pole.voz === v.id) : [];
  const st = tankStats(list), segM = {};
  st.seg.forEach(s => { segM[s.e.id] = s; });
  const L = '<h2 class="pt">Tankování</h2><p class="ps">Zapisuješ ho na stránce dne jako výdaj s tématem Tankování. Tady se počítá spotřeba.</p>' +
    '<div class="vchips">' + vz.map(x => '<button class="vchip ' + (v && x.id === v.id ? 'on' : '') + '" data-act="voz" data-id="' + x.id + '">' + esc(x.n) + ' · ' + (x.typ === 'moto' ? 'moto' : 'auto') + '</button>').join('') + '</div>' +
    (!v ? '<p class="empty">Zatím tu není žádné vozidlo. Přidej auto nebo motorku níž.</p>' : list.length
      ? '<div class="scroll"><table><thead><tr><th>Datum</th><th>Litry</th><th>Kč</th><th>Tachometr</th><th>Ujeto</th><th>l/100 km</th><th>Kč/l</th></tr></thead><tbody>' +
        list.slice().sort((a, b) => b.d.localeCompare(a.d) || (b.pole.tach - a.pole.tach)).map(e => { const s = segM[e.id], d = pd(e.d); return '<tr><td>' + d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + String(d.getFullYear()).slice(2) + '</td><td>' + nf(e.pole.litry, 1) + '</td><td>' + Math.round(e.kc).toLocaleString('cs-CZ') + '</td><td>' + (e.pole.tach ? e.pole.tach.toLocaleString('cs-CZ') : '–') + '</td><td>' + (s ? s.km.toLocaleString('cs-CZ') : '–') + '</td><td>' + (s ? nf(s.sp, 1) : '–') + '</td><td>' + nf(e.kc / e.pole.litry, 2) + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<p class="empty">Pro ' + esc(v.n) + ' zatím není žádné tankování. Zapiš ho na stránce dne, třeba „Tankování 20 l za 750 Kč, 83 087 km“.</p>') +
    '<h3 class="sub">Přidat vozidlo</h3><div class="row"><label class="f">Název<input id="vn" placeholder="např. Fabia"></label><label class="f">Typ<select id="vt"><option value="auto">Auto</option><option value="moto">Motorka</option></select></label></div><button class="btn ghost" data-act="vadd">Přidat vozidlo</button>' +
    (v && !list.length ? ' <button class="btn ghost" data-act="vdel" data-id="' + v.id + '">Smazat ' + esc(v.n) + '</button>' : '');
  const ok = !isNaN(st.avg);
  const R = '<h3 class="sub" style="margin-top:4px">' + (v ? esc(v.n) : 'Spotřeba') + '</h3>' + (ok
    ? '<p class="big">' + nf(st.avg, 1) + ' l</p><p class="ps">průměrná spotřeba na 100 km</p><div class="figs"><div><b>' + nf(st.kckm, 2) + ' Kč</b><span>za 1 km</span></div><div><b>' + st.km.toLocaleString('cs-CZ') + ' km</b><span>ujeto</span></div><div><b>' + kc(st.kc) + '</b><span>za palivo celkem</span></div></div>' +
      '<div class="fig"><svg id="tch" role="img" aria-label="Spotřeba mezi tankováními"></svg></div><p class="note2">Spotřeba úseku = natankováno ÷ ujeto od minula. Bez plné nádrže kolísá, spolehlivý je průměr.</p>'
    : '<p class="empty">Spotřebu spočítám od druhého tankování se stavem tachometru.</p>');
  return [L, R];
}

export function vUkoly(S, U) {
  const ym = mk(U.day), all = vals(S.ukoly);
  const act = all.filter(u => !u.hotovo && u.mesic <= ym), done = all.filter(u => u.hotovo && u.mesic === ym);
  const dated = act.filter(u => u.termin).sort((a, b) => a.termin.localeCompare(b.termin));
  const L = mHead('Úkolníček', ymLabel(ym) + ' · nesplněné se samy přenesou do dalšího měsíce') +
    (act.length ? act.map(u => taskHTML(S, U, u)).join('') : '<p class="empty">Všechno hotovo.</p>') +
    '<h3 class="sub">Nový úkol</h3><input id="un" class="line hand" placeholder="např. zavolat do pojišťovny" autocomplete="off"><div class="row" style="margin-top:10px"><label class="f">Termín (nepovinný)<input type="date" id="ut"></label></div><button class="btn" data-act="uadd">Přidat úkol</button>';
  const R = '<h3 class="sub" style="margin-top:4px">S termínem</h3>' + (dated.length ? dated.map(u => taskHTML(S, U, u)).join('') : '<p class="empty">Žádný úkol s termínem.</p>') +
    '<h3 class="sub">Splněno · ' + ymLabel(ym).toLowerCase() + '</h3>' + (done.length ? done.map(u => taskHTML(S, U, u)).join('') : '<p class="empty">Zatím nic odškrtnutého.</p>');
  return [L, R];
}

export function vKat(S, U) {
  const ym = mk(U.day), list = monthE(S, ym), sumK = id => list.filter(e => e.kat === id).reduce((s, e) => s + e.kc, 0);
  const row = k => '<div class="kat"><input type="color" value="' + k.c + '" data-act="kcol" data-id="' + k.id + '" aria-label="Barva kategorie ' + esc(k.n) + '"><span>' + esc(k.n) + (k.vych ? '' : ' <span class="own">vlastní</span>') + '</span><span class="sum">' + kc(sumK(k.id)) + '</span>' +
    (k.vych ? '<span></span>' : '<button class="del" data-act="kdel" data-id="' + k.id + '" aria-label="Smazat kategorii ' + esc(k.n) + '">×</button>') + '</div>';
  const L = '<h2 class="pt">Kategorie</h2><p class="ps">Součty za ' + ymLabel(ym).toLowerCase() + '. Barvu změníš klepnutím na tečku.</p><h3 class="sub">Výdaje</h3>' + katsSorted(S, 'v').map(row).join('') + '<h3 class="sub">Příjmy</h3>' + katsSorted(S, 'p').map(row).join('') +
    '<h3 class="sub">Vlastní kategorie</h3><div class="row"><label class="f">Název<input id="kn" placeholder="např. Pes"></label><label class="f">Druh<select id="kt"><option value="v">Výdaj</option><option value="p">Příjem</option></select></label><label class="f">Barva<input type="color" id="kc" value="#4f7cac"></label></div><button class="btn ghost" data-act="kadd">Přidat kategorii</button>';
  const tg = {};
  vals(S.e).forEach(e => (e.tagy || []).forEach(t => { tg[t] = tg[t] || { n: 0, s: 0 }; tg[t].n++; tg[t].s += e.kc; }));
  const sel = U.tagSel, te = sel ? vals(S.e).filter(e => (e.tagy || []).includes(sel)).sort((a, b) => b.d.localeCompare(a.d)) : [];
  const R = '<h3 class="sub" style="margin-top:4px">Tagy</h3><p class="note2">Tag napíšeš rovnou do zápisu s mřížkou: „pizza 329 #rande“. Jeden zápis může mít víc tagů a zůstává ve své kategorii.</p>' +
    '<div class="tags">' + (Object.keys(tg).length ? Object.entries(tg).sort((a, b) => b[1].s - a[1].s).map(([t, o]) => '<button class="tg ' + (t === sel ? 'on' : '') + '" data-act="tag" data-id="' + esc(t) + '">#' + esc(t) + ' · ' + kc(o.s) + '</button>').join('') : '<p class="empty">Zatím žádné tagy.</p>') + '</div>' +
    (sel ? '<h3 class="sub">#' + esc(sel) + ' · ' + te.length + ' ' + (te.length === 1 ? 'zápis' : te.length < 5 ? 'zápisy' : 'zápisů') + ' · ' + kc(tg[sel] ? tg[sel].s : 0) + '</h3><ul class="list">' + te.map(e => entHTML(S, e, true)).join('') + '</ul>' : '') +
    '<h3 class="sub">Peněženky</h3><p class="note2">Zůstatek = počáteční stav + příjmy − výdaje zapsané do peněženky.</p>' +
    pens(S).map(p => '<div class="kat pen"><span></span><span>' + esc(p.n) + '<small>počáteční stav <input class="inp mini" inputmode="decimal" data-act="pstart" data-id="' + p.id + '" value="' + (p.start || 0) + '" aria-label="Počáteční stav ' + esc(p.n) + '"> Kč</small></span><span class="sum"><b>' + kc(zustatek(S, p.id)) + '</b></span>' + (p.id === 'ucet' ? '<span></span>' : '<button class="del" data-act="pdel" data-id="' + p.id + '" aria-label="Smazat peněženku ' + esc(p.n) + '">×</button>') + '</div>').join('') +
    '<div class="row" style="margin-top:12px"><label class="f">Nová peněženka<input id="pn" placeholder="např. Spořicí účet"></label></div><button class="btn ghost" data-act="padd">Přidat peněženku</button>';
  return [L, R];
}

export function vHledat(S, U) {
  const res = hledej(S, U.q || '');
  const L = '<h2 class="pt">Hledat v deníku</h2><p class="ps">Prohledá zápisy, zápisky, účtenky, tagy i úkoly. Diakritiku psát nemusíš.</p>' +
    '<input id="hq" class="line hand" type="search" autocomplete="off" placeholder="např. káva, #rande, Lidl" value="' + esc(U.q || '') + '" aria-label="Hledaný text">' +
    '<p class="note2" id="hcount">' + ((U.q || '').trim().length < 2 ? 'Napiš aspoň dva znaky.' : res.length ? 'Nalezeno ' + res.length + '×' : 'Nic jsem nenašel.') + '</p>';
  const item = r => {
    const odk = '<a href="#den" data-act="goday" data-id="' + r.d + '">' + datKratce(r.d) + ' ' + r.d.slice(0, 4) + '</a>';
    if (r.typ === 'e') return entHTML(S, r.e, true);
    if (r.typ === 'n') return '<li class="hit"><span class="kind">Zápisek · ' + odk + '</span><span class="hand">' + esc(r.text) + '</span></li>';
    if (r.typ === 's') return '<li class="hit"><span class="kind">Účtenka · ' + odk + '</span><span>' + esc(r.s.obchod || 'účtenka z fotky') + '</span></li>';
    return '<li class="hit"><span class="kind">Úkol' + (r.u.termin ? ' · ' + odk : '') + '</span><span class="hand">' + esc(r.u.text) + '</span></li>';
  };
  const R = '<h3 class="sub" style="margin-top:4px">Výsledky</h3>' + (res.length ? '<ul class="list" id="hres">' + res.slice(0, 80).map(item).join('') + '</ul>' : '<p class="empty" id="hres">Tady se ukáže, co najdu.</p>');
  return [L, R];
}
export { plain };
