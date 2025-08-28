
# Praksis•Portal (HTML + CSS + Node.js)

Enkel starter for YFF-praksislogg. Inneholder:
- HTML-sider (Forside, Praksis, Prosjekter, CV)
- Tilgjengelig (UU) design med mørkt tema
- Node.js/Express for å servere statiske filer + en enkel `/api/logs` som leser `data/logs.json`
- Praksislogg lastes og tegnes automatisk på `praksis.html`

## Kom i gang
1. Installer avhengigheter:
   ```bash
   npm install
   ```
2. Kjør utviklingsserver (med auto-restart):
   ```bash
   npm run dev
   ```
   eller produksjon:
   ```bash
   npm start
   ```
3. Åpne i nettleser: http://localhost:3000

## Oppdater praksisbedrift
Rediger `data/logs.json` under feltet `bedrift`:
```json
{
  "bedrift": {
    "navn": "Min Bedrift AS",
    "adresse": "Adresse 1, 0123 Oslo",
    "veileder": "Navn Navnesen"
  }
}
```

## Legg til ukeslogg
I `data/logs.json`, legg til et nytt objekt i `weeks` for hver fredag:
```json
{
  "date": "2025-09-05",
  "week": 36,
  "hours": 6,
  "title": "Uken i korte trekk",
  "summary": "Kort intro til hva som skjedde",
  "tasks": ["Oppgave 1", "Oppgave 2"],
  "learning": "Hva lærte jeg?",
  "other": "Møter, sosiale ting osv.",
  "images": [
    { "src": "/images/uken-36-1.png", "alt": "Beskrivende alt-tekst", "caption": "Kort bildetekst" }
  ]
}
```

**Viktig:** Legg bildene i `public/images/` og referer med `/images/filnavn.png`. Husk alt-tekst.

## Struktur
```text
praksis-portal/
├─ server.js
├─ package.json
├─ data/
│  └─ logs.json
└─ public/
   ├─ index.html
   ├─ praksis.html
   ├─ prosjekter.html
   ├─ cv.html
   ├─ styles.css
   ├─ app.js
   └─ images/
```

## UU-sjekkliste (kort)
- Kontrast minst 4.5:1 (oppfylt i temaet)
- Tydelig fokusramme (gullfarget)
- Alt-tekst på alle bilder
- Semantiske overskrifter (H1→H2→H3)
- Tastaturnavigasjon (skip-link, fokus)

Lykke til! 🚀
