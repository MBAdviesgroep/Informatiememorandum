# Credion MB — Financieringsrapport-tool

Zet een Capsearch-memorandum (PDF) om naar een professioneel, bankwaardig
financieringsmemorandum in Credion MB-stijl (Amsterdam & Texel).

## Bestanden
- `index.html` — volledige front-end (upload → loading → A4-rapport + adviseur-controles). Zelfstandig bestand, geen build-stap.
- `api/upload.js` — Vercel Blob client-token, zodat de browser de PDF rechtstreeks naar Blob uploadt (omzeilt de 4,5MB serverless-limiet).
- `api/generate-report.js` — OpenAI-aanroep (Responses API, `gpt-4.1`). Leest de PDF, herschrijft in Credion MB-stijl en levert vaste JSON terug.
- `report-schema.example.json` — voorbeeld van de JSON die `generate-report` teruggeeft; de front-end mapt dit op de rapportvelden.
- `package.json` — dependencies (`openai`, `@vercel/blob`).

## Vercel — environment variables
Voeg toe onder **Project → Settings → Environment Variables**:

| Variabele | Waarde |
|---|---|
| `OPENAI_API_KEY` | je OpenAI API-key |
| `BLOB_READ_WRITE_TOKEN` *(of `BLOB2_READ_WRITE_TOKEN`)* | token van een Vercel Blob store |

Na wijzigen van env-vars altijd opnieuw **Redeploy**.

## Deploy
1. Zet deze map (`index.html` + `api/` + `package.json`) in een GitHub-repo.
2. Koppel de repo in Vercel (framework preset: **Other** — geen build nodig).
3. Zet de environment variables (zie boven) en deploy.

## Datacontract (front-end ↔ API)

**1 — Upload-token ophalen**
```
POST /api/upload
body: { "payload": { "pathname": "memorandum.pdf" } }
→ { "clientToken": "..." }
```
Upload de PDF vervolgens client-side met `@vercel/blob/client` (`upload(...)`) en die `clientToken`. Je krijgt een publieke Blob-`url` terug.

**2 — Rapport genereren**
```
POST /api/generate-report
body: {
  "memorandum_url": "<blob-url van de PDF>",
  "extra_urls": ["<optioneel: jaarrekening/taxatie/offerte/KvK>"],
  "notities": "<optioneel: wensen van de adviseur>"
}
→ { "success": true, "data": "<JSON-string volgens report-schema>" }
```
Parse `data` met `JSON.parse(...)` en vul de rapportvelden. Zie `report-schema.example.json` voor de structuur.

## Belangrijke uitgangspunten
- De agent **verzint geen cijfers**. Ontbrekende data komt terug als
  `"Niet opgenomen in bron"`, `"Nog te controleren"`,
  `"Afstemmen met actuele bankopgave"` of `"Aanvullen door adviseur"`, en
  numerieke velden blijven `0` met een `indicatief`-vlag waar van toepassing.
- De front-end is **leidend voor de opmaak**; de agent levert alleen inhoud.
- De huidige `index.html` toont voorbeelddata (Hogenhout Transport Groep) zodat
  het eindresultaat zichtbaar is. Het laatste stapje is het binden van de
  `generate-report`-JSON aan die velden.
