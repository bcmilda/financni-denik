# Finanční deník

Zápisník na peníze, který se počítá sám. Samostatná appka vycházející z Deníku ve FinanceFlow.
Verze **0.1.0** (21. 11. 2026).

## Co umí v0.1

- Kniha se 6 vzhledy, 6 písmy, 6 inkousty a 4 papíry, listování stránkami.
- **Den:** zápisek se zvýrazňovačem (5 barev) a diktováním, zápis výdaje nebo příjmu jedním řádkem
  („káva 65 #práce“, „Tankování 20 l za 750 Kč, nájezd 83 087 km“), kategorie, peněženka, tagy,
  vlepená účtenka z fotky, kolik zbývá do konce měsíce.
- **Měsíc:** predikce „zapsaná perem“ proti skutečnosti, graf den po dni, kategorie, 5 největších výdajů.
- **Tankování:** auta i motorky, klouzavá spotřeba, Kč/km, kontrola tachometru, vozidlo se vybere podle km.
- **Úkolníček:** termíny, nesplněné úkoly se přenášejí do dalšího měsíce.
- **Kategorie:** výchozí + vlastní, barvy, tagy se součty, peněženky se zůstatkem.
- **Hledat:** napříč zápisy, zápisky, účtenkami a úkoly, bez diakritiky.
- Přihlášení Googlem nebo e-mailem, synchronizace mezi zařízeními, offline, instalace do telefonu (PWA).
- Zkušební měsíc zdarma (platby přijdou ve verzi 0.5).

Bez vyplněné Firebase konfigurace běží appka v **režimu bez účtu** s ukázkovými daty (vše v prohlížeči).

## Spuštění na počítači

```
cd app
python3 -m http.server 8000
```
Pak otevři http://localhost:8000. (Přímo z disku přes file:// moduly nefungují.)

## Testy

```
node tests/logic.test.mjs
node tests/store.test.mjs
```

## Zprovoznění Firebase (jednou, dělá Milan)

1. **Firebase konzole → Přidat projekt**, název např. `financni-denik`. Google Analytics není potřeba.
2. **Authentication → Začít →** zapnout **Google** a **E-mail/heslo**.
3. **Realtime Database → Vytvořit databázi →** umístění **europe-west1**, start v **zamčeném režimu**.
4. **Nastavení projektu → Obecné → Přidat aplikaci → Web (</>)**, název „Finanční deník“, hosting zaškrtnout.
   Zkopírovanou konfiguraci vlož do `app/js/config.js` (apiKey, authDomain, databaseURL, projectId, appId).
5. V terminálu ve složce projektu:
   ```
   npm install -g firebase-tools
   firebase login
   firebase use --add          (vyber nový projekt)
   firebase deploy --only database
   firebase deploy --only hosting
   ```
6. Appka poběží zdarma na `https://<projekt>.web.app`.
7. **Authentication → Nastavení → Autorizované domény:** `<projekt>.web.app` tam už je; pro vlastní doménu později přidat.

Pořadí nasazení: **nejdřív pravidla databáze, potom hosting.**

## Struktura

```
app/                 vše, co jde na hosting
  index.html         kostra stránky
  css/app.css        vzhledy (skiny), papír, kniha, formuláře
  js/app.js          start, přihlášení, vykreslení, akce
  js/views.js        stránky (Den, Měsíc, Tankování, Úkolníček, Kategorie, Hledat)
  js/logic.js        čistá logika: rozpoznání zápisu, spotřeba, zůstatky, hledání
  js/charts.js       grafy „kreslené perem“
  js/store.js        úložiště: lokálně / Firebase po položkách
  js/cloud.js        Firebase Auth + Realtime Database
  js/data.js         vzhledy, výchozí kategorie, ukázkový měsíc
  js/config.js       Firebase konfigurace (prázdná = režim bez účtu)
  sw.js              offline mezipaměť
database.rules.json  pravidla databáze
firebase.json        hosting + pravidla
tests/               testy v Node
```
