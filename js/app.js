// Finanční deník · app.js · v0.4.0
// Start, přihlášení, vykreslení stránek a všechny akce uživatele.

import { VERZE, iso, pd, addD, mk, dnes, esc, kc, nf, num, uid, vals } from './util.js';
import { DESKY, PAPIR, FONTS, INKS, REZIMY, ukazka } from './data.js';
import { parse, tachOk, hledej, deser } from './logic.js';
import { st, startLocal, resetLocal, startCloud as storeCloud, zCloudu, zapis } from './store.js';
import { vDen, vMesic, vTank, vUkoly, vKat, vHledat } from './views.js';
import { grafMesic, grafTank, grafRada, grafSloupce, grafKolac, grafBudik } from './charts.js';
import { vPrehled, vPokladni, vGrafy, vCile, vOceneni, vVzhled, kronikaAkce, grafyObdobi } from './kronika.js';
import { mesice, souhrnMesice, katObdobi, posunYm } from './logic.js';
import { FIREBASE } from './config.js';
import { diktuj, hlasDostupny, hlasChyba } from './hlas.js';
import { initBlocek, otevritBlocek, toast } from './blocek.js';
import { vZivot, zivotAkce, bindZivot, rustData } from './zivot.js';

const $ = s => document.querySelector(s);
const VIEWS = { prehled: vPrehled, den: vDen, pokladni: vPokladni, mesic: vMesic, grafy: vGrafy, cile: vCile, oceneni: vOceneni, zivot: vZivot, tankovani: vTank, kategorie: vKat, hledat: vHledat,
  vzhled: (S, U) => vVzhled(S, U, { ucet: ucetHTML() }), ukoly: vCile };
// Menu v kožených deskách: [stránka, název, ikonka]
const MENU = [
  ['prehled', 'Přehled', '<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>'],
  ['den', 'Den a zápis', '<path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/>'],
  ['pokladni', 'Pokladní kniha', '<path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h12M9 8h6M9 11h6"/>'],
  ['mesic', 'Měsíc a plán', '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'],
  ['grafy', 'Grafy a statistiky', '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'],
  ['cile', 'Cíle a úkoly', '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>'],
  ['oceneni', 'Ocenění', '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>'],
  ['zivot', 'Kniha života', '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'],
  ['tankovani', 'Tankování', '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M7 8h5M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/>'],
  ['kategorie', 'Kategorie a peněženky', '<path d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8z"/><circle cx="8.5" cy="8.5" r="1.3"/>'],
  ['hledat', 'Hledat', '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'],
  ['vzhled', 'Vzhled a nastavení', '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'],
];
function menuHTML() {
  const r = REZIMY.find(x => x.id === S().nast.rezim) || REZIMY[2];
  const poradi = r.menu.concat(MENU.map(m => m[0]).filter(id => !r.menu.includes(id) && id !== 'vzhled')).concat(['vzhled']);
  return poradi.map(id => MENU.find(m => m[0] === id)).filter(Boolean).map(([id, n, ik]) => '<a href="#' + id + '" class="' + (U.view === id || (U.view === 'ukoly' && id === 'cile') ? 'on' : '') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ik + '</g></svg><span>' + n + '</span></a>').join('');
}
let prvniStart = true;
const startView = () => (REZIMY.find(x => x.id === S().nast.rezim) || REZIMY[2]).start;
const UIKEY = 'fd-ui-1';
let U = { view: 'den', day: dnes(), voz: '', tagSel: '', q: '' };
try { Object.assign(U, JSON.parse(localStorage.getItem(UIKEY)) || {}); } catch (err) { /* bez úložiště */ }
U.day = dnes();
const saveUI = () => { try { localStorage.setItem(UIKEY, JSON.stringify(U)); } catch (err) { /* bez úložiště */ } };
const Q = { typ: 'v', text: '', pen: 'ucet', katTouched: false, auto: {} };
let api = null, user = null, cekaRender = false, lastKey = '', ro = null;
const S = () => st.S;
const isDark = () => !!(PAPIR.find(p => p.id === S().nast.papir) || {}).dark;

// ---------- vykreslení ----------
function render() {
  if (!S()) return;
  const n = S().nast, b = document.body;
  b.dataset.desky = n.desky; b.dataset.stul = n.stul; b.dataset.papir = n.papir; b.dataset.linky = n.linky; b.dataset.rezim = n.rezim;
  const d = DESKY.find(x => x.id === n.desky) || DESKY[0], p = PAPIR.find(x => x.id === n.papir) || PAPIR[0];
  const f = FONTS.find(x => x.id === n.font) || FONTS[0], ink = INKS.find(x => x.id === n.ink) || INKS[0];
  b.style.setProperty('--cover', d.c); b.style.setProperty('--cover2', d.c2); b.style.setProperty('--paper', p.c);
  b.style.setProperty('--hand', f.f); b.style.setProperty('--hs', f.s + 'px'); b.style.setProperty('--ink', ink.c[isDark() ? 1 : 0]);
  $('#menu').innerHTML = menuHTML();
  $('#stav').innerHTML = stavHTML();
  const [L, R] = (VIEWS[U.view] || vDen)(S(), U, Q, hlasDostupny());
  $('#pL').innerHTML = L; $('#pR').innerHTML = R;
  const ix = Math.max(0, MENU.findIndex(m => m[0] === (U.view === 'ukoly' ? 'cile' : U.view)));
  $('#pL').dataset.s = ix * 2 + 1; $('#pR').dataset.s = ix * 2 + 2;
  const key = U.view + U.day;
  if (lastKey && key !== lastKey) { const bk = $('#book'); bk.classList.remove('turn'); void bk.offsetWidth; bk.classList.add('turn'); }
  lastKey = key;
  if (U.view === 'den') bindDen();
  if (U.view === 'hledat') bindHledat();
  if (U.view === 'zivot') bindZivot(U, { render, toast, saveUI });
  if (ro) ro.disconnect();
  ro = new ResizeObserver(kresli);
  document.querySelectorAll('.fig svg').forEach(s => ro.observe(s));
  cekaRender = false;
}
function kresli() {
  const m = $('#mch'); if (m) grafMesic(m, S(), mk(U.day));
  const ym = mk(U.day), n = U.view === 'grafy' ? grafyObdobi(U) : 1;
  const gsl = $('#gsl'); if (gsl) grafSloupce(gsl, mesice(S(), ym, U.view === 'grafy' ? Math.max(6, n) : 6));
  const gk = $('#gkol');
  if (gk) {
    const ks = katObdobi(S(), posunYm(ym, -(n - 1)), ym), tot = ks.reduce((x, k) => x + k[1], 0), sel = ks.find(k => k[0] === U.ksel);
    const data = ks.slice(0, 7).map(([k, v]) => ({ id: k, n: (S().kats[k] || { n: '?' }).n, c: (S().kats[k] || { c: '#999' }).c, v }));
    if (ks.length > 7) data.push({ id: 'ostatni', n: 'Ostatní', c: '#a8a8a8', v: ks.slice(7).reduce((x, k) => x + k[1], 0) });
    grafKolac(gk, data, U.ksel, sel ? [kc(sel[1]), (S().kats[sel[0]] || {}).n || '', Math.round(sel[1] / tot * 100) + ' %'] : [kc(tot), 'celkem']);
  }
  const gb = $('#gbud'); if (gb) { const pr = S().pred[ym], s = souhrnMesice(S(), ym), N = new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate(), now = dnes(); grafBudik(gb, s.exp, pr ? pr.vydaje : 0, mk(now) === ym ? pd(now).getDate() / N : ym < mk(now) ? 1 : 0); }
  const gv = $('#gv'), gh = $('#gh');
  if (gv) grafRada(gv, rustData(S(), U).filter(z => z.vyska).map(z => ({ d: z.d, v: z.vyska })), 'cm', 0);
  if (gh) grafRada(gh, rustData(S(), U).filter(z => z.vaha).map(z => ({ d: z.d, v: z.vaha })), 'kg', 1);
  const t = $('#tch');
  if (t) { const v = U.voz && S().vozy[U.voz] ? U.voz : (vals(S().vozy)[0] || {}).id; grafTank(t, vals(S().e).filter(e => e.tema === 'tank' && e.pole && e.pole.voz === v)); }
}
// Změna z jiného zařízení: nepřekreslovat uprostřed psaní
function zmenaDat() {
  const a = document.activeElement;
  if (a && $('#book').contains(a) && (a.id === 'note' || a.matches('input,select,textarea'))) { cekaRender = true; return; }
  render();
}
document.addEventListener('focusout', () => { if (cekaRender) setTimeout(() => { if (cekaRender && !$('#book').contains(document.activeElement)) render(); }, 200); });

function trialDni() { const u = S().ucet; return u && u.trialDo ? Math.ceil((u.trialDo - Date.now()) / 864e5) : null; }
function stavHTML() {
  if (st.mode === 'local') return 'Bez účtu';
  const d = trialDni();
  return d == null ? '' : d > 0 ? 'Zkušební měsíc · ' + d + ' ' + (d === 1 ? 'den' : d < 5 ? 'dny' : 'dní') : 'Zkušební měsíc skončil';
}

function ucetHTML() {
  const d = trialDni();
  const ucet = st.mode === 'cloud'
    ? '<p class="note2" style="margin-top:0">Přihlášen: <b>' + esc(user && (user.email || user.displayName) || '') + '</b><br>' + (d > 0 ? 'Zkušební měsíc zdarma: zbývá ' + d + ' dní.' : 'Zkušební měsíc skončil. Placení přijde v další verzi, zatím můžeš psát dál.') + '</p><button class="btn ghost" data-act="logout">Odhlásit se</button>'
    : '<p class="note2" style="margin-top:0">Režim bez účtu: zápisy jsou jen v tomto prohlížeči.</p>' + (FIREBASE.apiKey ? '<button class="btn" data-act="showlogin">Přihlásit se</button> ' : '') +
      '<button class="btn ghost" data-act="reset" data-id="demo">Obnovit ukázku</button> <button class="btn ghost" data-act="reset" data-id="">Prázdný deník</button>';
  return ucet;
}

// ---------- stránka dne ----------
function preview() {
  const q = $('#q'); if (!q) return;
  Q.text = q.value;
  const p = parse(q.value), pv = $('#qprev'), tema = $('#qtema');
  if (Q.typ === 'v' && p.tank) { tema.value = 'tank'; Q.auto.tank = 1; } else if (Q.auto.tank && !p.tank) { tema.value = ''; Q.auto.tank = 0; }
  const tank = tema.value === 'tank' && Q.typ === 'v';
  $('#qtank').hidden = !tank;
  if (tank && $('#ql')) {
    if (!isNaN(p.litry) && (Q.auto.l || !$('#ql').value)) { $('#ql').value = nf(p.litry, p.litry % 1 ? 1 : 0); Q.auto.l = 1; }
    if (!isNaN(p.km) && (Q.auto.km || !$('#qkm').value)) { $('#qkm').value = p.km; Q.auto.km = 1; }
    // Vozidlo podle tachometru: to, jehož poslední stav je nejblíž pod zadanými km
    if (!isNaN(p.km) && $('#qvoz') && !Q.vozTouched) {
      let best = null, bestTach = -1;
      vals(S().vozy).forEach(v => {
        const t = Math.max(0, ...vals(S().e).filter(e => e.tema === 'tank' && e.pole && e.pole.voz === v.id && e.d <= U.day).map(e => e.pole.tach || 0));
        if (t <= p.km && t > bestTach) { best = v.id; bestTach = t; }
      });
      if (best) $('#qvoz').value = best;
    }
  }
  if (p.kat && !Q.katTouched && [...$('#qkat').options].some(o => o.value === p.kat)) $('#qkat').value = p.kat;
  if (!q.value.trim()) { pv.textContent = 'Piš jako do sešitu: částku a tagy rozpoznám sám.'; return; }
  const parts = [isNaN(p.amt) ? 'částka chybí' : (Q.typ === 'p' ? 'příjem ' : 'výdaj ') + '<b>' + kc(p.amt) + '</b>'];
  if (tank) { parts.push('Tankování'); if (!isNaN(p.litry)) parts.push('<b>' + nf(p.litry, 1) + ' l</b>'); if (!isNaN(p.km)) parts.push('<b>' + p.km.toLocaleString('cs-CZ') + ' km</b>'); }
  if (p.tagy.length) parts.push(p.tagy.map(t => '#' + esc(t)).join(' '));
  pv.innerHTML = 'Rozpoznáno: ' + parts.join(' · ');
}
function ser(el) {
  let o = '';
  el.childNodes.forEach(n => {
    if (n.nodeType === 3) o += n.textContent;
    else if (n.nodeName === 'BR') o += '\n';
    else if (n.nodeName === 'MARK') o += '{{' + (n.dataset.c || 'y') + '|' + n.textContent.replace(/[{}|]/g, '') + '}}';
    else if (n.nodeName === 'DIV' || n.nodeName === 'P') { if (o && !o.endsWith('\n')) o += '\n'; o += ser(n); }
    else o += ser(n);
  });
  return o;
}
const ulozZapisek = () => { const t = ser($('#note')).replace(/\s+$/, ''); zapis(['notes', U.day], t ? t : null); };
function bindDen() {
  const q = $('#q');
  q.addEventListener('input', preview);
  q.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); pridej(); } });
  $('#qkat').addEventListener('change', () => { Q.katTouched = true; });
  $('#qpen').addEventListener('change', ev => { Q.pen = ev.target.value; });
  $('#qtema').addEventListener('change', () => { Q.auto.tank = 0; preview(); });
  if ($('#ql')) { $('#ql').addEventListener('input', () => { Q.auto.l = 0; }); $('#qkm').addEventListener('input', () => { Q.auto.km = 0; }); }
  if ($('#qvoz')) $('#qvoz').addEventListener('change', ev => { U.voz = ev.target.value; Q.vozTouched = true; saveUI(); });
  preview();
  const note = $('#note');
  let tm;
  note.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(ulozZapisek, 400); });
  note.addEventListener('blur', () => { clearTimeout(tm); ulozZapisek(); });
  $('#rcf').addEventListener('change', ev => {
    const fl = ev.target.files && ev.target.files[0]; if (!fl) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 480 / im.width), cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        const id = uid();
        zapis(['stk', id], { id, d: U.day, img: cv.toDataURL('image/jpeg', 0.6), obchod: '' });
        render();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(fl);
  });
}
function pridej() {
  const p = parse($('#q').value), pv = $('#qprev'), tank = $('#qtema').value === 'tank' && Q.typ === 'v';
  if (isNaN(p.amt) || p.amt <= 0) { pv.innerHTML = '<b>Chybí částka.</b> Napiš ji do textu, např. „káva 65“ nebo „za 750 Kč“.'; return; }
  const e = { id: uid(), d: U.day, ts: Date.now(), typ: Q.typ, kc: Math.round(p.amt * 100) / 100, text: p.text, kat: $('#qkat').value, pen: $('#qpen').value, tagy: p.tagy };
  if (tank) {
    if (!$('#qvoz')) { pv.innerHTML = '<b>Nejdřív přidej vozidlo</b> na stránce Tankování.'; return; }
    const l = num($('#ql').value), km = num($('#qkm').value), voz = $('#qvoz').value;
    if (!(l > 0)) { pv.innerHTML = '<b>Doplň natankované litry.</b>'; return; }
    const vozList = vals(S().e).filter(x => x.tema === 'tank' && x.pole && x.pole.voz === voz);
    if (km > 0 && !tachOk(vozList, U.day, km)) { pv.innerHTML = '<b>Tachometr nesedí:</b> u dřívějšího tankování je vyšší stav (nebo u pozdějšího nižší). Zkontroluj ho.'; return; }
    e.tema = 'tank'; e.pole = { litry: l, tach: km > 0 ? km : 0, voz }; U.voz = voz;
  }
  zapis(['e', e.id], e);
  Q.text = ''; Q.katTouched = false; Q.vozTouched = false; Q.auto = {};
  saveUI(); render();
  const q = $('#q'); if (q) q.focus();
}
function zvyrazni(c) {
  const sel = getSelection(), note = $('#note'), hint = $('#hlHint');
  if (!note) return;
  if (!sel.rangeCount || sel.isCollapsed || !note.contains(sel.getRangeAt(0).commonAncestorContainer)) { hint.textContent = 'Nejdřív označ slova v zápisku, pak vyber barvu.'; return; }
  hint.textContent = '';
  const r = sel.getRangeAt(0);
  if (c === 'x') note.querySelectorAll('mark.hl').forEach(m => { if (sel.containsNode(m, true)) m.replaceWith(...m.childNodes); });
  else {
    const m = document.createElement('mark'); m.className = 'hl'; m.dataset.c = c;
    m.appendChild(r.extractContents());
    m.querySelectorAll('mark').forEach(x => x.replaceWith(...x.childNodes));
    r.insertNode(m);
  }
  sel.removeAllRanges();
  ulozZapisek();
  note.innerHTML = deser(S().notes[U.day]);
}
function mluv(btn) {
  const kam = btn.dataset.id === 'note' ? $('#note') : $('#q');
  btn.classList.add('rec');
  diktuj(kam.id === 'q' ? 'Řekni třeba: káva šedesát pět' : 'Diktuj zápisek').then(t => {
    if (!t) return;
    if (kam.id === 'q') { kam.value = (kam.value ? kam.value + ' ' : '') + t; preview(); }
    else { kam.append(document.createTextNode((kam.textContent ? ' ' : '') + t)); ulozZapisek(); }
  }).catch(e => { const m = hlasChyba(e), h = $('#qprev') || $('#hlHint'); if (m && h) h.textContent = m; })
    .finally(() => btn.classList.remove('rec'));
}

// ---------- hledání ----------
function bindHledat() {
  const h = $('#hq');
  h.addEventListener('input', () => {
    U.q = h.value; saveUI();
    const res = hledej(S(), U.q);
    $('#hcount').textContent = U.q.trim().length < 2 ? 'Napiš aspoň dva znaky.' : res.length ? 'Nalezeno ' + res.length + '×' : 'Nic jsem nenašel.';
    $('#pR').innerHTML = vHledat(S(), U)[1];
  });
  if (!matchMedia('(max-width: 900px)').matches) h.focus();
}

// ---------- akce ----------
document.addEventListener('pointerdown', ev => { if (ev.target.closest('[data-hl]')) ev.preventDefault(); });
document.addEventListener('click', ev => {
  const h = ev.target.closest('[data-hl]');
  if (h) { zvyrazni(h.dataset.hl); return; }
  const t = ev.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, id = t.dataset.id, D = S();
  const mPosun = n => { const d = pd(U.day); d.setDate(1); d.setMonth(d.getMonth() + n); U.day = iso(d); };
  switch (a) {
    case 'dprev': U.day = addD(U.day, -1); break;
    case 'dnext': U.day = addD(U.day, 1); break;
    case 'today': ev.preventDefault(); U.day = dnes(); break;
    case 'mprev': mPosun(-1); break;
    case 'mnext': mPosun(1); break;
    case 'goziv': ev.preventDefault(); U.view = 'zivot'; U.osoba = id; U.ztab = t.dataset.tab || 'mapa'; try { history.replaceState(null, '', '#zivot'); } catch (err) { /* rámeček */ } break;
    case 'goday': ev.preventDefault(); U.day = id; U.view = 'den'; try { history.replaceState(null, '', '#den'); } catch (err) { /* náhled v rámečku */ } break;
    case 'typ': Q.typ = t.dataset.v; Q.katTouched = false; break;
    case 'add': pridej(); return;
    case 'mic': mluv(t); return;
    case 'del': { const e = D.e[id]; if (e && e.rc) zapis(['stk', e.rc], null); zapis(['e', id], null); break; }
    case 'rcok': {
      const amt = num($('#rcK').value), ob = $('#rcO').value.trim();
      if (!(amt > 0)) { $('#rcK').focus(); return; }
      zapis(['stk', id, 'obchod'], ob);
      const e = { id: uid(), d: D.stk[id].d, ts: Date.now(), typ: 'v', kc: amt, text: ob || 'Nákup podle účtenky', kat: 'jidlo', pen: Q.pen, tagy: [], rc: id };
      zapis(['e', e.id], e); break;
    }
    case 'rcdel': zapis(['stk', id], null); break;
    case 'pred': {
      const pp = num($('#pp').value), pv = num($('#pv').value);
      if (!(pp >= 0) || !(pv > 0)) { $('#pv').focus(); return; }
      zapis(['pred', mk(U.day)], { zapsano: dnes(), prijem: pp, vydaje: pv }); break;
    }
    case 'voz': U.voz = id; break;
    case 'vadd': { const n = $('#vn').value.trim(); if (!n) { $('#vn').focus(); return; } const v = { id: uid(), n, typ: $('#vt').value }; zapis(['vozy', v.id], v); U.voz = v.id; break; }
    case 'vdel': zapis(['vozy', id], null); U.voz = ''; break;
    case 'uadd': { const n = $('#un').value.trim(); if (!n) { $('#un').focus(); return; } const u = { id: uid(), text: n, termin: $('#ut').value || '', hotovo: false, mesic: mk(U.day) }; zapis(['ukoly', u.id], u); break; }
    case 'tdone': { const u = D.ukoly[id]; if (!u) return; zapis(['ukoly', id], { ...u, hotovo: t.checked, mesic: t.checked ? mk(U.day) : u.mesic }); break; }
    case 'tdel': zapis(['ukoly', id], null); break;
    case 'kadd': { const n = $('#kn').value.trim(); if (!n) { $('#kn').focus(); return; } const k = { id: uid(), n, c: $('#kc').value, t: $('#kt').value, ord: 100 + vals(D.kats).length }; zapis(['kats', k.id], k); break; }
    case 'kdel': zapis(['kats', id], null); break;
    case 'kcol': case 'pstart': return;
    case 'padd': { const n = $('#pn').value.trim(); if (!n) { $('#pn').focus(); return; } const p = { id: uid(), n, start: 0 }; zapis(['pen', p.id], p); break; }
    case 'pdel': zapis(['pen', id], null); break;
    case 'tag': U.tagSel = U.tagSel === id ? '' : id; break;
    case 'reset': resetLocal(id === 'demo'); break;
    case 'logout': if (api) api.odhlasit(); return;
    case 'showlogin': ukazLogin(); return;
    default: { let r = zivotAkce(a, t, U, { render, toast }); if (!r) r = kronikaAkce(a, t, U, { render, toast }); if (!r || r === 'stop') return; }
  }
  saveUI(); render();
});
document.addEventListener('change', ev => {
  const t = ev.target, a = t.dataset && t.dataset.act;
  if (a === 'kcol') { zapis(['kats', t.dataset.id, 'c'], t.value); render(); }
  if (a === 'pstart') { const v = num(t.value); zapis(['pen', t.dataset.id, 'start'], isNaN(v) ? 0 : v); render(); }
});
// Menu na telefonu: tlačítko v deskách rozbalí seznam stránek
$('#menuBtn').addEventListener('click', () => { const o = document.body.classList.toggle('menu-open'); $('#menuBtn').setAttribute('aria-expanded', String(o)); });
document.addEventListener('click', ev => { if (ev.target.closest('#menu a')) { document.body.classList.remove('menu-open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); } });
function route() {
  const h = location.hash.slice(1);
  if (h === 'zapis' || h === 'zapis-mic') {
    // Zkratka z plochy: otevřít bloček nad stránkou Den
    U.view = 'den';
    try { history.replaceState(null, '', '#den'); } catch (err) { /* náhled v rámečku */ }
    saveUI(); render(); otevritBlocek({ mic: h === 'zapis-mic' }); return;
  }
  if (VIEWS[h]) U.view = h === 'ukoly' ? 'cile' : h;
  else if (!h && prvniStart) U.view = startView();
  prvniStart = false;
  saveUI(); render();
  window.scrollTo(0, 0);
}
const NATIVNI = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
// Android appka: widget a zkratky otevírají financnidenik://zapis (?mic=1)
function odkazApp(url) {
  if (!url || !/zapis/.test(url)) return;
  U.view = 'den'; saveUI(); render();
  otevritBlocek({ mic: /mic=1/.test(url) });
}
let nativniHotovo = false;
function nativniOdkazy() {
  if (!NATIVNI || nativniHotovo) return;
  nativniHotovo = true;
  const App = window.Capacitor.Plugins.App || window.Capacitor.registerPlugin('App');
  App.addListener('appUrlOpen', ev => odkazApp(ev && ev.url));
  App.getLaunchUrl().then(r => odkazApp(r && r.url)).catch(() => {});
}
window.addEventListener('hashchange', route);

// ---------- přihlášení ----------
function ukazLogin(msg) {
  const el = $('#login');
  el.hidden = false; $('#app').hidden = true;
  el.innerHTML = '<div class="cover"><h1 class="brand">Finanční deník</h1><p class="lead">Zápisník na peníze, který se počítá sám. První měsíc zdarma, bez platební karty.</p>' +
    (api ? '<button class="btn wide" data-l="google">Pokračovat s Googlem</button><p class="or">nebo e-mailem</p>' +
      '<form id="lf" novalidate><label class="f">E-mail<input id="le" type="email" autocomplete="email" required></label><label class="f">Heslo<input id="lh" type="password" autocomplete="current-password" minlength="6" required></label>' +
      '<div class="lrow"><button class="btn" data-l="login" type="submit">Přihlásit</button><button class="btn ghost" data-l="reg" type="button">Založit účet</button></div></form>' +
      '<button class="linkbtn" data-l="reset">Zapomenuté heslo</button>' : '') +
    '<p class="lmsg" id="lmsg" role="status">' + esc(msg || '') + '</p><button class="linkbtn" data-l="demo">Vyzkoušet bez účtu</button></div>';
}
document.addEventListener('submit', ev => { if (ev.target.id === 'lf') { ev.preventDefault(); prihlas('login'); } });
document.addEventListener('click', ev => { const b = ev.target.closest('[data-l]'); if (b && b.type !== 'submit') prihlas(b.dataset.l); });
async function prihlas(co) {
  const msg = $('#lmsg'), em = $('#le') ? $('#le').value.trim() : '', he = $('#lh') ? $('#lh').value : '';
  if (co === 'demo') { if (api && user) await api.odhlasit(); startLocal(true); spust(); return; }
  if (!api) return;
  msg.textContent = 'Chvilku…';
  try {
    if (co === 'google') await api.google();
    else if (co === 'login') await api.login(em, he);
    else if (co === 'reg') await api.registrace(em, he);
    else if (co === 'reset') { if (!em) { msg.textContent = 'Napiš nahoru svůj e-mail a klikni znovu.'; return; } await api.reset(em); msg.textContent = 'Poslal jsem odkaz na nastavení hesla na ' + em + '.'; }
  } catch (e) { msg.textContent = (api.chyba || (x => x.message))(e); }
}
let blocekInit = false;
function spust() {
  $('#login').hidden = true; $('#app').hidden = false; st.onChange = zmenaDat;
  if (!blocekInit) { initBlocek(() => render()); blocekInit = true; }
  route(); nativniOdkazy();
}

async function boot() {
  if (!NATIVNI && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!FIREBASE.apiKey) { startLocal(true); spust(); return; }
  ukazLogin('Načítám…');
  try {
    const mod = await import('./cloud.js');
    api = await mod.startCloud(FIREBASE, (u, a) => {
      api = a; user = u;
      if (!u) { if (st.mode === 'cloud') { st.S = null; st.mode = 'local'; } if (!S() || st.mode !== 'local') ukazLogin(''); return; }
      storeCloud(u.uid, api.writer(u.uid));
      st.token = api.token;
      if (S()) spust();
      api.odebirej(u.uid, data => { zCloudu(data); if ($('#app').hidden) spust(); });
    });
    api.chyba = mod.chyba;
  } catch (e) {
    ukazLogin('Přihlášení se nenačetlo. Jsi připojený k internetu?');
  }
}
boot();
