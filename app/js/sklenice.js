// Finanční deník · sklenice.js · v0.6.0
// Kreslené cíle: zavařovací sklenice s mincemi a bankovkami, teploměr, cihlová zeď.
// Vrací SVG jako text (bez DOM), velikost řídí viewBox.

import { kc } from './util.js';

const rnd = seed => { let s = seed % 2147483647 || 3; return () => (s = s * 16807 % 2147483647) / 2147483647; };
const hash = t => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const podil = c => (c.cil > 0 ? Math.max(0, Math.min(1, (c.nasporeno || 0) / c.cil)) : 0);

// Sklenice: mince a bankovky se „sypou“ odspodu podle našetřeného podílu
export function sklenice(c) {
  const p = podil(c), r = rnd(hash(c.id)), W = 160, H = 200, x0 = 30, x1 = 130, y0 = 52, y1 = 186;
  const hladina = y1 - (y1 - y0 - 8) * p;
  let mince = '';
  const radku = Math.ceil((y1 - hladina) / 11);
  for (let i = 0; i < radku; i++) {
    const y = y1 - 8 - i * 11;
    for (let x = x0 + 10; x < x1 - 8; x += 15 + r() * 4) {
      if (y < hladina + 4) break;
      if (r() < 0.18) {
        mince += '<rect x="' + (x - 9).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" width="20" height="10" rx="1.5" transform="rotate(' + ((r() - 0.5) * 40).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="#8fc49a" stroke="#3e7d48" stroke-width="1"/>';
      } else {
        const rr = 6 + r() * 1.8;
        mince += '<ellipse cx="' + (x + (r() - 0.5) * 4).toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + rr.toFixed(1) + '" ry="' + (rr * 0.62).toFixed(1) + '" fill="' + (r() < 0.5 ? '#f2c14e' : '#e0a92e') + '" stroke="#9a6a12" stroke-width="1"/>';
      }
    }
  }
  const novy = c.novy ? '<g class="padajici"><ellipse cx="80" cy="' + (hladina - 6) + '" rx="7" ry="4.4" fill="#f2c14e" stroke="#9a6a12"/></g>' : '';
  return '<svg class="sklenice" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sklenice naplněná z ' + Math.round(p * 100) + ' %">' +
    '<defs><clipPath id="sk-' + c.id + '"><path d="M' + x0 + ' ' + y0 + 'Q' + (x0 - 6) + ' 120 ' + x0 + ' ' + (y1 - 6) + 'Q80 ' + (y1 + 6) + ' ' + x1 + ' ' + (y1 - 6) + 'Q' + (x1 + 6) + ' 120 ' + x1 + ' ' + y0 + 'Z"/></clipPath></defs>' +
    '<g clip-path="url(#sk-' + c.id + ')">' + mince + novy + '</g>' +
    '<path d="M' + x0 + ' ' + y0 + 'Q' + (x0 - 6) + ' 120 ' + x0 + ' ' + (y1 - 6) + 'Q80 ' + (y1 + 6) + ' ' + x1 + ' ' + (y1 - 6) + 'Q' + (x1 + 6) + ' 120 ' + x1 + ' ' + y0 + '" fill="rgba(200,230,240,.18)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M' + (x0 + 8) + ' 70 Q' + (x0 + 2) + ' 120 ' + (x0 + 8) + ' 168" stroke="#fff" stroke-opacity=".55" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<rect x="' + (x0 - 2) + '" y="30" width="' + (x1 - x0 + 4) + '" height="22" rx="4" fill="#c9a227" stroke="#8a6a12" stroke-width="1.5"/>' +
    '<path d="M' + (x0 + 4) + ' 36h' + (x1 - x0 - 8) + 'M' + (x0 + 4) + ' 42h' + (x1 - x0 - 8) + 'M' + (x0 + 4) + ' 48h' + (x1 - x0 - 8) + '" stroke="#8a6a12" stroke-opacity=".5"/>' +
    '<rect x="44" y="96" width="72" height="34" rx="3" fill="#fffbe9" stroke="#b9ae8f" transform="rotate(-3 80 113)"/>' +
    '<text x="80" y="118" text-anchor="middle" class="sk-pct" transform="rotate(-3 80 113)">' + Math.round(p * 100) + ' %</text></svg>';
}

// Teploměr: rtuť stoupá od baňky, stupnice v korunách
export function teplomer(c) {
  const p = podil(c), H = 200, top = 18, bot = 160, y = bot - (bot - top) * p;
  let stupnice = '';
  [0, 0.25, 0.5, 0.75, 1].forEach(q => {
    const yy = bot - (bot - top) * q;
    stupnice += '<line x1="92" x2="102" y1="' + yy + '" y2="' + yy + '" stroke="currentColor" stroke-width="1.5"/><text x="106" y="' + (yy + 4) + '" class="sk-s">' + kc(c.cil * q).replace(/ Kč$/, '') + '</text>';
  });
  return '<svg class="teplomer" viewBox="0 0 180 ' + H + '" role="img" aria-label="Teploměr na ' + Math.round(p * 100) + ' %">' +
    '<rect x="66" y="' + (top - 8) + '" width="22" height="' + (bot - top + 22) + '" rx="11" fill="rgba(255,255,255,.5)" stroke="currentColor" stroke-width="2"/>' +
    '<rect x="71" y="' + y + '" width="12" height="' + (bot - y + 14) + '" rx="6" fill="#d1495b"/>' +
    '<circle cx="77" cy="' + (bot + 18) + '" r="17" fill="#d1495b" stroke="currentColor" stroke-width="2"/><circle cx="72" cy="' + (bot + 13) + '" r="5" fill="#fff" fill-opacity=".5"/>' +
    stupnice + '<text x="20" y="' + (y + 5) + '" class="sk-pct">' + Math.round(p * 100) + ' %</text></svg>';
}

// Cihlová zeď: každá cihla = stejná částka, našetřené cihly vybarvené zvýrazňovačem
export function zed(c) {
  const N = 40, cihla = c.cil / N, plne = Math.floor((c.nasporeno || 0) / cihla + 1e-9), rad = 8, vRade = 5, w = 30, h = 14;
  let s = '';
  for (let i = 0; i < N; i++) {
    const rr = Math.floor(i / vRade), k = i % vRade, x = 6 + k * w + (rr % 2 ? w / 2 : 0), yy = 6 + (rad - 1 - rr) * (h + 2);
    s += '<rect x="' + x + '" y="' + yy + '" width="' + (w - 2) + '" height="' + h + '" rx="2" class="' + (i < plne ? 'cihla plna' : 'cihla') + '"/>';
  }
  return '<svg class="zed" viewBox="0 0 172 ' + (rad * (h + 2) + 10) + '" role="img" aria-label="Zeď: ' + plne + ' z ' + N + ' cihel">' + s + '</svg>' +
    '<p class="sk-pozn">1 cihla = ' + kc(cihla) + ' · ' + plne + ' z ' + N + ' cihel</p>';
}

export const VZHLEDY_CILE = [['sklenice', 'Sklenice'], ['teplomer', 'Teploměr'], ['zed', 'Cihlová zeď']];
export const kresliCil = c => ({ sklenice, teplomer, zed }[c.vzhled] || sklenice)(c);
