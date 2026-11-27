// Finanční deník · googleapp.js · v0.7.0
// Přihlášení Googlem v Android appce. Google nepovoluje přihlášení uvnitř WebView, proto:
//  1. appka vytvoří jednorázový klíč (AES-GCM) a otevře v systémovém prohlížeči stránku prihlaseni.html#k=…&n=…
//  2. stránka přihlásí Googlem (Firebase), Google token zašifruje tím klíčem a vrátí ho odkazem
//     financnidenik://prihlaseni?d=…
//  3. appka token rozšifruje a přihlásí se jím (signInWithCredential).
// Klíč jde do prohlížeče jen v části za # (neposílá se na server) a odkaz zpět nese jen šifrovaná data,
// takže cizí appka, která by odkaz zachytila, s ním nic neudělá. Nic se nemění ve Firebase konzoli.

const KLIC = 'fd-google-app';
const PLATNOST = 15 * 60 * 1000; // pokus o přihlášení platí 15 minut

export const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const zB64u = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const importKlic = (raw, pouziti) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [pouziti]);

// Appka: připraví klíč a vrátí adresu přihlašovací stránky
export async function pripravit(webUrl) {
  const raw = crypto.getRandomValues(new Uint8Array(32)), n = b64u(crypto.getRandomValues(new Uint8Array(16)));
  localStorage.setItem(KLIC, JSON.stringify({ k: b64u(raw), n, t: Date.now() }));
  return webUrl.replace(/\/?$/, '/') + 'prihlaseni.html#k=' + b64u(raw) + '&n=' + n;
}

// Přihlašovací stránka: zašifruje token klíčem z adresy
export async function zasifrovat(kB64, n, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKlic(zB64u(kB64), 'encrypt'), new TextEncoder().encode(JSON.stringify({ ...data, n })));
  const out = new Uint8Array(12 + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), 12);
  return 'financnidenik://prihlaseni?d=' + b64u(out);
}

// Appka: rozšifruje odkaz zpět a vrátí { idToken, accessToken }, nebo vyhodí chybu
export async function rozsifrovat(url) {
  const m = String(url).match(/[?&]d=([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('spatny_odkaz');
  let ulozeno = null;
  try { ulozeno = JSON.parse(localStorage.getItem(KLIC) || 'null'); } catch { /* nic */ }
  localStorage.removeItem(KLIC);
  if (!ulozeno || Date.now() - ulozeno.t > PLATNOST) throw new Error('vyprselo');
  const d = zB64u(m[1]);
  const txt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: d.slice(0, 12) }, await importKlic(zB64u(ulozeno.k), 'decrypt'), d.slice(12));
  const v = JSON.parse(new TextDecoder().decode(txt));
  if (v.n !== ulozeno.n || !v.idToken) throw new Error('nesedi');
  return { idToken: v.idToken, accessToken: v.accessToken || null };
}
