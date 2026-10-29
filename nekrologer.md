## Nekrolog: src/utils/legacyCsv.js
- **Dom:** Trygt
- **Hva det var:** CSV-eksport (`eksporterCsv`) og CSV-innlesing (`lesCsv`) av bookinger til økonomi. Filen er merket som erstattet av lønnsintegrasjonen, og en TODO ber om at den slettes.
- **Sist rørt:** 2021-02-15 av Mona Mumiehaug, for 5 år siden. Mona sluttet i 2021.
- **Bevis:**
  - `finn_referanser("legacyCsv")` ga 0 referanser.
  - Et regex-søk etter `eksporterCsv|lesCsv|legacy|csv` traff bare filen selv.
  - `config/default.js` har ingen streng som peker hit. Jobbene bruker bare `rydding.ryddGamleBookinger`, og pluginene bare `teams`.
  - `package.json` har ingen npm-script som peker hit.
  - README nevner ikke filen. Den nevner bare `formaterBookingForLonn` i `bookingService.js`, og det er en annen funksjon som er i bruk.
  - Den siste commit-meldingen er «Merk CSV-eksport som utgående». TODO-en fra 2021-02-15 sier «slett når økonomi bekrefter at de ikke trenger denne».
  - Sletting gjør også `moment` ubrukt, siden `legacyCsv.js` er den eneste som bruker den. Da kan `moment` fjernes fra `package.json`.
- **Usikkerhet:**
  - Jeg har ikke kunnet bekrefte at økonomi faktisk har sagt at de ikke trenger den. TODO-en er aldri avkreftet eller bekreftet i det jeg har sett.
  - Andre repoer kan i teorien kjøre filen direkte (`require` med sti eller en manuell kjøring). Jeg har bare sett README, som nevner `lonn-integrasjon` for en annen funksjon.
  - Jeg har ikke kunnet sjekke manuelle kjøringer utenfor repoet.

## Andre funn (lavere tillit)
- **Ubrukte pakker:**
  - `lodash`: bare i en utkommentert linje i `bookingService.js:4`.
  - `request`: bare i utkommentert SMS-kode i `varsling.js:19-22`. Lagt til i 2021 av Mona «for SMS-varsling».
  - `sinon`: ingen treff noe sted.
  - Alle tre er trygge å fjerne fra `package.json`.
- **Feature-flagg som aldri endres:**
  - `nyKalender: false`. Pilot i 2021 som aldri ble skrudd på. `src/kalender/nyKalender.js` importeres fortsatt i `rom.js` og er derfor ikke strengt dødt, men grenen kjøres aldri.
  - `venteliste` og `eksternRabatt` står som `false`. Jeg har ikke undersøkt hvor de brukes.
- **Utkommentert kode:** `bookingService.js` og `varsling.js`, som nevnt over.
- **Ikke undersøkt:** testfilene (skippede tester), `dato.js`, `auth.js` og resten av `bookingService.js`.

## Skal IKKE fjernes
- **`formaterBookingForLonn` i `bookingService.js`:** README sier at den brukes av `lonn-integrasjon`, et eget repo. Den har trolig ingen kallere her, men er i bruk utenfra.
- **`src/jobber/rydding.js` (`ryddGamleBookinger`):** peker fra `config/default.js` som `"rydding.ryddGamleBookinger"`, og lastes ved oppstart.
- **`src/plugins/teams.js`:** lastes dynamisk via `plugins: ['teams']` i config.
- **`brukLdap: true`:** flagget er på og i bruk, ikke dødt.
- **`nyKalender.js`:** importeres i `rom.js`. Flagget er av, men filen kan ikke fjernes uten å endre ruten.
- **`dayjs`, `node-cron`, `uuid`, `nodemailer`, `express`, `supertest`:** alle brukes i uutkommentert kode.
- **`eslint`, `jest`, `nodemon`, `rimraf`:** brukes via npm-scripts (`lint`, `test`, `dev`, `clean`).
- **`eslint-config-standard`:** brukes i `.eslintrc.json`.
