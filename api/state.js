const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'backend', 'data', 'state.json');
    const payload = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load state', detail: String(err) });
  }
};
