// Finanční deník · tyden.js · v0.6.0
// Týdenní list (pondělí–neděle) a nedělní rituál: pět minut ohlédnutí za týdnem.
// Data: tydny/{pondělí YYYY-MM-DD} = { pocasi, povedlo, prekvapilo, priste, hotovo (ms) }

import { esc, kc, pd, dnes, MG, vals } from './util.js';
import { pondeli, tydenStat, cisloTydne, plain } from './logic.js';
import { zapis } from './store.js';
import { kat } from './views.js';

const pl = (n, a, b, c) => n + ' ' + (n === 1 ? a : n >= 2 && n <= 4 ? b : c);
const posun = (d, n) => { const x = pd(d); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

// Počasí týdne: jak se týden cítil (žádné hodnocení výdajů)
export const POCASI = [
  ['slunce', 'Slunečný', '<circle cx="16" cy="16" r="6" fill="#f2b632"/><g stroke="#f2b632" stroke-width="2.4" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g>'],
  ['polojasno', 'Polojasno', '<circle cx="12" cy="12" r="5.5" fill="#f2b632"/><path d="M10 25h13.5a4.5 4.5 0 0 0 .3-9 6 6 0 0 0-11.5 1.6A3.8 3.8 0 0 0 10 25z" fill="#c7d3df" stroke="#8b9bab" stroke-width="1.2"/>'],
  ['mraky', 'Zataženo', '<path d="M7 24h17a5 5 0 0 0 .4-10 7 7 0 0 0-13.5 1.8A4.3 4.3 0 0 0 7 24z" fill="#b8c3ce" stroke="#7d8b99" stroke-width="1.2"/>'],
  ['dest', 'Deštivý', '<path d="M7 19h17a5 5 0 0 0 .4-10A7 7 0 0 0 10.9 10.8 4.3 4.3 0 0 0 7 19z" fill="#9fb0c0" stroke="#6d7d8c" stroke-width="1.2"/><g stroke="#3d7ea6" stroke-width="2" stroke-linecap="round"><path d="M11 23l-1.5 4M17 23l-1.5 4M23 23l-1.5 4"/></g>'],
  ['bourka', 'Bouřka', '<path d="M7 18h17a5 5 0 0 0 .4-10A7 7 0 0 0 10.9 9.8 4.3 4.3 0 0 0 7 18z" fill="#7f8c99" stroke="#57636f" stroke-width="1.2"/><path d="M17 18l-4 6h4l-2 6 6-8h-4l2-4z" fill="#f2b632" stroke="#c48a10" stroke-width=".8" stroke-linejoin="round"/>'],
];
export const pocasiSvg = (id, w) => { const p = POCASI.find(x => x[0] === id); return p ? '<svg viewBox="0 0 32 32" width="' + (w || 32) + '" height="' + (w || 32) + '" aria-hidden="true">' + p[2] + '</svg>' : ''; };

// Čeká nedělní rituál? (neděle, nebo pondělí–úterý, když minulý týden ještě není uzavřený)
export function ritualCeka(S, d0) {
  const den = pd(d0).getDay(), po = pondeli(d0);
  if (den === 0) return (S.tydny || {})[po] && S.tydny[po].hotovo ? null : po;
  if (den === 1 || den === 2) { const minule = posun(po, -7), t = (S.tydny || {})[minule]; return t && t.hotovo ? null : vals(S.e).some(e => e.d >= minule && e.d < po) ? minule : null; }
  return null;
}

const rozsah = (po, ne) => { const a = pd(po), b = pd(ne); return a.getMonth() === b.getMonth() ? a.getDate() + '.–' + b.getDate() + '. ' + MG[b.getMonth()] : a.getDate() + '. ' + MG[a.getMonth()] + ' – ' + b.getDate() + '. ' + MG[b.getMonth()]; };

export function vTyden(S, U) {
  const d0 = dnes(), po = U.tyden || pondeli(d0), s = tydenStat(S, po, d0), z = (S.tydny || {})[po] || {}, minule = (S.tydny || {})[posun(po, -7)] || {};
  const zkr = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  const radky = s.dny.map(x => {
    const dt = pd(x.d), budouci = x.d > d0, vyd = x.l.filter(e => e.typ === 'v').sort((a, b) => b.kc - a.kc);
    const txt = vyd.slice(0, 3).map(e => esc(e.text)).join(' · ') + (vyd.length > 3 ? ' · +' + (vyd.length - 3) : '');
    const pozn = plain(x.note || '').split('\n')[0];
    return '<li class="tden-r' + (x.d === d0 ? ' dnes' : '') + (budouci ? ' bud' : '') + '"><a href="#den" data-act="goday" data-id="' + x.d + '" class="tden-d"><b>' + zkr[dt.getDay()] + '</b><span>' + dt.getDate() + '.</span></a>' +
      '<div class="tden-t"><i class="tecka ' + x.st + '" title="' + (x.st === 'ok' ? 'V denním limitu' : x.st === 'nad' ? 'Nad denním limitem' : '') + '"></i>' + (txt || (budouci ? '' : '<span class="muted">bez výdajů</span>')) +
      (pozn ? '<em class="hand">' + esc(pozn.length > 70 ? pozn.slice(0, 68) + '…' : pozn) + '</em>' : '') + '</div>' +
      '<span class="tden-k">' + (x.vyd ? kc(x.vyd) : '') + (x.prij ? '<small class="p">+' + kc(x.prij) + '</small>' : '') + '</span></li>';
  }).join('');
  const L = '<div class="phead"><button class="arw" data-act="wprev" aria-label="Předchozí týden">‹</button><div><h2 class="pt">Týden ' + cisloTydne(po) + '</h2><p class="ps">' + rozsah(po, s.ne) + ' ' + s.ne.slice(0, 4) + (po === pondeli(d0) ? ' · tento týden' : ' · <a href="#tyden" data-act="wdnes">na tento týden</a>') + '</p></div><button class="arw" data-act="wnext" aria-label="Další týden">›</button></div>' +
    (minule.priste ? '<div class="lepik zluty hlidam"><h4>Tento týden si hlídám</h4><p class="hand">' + esc(minule.priste) + '</p></div>' : '') +
    '<ul class="tden">' + radky + '</ul>' +
    '<div class="figs"><div><b>' + kc(s.vyd) + '</b><span>výdaje týdne</span></div><div><b>' + kc(s.prij) + '</b><span>příjmy</span></div>' +
    (s.limit != null ? '<div><b>' + kc(s.vol) + '</b><span>volné výdaje z ' + kc(s.limit) + '</span></div>' : '') + '</div>' +
    '<p class="note2"><i class="tecka ok"></i> den v limitu · <i class="tecka nad"></i> nad limitem. Počítají se volné výdaje (bez bydlení, předplatného a pravidelných plateb).</p>';

  // Pravá strana: nedělní rituál
  const fakta = [];
  fakta.push('Zapsané dny: ' + s.zapsanoDni + ' / 7' + (s.pocet ? ', ' + pl(s.pocet, 'výdaj', 'výdaje', 'výdajů') : '') + '.');
  if (s.vyd) fakta.push('Utraceno ' + kc(s.vyd) + (s.maMinule && s.minule ? (s.vyd <= s.minule ? ', o ' + kc(s.minule - s.vyd) + ' méně' : ', o ' + kc(s.vyd - s.minule) + ' víc') + ' než minulý týden.' : '.'));
  if (s.ubehlo) fakta.push('Dny v denním limitu: ' + s.vLimitu + ' / ' + s.ubehlo + '.');
  if (s.nejvetsi) fakta.push('Největší výdaj: ' + s.nejvetsi.text + ' (' + kc(s.nejvetsi.kc) + ').');
  if (s.kats[0]) fakta.push('Nejvíc šlo na ' + kat(S, s.kats[0][0]).n.toLowerCase() + '.');
  if (s.pocit.radost) fakta.push('Pro radost: ' + kc(s.pocit.radost) + '.');
  const pole = (k, nadpis, ph) => '<label class="f rit"><span class="hand">' + nadpis + '</span><textarea class="inp hand" rows="2" data-act="wtext" data-k="' + k + '" data-po="' + po + '" placeholder="' + ph + '">' + esc(z[k] || '') + '</textarea></label>';
  const R = '<h3 class="sub" style="margin-top:4px">Nedělní rituál</h3><p class="ps" style="margin-top:-4px">Pět minut s čajem: ohlédnout se, nic nehodnotit, jednu věc vzít do dalšího týdne.</p>' +
    '<div class="lepik bily"><h4>1. Ohlédnutí</h4><ul>' + fakta.map(f => '<li>' + esc(f) + '</li>').join('') + '</ul></div>' +
    '<h3 class="sub">2. Jaký byl týden?</h3><div class="pocasi" role="group" aria-label="Jaký byl týden">' + POCASI.map(([id, n]) => '<button class="pcs' + (z.pocasi === id ? ' on' : '') + '" data-act="wpocasi" data-id="' + id + '" data-po="' + po + '" aria-pressed="' + (z.pocasi === id) + '">' + pocasiSvg(id, 34) + '<span>' + n + '</span></button>').join('') + '</div>' +
    '<h3 class="sub">3. Pár řádků</h3>' + pole('povedlo', 'Co se povedlo?', 'např. vařili jsme doma, nic jsem nezapomněl zaplatit') + pole('prekvapilo', 'Co mě překvapilo?', 'např. kolik stojí kafe cestou') + pole('priste', 'Jedna věc na příští týden', 'např. svačina z domu') +
    (z.hotovo ? '<p class="tyd-ok"><i class="razitko-ok' + (U.novyTyden === po ? ' bum' : '') + '">týden uzavřen</i> <span class="note2">' + new Date(z.hotovo).getDate() + '. ' + MG[new Date(z.hotovo).getMonth()] + '</span></p>'
      : '<button class="btn" data-act="wzavri" data-po="' + po + '">Uzavřít týden</button>' + (s.ne > d0 ? '<p class="note2">Týden ještě běží – uzavřít ho můžeš kdykoli, ideálně v neděli večer.</p>' : ''));
  return [L, R];
}

export function tydenAkce(a, t, U, ctx) {
  const po = t.dataset.po;
  switch (a) {
    case 'wprev': U.tyden = posun(U.tyden || pondeli(dnes()), -7); U.smer = -1; return true;
    case 'wnext': U.tyden = posun(U.tyden || pondeli(dnes()), 7); U.smer = 1; return true;
    case 'wdnes': U.tyden = pondeli(dnes()); return true;
    case 'wpocasi': {
      const z = ctx.S().tydny && ctx.S().tydny[po];
      zapis(['tydny', po, 'pocasi'], z && z.pocasi === t.dataset.id ? null : t.dataset.id); return true;
    }
    case 'wzavri': {
      document.querySelectorAll('[data-act=wtext]').forEach(el => ulozText(el));
      zapis(['tydny', po, 'hotovo'], Date.now()); U.novyTyden = po; ctx.zvuk('razitko');
      setTimeout(() => { U.novyTyden = ''; }, 1200); return true;
    }
  }
  return false;
}
// Text rituálu se ukládá při opuštění pole (change)
export function ulozText(el) {
  const v = el.value.trim().slice(0, 1500);
  zapis(['tydny', el.dataset.po, el.dataset.k], v || null);
}
