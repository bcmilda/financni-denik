// Finanční deník · config.js
// Sem vlož konfiguraci webové aplikace z Firebase konzole
// (Nastavení projektu → Obecné → Vaše aplikace → Konfigurace SDK).
// Dokud je apiKey prázdný, appka běží v režimu bez účtu (data jen v prohlížeči).

export const FIREBASE = {
  apiKey: 'AIzaSyClWlC1oZXtZiRDSjw-1zw4Ri_567GBiLo',
  authDomain: 'financni-denik-dd6d3.firebaseapp.com',
  databaseURL: 'https://financni-denik-dd6d3-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'financni-denik-dd6d3',
  appId: '1:690028686362:web:bfdfb7a2c99be445f2f5a3',
};

// Adresa AI workeru pro vysvětlení lékařských zpráv (worker/worker.js), např.
// 'https://financni-denik-ai.<účet>.workers.dev'. Prázdné = tlačítko Vysvětlit jen ukáže, že AI není zapnutá.
export const AI_WORKER = '';

// Veřejná adresa webové verze. Android appka tu otevírá stránku prihlaseni.html pro přihlášení Googlem.
export const WEB_URL = 'https://bcmilda.github.io/financni-denik/';
