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

Steg 1–8 av 9 i byggordningen är klara: schemaläggningsmotorn med tester, alla
fyra flikar, lagringen, första besökets frågor, veckovyns signaturinteraktion,
och genomgången av tomma tillstånd, mörkt läge och tillgänglighet. Allt sparas i localStorage
under en enda nyckel och kan exporteras och importeras som JSON.

Veckovyns signaturinteraktion finns: dra på en dag för att markera upptagen
tid och se träningsblocket flytta sig medan fingret rör sig. Draget matas
genom samma motor som allt annat, så blocket som rör sig är ett riktigt
resultat — inte en animation som låtsas. Ingenting skrivs förrän man släpper,
och samma sak går att göra utan drag genom att trycka på dagen.

Appen ligger live på https://alfonswillstedt-design.github.io/training-2.0/
och deployas automatiskt vid varje push. Testerna är en grind i bygget: går de
inte igenom deployas ingenting.

Kvar: PWA — service worker, manifest och ikoner.

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
src/storage/       localStorage, schemaVersion och migreringar, export/import
src/strings/       allt synligt språk på ett ställe
src/design/        typskala, färger, tidsformatering, skal och kontroller
src/features/      en mapp per flik
tests/             testerna, skrivna före koden de täcker
```

## Designspråk

Mobilen först, 390 px som mått. Ett typsnitt — Instrument Sans, självhostat, så
appen fungerar i flygplansläge — där vikt och storlek är enda kontrastmedel.
Exakt två hörnradier. Mörkt läge följer systemet och är ingen inställning.
Klockslag sätts med tabulära siffror så de inte hoppar när de uppdateras.

Färgerna är mätta, inte gissade. All text når 4,5:1 mot sin bakgrund i både
ljust och mörkt läge, och varje träffyta är minst 44 px. Accentfärgen finns i
två toner: en ljusare som fyllning och en mörkare som text, eftersom samma ton
inte klarar båda kraven mot ett ljust papper.

## Data

Allt ligger under en enda localStorage-nyckel med ett `schemaVersion`-fält, och
migreringsmaskineriet finns från dag ett — sparad data ska kunna lyftas till en
ny version i stället för att raderas. Data som inte går att läsa läggs i
karantän under en egen nyckel i stället för att skrivas över. Export och import
som JSON är hela backup-lösningen, och vägen in i en framtida native-app.

## Riktning efter demon

Appen finns i två nivåer. **Schemaläggningen i appen** är den ena, och den är
en färdig produkt i sig — inte en trappa upp till något annat. **Kalendern är
en uppgradering man köper**: appen lever då i användarens Google-kalender och
räknar om aktivt efter vad som händer i livet.

Att det är två nivåer och inte två steg får en konsekvens som styr all kod
härifrån: kalendern måste läggas ovanpå utan att ändra kärnan. Den som aldrig
betalar ska inte märka att integrationen finns, och motorn ska inte veta att
det finns en kalender.

Vid varje ändring läser den betalda versionen kalendern och skriver tillbaka —
men det enda den någonsin får ändra där är var träningspasset ligger. Allt
annat i kalendern är läsdata.

Tre beslut som hör dit:

- **Mattid per händelse.** En kalenderhändelse bär inte informationen om man
  måste hinna äta efter den. Appen frågar en gång när ett nytt återkommande
  block dyker upp, och minns svaret.
- **Notiser när ett pass flyttas.** Bara då, aldrig annars. Det river upp
  v1-regeln om noll notiser och noll behörigheter — men utan dem skulle
  schemat ändras bakom ryggen på användaren, och det väger tyngre.
- **Backend blir nödvändig.** Att synka när appen är stängd, hålla OAuth-tokens
  vid liv och skicka push går inte från en statisk sida utan nätverksanrop.
  Beslutet "ingen backend, inga konton" gäller demon, inte kalenderversionen.

Datamodellen klarar redan kalenderhändelser utan ändring: ett åtagande utan
fasta veckodagar men med undantag för enskilda datum är precis vad en
kalenderhändelse är. Motorn tar emot upptagen tid, inte kalendrar — därför
byter den källa utan att räkna om något annat.

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
