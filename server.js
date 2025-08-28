
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve statiske filer
app.use(express.static(path.join(__dirname, 'public')));

// En enkel API for praksislogg
app.get('/api/logs', (req, res) => {
  const p = path.join(__dirname, 'data', 'logs.json');
  fs.readFile(p, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Kunne ikke lese loggfil.' });
    }
    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ugyldig JSON-format i logs.json.' });
    }
  });
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server kjører på http://localhost:${PORT}`);
});
