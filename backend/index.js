const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = process.env.PORT || 5174;
const dataDir = path.join(__dirname, 'data');
const statePath = path.join(dataDir, 'state.json');
const zipsPath = path.join(dataDir, 'zips.txt');
const mediaDir = path.join(__dirname, 'media');

app.use(cors());
app.use('/media', express.static(mediaDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/zips', async (_req, res) => {
  try {
    const raw = await fs.readFile(zipsPath, 'utf8');
    const zips = raw.split(/\s+/).filter(Boolean);
    res.json({ zips });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read ZIP list.' });
  }
});

app.get('/api/state', async (_req, res) => {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const state = JSON.parse(raw);
    res.set('Cache-Control', 'no-store');
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read state.json.' });
  }
});

app.listen(port, () => {
  console.log(`Weather backend running on http://localhost:${port}`);
});
