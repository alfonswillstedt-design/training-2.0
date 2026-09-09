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

Steg 1 av 9 i byggordningen är klar: datamodeller och schemaläggningsmotorn,
med tester. Inget UI ännu.

## Kommandon

```bash
npm install
npm test          # kör testsviten
npm run typecheck
```

## Struktur

```
src/scheduling/    planWeek + typer — noll React-beroenden, avsedd att kunna
                   flyttas rakt över till en native-app
tests/scheduling/  testerna, skrivna före motorn
```

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
