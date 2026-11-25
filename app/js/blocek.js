// Finanční deník · blocek.js · v0.5.0
// „Trhací bloček“ – rychlý zápis z kapsy. Otevírá ho widget na ploše Androidu,
// zkratka ikony (dlouhé podržení) nebo adresa #zapis / #zapis-mic.
// Zápis jde rovnou do deníku (do dnešního dne), stejně jako ze stránky Den.

import { esc, kc, nf, num, uid, vals, dnes } from './util.js';
import { parse, tachOk } from './logic.js';
import { st, zapis } from './store.js';
import { diktuj, hlasDostupny, hlasChyba } from './hlas.js';

const $ = s => document.querySelector(s);
const S = () => st.S;
const B = { typ: 'v', katTouched: false, vozTouched: false, auto: {}, poZapsani: () => {} };

const MIC = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

// Nejčastější kategorie za poslední 2 měsíce (rychlé čipy)
function topKats(typ) {
  const od = new Date(); od.setMonth(od.getMonth() - 2);
  const hr = od.toISOString().slice(0, 10), c = {};
  vals(S().e).filter(e => e.typ === typ && e.d >= hr).forEach(e => { c[e.kat] = (c[e.kat] || 0) + 1; });
  return vals(S().kats).filter(k => k.t === typ).sort((a, b) => (c[b.id] || 0) - (c[a.id] || 0) || (a.ord ?? 99) - (b.ord ?? 99)).slice(0, 6);
}

function html() {
  const kats = vals(S().kats).filter(k => k.t === B.typ).sort((a, b) => (a.ord ?? 99) - (b.ord ?? 99));
  const vozy = vals(S().vozy).sort((a, b) => a.n.localeCompare(b.n, 'cs'));
  return '<div class="slip"><button class="bx" data-b="zavrit" aria-label="Zavřít bloček">×</button>' +
    '<h2 id="bt">Rychlý zápis</h2><p class="bsub">Zapíše se do dneška. Částku a tagy poznám sám.</p>' +
    '<div class="seg" role="group" aria-label="Druh zápisu"><button data-b="typ" data-v="v" class="' + (B.typ === 'v' ? 'on' : '') + '">Výdaj</button><button data-b="typ" data-v="p" class="' + (B.typ === 'p' ? 'on' : '') + '">Příjem</button></div>' +
    '<div class="qrow"><input id="bq" class="line hand" autocomplete="off" enterkeyhint="done" aria-label="Co a za kolik" placeholder="např. káva 65">' +
    (hlasDostupny() ? '<button class="mic" data-b="mic" aria-label="Diktovat">' + MIC + '</button>' : '') + '</div><p class="prev" id="bprev"></p>' +
    '<div class="chips" id="bchips">' + topKats(B.typ).map(k => '<button class="chip" data-b="kat" data-id="' + k.id + '" style="--c:' + k.c + '">' + esc(k.n) + '</button>').join('') + '</div>' +
    '<div class="row"><label class="f">Kategorie<select id="bkat">' + kats.map(k => '<option value="' + k.id + '">' + esc(k.n) + '</option>').join('') + '</select></label>' +
    '<label class="f">Peněženka<select id="bpen">' + vals(S().pen).map(p => '<option value="' + p.id + '">' + esc(p.n) + '</option>').join('') + '</select></label></div>' +
    '<div class="row" id="btank" hidden>' + (vozy.length ? '<label class="f">Vozidlo<select id="bvoz">' + vozy.map(v => '<option value="' + v.id + '">' + esc(v.n) + '</option>').join('') + '</select></label>' : '') +
    '<label class="f">Litry<input id="bl" inputmode="decimal"></label><label class="f">Tachometr, km<input id="bkm" inputmode="numeric"></label></div>' +
    '<button class="btn wide" data-b="ulozit">Zapsat</button></div>';
}

function nahled() {
  const q = $('#bq'); if (!q) return;
  const p = parse(q.value), pv = $('#bprev'), tank = p.tank && B.typ === 'v' && vals(S().vozy).length > 0;
  $('#btank').hidden = !tank;
  if (tank) {
    if (!isNaN(p.litry) && (B.auto.l || !$('#bl').value)) { $('#bl').value = nf(p.litry, p.litry % 1 ? 1 : 0); B.auto.l = 1; }
    if (!isNaN(p.km) && (B.auto.km || !$('#bkm').value)) { $('#bkm').value = p.km; B.auto.km = 1; }
    if (!isNaN(p.km) && !B.vozTouched) {
      let best = null, bt = -1;
      vals(S().vozy).forEach(v => {
        const t = Math.max(0, ...vals(S().e).filter(e => e.tema === 'tank' && e.pole && e.pole.voz === v.id).map(e => e.pole.tach || 0));
        if (t <= p.km && t > bt) { best = v.id; bt = t; }
      });
      if (best) $('#bvoz').value = best;
    }
  }
  if (p.kat && !B.katTouched && [...$('#bkat').options].some(o => o.value === p.kat)) $('#bkat').value = p.kat;
  document.querySelectorAll('#bchips .chip').forEach(c => c.classList.toggle('on', c.dataset.id === $('#bkat').value));
  if (!q.value.trim()) { pv.textContent = ''; return; }
  const parts = [isNaN(p.amt) ? 'částka chybí' : (B.typ === 'p' ? 'příjem ' : 'výdaj ') + '<b>' + kc(p.amt) + '</b>'];
  if (tank) { parts.push('Tankování'); if (!isNaN(p.litry)) parts.push('<b>' + nf(p.litry, 1) + ' l</b>'); if (!isNaN(p.km)) parts.push('<b>' + p.km.toLocaleString('cs-CZ') + ' km</b>'); }
  if (p.tagy.length) parts.push(p.tagy.map(t => '#' + esc(t)).join(' '));
  pv.innerHTML = parts.join(' · ');
}

function ulozit() {
  const p = parse($('#bq').value), pv = $('#bprev'), tank = !$('#btank').hidden;
  if (isNaN(p.amt) || p.amt <= 0) { pv.innerHTML = '<b>Chybí částka.</b> Třeba „káva 65“.'; $('#bq').focus(); return; }
  const d = dnes();
  const e = { id: uid(), d, ts: Date.now(), typ: B.typ, kc: Math.round(p.amt * 100) / 100, text: p.text, kat: $('#bkat').value, pen: $('#bpen').value, tagy: p.tagy, zdroj: 'blocek' };
  if (tank) {
    const l = num($('#bl').value), km = num($('#bkm').value), voz = $('#bvoz').value;
    if (!(l > 0)) { pv.innerHTML = '<b>Doplň litry.</b>'; return; }
    if (km > 0 && !tachOk(vals(S().e).filter(x => x.tema === 'tank' && x.pole && x.pole.voz === voz), d, km)) { pv.innerHTML = '<b>Tachometr nesedí</b> s dřívějším tankováním.'; return; }
    e.tema = 'tank'; e.pole = { litry: l, tach: km > 0 ? km : 0, voz };
  }
  zapis(['e', e.id], e);
  zavritBlocek();
  toast('Zapsáno: ' + e.text + ' · ' + kc(e.kc));
  B.poZapsani();
}

export function toast(t) {
  const el = $('#toast'); if (!el) return;
  el.textContent = t; el.hidden = false;
  clearTimeout(toast.tm); toast.tm = setTimeout(() => { el.hidden = true; }, 3200);
}

function mluv() {
  const b = document.querySelector('[data-b=mic]'); if (b) b.classList.add('rec');
  diktuj('Řekni třeba: káva šedesát pět').then(t => {
    const q = $('#bq'); if (!q) return;
    q.value = (q.value ? q.value + ' ' : '') + t; nahled();
  }).catch(e => { const m = hlasChyba(e); if (m && $('#bprev')) $('#bprev').textContent = m; })
    .finally(() => { if (b) b.classList.remove('rec'); });
}

function vykresli(txt) {
  const el = $('#blocek');
  el.innerHTML = html(); el.hidden = false;
  const q = $('#bq');
  q.value = txt || '';
  q.addEventListener('input', nahled);
  q.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ulozit(); } });
  $('#bkat').addEventListener('change', () => { B.katTouched = true; nahled(); });
  if ($('#bvoz')) $('#bvoz').addEventListener('change', () => { B.vozTouched = true; });
  ['bl', 'bkm'].forEach(id => $('#' + id).addEventListener('input', () => { B.auto[id === 'bl' ? 'l' : 'km'] = 0; }));
  nahled();
  return q;
}
export function otevritBlocek(opt) {
  if (!S()) return;
  B.typ = 'v'; B.katTouched = false; B.vozTouched = false; B.auto = {};
  const q = vykresli('');
  document.body.classList.add('blocek-open');
  if (opt && opt.mic && hlasDostupny()) mluv(); else setTimeout(() => q.focus(), 60);
}
export function zavritBlocek() {
  const el = $('#blocek'); if (!el) return;
  el.hidden = true; el.innerHTML = '';
  document.body.classList.remove('blocek-open');
}
export function initBlocek(poZapsani) {
  B.poZapsani = poZapsani;
  document.addEventListener('click', ev => {
    const el = $('#blocek');
    if (el && !el.hidden && ev.target === el) { zavritBlocek(); return; }
    const t = ev.target.closest('[data-b]'); if (!t) return;
    const a = t.dataset.b;
    if (a === 'zavrit') zavritBlocek();
    else if (a === 'ulozit') ulozit();
    else if (a === 'mic') mluv();
    else if (a === 'typ') { const txt = $('#bq').value; B.typ = t.dataset.v; B.katTouched = false; vykresli(txt).focus(); }
    else if (a === 'kat') { $('#bkat').value = t.dataset.id; B.katTouched = true; nahled(); }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#blocek').hidden) zavritBlocek(); });
}
