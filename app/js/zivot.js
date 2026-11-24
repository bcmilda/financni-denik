// Finanční deník · zivot.js · v0.3.0
// Kniha života: osoby, osa života, mapa života (etapy a události), lékařský archiv s vysvětlením,
// očkovací průkaz, zoubky a růst. Levá strana = osa života, pravá = vybraná část.

import { esc, pd, dnes, uid, vals, datKratce, nf, num } from './util.js';
import { TYPY, VZTAHY, vek, nazevZubu, oblouk, stavZubu } from './zivot-data.js';
import { st, zapis } from './store.js';
import { AI_WORKER } from './config.js';

const $ = s => document.querySelector(s);
const ZALOZKY = [['mapa', 'Mapa života'], ['archiv', 'Lékařský archiv'], ['ockovani', 'Očkovací průkaz'], ['zuby', 'Zoubky'], ['rust', 'Růst']];
const datum = s => { if (!s) return ''; const d = pd(s); return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear(); };
const osoby = S => vals(S.osoby).sort((a, b) => (a.vztah === 'ja' ? -1 : b.vztah === 'ja' ? 1 : 0) || (a.narozeni || '9').localeCompare(b.narozeni || '9'));
const zaznamy = (S, os) => vals(S.zivot).filter(z => z.osoba === os);
let foto = null; // zmenšená fotka čekající na uložení záznamu

// ---------- levá strana: osoby + osa života ----------
function radek(z, o) {
  const t = TYPY[z.typ] || TYPY.poznamka;
  let titul = z.titul || '', pod = z.text || '';
  if (z.typ === 'lekar') { pod = [z.lekar, z.duvod].filter(Boolean).join(' · '); }
  if (z.typ === 'ockovani') { titul = z.latka + (z.davka ? ' · ' + z.davka : ''); pod = z.proti || ''; }
  if (z.typ === 'zub') { titul = (z.akce === 'prorezal' ? 'Prořezal se ' : 'Vypadl ') + nazevZubu(z.zub); }
  if (z.typ === 'rust') { titul = [z.vyska ? nf(z.vyska, 0) + ' cm' : '', z.vaha ? nf(z.vaha, 1) + ' kg' : ''].filter(Boolean).join(' · '); }
  if (z.typ === 'etapa') titul += ' (' + datum(z.d) + (z.do ? ' – ' + datum(z.do) : ' – dosud') + ')';
  return '<li class="zr" style="--c:' + t.c + '"><span class="zd">' + datKratce(z.d) + '</span><span class="zt"><b>' + esc(titul) + '</b>' + (pod ? '<small>' + esc(pod) + '</small>' : '') +
    '<em>' + t.n + (o && o.narozeni ? ' · ' + vek(o.narozeni, z.d) : '') + '</em></span><button class="del" data-act="zdel" data-id="' + z.id + '" aria-label="Smazat záznam">×</button></li>';
}
function osa(S, U, o) {
  const f = U.zfilt || '', q = (U.zq || '').toLowerCase();
  let l = zaznamy(S, o.id).filter(z => !f || z.typ === f);
  if (q) l = l.filter(z => JSON.stringify([z.titul, z.text, z.lekar, z.duvod, z.prepis, z.latka, z.proti, z.vysv && z.vysv.text, z.vysv && z.vysv.shrnuti]).toLowerCase().includes(q));
  l.sort((a, b) => b.d.localeCompare(a.d));
  const celkem = l.length, zkratit = !U.osaVse && !f && !q && celkem > 10;
  if (zkratit) l = l.slice(0, 10);
  if (o.narozeni && !f && !q && !zkratit) l.push({ id: '', d: o.narozeni, typ: 'narozeni' });
  const roky = {};
  l.forEach(z => { (roky[z.d.slice(0, 4)] = roky[z.d.slice(0, 4)] || []).push(z); });
  const vekRoku = r => { const n = r - o.narozeni.slice(0, 4); return n === 0 ? 'rok narození' : 'v tomto roce ' + n + (n === 1 ? ' rok' : n < 5 ? ' roky' : ' let'); };
  const h = Object.keys(roky).sort().reverse().map(r => '<h4 class="rok">' + r + (o.narozeni && r >= o.narozeni.slice(0, 4) ? '<span>' + vekRoku(r) + '</span>' : '') + '</h4><ul class="list">' +
    roky[r].map(z => z.typ === 'narozeni' ? '<li class="zr" style="--c:#b5838d"><span class="zd">' + datKratce(z.d) + '</span><span class="zt"><b>Narození</b></span></li>' : radek(z, o)).join('') + '</ul>').join('');
  if (h && zkratit) return h + '<button class="btn ghost" data-act="osavse" style="margin-top:12px">Celá osa života (' + celkem + ' záznamů)</button>';
  return h || '<p class="empty">' + (q || f ? 'Nic takového jsem nenašel.' : 'Zatím žádné záznamy. Přidej první vpravo.') + '</p>';
}

export function vZivot(S, U) {
  const os = osoby(S);
  if (!os.length) {
    return ['<h2 class="pt">Kniha života</h2><p class="ps">Zadní část knihy patří lidem: tobě, dětem, partnerovi. Ke každému tu bude osa života, lékařský archiv, očkovací průkaz, zoubky a růst.</p>' + formOsoba(), '<p class="empty" style="margin-top:12px">Nejdřív přidej první osobu.</p>'];
  }
  // Bez volby: osoba s nejvíc záznamy (u rodičů typicky dítě)
  const pocet = id => vals(S.zivot).filter(x => x.osoba === id).length;
  const o = S.osoby[U.osoba] || os.slice().sort((a, b) => pocet(b.id) - pocet(a.id))[0];
  U.osoba = o.id;
  const L = '<h2 class="pt">Kniha života</h2><div class="vchips">' + os.map(x => '<button class="vchip ' + (x.id === o.id ? 'on' : '') + '" data-act="osoba" data-id="' + x.id + '">' + esc(x.jmeno) + '</button>').join('') +
    '<button class="vchip" data-act="osnew">+ Osoba</button></div>' + (U.osNew ? formOsoba() : '') +
    '<p class="ps">' + esc(VZTAHY[o.vztah] || '') + (o.narozeni ? ' · narozen' + (o.vztah === 'dite' ? '/a' : '') + ' ' + datum(o.narozeni) + ' · ' + vek(o.narozeni, dnes()) : '') + '</p>' +
    '<h3 class="sub">Osa života</h3><div class="tags zf">' + [['', 'Vše']].concat(Object.entries(TYPY).map(([k, v]) => [k, v.n])).map(([k, n]) => '<button class="tg ' + ((U.zfilt || '') === k ? 'on' : '') + '" data-act="zfilt" data-id="' + k + '">' + n + '</button>').join('') + '</div>' +
    '<input id="zq" class="line" type="search" placeholder="Hledat v záznamech osoby" value="' + esc(U.zq || '') + '" aria-label="Hledat v záznamech">' +
    '<div id="osa">' + osa(S, U, o) + '</div>';
  const tab = U.ztab || 'mapa';
  const R = '<div class="ztabs" role="tablist">' + ZALOZKY.map(([k, n]) => '<button role="tab" aria-selected="' + (k === tab) + '" class="ztab ' + (k === tab ? 'on' : '') + '" data-act="ztab" data-id="' + k + '">' + n + '</button>').join('') + '</div>' +
    ({ mapa, archiv, ockovani, zuby, rust }[tab])(S, U, o);
  return [L, R];
}
export function osaHTML(S, U) { const o = S.osoby[U.osoba]; return o ? osa(S, U, o) : ''; }

function formOsoba() {
  return '<div class="box"><div class="row"><label class="f">Jméno<input id="on" placeholder="např. Ema"></label><label class="f">Datum narození<input type="date" id="od"></label>' +
    '<label class="f">Kdo to je<select id="ov">' + Object.entries(VZTAHY).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label></div><button class="btn" data-act="osadd">Přidat osobu</button></div>';
}

// ---------- Mapa života ----------
function mapa(S, U, o) {
  const l = zaznamy(S, o.id), dnesD = dnes();
  const etapy = l.filter(z => z.typ === 'etapa').sort((a, b) => a.d.localeCompare(b.d));
  const udal = l.filter(z => z.typ === 'udalost').sort((a, b) => a.d.localeCompare(b.d));
  const start = o.narozeni || [...l].sort((a, b) => a.d.localeCompare(b.d))[0]?.d || dnesD;
  const t0 = pd(start).getTime(), t1 = Date.now(), X = s => Math.max(0, Math.min(100, (pd(s).getTime() - t0) / Math.max(1, t1 - t0) * 100));
  const r0 = +start.slice(0, 4), r1 = new Date().getFullYear(), krok = Math.max(1, Math.ceil((r1 - r0) / 6));
  let osaRoky = '';
  for (let r = r0; r <= r1; r += krok) osaRoky += '<span style="left:' + X(r + '-01-01') + '%">' + r + '</span>';
  const lek = l.filter(z => z.typ === 'lekar').sort((a, b) => b.d.localeCompare(a.d));
  const pristi = lek.filter(z => z.pristi && z.pristi >= dnesD).sort((a, b) => a.pristi.localeCompare(b.pristi))[0];
  const ock = l.filter(z => z.typ === 'ockovani').sort((a, b) => b.d.localeCompare(a.d))[0];
  const zst = stavZubu(l), vyp = Object.entries(zst).filter(([k, v]) => +k >= 50 && v.vypadl).length;
  const r = l.filter(z => z.typ === 'rust').sort((a, b) => b.d.localeCompare(a.d))[0];
  const nove = [...l].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 4);
  return '<h3 class="sub">Etapy a události</h3>' +
    (etapy.length || udal.length ? '<div class="mapa">' + etapy.map(e => '<div class="et"><span class="en">' + esc(e.titul) + '</span><div class="eb"><i style="left:' + X(e.d) + '%;width:' + Math.max(1.5, X(e.do || dnesD) - X(e.d)) + '%"></i></div></div>').join('') +
      '<div class="et"><span class="en">Události</span><div class="eb ud">' + udal.map(u => '<i title="' + esc(u.titul + ' · ' + datum(u.d)) + '" style="left:' + X(u.d) + '%"></i>').join('') + '</div></div><div class="eroky">' + osaRoky + '</div></div>' +
      (udal.length ? '<p class="note2">' + udal.map(u => '<b>' + esc(u.titul) + '</b> ' + (o.narozeni ? vek(o.narozeni, u.d) : datum(u.d))).join(' · ') + '</p>' : '')
      : '<p class="empty">Přidej první etapu (školka, škola, práce, bydlení) nebo událost.</p>') +
    '<h3 class="sub">Na jednom místě</h3><dl class="kv">' +
    '<dt>Poslední u lékaře</dt><dd>' + (lek[0] ? datum(lek[0].d) : '–') + '</dd>' +
    '<dt>Příští kontrola</dt><dd>' + (pristi ? datum(pristi.pristi) : '–') + '</dd>' +
    '<dt>Poslední očkování</dt><dd>' + (ock ? datum(ock.d) : '–') + '</dd>' +
    (o.vztah === 'dite' ? '<dt>Vypadlé mléčné zuby</dt><dd>' + vyp + ' z 20</dd>' : '') +
    '<dt>Výška a váha</dt><dd>' + (r ? [r.vyska ? nf(r.vyska, 0) + ' cm' : '', r.vaha ? nf(r.vaha, 1) + ' kg' : ''].filter(Boolean).join(' · ') : '–') + '</dd></dl>' +
    (nove.length ? '<h3 class="sub">Naposledy zapsáno</h3><ul class="list">' + nove.map(z => radek(z, o)).join('') + '</ul>' : '') +
    '<h3 class="sub">Nový zápis</h3><div class="row"><label class="f">Druh<select id="zt"><option value="udalost">Událost</option><option value="etapa">Etapa (od–do)</option><option value="poznamka">Poznámka</option></select></label>' +
    '<label class="f">Datum<input type="date" id="zd" value="' + dnesD + '"></label><label class="f">Do (u etapy)<input type="date" id="zdo"></label></div>' +
    '<input id="zti" class="line hand" placeholder="Co se stalo – např. první zoubek, nová práce" aria-label="Název"><textarea id="ztx" class="inp" rows="3" placeholder="Poznámka (nepovinná)" aria-label="Poznámka" style="margin:10px 0"></textarea>' +
    '<button class="btn" data-act="zadd" data-id="obecny">Zapsat do knihy</button>' +
    (!l.length ? ' <button class="btn ghost" data-act="osdel" data-id="' + o.id + '">Smazat osobu ' + esc(o.jmeno) + '</button>' : '');
}

// ---------- Lékařský archiv ----------
function vysvHTML(z) {
  const v = z.vysv;
  if (!v) {
    return '<div class="vysv prazdne"><p>' + (z.prepis || z.img ? 'Zpráva zatím není vysvětlená.' : 'Vyfoť nebo opiš zprávu a nech si ji vysvětlit.') + '</p>' +
      ((z.prepis || z.img) ? '<button class="btn ghost" data-act="vysvetli" data-id="' + z.id + '">Vysvětlit srozumitelně (AI)</button>' : '') + '</div>';
  }
  return '<div class="vysv"><h5>Srozumitelně' + (v.ukazka ? ' · ukázka' : '') + '</h5><p>' + esc(v.text) + '</p>' +
    (v.shrnuti ? '<h5>Stav podle zprávy</h5><p>' + esc(v.shrnuti) + '</p>' : '') +
    ((v.pojmy || []).length ? '<h5>Pojmy</h5><dl class="pojmy">' + v.pojmy.map(p => '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>').join('') + '</dl>' : '') +
    ((v.otazky || []).length ? '<h5>Na co se zeptat lékaře</h5><ul>' + v.otazky.map(q => '<li>' + esc(q) + '</li>').join('') + '</ul>' : '') +
    '<p class="pozn">Vysvětlení připravila AI z textu zprávy. Nenahrazuje lékaře: když si nejsi jistý, zeptej se ho.</p></div>';
}
function archiv(S, U, o) {
  const l = zaznamy(S, o.id).filter(z => z.typ === 'lekar').sort((a, b) => b.d.localeCompare(a.d));
  return '<h3 class="sub">Lékařský archiv · ' + esc(o.jmeno) + '</h3><p class="note2">Zprávy od lékařů na jednom místě: fotka, přepis a vysvětlení lidskou řečí.</p>' +
    l.map(z => '<article class="lz"><header><b>' + esc(z.titul || z.duvod || 'Návštěva lékaře') + '</b><span>' + datum(z.d) + (o.narozeni ? ' · ' + vek(o.narozeni, z.d) : '') + '</span>' +
      '<button class="del" data-act="zdel" data-id="' + z.id + '" aria-label="Smazat záznam">×</button></header>' +
      '<p class="lm">' + esc([z.lekar, z.duvod].filter(Boolean).join(' · ')) + (z.pristi ? ' · <b>příští kontrola ' + datum(z.pristi) + '</b>' : '') + '</p>' +
      (z.img ? '<figure class="rcpt foto lf"><img src="' + z.img + '" alt="Fotka zprávy"></figure>' : '') +
      (z.prepis ? '<details' + (z.vysv ? '' : ' open') + '><summary>Přepis zprávy</summary><p class="prepis">' + esc(z.prepis) + '</p></details>' : '') + vysvHTML(z) + '</article>').join('') +
    '<h3 class="sub">Nový záznam od lékaře</h3><div class="row"><label class="f">Datum<input type="date" id="ld" value="' + dnes() + '"></label><label class="f">Lékař / obor<input id="ll" placeholder="např. MUDr. Svoboda, ORL"></label><label class="f">Proč<input id="lu" placeholder="např. bolest ucha"></label></div>' +
    '<textarea id="lp" class="inp" rows="4" placeholder="Přepis zprávy (můžeš opsat nebo vložit text). AI ho později přečte i z fotky." aria-label="Přepis zprávy"></textarea>' +
    '<div class="row" style="margin-top:10px"><label class="f">Příští kontrola<input type="date" id="lk"></label><label class="f chk"><input type="checkbox" id="lkU" checked> Připomenout v Úkolníčku</label></div>' +
    '<label class="btn ghost" for="lfoto">' + (foto ? 'Fotka připravena – vyměnit' : 'Přidat fotku zprávy') + '</label><input type="file" id="lfoto" accept="image/*" hidden> ' +
    '<button class="btn" data-act="zadd" data-id="lekar">Uložit do archivu</button>';
}

// ---------- Očkovací průkaz ----------
function ockovani(S, U, o) {
  const l = zaznamy(S, o.id).filter(z => z.typ === 'ockovani').sort((a, b) => a.d.localeCompare(b.d));
  return '<div class="prukaz"><div class="ph"><b>Očkovací průkaz</b><span>' + esc(o.jmeno) + (o.narozeni ? ' · nar. ' + datum(o.narozeni) : '') + '</span></div>' +
    (l.length ? '<div class="scroll"><table class="stack pt-tab"><thead><tr><th>Datum</th><th>Očkovací látka</th><th>Dávka</th><th>Šarže · lékař</th><th></th></tr></thead><tbody>' +
      l.map((z, i) => '<tr><td>' + datum(z.d) + '</td><td class="wrap"><b>' + esc(z.latka) + '</b>' + (z.proti ? '<small>' + esc(z.proti) + '</small>' : '') + '</td><td>' + esc(z.davka || '') + '</td><td class="wrap">' + esc([z.sarze, z.lekar].filter(Boolean).join(' · ')) + '<i class="razitko" style="--r:' + ((i * 37) % 20 - 10) + 'deg">zapsáno</i></td><td><button class="del" data-act="zdel" data-id="' + z.id + '" aria-label="Smazat">×</button></td></tr>').join('') + '</tbody></table></div>'
      : '<p class="empty">Zatím žádné očkování. Opiš ho z papírového průkazu.</p>') + '</div>' +
    '<p class="note2">Appka očkování nehodnotí ani nedoporučuje, jen přehledně uchová, co zapíšeš.</p>' +
    '<h3 class="sub">Zapsat očkování</h3><div class="row"><label class="f">Datum<input type="date" id="vd" value="' + dnes() + '"></label><label class="f">Očkovací látka<input id="vl" placeholder="např. MMR"></label><label class="f">Dávka<input id="vv" placeholder="např. 2. dávka"></label></div>' +
    '<div class="row"><label class="f">Proti čemu<input id="vp" placeholder="např. spalničky, příušnice, zarděnky"></label><label class="f">Šarže<input id="vs"></label><label class="f">Lékař<input id="vk"></label></div>' +
    '<button class="btn" data-act="zadd" data-id="ockovani">Zapsat do průkazu</button>';
}

// ---------- Zoubky ----------
function pusa(mlecne, stav, sel) {
  const W = 420, H = 330, cx = 210, cy = 165;
  const zub = (kod, x, y, rot, horni) => {
    const p = kod % 10, s = stav[kod] || {}, w = mlecne ? [22, 19, 20, 27, 30][p - 1] : [20, 17, 19, 21, 21, 29, 28, 26][p - 1];
    const h = mlecne ? 30 : 34, chybi = mlecne ? !!s.vypadl : !s.prorezal;
    const tvar = 'M' + (-w / 2) + ' ' + (-h / 2) + 'q' + (w / 2) + ' ' + (-7) + ' ' + w + ' 0v' + (h - 9) + 'q' + (-w / 2) + ' 12 ' + (-w) + ' 0z';
    return '<g class="zub' + (chybi ? ' chybi' : '') + (sel === kod ? ' sel' : '') + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(1) + ')' + (horni ? '' : ' scale(1 -1)') + '" data-act="zub" data-id="' + kod + '" role="button" tabindex="0" aria-label="' + esc(nazevZubu(kod)) + (chybi ? (mlecne ? ', vypadl ' + datum(s.vypadl) : ', ještě nevyrostl') : '') + '">' +
      '<path d="' + tvar + '"/>' + (s.prvni ? '<text y="5" text-anchor="middle" class="hv" transform="' + (horni ? '' : 'scale(1 -1)') + '">★</text>' : '') + '</g>';
  };
  const arc = (kody, horni) => {
    const n = kody.length, rx = mlecne ? 128 : 150, ry = mlecne ? 92 : 104;
    return kody.map((k, i) => {
      const th = Math.PI * (0.94 - 0.88 * i / (n - 1)), x = cx + rx * Math.cos(th);
      const y = horni ? cy - 22 - ry * Math.sin(th) * 0.95 : cy + 22 + ry * Math.sin(th) * 0.9;
      const rot = (horni ? 1 : -1) * (90 - th * 180 / Math.PI);
      return zub(k, x, y, rot, horni);
    }).join('');
  };
  return '<svg class="pusa" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Zuby – klepni na zub">' +
    '<ellipse cx="' + cx + '" cy="' + cy + '" rx="196" ry="156" class="rty"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="176" ry="138" class="dutina"/>' +
    '<ellipse cx="' + cx + '" cy="' + (cy + 62) + '" rx="78" ry="40" class="jazyk"/>' +
    '<path d="M' + (cx - 160) + ' ' + (cy - 30) + 'Q' + cx + ' ' + (cy - 250) + ' ' + (cx + 160) + ' ' + (cy - 30) + '" class="dasen"/><path d="M' + (cx - 160) + ' ' + (cy + 30) + 'Q' + cx + ' ' + (cy + 240) + ' ' + (cx + 160) + ' ' + (cy + 30) + '" class="dasen"/>' +
    arc(oblouk(mlecne, true), true) + arc(oblouk(mlecne, false), false) +
    '<text x="12" y="' + (H - 10) + '" class="pl">vpravo</text><text x="' + (W - 12) + '" y="' + (H - 10) + '" text-anchor="end" class="pl">vlevo</text></svg>';
}
function zuby(S, U, o) {
  const l = zaznamy(S, o.id), stav = stavZubu(l), mlecne = (U.chrup || 'm') === 'm', sel = U.zub ? +U.zub : 0;
  const ud = l.filter(z => z.typ === 'zub' && (mlecne ? z.zub >= 50 : z.zub < 50)).sort((a, b) => b.d.localeCompare(a.d));
  const vyp = Object.entries(stav).filter(([k, v]) => +k >= 50 && v.vypadl).length, pro = Object.entries(stav).filter(([k, v]) => +k < 50 && v.prorezal).length;
  const prvni = Object.entries(stav).find(([k, v]) => v.prvni);
  return '<div class="seg" role="group" aria-label="Chrup"><button data-act="chrup" data-id="m" class="' + (mlecne ? 'on' : '') + '">Mléčné zuby</button><button data-act="chrup" data-id="s" class="' + (mlecne ? '' : 'on') + '">Stálé zuby</button></div>' +
    '<p class="note2">' + (mlecne ? 'Vypadlo ' + vyp + ' z 20 mléčných zubů.' : 'Prořezalo se ' + pro + ' z 32 stálých zubů.') + (prvni && mlecne ? ' První vypadl ' + esc(nazevZubu(+prvni[0])) + ' ' + datum(prvni[1].vypadl) + (o.narozeni ? ' (' + vek(o.narozeni, prvni[1].vypadl) + ')' : '') + ' ★' : '') + '</p>' +
    pusa(mlecne, stav, sel) +
    (sel ? '<div class="box"><b>' + esc(nazevZubu(sel)) + '</b><div class="row" style="margin-top:8px"><label class="f">Co se stalo<select id="za">' + (sel >= 50 ? '<option value="vypadl">Vypadl</option><option value="prorezal">Prořezal se</option>' : '<option value="prorezal">Prořezal se</option><option value="vypadl">Vypadl / vytržen</option>') + '</select></label><label class="f">Datum<input type="date" id="zzd" value="' + dnes() + '"></label></div>' +
      '<input id="zzt" class="line hand" placeholder="Poznámka – např. zoubková víla nechala 50 Kč"><div style="margin-top:10px"><button class="btn" data-act="zadd" data-id="zub">Zapsat zoubek</button> <button class="btn ghost" data-act="zub" data-id="">Zavřít</button></div></div>'
      : '<p class="note2">Klepni na zoubek a zapiš, kdy vypadl nebo se prořezal.</p>') +
    (ud.length ? '<ul class="list">' + ud.map(z => radek(z, o)).join('') + '</ul>' : '');
}

// ---------- Růst ----------
function rust(S, U, o) {
  const l = zaznamy(S, o.id).filter(z => z.typ === 'rust').sort((a, b) => a.d.localeCompare(b.d));
  return '<h3 class="sub">Výška</h3><div class="fig mini"><svg id="gv" role="img" aria-label="Výška v čase"></svg></div><h3 class="sub">Váha</h3><div class="fig mini"><svg id="gh" role="img" aria-label="Váha v čase"></svg></div>' +
    (l.length ? '<div class="scroll"><table><thead><tr><th>Datum</th><th>Věk</th><th>Výška, cm</th><th>Váha, kg</th><th></th></tr></thead><tbody>' + l.slice().reverse().map(z => '<tr><td>' + datum(z.d) + '</td><td>' + (o.narozeni ? vek(o.narozeni, z.d) : '') + '</td><td>' + (z.vyska ? nf(z.vyska, z.vyska % 1 ? 1 : 0) : '–') + '</td><td>' + (z.vaha ? nf(z.vaha, 1) : '–') + '</td><td><button class="del" data-act="zdel" data-id="' + z.id + '" aria-label="Smazat">×</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="empty">Zatím žádné měření.</p>') +
    '<h3 class="sub">Nové měření</h3><div class="row"><label class="f">Datum<input type="date" id="rd" value="' + dnes() + '"></label><label class="f">Výška, cm<input id="rv" inputmode="decimal"></label><label class="f">Váha, kg<input id="rh" inputmode="decimal"></label></div><button class="btn" data-act="zadd" data-id="rust">Zapsat měření</button>';
}
export const rustData = (S, U) => zaznamy(S, U.osoba).filter(z => z.typ === 'rust').sort((a, b) => a.d.localeCompare(b.d));

// ---------- akce ----------
const hodnota = id => ($('#' + id) ? $('#' + id).value.trim() : '');
function novy(U, typ, d, o) { const z = { id: uid(), osoba: U.osoba, typ, d: d || dnes(), ...o }; zapis(['zivot', z.id], z); return z; }

export function zmensiFoto(file, maxW, q) {
  return new Promise((ok, chyba) => {
    const rd = new FileReader();
    rd.onerror = chyba;
    rd.onload = () => {
      const im = new Image();
      im.onerror = chyba;
      im.onload = () => {
        const k = Math.min(1, maxW / im.width), cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL('image/jpeg', q));
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}

export function bindZivot(U, ctx) {
  const zq = $('#zq');
  if (zq) zq.addEventListener('input', () => { U.zq = zq.value; $('#osa').innerHTML = osaHTML(st.S, U); ctx.saveUI(); });
  const lf = $('#lfoto');
  if (lf) lf.addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    zmensiFoto(f, 800, 0.6).then(img => { foto = img; ctx.toast('Fotka zprávy je připravená, ulož záznam.'); ctx.render(); }).catch(() => ctx.toast('Fotku se nepodařilo načíst.'));
  });
  document.querySelectorAll('.pusa .zub').forEach(g => g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); } }));
}

// Vrací true, když akci obsloužila Kniha života
export function zivotAkce(a, t, U, ctx) {
  const id = t.dataset.id, S = st.S;
  switch (a) {
    case 'osoba': U.osoba = id; U.zub = ''; U.osNew = false; U.osaVse = false; return true;
    case 'osnew': U.osNew = !U.osNew; return true;
    case 'osadd': {
      const jmeno = hodnota('on'); if (!jmeno) { $('#on').focus(); return 'stop'; }
      const o = { id: uid(), jmeno, narozeni: hodnota('od'), vztah: $('#ov').value };
      zapis(['osoby', o.id], o); U.osoba = o.id; U.osNew = false; return true;
    }
    case 'osdel': zapis(['osoby', id], null); U.osoba = ''; return true;
    case 'ztab': U.ztab = id; return true;
    case 'zfilt': U.zfilt = id; return true;
    case 'osavse': U.osaVse = true; return true;
    case 'chrup': U.chrup = id; U.zub = ''; return true;
    case 'zub': U.zub = id; return true;
    case 'zdel': zapis(['zivot', id], null); return true;
    case 'zadd': {
      if (id === 'obecny') {
        const titul = hodnota('zti'); if (!titul) { $('#zti').focus(); return 'stop'; }
        const typ = $('#zt').value;
        novy(U, typ, hodnota('zd'), { titul, text: hodnota('ztx'), ...(typ === 'etapa' ? { do: hodnota('zdo') } : {}) });
      } else if (id === 'lekar') {
        const prepis = hodnota('lp'), lekar = hodnota('ll'), duvod = hodnota('lu');
        if (!prepis && !foto && !lekar && !duvod) { $('#ll').focus(); return 'stop'; }
        const pristi = hodnota('lk');
        const z = novy(U, 'lekar', hodnota('ld'), { lekar, duvod, titul: duvod || lekar || 'Návštěva lékaře', prepis, pristi, ...(foto ? { img: foto } : {}) });
        if (pristi && $('#lkU').checked) {
          const u = { id: uid(), text: 'Kontrola: ' + (S.osoby[U.osoba] || {}).jmeno + ' – ' + (lekar || duvod || 'lékař'), termin: pristi, hotovo: false, mesic: dnes().slice(0, 7), zivot: z.id };
          zapis(['ukoly', u.id], u);
        }
        foto = null;
        ctx.toast('Uloženo do lékařského archivu.');
      } else if (id === 'ockovani') {
        const latka = hodnota('vl'); if (!latka) { $('#vl').focus(); return 'stop'; }
        novy(U, 'ockovani', hodnota('vd'), { latka, proti: hodnota('vp'), davka: hodnota('vv'), sarze: hodnota('vs'), lekar: hodnota('vk') });
      } else if (id === 'zub') {
        novy(U, 'zub', hodnota('zzd'), { zub: +U.zub, akce: $('#za').value, text: hodnota('zzt') }); U.zub = '';
      } else if (id === 'rust') {
        const v = num(hodnota('rv')), h = num(hodnota('rh'));
        if (!(v > 0) && !(h > 0)) { $('#rv').focus(); return 'stop'; }
        novy(U, 'rust', hodnota('rd'), { ...(v > 0 ? { vyska: v } : {}), ...(h > 0 ? { vaha: h } : {}) });
      }
      return true;
    }
    case 'vysvetli': vysvetli(id, ctx); return 'stop';
    default: return false;
  }
}

// AI vysvětlení zprávy přes vlastní worker (worker/worker.js). Funguje jen přihlášeným.
async function vysvetli(id, ctx) {
  const z = st.S.zivot[id]; if (!z) return;
  if (!AI_WORKER || st.mode !== 'cloud' || !st.token) {
    ctx.toast(st.mode !== 'cloud' ? 'Vysvětlení funguje po přihlášení (až poběží Firebase).' : 'AI vysvětlení ještě není zapnuté (chybí adresa workeru v config.js).');
    return;
  }
  const btn = document.querySelector('[data-act=vysvetli][data-id="' + id + '"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Čtu zprávu…'; }
  try {
    const o = st.S.osoby[z.osoba] || {};
    const r = await fetch(AI_WORKER.replace(/\/$/, '') + '/vysvetli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await st.token() },
      body: JSON.stringify({ img: z.img || '', prepis: z.prepis || '', lekar: z.lekar || '', duvod: z.duvod || '', vek: o.narozeni ? vek(o.narozeni, z.d) : '' }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const v = await r.json();
    if (v.prepis && !z.prepis) zapis(['zivot', id, 'prepis'], String(v.prepis).slice(0, 19000));
    zapis(['zivot', id, 'vysv'], { text: v.text || '', shrnuti: v.shrnuti || '', pojmy: v.pojmy || [], otazky: v.otazky || [], cas: Date.now() });
    ctx.render();
  } catch (err) {
    ctx.toast('Vysvětlení se nepovedlo. Zkus to za chvíli znovu.');
    if (btn) { btn.disabled = false; btn.textContent = 'Vysvětlit srozumitelně (AI)'; }
  }
}
