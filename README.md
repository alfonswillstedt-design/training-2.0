# Träningsschemaläggare

En webbapp som räknar ut **när** du kan träna, utifrån de tider i veckan du
inte rår över.

I alla andra appar skriver du in vilka dagar du tränar. Här matar du in ditt
liv — skola, jobb, pendling — och appen svarar med när träningen får plats.
Träningsdagarna är alltid ett resultat, aldrig en inmatning.

Appen planerar när, inte vad. Inget övningsbibliotek, ingen set- och
rep-loggning, ingen progressionsalgoritm. Den ska gå att köra bredvid Hevy
eller Strong, inte ersätta dem.

## Läge

Steg 1–2 av 9 i byggordningen är klara: schemaläggningsmotorn med tester, och
flik 1 — Nästa pass — mot hårdkodad testdata. Ingen lagring, inga flikar än.

I dev-bygget ligger en scenarioväljare under vyn som visar varje tillstånd:
skoldag, efter jobbet, vilodag, PWO före passet, dag som inte går ihop, och de
två tomma tillstånden.

## Kommandon

```bash
npm install
npm run dev       # startar på /training-2.0/
npm test          # kör testsviten
npm run build     # typkontroll + produktionsbygge
```

## Struktur

```
src/scheduling/    planWeek + typer — noll React-beroenden, avsedd att kunna
                   flyttas rakt över till en native-app
src/design/        typskala, färger, tidsformatering
src/strings/       allt synligt språk på ett ställe
src/features/      en mapp per flik
tests/             testerna, skrivna före koden de täcker
```

## Designspråk

Mobilen först, 390 px som mått. Ett typsnitt — Instrument Sans, självhostat, så
appen fungerar i flygplansläge — där vikt och storlek är enda kontrastmedel.
Exakt två hörnradier. Mörkt läge följer systemet och är ingen inställning.
Klockslag sätts med tabulära siffror så de inte hoppar när de uppdateras.

### Motorn

`planWeek(input) → PlannedDay[]` är ren och deterministisk. Samma indata ger
alltid samma utdata — ingen AI, inga heuristiker som ändrar sig.

All tid räknas i minuter från midnatt, aldrig i `Date`-objekt. Den enda
punkten där ett `Date` läses är veckans startdatum, och klockslaget kastas
bort direkt. Datumaritmetiken görs i UTC, så sommartid inte kan förstöra en
uträkning.

Ett pass flyttas aldrig tyst. Går det inte att placera bär dagen med sig
varför, i strukturerad form med riktiga siffror, som UI:t formulerar om till
en mening. Motorn kortar aldrig ett pass, slår aldrig ihop två och hittar
aldrig på en tid som inte fungerar.
