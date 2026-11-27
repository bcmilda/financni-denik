// Finanční deník · tracker.js · v0.7.0
// Tracker návyků a výskytů – pro sebe i pro ostatní (dítě z Knihy života).
// Data: trackery/{id} = { nazev, osoba ('' = já), rezim ('ano' | 'pocet'), barva, dny: { 'YYYY-MM-DD': počet } }

import { esc, uid, vals, dnes, mk, pd, ymLabel, MN, datKratce } from './util.js';
import { trackerStat, posunYm } from './logic.js';
import { st, zapis } from './store.js';

const $ = s => document.querySelector(s);
const BARVY = ['#3d7ea6', '#d4a017', '#2e8b6e', '#d1495b', '#7b5ea7', '#8a5a3c', '#e07a5f'];
const DNYZK = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const kdo = (S, t) => (t.osoba && S.osoby && S.osoby[t.osoba] ? S.osoby[t.osoba].jmeno : 'Já');
const pl = (n, a, b, c) => n + ' ' + (n === 1 ? a : n >= 2 && n <= 4 ? b : c);

function dnesBtn(t, d) {
  const n = (t.dny || {})[d] || 0;
  if (t.rezim === 'pocet') return '<div class="tpocet"><button class="arw" data-act="tmin" data-id="' + t.id + '" data-d="' + d + '" aria-label="Ubrat">−</button><b>' + n + '×</b><button class="btn" data-act="tplus" data-id="' + t.id + '" data-d="' + d + '">+1 dnes</button></div>';
  return '<button class="btn ' + (n ? '' : 'ghost') + ' tdnes" data-act="ttog" data-id="' + t.id + '" data-d="' + d + '" aria-pressed="' + !!n + '">' + (n ? 'Dnes ✓' : 'Dnes') + '</button>';
}

export function vTracker(S, U) {
  const d0 = dnes(), filtr = U.trkOs == null ? 'vse' : U.trkOs;
  const vse = vals(S.trackery).sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
  const l = vse.filter(t => filtr === 'vse' || (t.osoba || '') === filtr);
  const lide = [...new Set(vse.map(t => t.osoba || ''))];
  const sel = (S.trackery || {})[U.trk] || l[0];
  const L = '<h2 class="pt">Tracker</h2><p class="ps">Co se jak často děje – u tebe i u dětí. Klepni na „Dnes“ a je zapsáno.</p>' +
    (lide.length > 1 ? '<div class="tags zf"><button class="tg ' + (filtr === 'vse' ? 'on' : '') + '" data-act="trkos" data-id="vse">Všichni</button>' + lide.map(o => '<button class="tg ' + (filtr === o ? 'on' : '') + '" data-act="trkos" data-id="' + esc(o) + '">' + esc(o ? (S.osoby[o] || {}).jmeno || '?' : 'Já') + '</button>').join('') + '</div>' : '') +
    (l.length ? l.map(t => {
      const s = trackerStat(t, d0), m = s.mesice[mk(d0)] || 0;
      return '<div class="trk' + (sel && sel.id === t.id ? ' on' : '') + '" style="--c:' + t.barva + '"><button class="trk-n" data-act="trk" data-id="' + t.id + '"><b>' + esc(t.nazev) + '</b><small>' + esc(kdo(S, t)) + ' · tento měsíc ' + m + '×' + (s.serie > 1 ? ' · série ' + pl(s.serie, 'den', 'dny', 'dní') : '') + '</small></button>' + dnesBtn(t, d0) + '</div>';
    }).join('') : '<p class="empty">Zatím žádný tracker. Přidej první níž – třeba „Holení“ nebo „Čištění zubů“ pro dítě.</p>') +
    '<h3 class="sub">Nový tracker</h3><div class="row"><label class="f">Co sledovat<input id="tn" placeholder="např. Holení, Cvičení, Čištění zubů"></label>' +
    '<label class="f">Pro koho<select id="to"><option value="">Já</option>' + vals(S.osoby).filter(o => o.vztah !== 'ja').map(o => '<option value="' + o.id + '">' + esc(o.jmeno) + '</option>').join('') + '</select></label>' +
    '<label class="f">Zapisovat<select id="tr"><option value="ano">Ano / ne za den</option><option value="pocet">Počet za den</option></select></label></div>' +
    '<button class="btn" data-act="tadd">Přidat tracker</button>';
  if (!sel) return [L, '<p class="empty" style="margin-top:12px">Vyber nebo přidej tracker.</p>'];
  const ym = U.trkYm || mk(d0), N = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(), prvni = (pd(ym + '-01').getDay() + 6) % 7, s = trackerStat(sel, d0);
  let bunky = '';
  for (let i = 0; i < prvni; i++) bunky += '<span class="kb prazdna"></span>';
  for (let dd = 1; dd <= N; dd++) {
    const iso = ym + '-' + String(dd).padStart(2, '0'), n = (sel.dny || {})[iso] || 0, bud = iso > d0;
    bunky += '<button class="kb' + (n ? ' plna' : '') + (iso === d0 ? ' dnes' : '') + (U.trkDen === iso ? ' vyb' : '') + '" ' + (bud ? 'disabled' : 'data-act="tden" data-id="' + sel.id + '" data-d="' + iso + '"') + ' aria-label="' + dd + '. ' + (n ? (sel.rezim === 'pocet' ? n + '×' : 'ano') : 'nic') + '"><span>' + dd + '</span>' + (n && sel.rezim === 'pocet' ? '<i>' + n + '</i>' : '') + '</button>';
  }
  const posl12 = Array.from({ length: 12 }, (_, i) => posunYm(mk(d0), i - 11)), mx = Math.max(1, ...posl12.map(m => s.mesice[m] || 0));
  const R = '<div class="phead"><button class="arw" data-act="tym" data-id="-1" aria-label="Předchozí měsíc">‹</button><div><h2 class="pt" style="--c:' + sel.barva + '">' + esc(sel.nazev) + '</h2><p class="ps">' + esc(kdo(S, sel)) + ' · ' + ymLabel(ym) + '</p></div><button class="arw" data-act="tym" data-id="1" aria-label="Další měsíc">›</button></div>' +
    '<div class="kal" style="--c:' + sel.barva + '">' + DNYZK.map(x => '<span class="kh">' + x + '</span>').join('') + bunky + '</div>' +
    (U.trkDen && sel.rezim === 'pocet' ? '<div class="box">' + datKratce(U.trkDen) + ': ' + dnesBtn(sel, U.trkDen).replace('+1 dnes', '+1') + '</div>' : '') +
    '<p class="note2">' + (sel.rezim === 'pocet' ? 'Klepnutím na den ho vybereš a upravíš počet.' : 'Klepnutím na den zapíšeš nebo smažeš výskyt.') + '</p>' +
    '<div class="figs"><div><b>' + (s.mesice[ym] || 0) + '×</b><span>v tomto měsíci</span></div><div><b>' + pl(s.serie, 'den', 'dny', 'dní') + '</b><span>aktuální série</span></div><div><b>' + pl(s.nejdelsi, 'den', 'dny', 'dní') + '</b><span>nejdelší série</span></div><div><b>' + (s.posledni ? (s.predDny === 0 ? 'dnes' : s.predDny === 1 ? 'včera' : 'před ' + s.predDny + ' dny') : '–') + '</b><span>naposledy</span></div></div>' +
    '<h3 class="sub">Po měsících</h3><div class="bars">' + posl12.map(m => '<div class="b"><span>' + MN[+m.slice(5) - 1].slice(0, 3) + ' ' + m.slice(2, 4) + '</span><div class="tr"><div class="fl" style="--c:' + sel.barva + ';width:' + Math.max((s.mesice[m] ? 3 : 0), (s.mesice[m] || 0) / mx * 100) + '%"></div></div><span class="v">' + (s.mesice[m] || 0) + '×</span></div>').join('') + '</div>' +
    '<p style="margin-top:16px"><button class="btn ghost" data-act="tdel" data-id="' + sel.id + '">Smazat tracker</button></p>';
  return [L, R];
}

export function trackerAkce(a, t, U, ctx) {
  const id = t.dataset.id, d = t.dataset.d, T = (st.S.trackery || {})[id];
  const nastav = n => zapis(['trackery', id, 'dny', d], n > 0 ? n : null);
  switch (a) {
    case 'trk': U.trk = id; U.trkDen = ''; return true;
    case 'trkos': U.trkOs = id; return true;
    case 'tym': U.trkYm = posunYm(U.trkYm || mk(dnes()), +id); U.trkDen = ''; return true;
    case 'ttog': if (!T) return 'stop'; nastav((T.dny || {})[d] ? 0 : 1); if (!(T.dny || {})[d] && ctx.zvuk) ctx.zvuk('razitko'); return true;
    case 'tplus': if (!T) return 'stop'; nastav(((T.dny || {})[d] || 0) + 1); return true;
    case 'tmin': if (!T) return 'stop'; nastav(((T.dny || {})[d] || 0) - 1); return true;
    case 'tden':
      if (!T) return 'stop';
      U.trk = id;
      if (T.rezim === 'pocet') { U.trkDen = U.trkDen === d ? '' : d; return true; }
      nastav((T.dny || {})[d] ? 0 : 1); return true;
    case 'tadd': {
      const nazev = $('#tn').value.trim(); if (!nazev) { $('#tn').focus(); return 'stop'; }
      const n = { id: uid(), nazev, osoba: $('#to').value, rezim: $('#tr').value, barva: BARVY[vals(st.S.trackery).length % BARVY.length], dny: {} };
      zapis(['trackery', n.id], n); U.trk = n.id; return true;
    }
    case 'tdel': zapis(['trackery', id], null); U.trk = ''; return true;
    default: return false;
  }
}
