# Credion MB — Luxe Financieringsmemorandum-tool

Zet een Capsearch-/financieringsmemorandum of saneringsdossier om naar een hoogwaardig, printklaar Credion MB-financieringsrapport.

## Wat is aangepast in deze superior-versie

- `index.html` is volledig vervangen door een luxe rapportomgeving in de stijl van de ESG-tool.
- Uploadscherm, trustbar, loading flow, A4-rapportpagina's, blauwe topbalken en oranje accentlijnen zijn in Credion-stijl opgezet.
- Het rapport bevat nu luxe visualisaties: rapportscore, radar, financieringsmix, zekerhedenmix, balansgrafieken, documentatiestatus en risicomatrix.
- De frontend rendert API-data; er staat geen demo-rapport meer hardcoded in de rapportweergave.
- `api/generate-report.js` gebruikt nu een uitgebreid strict JSON-schema met memorandum, inhoudsopgave, balansanalyse, memo-/buitenbalansposten, visualisatie-data en agent-controles.
- `report-schema.example.json` bevat alleen een lege/schone structuur zonder voorbeeldcijfers.

## Bestanden

- `index.html` — volledige front-end: upload → loading → luxe A4-rapport → print/export.
- `api/upload.js` — Vercel Blob client-token voor rechtstreekse browser-upload.
- `api/generate-report.js` — OpenAI Responses API met strict `json_schema`.
- `report-schema.example.json` — schoon voorbeeldschema zonder casusdata.
- `package.json` — dependencies (`openai`, `@vercel/blob`).

## Vercel environment variables

| Variabele | Waarde |
|---|---|
| `OPENAI_API_KEY` | je OpenAI API-key |
| `BLOB_READ_WRITE_TOKEN` of `BLOB2_READ_WRITE_TOKEN` | token van een Vercel Blob store |

Na wijzigen van env-vars altijd opnieuw redeployen.

## Datacontract

### Rapport genereren

```json
POST /api/generate-report
{
  "memorandum_url": "<blob-url van de hoofd-PDF>",
  "extra_urls": ["<optionele extra PDF's>"],
  "notities": "<optionele adviseursnotities>"
}
```

Response:

```json
{
  "success": true,
  "data": { "rapport_meta": {}, "memorandum": {}, "visualisatie_data": {} }
}
```

De frontend kan ook oude responses verwerken waarin `data` nog een JSON-string is.

## Belangrijk

De prompt en het schema verbieden voorbeelddata. Als informatie ontbreekt, moet de agent dat markeren met bijvoorbeeld `Niet opgenomen in bron`, `Nog te controleren`, `Aanvullen door adviseur` of `Afstemmen met actuele opgave`. Numerieke velden blijven 0 als het bedrag niet betrouwbaar uit brondata komt.


## Fix: Vercel Blob client token

Deze versie gebruikt `handleUpload` in `api/upload.js`. Dat is de officiële flow voor browseruploads met `@vercel/blob/client`.

Controleer in Vercel:

1. Storage > Blob > connect deze store aan hetzelfde project.
2. Environment Variables bevat `BLOB_READ_WRITE_TOKEN` voor Production en Preview.
3. Redeploy het project nadat de environment variable is toegevoegd.

Zonder deze token stopt de upload bij: `Vercel Blob: Failed to retrieve the client token`.
