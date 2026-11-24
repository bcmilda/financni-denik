// Finanční deník · app.js · v0.1.0
// Start, přihlášení, vykreslení stránek a všechny akce uživatele.

import { VERZE, iso, pd, addD, mk, dnes, esc, kc, nf, num, uid, vals } from './util.js';
import { SKINS, FONTS, INKS, PAPERS, ukazka } from './data.js';
import { parse, tachOk, hledej, deser } from './logic.js';
import { st, startLocal, resetLocal, startCloud as storeCloud, zCloudu, zapis } from './store.js';
import { vDen, vMesic, vTank, vUkoly, vKat, vHledat } from './views.js';
import { grafMesic, grafTank } from './charts.js';
import { FIREBASE } from './config.js';

const $ = s => document.querySelector(s);
const VIEWS = { den: vDen, mesic: vMesic, tankovani: vTank, ukoly: vUkoly, kategorie: vKat, hledat: vHledat };
const UIKEY = 'fd-ui-1';
let U = { view: 'den', day: dnes(), voz: '', tagSel: '', q: '' };
try { Object.assign(U, JSON.parse(localStorage.getItem(UIKEY)) || {}); } catch (err) { /* bez úložiště */ }
U.day = dnes();
const saveUI = () => { try { localStorage.setItem(UIKEY, JSON.stringify(U)); } catch (err) { /* bez úložiště */ } };
const Q = { typ: 'v', text: '', pen: 'ucet', katTouched: false, auto: {} };
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let api = null, user = null, cekaRender = false, lastKey = '', ro = null;
const S = () => st.S;
const isDark = () => !!(SKINS.find(s => s.id === S().nast.skin) || {}).dark;

// ---------- vykreslení ----------
function render() {
  if (!S()) return;
  const n = S().nast, b = document.body;
  b.dataset.skin = n.skin; b.dataset.paper = n.paper;
  const f = FONTS.find(x => x.id === n.font) || FONTS[0], ink = INKS.find(x => x.id === n.ink) || INKS[0];
  b.style.setProperty('--hand', f.f); b.style.setProperty('--hs', f.s + 'px'); b.style.setProperty('--ink', ink.c[isDark() ? 1 : 0]);
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + U.view));
  $('#stav').innerHTML = stavHTML();
  if (!$('#panel').hidden) $('#panelIn').innerHTML = panelHTML();
  const [L, R] = (VIEWS[U.view] || vDen)(S(), U, Q, !!SR);
  $('#pL').innerHTML = L; $('#pR').innerHTML = R;
  const key = U.view + U.day;
  if (lastKey && key !== lastKey) { const bk = $('#book'); bk.classList.remove('turn'); void bk.offsetWidth; bk.classList.add('turn'); }
  lastKey = key;
  if (U.view === 'den') bindDen();
  if (U.view === 'hledat') bindHledat();
  if (ro) ro.disconnect();
  ro = new ResizeObserver(kresli);
  document.querySelectorAll('.fig svg').forEach(s => ro.observe(s));
  cekaRender = false;
}
function kresli() {
  const m = $('#mch'); if (m) grafMesic(m, S(), mk(U.day));
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

function panelHTML() {
  const n = S().nast, dark = isDark() ? 1 : 0, d = trialDni();
  const ucet = st.mode === 'cloud'
    ? '<p class="note2" style="margin-top:0">Přihlášen: <b>' + esc(user && (user.email || user.displayName) || '') + '</b><br>' + (d > 0 ? 'Zkušební měsíc zdarma: zbývá ' + d + ' dní.' : 'Zkušební měsíc skončil. Placení přijde v další verzi, zatím můžeš psát dál.') + '</p><button class="btn ghost" data-act="logout">Odhlásit se</button>'
    : '<p class="note2" style="margin-top:0">Režim bez účtu: zápisy jsou jen v tomto prohlížeči.</p>' + (FIREBASE.apiKey ? '<button class="btn" data-act="showlogin">Přihlásit se</button> ' : '') +
      '<button class="btn ghost" data-act="reset" data-id="demo">Obnovit ukázku</button> <button class="btn ghost" data-act="reset" data-id="">Prázdný deník</button>';
  return '<div><h4>Vzhled knihy</h4><div class="opts">' + SKINS.map(s => '<button class="sw ' + (n.skin === s.id ? 'on' : '') + '" data-act="skin" data-id="' + s.id + '" style="--c:' + s.c + ';--p:' + s.p + '" aria-label="' + s.n + '"><i></i></button>').join('') + '</div><p class="skinname">' + ((SKINS.find(s => s.id === n.skin) || {}).n || '') + '</p></div>' +
    '<div><h4>Písmo zápisků</h4><div class="opts">' + FONTS.map(f => '<button class="fo ' + (n.font === f.id ? 'on' : '') + '" data-act="font" data-id="' + f.id + '" style="font-family:' + f.f + ';font-size:' + Math.min(f.s, 20) + 'px">' + f.n + '</button>').join('') + '</div></div>' +
    '<div><h4>Inkoust</h4><div class="opts">' + INKS.map(i => '<button class="ink ' + (n.ink === i.id ? 'on' : '') + '" data-act="ink" data-id="' + i.id + '" style="--c:' + i.c[dark] + '" aria-label="' + i.n + '"></button>').join('') + '</div><h4 style="margin-top:10px">Papír</h4><div class="opts">' + PAPERS.map(p => '<button class="pa ' + (n.paper === p.id ? 'on' : '') + '" data-act="paper" data-id="' + p.id + '">' + p.n + '</button>').join('') + '</div></div>' +
    '<div><h4>Účet</h4>' + ucet + '<p class="note2">Finanční deník ' + VERZE + '</p></div>';
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
let rec = null;
function diktuj(btn) {
  const kam = btn.dataset.id === 'note' ? $('#note') : $('#q');
  if (rec) { rec.stop(); return; }
  try {
    rec = new SR(); rec.lang = 'cs-CZ'; rec.interimResults = false; rec.maxAlternatives = 1;
    btn.classList.add('rec');
    rec.onresult = ev => {
      const t = ev.results[0][0].transcript;
      if (kam.id === 'q') { kam.value = (kam.value ? kam.value + ' ' : '') + t; preview(); }
      else { kam.append(document.createTextNode((kam.textContent ? ' ' : '') + t)); ulozZapisek(); }
    };
    rec.onerror = ev => { const h = $('#qprev') || $('#hlHint'); if (h) h.textContent = ev.error === 'not-allowed' ? 'Mikrofon není povolený.' : 'Diktování se nepovedlo, zkus to znovu.'; };
    rec.onend = () => { btn.classList.remove('rec'); rec = null; };
    rec.start();
  } catch (err) { btn.classList.remove('rec'); rec = null; }
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
    case 'goday': ev.preventDefault(); U.day = id; U.view = 'den'; try { history.replaceState(null, '', '#den'); } catch (err) { /* náhled v rámečku */ } break;
    case 'typ': Q.typ = t.dataset.v; Q.katTouched = false; break;
    case 'add': pridej(); return;
    case 'mic': diktuj(t); return;
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
    case 'skin': { const s = SKINS.find(x => x.id === id); zapis(['nast', 'skin'], id); if (s) zapis(['nast', 'paper'], s.paper); break; }
    case 'font': zapis(['nast', 'font'], id); break;
    case 'ink': zapis(['nast', 'ink'], id); break;
    case 'paper': zapis(['nast', 'paper'], id); break;
    case 'reset': resetLocal(id === 'demo'); break;
    case 'logout': if (api) api.odhlasit(); return;
    case 'showlogin': ukazLogin(); return;
    default: return;
  }
  saveUI(); render();
});
document.addEventListener('change', ev => {
  const t = ev.target, a = t.dataset && t.dataset.act;
  if (a === 'kcol') { zapis(['kats', t.dataset.id, 'c'], t.value); render(); }
  if (a === 'pstart') { const v = num(t.value); zapis(['pen', t.dataset.id, 'start'], isNaN(v) ? 0 : v); render(); }
});
$('#vzBtn').addEventListener('click', () => {
  const p = $('#panel'); p.hidden = !p.hidden;
  $('#vzBtn').setAttribute('aria-expanded', String(!p.hidden));
  if (!p.hidden) $('#panelIn').innerHTML = panelHTML();
});
function route() { const h = location.hash.slice(1); if (VIEWS[h]) U.view = h; saveUI(); render(); }
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
function spust() { $('#login').hidden = true; $('#app').hidden = false; st.onChange = zmenaDat; route(); }

async function boot() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!FIREBASE.apiKey) { startLocal(true); spust(); return; }
  ukazLogin('Načítám…');
  try {
    const mod = await import('./cloud.js');
    api = await mod.startCloud(FIREBASE, (u, a) => {
      api = a; user = u;
      if (!u) { if (st.mode === 'cloud') { st.S = null; st.mode = 'local'; } if (!S() || st.mode !== 'local') ukazLogin(''); return; }
      storeCloud(u.uid, api.writer(u.uid));
      if (S()) spust();
      api.odebirej(u.uid, data => { zCloudu(data); if ($('#app').hidden) spust(); });
    });
    api.chyba = mod.chyba;
  } catch (e) {
    ukazLogin('Přihlášení se nenačetlo. Jsi připojený k internetu?');
  }
}
boot();
