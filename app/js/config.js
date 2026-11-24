// Finanční deník · config.js
// Sem vlož konfiguraci webové aplikace z Firebase konzole
// (Nastavení projektu → Obecné → Vaše aplikace → Konfigurace SDK).
// Dokud je apiKey prázdný, appka běží v režimu bez účtu (data jen v prohlížeči).

export const FIREBASE = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  appId: '',
};

// Adresa AI workeru pro vysvětlení lékařských zpráv (worker/worker.js), např.
// 'https://financni-denik-ai.<účet>.workers.dev'. Prázdné = tlačítko Vysvětlit jen ukáže, že AI není zapnutá.
export const AI_WORKER = '';
