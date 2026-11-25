// Finanční deník · hlas.js · v0.6.0
// Diktování: v Android appce přes nativní rozpoznávání řeči (plugin Diktat v android/),
// v prohlížeči přes Web Speech API. Vrací Promise s rozpoznaným textem.

const nativni = () => {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
  return C.Plugins && C.Plugins.Diktat ? C.Plugins.Diktat : (C.registerPlugin ? C.registerPlugin('Diktat') : null);
};
const WebSR = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export const hlasDostupny = () => !!(nativni() || WebSR());

let rec = null;
export function diktuj(prompt) {
  const N = nativni();
  if (N) return N.start({ prompt: prompt || 'Řekni, co zapsat' }).then(r => (r && r.text) || '');
  const SR = WebSR();
  if (!SR) return Promise.reject(new Error('nedostupne'));
  if (rec) { rec.stop(); return Promise.reject(new Error('zastaveno')); }
  return new Promise((ok, chyba) => {
    rec = new SR();
    rec.lang = 'cs-CZ'; rec.interimResults = false; rec.maxAlternatives = 1;
    let hotovo = false;
    rec.onresult = ev => { hotovo = true; ok(ev.results[0][0].transcript); };
    rec.onerror = ev => { hotovo = true; chyba(new Error(ev.error === 'not-allowed' ? 'mikrofon' : 'chyba')); };
    rec.onend = () => { rec = null; if (!hotovo) chyba(new Error('ticho')); };
    try { rec.start(); } catch (err) { rec = null; chyba(err); }
  });
}
export const hlasChyba = e => ({ mikrofon: 'Mikrofon není povolený.', ticho: 'Nic jsem neslyšel, zkus to znovu.', zruseno: 'Diktování zrušeno.', zastaveno: '' }[e && e.message] ?? 'Diktování se nepovedlo, zkus to znovu.');
