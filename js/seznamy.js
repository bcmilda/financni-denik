// Finanční deník · seznamy.js · v0.7.0
// Dlužníček, obálky, narozeniny a dárky, nákupní seznam.
// Data: dluhy/{id} {kdo, kc, smer 'mne'|'ja', d, pozn, splatky/{id}{d,kc}, vraceno}
//       obalky/{id} {nazev, kc, kats {katId:true}, barva, ord}
//       narozeniny/{id} {jmeno, datum 'YYYY-MM-DD'|'--MM-DD', rozpocet, napady, darky/{rok}: idZápisu}
//         (osoby z Knihy života mají záznam narozeniny/o-{idOsoby} jen s rozpočtem, nápady a dárky)
//       nakup/{id} {text, ts, hotovo}

import { esc, kc, pd, mk, dnes, vals, uid, num, MG, ymLabel, datKratce } from './util.js';
import { dluhStav, dluhyPoLidech, obalkyMesic, narozeninySeznam } from './logic.js';
import { zapis } from './store.js';
import { kat } from './views.js';

const $ = s => document.querySelector(s);
const dni = n => n + ' ' + (n === 1 ? 'den' : n >= 2 && n <= 4 ? 'dny' : 'dní');
const katsV = S => vals(S.kats).filter(k => k.t === 'v').sort((a, b) => (a.ord ?? 99) - (b.ord ?? 99));
const pens = S => vals(S.pen).sort((a, b) => (a.id === 'ucet' ? -1 : b.id === 'ucet' ? 1 : a.n.localeCompare(b.n, 'cs')));
const dnuOd = d => Math.max(0, Math.round((Date.parse(dnes()) - Date.parse(d)) / 864e5));

// ======================= Dlužníček =======================
function dluhHTML(dl, U) {
  const s = dluhStav(dl), stari = dnuOd(dl.d);
  return '<div class="dluh' + (s.hotovo ? ' hotovo' : '') + '"><div class="dluh-h"><b class="hand">' + esc(dl.kdo) + '</b><span class="dluh-k">' + kc(s.hotovo ? dl.kc : s.zbyva) + '</span></div>' +
    '<p class="dluh-m">' + (dl.smer === 'ja' ? 'Půjčil(a) mi' : 'Půjčil(a) jsem') + ' ' + datKratce(dl.d) + (stari > 0 && !s.hotovo ? ' · před ' + dni(stari) : '') +
    (s.splaceno && !s.hotovo ? ' · splaceno ' + kc(s.splaceno) + ' z ' + kc(dl.kc) : '') + (dl.pozn ? '<br><span class="hand">' + esc(dl.pozn) + '</span>' : '') + '</p>' +
    (s.hotovo ? '<i class="razitko-ok vraceno' + (U.novyDluh === dl.id ? ' bum' : '') + '">vráceno</i><button class="del" data-act="dldel" data-id="' + dl.id + '" aria-label="Smazat záznam">×</button>'
      : '<div class="dluh-a"><input class="inp mini" id="spl-' + dl.id + '" inputmode="decimal" placeholder="Kč" aria-label="Částka splátky"><button class="btn ghost" data-act="dlspl" data-id="' + dl.id + '">Splátka</button><button class="btn" data-act="dlvr" data-id="' + dl.id + '">Vráceno celé</button><button class="del" data-act="dldel" data-id="' + dl.id + '" aria-label="Smazat dluh">×</button></div>') + '</div>';
}
export function vDluznicek(S, U) {
  const vse = vals(S.dluhy || {}).sort((a, b) => b.d.localeCompare(a.d));
  const otevrene = smer => vse.filter(x => (x.smer === 'ja') === (smer === 'ja') && !dluhStav(x).hotovo);
  const mne = otevrene('mne'), ja = otevrene('ja'), suma = l => l.reduce((s, x) => s + dluhStav(x).zbyva, 0);
  const L = '<h2 class="pt">Dlužníček</h2><p class="ps">Kdo komu kolik dluží. Půjčka není výdaj – do výdajů se nepočítá.</p>' +
    '<div class="figs"><div><b>' + kc(suma(mne)) + '</b><span>dluží mně</span></div><div><b>' + kc(suma(ja)) + '</b><span>dlužím já</span></div></div>' +
    '<h3 class="sub">Dluží mně</h3>' + (mne.length ? mne.map(x => dluhHTML(x, U)).join('') : '<p class="empty">Nikdo ti nic nedluží.</p>') +
    '<h3 class="sub">Dlužím já</h3>' + (ja.length ? ja.map(x => dluhHTML(x, U)).join('') : '<p class="empty">Nikomu nic nedlužíš.</p>');
  const lide = dluhyPoLidech(S).filter(r => r.mne && r.ja);
  const hotove = vse.filter(x => dluhStav(x).hotovo).slice(0, 12);
  const R = '<h3 class="sub" style="margin-top:4px">Nový záznam</h3><div class="seg" role="group" aria-label="Kdo komu"><button data-act="dlsmer" data-v="mne" class="' + (U.dlSmer !== 'ja' ? 'on' : '') + '">Půjčil(a) jsem</button><button data-act="dlsmer" data-v="ja" class="' + (U.dlSmer === 'ja' ? 'on' : '') + '">Půjčil(a) mi</button></div>' +
    '<div class="row"><label class="f">' + (U.dlSmer === 'ja' ? 'Kdo mi půjčil' : 'Komu') + '<input id="dlk" placeholder="např. Petr" list="dllide" autocomplete="off"></label><label class="f">Kč<input id="dlc" inputmode="decimal"></label><label class="f">Kdy<input id="dld" type="date" value="' + dnes() + '"></label></div>' +
    '<datalist id="dllide">' + [...new Set(vse.map(x => x.kdo.trim()))].map(k => '<option value="' + esc(k) + '">').join('') + '</datalist>' +
    '<label class="f">Poznámka<input id="dlp" placeholder="např. na benzín, do výplaty"></label><button class="btn" data-act="dladd">Zapsat do dlužníčku</button>' +
    (lide.length ? '<h3 class="sub">Vzájemně</h3>' + lide.map(r => '<p class="note2"><b>' + esc(r.kdo) + '</b>: dluží ti ' + kc(r.mne) + ', ty jemu ' + kc(r.ja) + ' → ' + (r.cisty >= 0 ? 'po započtení ti dluží ' + kc(r.cisty) : 'po započtení dlužíš ty ' + kc(-r.cisty)) + '</p>').join('') : '') +
    '<h3 class="sub">Vyrovnané</h3>' + (hotove.length ? hotove.map(x => dluhHTML(x, U)).join('') : '<p class="empty">Zatím nic vyrovnaného.</p>');
  return [L, R];
}

// ======================= Obálky =======================
export function obalkaSvg(r, barva) {
  const c = barva || '#c9a27a', zb = r.o.kc > 0 ? Math.max(0, r.zbyva) / r.o.kc : 0, n = zb <= 0 ? 0 : zb < 0.34 ? 1 : zb < 0.67 ? 2 : 3;
  const bank = [[34, 18, -6], [50, 10, 3], [66, 16, 9]].slice(0, n).map(([x, y, rot], i) =>
    '<g transform="translate(' + x + ' ' + (y + (1 - zb) * 18) + ') rotate(' + rot + ')"><rect x="-17" y="0" width="34" height="46" rx="2" fill="' + ['#9ad3a5', '#b6d7f0', '#f3d58a'][i] + '" stroke="#5c7a5f" stroke-width="1"/><circle cx="0" cy="14" r="6" fill="none" stroke="#5c7a5f" stroke-width="1"/></g>').join('');
  return '<svg viewBox="0 0 100 90" class="obalka-svg" aria-hidden="true">' + bank +
    '<path d="M6 34h88v48a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="' + c + '" stroke="rgba(0,0,0,.25)"/>' +
    '<path d="M6 34l44 28 44-28" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="1.5"/><path d="M6 86l34-26M94 86L60 60" stroke="rgba(0,0,0,.12)" stroke-width="1.2"/>' +
    (r.zbyva < 0 ? '<text x="50" y="80" text-anchor="middle" font-family="Caveat,cursive" font-size="13" font-weight="700" fill="#b8323d" transform="rotate(-6 50 76)">přečerpáno</text>' : '') + '</svg>';
}
export function vObalky(S, U) {
  const ym = mk(U.day), m = obalkyMesic(S, ym), pr = S.pred[ym];
  const prijem = pr ? pr.prijem : vals(S.e).filter(e => e.typ === 'p' && mk(e.d) === ym).reduce((s, e) => s + e.kc, 0);
  const L = '<div class="phead"><button class="arw" data-act="mprev" aria-label="Předchozí měsíc">‹</button><div><h2 class="pt">Obálky</h2><p class="ps">' + ymLabel(ym) + '</p></div><button class="arw" data-act="mnext" aria-label="Další měsíc">›</button></div>' +
    (m.radky.length ? '<div class="obalky">' + m.radky.map(r => '<div class="obalka">' + obalkaSvg(r, r.o.barva) + '<b class="hand">' + esc(r.o.nazev) + '</b><span>' + (r.zbyva >= 0 ? 'zbývá <b>' + kc(r.zbyva) + '</b>' : '<b class="nad">o ' + kc(-r.zbyva) + ' víc</b>') + '</span><small>utraceno ' + kc(r.utraceno) + ' z ' + kc(r.o.kc) + '</small></div>').join('') + '</div>'
      : '<p class="empty">Zatím žádné obálky. Založ první vpravo – třeba Jídlo, Benzín a Zábava.</p>') +
    '<div class="figs"><div><b>' + kc(m.rozdeleno) + '</b><span>rozděleno do obálek</span></div>' + (prijem ? '<div><b>' + kc(prijem - m.rozdeleno) + '</b><span>' + (pr ? 'z plánovaného příjmu' : 'z příjmů') + ' zbývá nerozděleno</span></div>' : '') + '<div><b>' + kc(m.mimo) + '</b><span>výdaje mimo obálky</span></div></div>' +
    '<p class="note2">Obálka jen sčítá výdaje svých kategorií – nic se nepočítá dvakrát. Kategorie může být jen v jedné obálce.</p>';
  const pouzite = {}; vals(S.obalky || {}).forEach(o => Object.keys(o.kats || {}).forEach(k => { pouzite[k] = o.id; }));
  const upr = U.obUpr && (S.obalky || {})[U.obUpr];
  const R = '<h3 class="sub" style="margin-top:4px">' + (upr ? 'Upravit obálku' : 'Nová obálka') + '</h3><div class="row"><label class="f">Název<input id="obn" placeholder="např. Jídlo" value="' + esc(upr ? upr.nazev : '') + '"></label><label class="f">Kč na měsíc<input id="obk" inputmode="decimal" value="' + (upr ? upr.kc : '') + '"></label><label class="f">Barva<input id="obb" type="color" value="' + (upr ? upr.barva : '#c9a27a') + '"></label></div>' +
    '<p class="note2" style="margin-bottom:4px">Které výdaje do ní patří:</p><div class="obkats">' + katsV(S).map(k => { const jinde = pouzite[k.id] && pouzite[k.id] !== (upr && upr.id); return '<label class="chk"><input type="checkbox" class="obkat" value="' + k.id + '"' + (upr && (upr.kats || {})[k.id] ? ' checked' : '') + (jinde ? ' disabled' : '') + '> <i class="dot" style="--c:' + k.c + '"></i>' + esc(k.n) + (jinde ? ' <small>(v obálce ' + esc(S.obalky[pouzite[k.id]].nazev) + ')</small>' : '') + '</label>'; }).join('') + '</div>' +
    '<button class="btn" data-act="obadd">' + (upr ? 'Uložit obálku' : 'Založit obálku') + '</button>' + (upr ? ' <button class="btn ghost" data-act="obzrus">Zrušit</button>' : '') +
    (vals(S.obalky || {}).length ? '<h3 class="sub">Moje obálky</h3>' + vals(S.obalky).sort((a, b) => (a.ord || 0) - (b.ord || 0)).map(o => '<div class="kat"><i class="dot" style="--c:' + o.barva + '"></i><span>' + esc(o.nazev) + '<small>' + Object.keys(o.kats || {}).map(k => esc(kat(S, k).n)).join(', ') + '</small></span><span class="sum">' + kc(o.kc) + '</span><span><button class="linkbtn" data-act="obupr" data-id="' + o.id + '">Upravit</button> <button class="del" data-act="obdel" data-id="' + o.id + '" aria-label="Smazat obálku ' + esc(o.nazev) + '">×</button></span></div>').join('') : '');
  return [L, R];
}

// ======================= Narozeniny a dárky =======================
export function vNarozeniny(S, U) {
  const d0 = dnes(), rok = d0.slice(0, 4), l = narozeninySeznam(S, d0);
  const karta = x => {
    const z = x.z || {}, dt = pd(x.d), dar = (z.darky || {})[x.d.slice(0, 4)], e = dar && S.e[dar];
    return '<div class="narozky' + (x.za <= 14 ? ' brzy' : '') + '"><div class="nar-d"><b>' + dt.getDate() + '.</b><span>' + MG[dt.getMonth()] + '</span></div><div class="nar-t">' +
      '<b class="hand">' + esc(x.jmeno) + (x.vek != null ? ' <span class="vek">' + x.vek + '</span>' : '') + '</b><small>' + (x.za === 0 ? 'dnes!' : x.za === 1 ? 'zítra' : 'za ' + dni(x.za)) + (x.osoba ? ' · z Knihy života' : '') + '</small>' +
      '<label class="f nar-n"><span class="sr">Nápady na dárek</span><input class="inp hand" data-act="narnap" data-id="' + x.id + '" data-os="' + (x.osoba || '') + '" placeholder="Nápady na dárek…" value="' + esc(z.napady || '') + '"></label>' +
      (e ? '<p class="nar-ok"><i class="razitko-ok">koupeno</i> ' + esc(e.text) + ' · ' + kc(e.kc) + '</p>'
        : '<div class="nar-a"><input class="inp mini" id="nk-' + x.id + '" inputmode="decimal" placeholder="' + (z.rozpocet ? 'rozpočet ' + z.rozpocet : 'Kč') + '" aria-label="Kolik stál dárek"><button class="btn ghost" data-act="narkup" data-id="' + x.id + '" data-os="' + (x.osoba || '') + '" data-jm="' + esc(x.jmeno) + '">Dárek koupen</button></div>') +
      '</div>' + (x.osoba ? '' : '<button class="del" data-act="nardel" data-id="' + x.id + '" aria-label="Smazat narozeniny ' + esc(x.jmeno) + '">×</button>') + '</div>';
  };
  const brzy = l.filter(x => x.za <= 60), pozdeji = l.filter(x => x.za > 60);
  const L = '<h2 class="pt">Narozeniny a dárky</h2><p class="ps">Kdo slaví, kolik let a co mu dát. Dárek se zapíše jako výdaj v kategorii Dárky.</p>' +
    '<h3 class="sub">Nejbližší</h3>' + (brzy.length ? brzy.map(karta).join('') : '<p class="empty">V příštích dvou měsících nikdo neslaví.</p>') +
    (pozdeji.length ? '<h3 class="sub">Později v roce</h3>' + pozdeji.map(karta).join('') : '');
  const poMes = Array.from({ length: 12 }, (_, i) => l.filter(x => +x.d.slice(5, 7) === i + 1));
  const darkyRok = vals(S.e).filter(e => e.typ === 'v' && e.kat === 'dary' && e.d.slice(0, 4) === rok).reduce((s, e) => s + e.kc, 0);
  const R = '<h3 class="sub" style="margin-top:4px">Přidat narozeniny</h3><div class="row"><label class="f">Jméno<input id="nrj" placeholder="např. Babička"></label><label class="f">Datum<input id="nrd" type="date"></label><label class="f">Rozpočet Kč<input id="nrr" inputmode="decimal"></label></div>' +
    '<label class="f chk"><input type="checkbox" id="nrbez"> Rok narození neznám (nebudu ukazovat věk)</label><button class="btn" data-act="naradd">Přidat</button>' +
    '<p class="note2">Lidé z <a href="#zivot">Knihy života</a> s datem narození se sem přidají sami.</p>' +
    '<h3 class="sub">Rok v narozeninách</h3><div class="nar-rok">' + poMes.map((x, i) => '<div><b>' + MG[i].slice(0, 3) + '</b>' + x.map(y => '<span class="hand">' + esc(y.jmeno) + '</span>').join('') + '</div>').join('') + '</div>' +
    '<p class="note2">Na dárky letos: <b>' + kc(darkyRok) + '</b></p>';
  return [L, R];
}

// ======================= Nákupní seznam =======================
export function vNakup(S, U) {
  const l = vals(S.nakup || {}).sort((a, b) => (a.hotovo ? 1 : 0) - (b.hotovo ? 1 : 0) || (a.ts || 0) - (b.ts || 0));
  const kup = l.filter(x => x.hotovo);
  const L = '<h2 class="pt">Nákupní seznam</h2><p class="ps">V obchodě odškrtávej, u pokladny zapiš jednou částkou.</p>' +
    '<div class="qrow"><input id="nkn" class="line hand" autocomplete="off" placeholder="mléko, chleba, 10 vajec…" aria-label="Co koupit (víc věcí odděl čárkou)"></div><button class="btn ghost" data-act="nkadd">Přidat na seznam</button>' +
    (l.length ? '<ul class="nakup lined">' + l.map(x => '<li class="' + (x.hotovo ? 'done' : '') + '"><label><input type="checkbox" data-act="nktog" data-id="' + x.id + '" ' + (x.hotovo ? 'checked' : '') + '> <span class="hand">' + esc(x.text) + '</span></label><button class="del" data-act="nkdel" data-id="' + x.id + '" aria-label="Smazat ' + esc(x.text) + '">×</button></li>').join('') + '</ul>'
      : '<p class="empty">Seznam je prázdný.</p>') +
    (kup.length ? '<button class="linkbtn" data-act="nkcist">Smazat odškrtnuté (' + kup.length + ')</button>' : '');
  const R = '<h3 class="sub" style="margin-top:4px">U pokladny</h3>' +
    (kup.length ? '<p class="note2">V košíku: ' + kup.map(x => esc(x.text)).join(', ') + '</p>' : '<p class="note2">Odškrtni, co máš v košíku, a pak zapiš, kolik to stálo.</p>') +
    '<div class="row"><label class="f">Obchod<input id="nko" placeholder="např. Lidl"></label><label class="f">Zaplaceno Kč<input id="nkc" inputmode="decimal"></label></div>' +
    '<div class="row"><label class="f">Kategorie<select id="nkk">' + katsV(S).map(k => '<option value="' + k.id + '"' + (k.id === 'jidlo' ? ' selected' : '') + '>' + esc(k.n) + '</option>').join('') + '</select></label>' +
    '<label class="f">Peněženka<select id="nkp">' + pens(S).map(p => '<option value="' + p.id + '">' + esc(p.n) + '</option>').join('') + '</select></label></div>' +
    '<button class="btn" data-act="nkzapl">Zapsat nákup do dneška</button><p class="note2">Odškrtnuté věci se ze seznamu smažou a zápis dostane jejich výčet.</p>';
  return [L, R];
}

// ======================= akce =======================
export function seznamyAkce(a, t, U, ctx) {
  const S = ctx.S(), id = t.dataset.id;
  const v = sel => { const el = $(sel); return el ? el.value.trim() : ''; };
  switch (a) {
    // dlužníček
    case 'dlsmer': U.dlSmer = t.dataset.v; return true;
    case 'dladd': {
      const kdo = v('#dlk'), c = num(v('#dlc'));
      if (!kdo) { $('#dlk').focus(); return 'stop'; }
      if (!(c > 0)) { $('#dlc').focus(); return 'stop'; }
      const nid = uid();
      zapis(['dluhy', nid], { id: nid, kdo: kdo.slice(0, 60), kc: c, smer: U.dlSmer === 'ja' ? 'ja' : 'mne', d: v('#dld') || dnes(), pozn: v('#dlp').slice(0, 200), ts: Date.now() });
      ctx.toast('Zapsáno do dlužníčku.'); return true;
    }
    case 'dlspl': {
      const dl = (S.dluhy || {})[id], c = num(v('#spl-' + id)); if (!dl) return true;
      if (!(c > 0)) { $('#spl-' + id).focus(); return 'stop'; }
      const sid = uid(); zapis(['dluhy', id, 'splatky', sid], { d: dnes(), kc: c });
      if (dluhStav({ ...dl, splatky: { ...(dl.splatky || {}), [sid]: { kc: c } } }).hotovo) { zapis(['dluhy', id, 'vraceno'], Date.now()); U.novyDluh = id; ctx.zvuk('razitko'); setTimeout(() => { U.novyDluh = ''; }, 1200); }
      return true;
    }
    case 'dlvr': zapis(['dluhy', id, 'vraceno'], Date.now()); U.novyDluh = id; ctx.zvuk('razitko'); setTimeout(() => { U.novyDluh = ''; }, 1200); return true;
    case 'dldel': { const dl = (S.dluhy || {})[id]; zapis(['dluhy', id], null); if (dl) ctx.toast('Smazáno: ' + dl.kdo, { n: 'Vrátit', f: () => { zapis(['dluhy', id], dl); ctx.render(); } }); return true; }
    // obálky
    case 'obadd': {
      const n = v('#obn'), c = num(v('#obk'));
      if (!n) { $('#obn').focus(); return 'stop'; }
      if (!(c >= 0)) { $('#obk').focus(); return 'stop'; }
      const kats = {}; document.querySelectorAll('.obkat:checked').forEach(x => { kats[x.value] = true; });
      const upr = U.obUpr && (S.obalky || {})[U.obUpr], oid = upr ? upr.id : uid();
      zapis(['obalky', oid], { id: oid, nazev: n.slice(0, 40), kc: c || 0, kats, barva: v('#obb') || '#c9a27a', ord: upr ? upr.ord || 0 : vals(S.obalky || {}).length });
      U.obUpr = ''; return true;
    }
    case 'obupr': U.obUpr = id; return true;
    case 'obzrus': U.obUpr = ''; return true;
    case 'obdel': { const o = (S.obalky || {})[id]; zapis(['obalky', id], null); if (U.obUpr === id) U.obUpr = ''; if (o) ctx.toast('Obálka smazána.', { n: 'Vrátit', f: () => { zapis(['obalky', id], o); ctx.render(); } }); return true; }
    // narozeniny
    case 'naradd': {
      const j = v('#nrj'), d = v('#nrd');
      if (!j) { $('#nrj').focus(); return 'stop'; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { $('#nrd').focus(); return 'stop'; }
      const nid = uid(), r = num(v('#nrr'));
      zapis(['narozeniny', nid], { id: nid, jmeno: j.slice(0, 60), datum: $('#nrbez').checked ? '--' + d.slice(5) : d, rozpocet: r > 0 ? r : null, napady: '' });
      return true;
    }
    case 'nardel': { const z = (S.narozeniny || {})[id]; zapis(['narozeniny', id], null); if (z) ctx.toast('Smazáno: ' + z.jmeno, { n: 'Vrátit', f: () => { zapis(['narozeniny', id], z); ctx.render(); } }); return true; }
    case 'narkup': {
      const c = num(v('#nk-' + id)); if (!(c > 0)) { $('#nk-' + id).focus(); return 'stop'; }
      const x = narozeninySeznam(S, dnes()).find(y => y.id === id); if (!x) return true;
      const eid = uid(), napad = ((S.narozeniny || {})[id] || {}).napady;
      zapis(['e', eid], { id: eid, d: dnes(), ts: Date.now(), typ: 'v', kc: c, text: 'Dárek: ' + x.jmeno + (napad ? ' (' + napad.slice(0, 40) + ')' : ''), kat: S.kats.dary ? 'dary' : 'ost', pen: 'ucet', tagy: [] });
      if (!(S.narozeniny || {})[id]) zapis(['narozeniny', id], { id, osoba: t.dataset.os || null });
      zapis(['narozeniny', id, 'darky', x.d.slice(0, 4)], eid);
      ctx.zvuk('razitko'); ctx.toast('Zapsáno do dneška jako výdaj Dárky.'); return true;
    }
    // nákup
    case 'nkadd': {
      const txt = v('#nkn'); if (!txt) { $('#nkn').focus(); return 'stop'; }
      txt.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).slice(0, 40).forEach((x, i) => { const nid = uid(); zapis(['nakup', nid], { id: nid, text: x.slice(0, 80), ts: Date.now() + i, hotovo: false }); });
      U.fokus = '#nkn'; return true;
    }
    case 'nktog': zapis(['nakup', id, 'hotovo'], t.checked); return true;
    case 'nkdel': zapis(['nakup', id], null); return true;
    case 'nkcist': vals(S.nakup || {}).filter(x => x.hotovo).forEach(x => zapis(['nakup', x.id], null)); return true;
    case 'nkzapl': {
      const c = num(v('#nkc')); if (!(c > 0)) { $('#nkc').focus(); return 'stop'; }
      const kup = vals(S.nakup || {}).filter(x => x.hotovo), ob = v('#nko'), eid = uid();
      const text = (ob || 'Nákup') + (kup.length ? ': ' + kup.map(x => x.text).join(', ') : '');
      zapis(['e', eid], { id: eid, d: dnes(), ts: Date.now(), typ: 'v', kc: c, text: text.length > 140 ? text.slice(0, 138) + '…' : text, kat: v('#nkk') || 'jidlo', pen: v('#nkp') || 'ucet', tagy: [] });
      kup.forEach(x => zapis(['nakup', x.id], null));
      ctx.toast('Nákup zapsán do dneška: ' + kc(c)); return true;
    }
  }
  return false;
}
// Nápady na dárek se ukládají při opuštění pole (change)
export function ulozNapady(el, S) {
  const id = el.dataset.id, v = el.value.trim().slice(0, 300);
  if (!(S.narozeniny || {})[id]) zapis(['narozeniny', id], { id, osoba: el.dataset.os || null, napady: v });
  else zapis(['narozeniny', id, 'napady'], v);
}
// Enter v poli nákupního seznamu přidá položky
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'nkn') { ev.preventDefault(); const b = document.querySelector('[data-act=nkadd]'); if (b) b.click(); }
});
