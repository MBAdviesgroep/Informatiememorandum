import OpenAI from 'openai';

/* ════════════════════════════════════════════════════════════════════
   Credion MB — Financieringsrapport-tool  ·  /api/generate-report
   ────────────────────────────────────────────────────────────────────
   De frontend rendert een vast A4-stramien (cover + 9 hoofdstukken).
   De agent leest het Capsearch-memorandum (PDF) uit en levert UITSLUITEND
   geldige JSON volgens het onderstaande schema. De frontend verzorgt de
   opmaak; de agent verzint NOOIT cijfers die niet in de bron staan.
   ════════════════════════════════════════════════════════════════════ */

const SYSTEM_BASE = `Je bent een senior financieringsadviseur bij Credion MB Amsterdam & Texel. Je zet een aangeleverd Capsearch-memorandum (PDF) om naar een professioneel, bankwaardig financieringsmemorandum voor banken en leasepartijen. Je antwoordt UITSLUITEND met geldige JSON (geen markdown, geen uitleg eromheen).`;

const SCHEMA = `

═══════════════════════════════════════════════════════════════
RAPPORTOPBOUW (de frontend toont cover + deze 9 hoofdstukken)
═══════════════════════════════════════════════════════════════
1. Managementsamenvatting        2. Aanvrager & juridische structuur
3. Activiteiten onderneming      4. Financieringsbehoefte
5. Bestaande financieringen      6. Nieuwe financiering
7. Zekerheden                    8. Documentatie
9. Bijlagen

KERNREGELS
- Volg de INHOUD en structuur van het Capsearch-memorandum, maar scherp de teksten zakelijk aan in Credion MB-stijl: helder, professioneel, financieringsgericht, korte alinea's, geen marketingtaal, geen wollige zinnen. Geschikt voor banken en leasepartijen.
- VERZIN NOOIT cijfers, namen, bedragen of voorwaarden. Neem getallen exact over uit de bron. Ontbreekt informatie, gebruik dan letterlijk een van deze markeringen als tekstwaarde: "Niet opgenomen in bron", "Nog te controleren", "Afstemmen met actuele bankopgave" of "Aanvullen door adviseur". Laat numerieke velden op 0 staan als het bedrag niet in de bron staat, en zet de bijbehorende *_indicatief-vlag correct.
- Markeer bedragen die in de bron indicatief zijn (bijv. bestaande restschuld) met de vlag indicatief:true en benoem in aandachtspunten dat een actuele bankopgave nodig is.
- Bereken de indicatieve maandlast van een lease/lineaire financiering alleen als hoofdsom, looptijd en rekenrente bekend zijn (annuïteit, excl. slottermijn/kosten); rond af op hele euro's en zet maandlast_indicatief. Kan het niet betrouwbaar, laat 0.
- Herschrijfvoorbeeld (stijl): bron "De totale financieringsbehoefte bedraagt € 75.400 t.b.v. bedrijfsmiddelen." → "De financieringsaanvraag ziet op een investering van € 75.400 in bedrijfsmiddelen, bestaande uit een nieuwe afvulinstallatie en laadinfrastructuur, waarmee de operationele capaciteit wordt vergroot en het wagenpark verder verduurzaamt."
- Vul agent_controles eerlijk: tel wat je daadwerkelijk in de bron vond en benoem echte inconsistenties, ontbrekende stukken en adviseur-checks.

LEVER PRECIES DIT JSON-OBJECT (getallen zonder valutateken; percentages als getal):
{
  "klant": "", "datum_rapport": "",

  "samenvatting": {
    "kredietnemer": "", "financieringsdoel": "", "totale_behoefte": 0,
    "financieringsvorm": "", "looptijd_mnd": 0, "belangrijkste_zekerheden": "",
    "conclusie": "", "status": "Concept · ter beoordeling"
  },

  "structuur": {
    "betrokken_partijen": [ {"partij":"", "rol":"", "rechtsvorm":""} ],
    "organogram": [ {"niveau":1, "naam":"", "toelichting":""} ],
    "tekenbevoegd": [ {"naam":"", "bevoegdheid":""} ],
    "aandachtspunten": [""]
  },

  "activiteiten": {
    "beschrijving": "",
    "omzetgroepen": [ {"naam":"", "aandeel_pct":0, "indicatief":true} ],
    "marktpositie": "", "toegevoegde_waarde": "", "klantrelaties": "",
    "aandachtspunten": [""]
  },

  "financieringsbehoefte": {
    "totaal": 0,
    "specificatie": [ {"post":"", "toelichting":"", "bedrag":0} ],
    "onderbouwing": "", "effect": "", "aandachtspunten": [""]
  },

  "bestaande_financieringen": {
    "huisbank": "",
    "leningen": [ {"soort":"", "verstrekker":"", "restschuld":0, "indicatief":true, "rente":"", "looptijd":"", "aflossing":""} ],
    "aandachtspunten": [""]
  },

  "nieuwe_financiering": {
    "vorm":"", "hoofdsom":0, "looptijd_mnd":0, "rekenrente_pct":0,
    "startdatum":"", "einddatum":"", "slottermijn":"",
    "maandlast_indicatief":0, "aandachtspunten":[""]
  },

  "zekerheden": {
    "nieuw":  [ {"type":"", "omschrijving":"", "categorie":"Pandrecht"} ],
    "bestaand":[ {"type":"", "omschrijving":"", "categorie":"Hypotheek"} ],
    "zekerheidsstellers": [ {"naam":"", "rol":""} ],
    "aandachtspunten": [""]
  },

  "documentatie": [ {"document":"", "status":"Ontvangen"} ],

  "bijlagen": {
    "rechtspersonen": [ {"naam":"", "rechtsvorm":"", "kvk":"Nog te controleren", "vestiging":"Niet in bron"} ],
    "privepersonen":  [ {"naam":"", "rol":"", "belang":""} ],
    "overige_documentatie": [""]
  },

  "agent_controles": {
    "cijfers_gevonden": 0, "teksten_gevonden": 0,
    "zekerheden_gevonden": 0, "financieringen_gevonden": 0,
    "inconsistenties": [""], "ontbrekende_stukken": [""], "adviseur_check": [""]
  }
}

TOEGESTANE WAARDEN
- documentatie.status: "Ontvangen" | "Op te vragen" | "Ontbreekt" | "Niet in bron"
- zekerheden.*.categorie: "Pandrecht" | "Hypotheek" | "Borg" | "Overig"

Lever uitsluitend valide JSON terug, zonder markdown.`;

function buildPrompt({ system_prompt, notities, extraCount }) {
  const base = system_prompt || SYSTEM_BASE;
  return (
    base +
    SCHEMA +
    `\n\nAANTAL DOCUMENTEN: 1 Capsearch-memorandum + ${extraCount} aanvullend bestand (jaarrekening/taxatie/offerte/KvK). Lees ze ALLEMAAL.` +
    (notities ? '\n\nExtra toelichting/wensen van de adviseur (zwaar laten meewegen):\n' + notities : '')
  );
}

function getOutputText(response) {
  if (response?.output_text) return response.output_text;
  const parts = [];
  for (const item of response?.output || []) {
    for (const c of item?.content || []) {
      if (c?.text) parts.push(c.text);
    }
  }
  return parts.join('\n').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const {
      memorandum_url,
      extra_urls,
      extra_url,
      notities,
      system_prompt,
    } = req.body || {};

    if (!memorandum_url) {
      return res.status(400).json({ error: 'memorandum_url ontbreekt.' });
    }

    const extras = Array.isArray(extra_urls)
      ? extra_urls.filter(Boolean)
      : extra_url
      ? [extra_url]
      : [];

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildPrompt({ system_prompt, notities, extraCount: extras.length });

    const content = [
      { type: 'input_text', text: prompt },
      { type: 'input_file', file_url: memorandum_url },
      ...extras.map((url) => ({ type: 'input_file', file_url: url })),
    ];

    let response;
    try {
      response = await client.responses.create({
        model: 'gpt-4.1',
        input: [{ role: 'user', content }],
      });
    } catch (firstErr) {
      if (firstErr?.status === 429 || String(firstErr?.message || '').includes('429')) {
        response = await client.responses.create({
          model: 'gpt-4.1-mini',
          input: [{ role: 'user', content }],
        });
      } else {
        throw firstErr;
      }
    }

    const outputText = getOutputText(response);
    if (!outputText) {
      return res.status(500).json({ error: 'AI gaf geen tekst terug.' });
    }

    // De frontend verwacht { success:true, data:'JSON-string' }.
    return res.status(200).json({ success: true, data: outputText });
  } catch (error) {
    console.error('Generate-report error:', error);
    return res.status(500).json({ error: error.message || 'AI-verwerking mislukt' });
  }
}
