# Romvakt

Intern tjeneste for booking av møterom og prosjektrom på alle kontorene.

## Kjøre lokalt

    npm install
    npm run dev

API-et kjører på port 3100. Se `src/routes/` for endepunktene.

## Jobber

Nattlige jobber settes opp i `config/default.js` under `jobber`. Handleren
oppgis som `"fil.funksjon"` relativt til `src/jobber/`, og lastes ved oppstart.

## Plugins

Integrasjoner (Teams osv.) slås på i `config/default.js` under `plugins`.
De lastes dynamisk fra `src/plugins/`.

## Eksport til lønn

`formaterBookingForLonn` i `bookingService.js` brukes av lønnsintegrasjonen
(eget repo, `lonn-integrasjon`). Ikke endre signaturen uten å snakke med dem.
