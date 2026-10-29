# Scenario: Romvakt skal ryddes før Node-oppgraderingen

> Fiktivt scenario basert på `hjemsokt-repo/`. Tallene fra agentkjøringene er målt i prosjektet. Tidsbesparelsen er et anslag, ikke en måling.

## Situasjonen

Jonas Benknuser har arvet **Romvakt**, den interne tjenesten for rombooking. De som skrev den er borte: Mona sluttet i 2021, Petter gikk til et annet team i 2022. Koden har ikke noe eier som kjenner den.

Nå har teamet to krav:

1. **Sikkerhetsgjennomgangen** flagger `request` (offisielt avviklet) og ber om færre avhengigheter.
2. **Oppgraderingen** til ny Node-versjon og bytte av minnelagring til Postgres skal planlegges neste sprint.

Jonas vil rydde bort død kode først, så oppgraderingen blir mindre. Men han tør ikke slette noe han ikke forstår.

## Risikoen ved å gjøre det for hånd

Repoet har ting som ser døde ut, men ikke er det:

| Ser dødt ut | Hvorfor det ikke er det | Hva som skjer om det slettes |
|---|---|---|
| `formaterBookingForLonn` | Brukes av `lonn-integrasjon`, et annet repo | Fakturering av prosjektrom slutter å virke. Ingen test her slår alarm |
| `ryddGamleBookinger` | Kalles ikke i kode, bare via strengen `rydding.ryddGamleBookinger` i config | Gamle bookinger ryddes aldri mer |
| `plugins/teams.js` | Lastes med dynamisk `import()` fra config | Teams-varsler forsvinner stille |
| `rimraf`, `nodemon` | Brukes bare i npm-scripts | `npm run clean` og `npm run dev` slutter å virke |

Et vanlig tekstsøk eller en «ubrukt import»-sjekk finner ingen av disse bindingene. Å sjekke alt for hånd tar timer, og ingen i teamet kan svare på det som er historisk.

## Hvordan Jonas bruker Kodekirkegården

**1. Sveip av hele repoet.** Jonas kjører agenten og ber den skrive en nekrolog for hvert funn den er trygg på:

```bash
npm start -- --rapport "Gå gjennom hele hjemsokt-repo og skriv en nekrolog for hvert funn du er trygg på."
```

I prosjektets evalueringskjøring brukte et slikt sveip 37 verktøykall (hele evalueringen med tre oppgaver tok 1 minutt og 12 sekunder). Agenten så på filene, pakkene, config, tester og git-historikken, og skrev `nekrologer.md`.

**2. Rapporten.** Hvert funn har en dom, bevis og usikkerhet:

- **Trygt å begrave:** `lodash` og `request` (bare i utkommentert kode), `sinon` (ubrukt), utkommentert v1-ruting, utkommentert `formaterDatoGammel`, `sendSms`, og `HELLIGDAGER_2021`.
- **Usikkert, må avklares:** `legacyCsv.js` (TODO-en sier «slett når økonomi bekrefter», og ingen bekreftelse finnes), `nyKalender` (flagget er av, men ruten er koblet inn) og `eksternRabatt`.
- **Skal IKKE fjernes:** `formaterBookingForLonn`, `ryddGamleBookinger` og `teams`, hver med begrunnelsen over.

**3. Kontrollspørsmål.** Før Jonas rører lønnsfunksjonen, spør han direkte:

```bash
npm start -- "Er formaterBookingForLonn trygg å fjerne?"
```

Agenten svarer **Behold**, siterer README og kodekommentaren, og sier at «0 referanser her betyr ikke at funksjonen er død».

**4. Menneskene i løkka.** Agenten sletter ingenting. Jonas gjør det som er trygt, og tar resten videre:

| Handling | Hvem |
|---|---|
| Fjerne `lodash`, `request`, `sinon` og utkommentert kode | Jonas, i en egen PR |
| Spørre økonomi om `legacyCsv.js` kan slettes. `moment` kan fjernes samtidig | Jonas → økonomi |
| Avklare `nyKalender` og `eksternRabatt` | Jonas → produkteier |
| Beholde lønnsfunksjonen og dokumentere den bedre | Jonas, evt. avtale med `lonn-integrasjon`-teamet |

## Resultat

- Tre avhengigheter fjernet, deriblant en avviklet pakke som sikkerhetsgjennomgangen pekte på.
- Et konkret spørsmål til økonomi i stedet for en gjetning.
- Ingen av fellene slettet.
- Hver beslutning har en skriftlig begrunnelse som kan limes inn i PR-en.

## Hva dette ikke er

- **Ikke en erstatning for gjennomgang.** Agenten sier selv hva den ikke har sjekket, f.eks. andre repoer og drift. Et menneske må godkjenne hver sletting.
- **Ikke en garanti.** I prosjektets evaluering besto agenten alle tre oppgavene, men poengsettingen sjekker bare hva som er nevnt, og agenten er ikke deterministisk. Les rapporten før du handler på den.
- **Ikke juridisk eller regnskapsmessig vurdering.** Spørsmål som «trenger økonomi CSV-eksporten?» må avklares med riktig avdeling.

## Bruk i demoen

| Steg | Kommando | Det publikum ser |
|---|---|---|
| 1 | `npm run demo` (oppgave 1) | Agenten graver, viser verktøykallene, og skriver nekrologen for `legacyCsv.js` |
| 2 | `npm run demo` (oppgave 2) | Agenten sier nei til å fjerne `formaterBookingForLonn`, og forklarer hvorfor |
| Reserve | `npm run demo -- --opptak` | Samme demo, avspilt fra opptak uten nett |

Poenget å få frem: verdien er ikke at agenten finner død kode, men at den **vet når den ikke skal anbefale å slette**.

## Andre steder samme mønster passer

- Overtakelse av et system etter at teamet er byttet ut.
- Opprydding før en migrering (språkversjon, rammeverk, database).
- Revisjon av avhengigheter før en sikkerhetsgjennomgang.
- Kodebaser med mange feature-flagg som ingen tør å skru av.
