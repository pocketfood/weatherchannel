const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'backend', 'data', 'zips.txt');
    const contents = fs.readFileSync(filePath, 'utf8');
    const zips = contents
      .split(/[\n,]+/)
      .map((zip) => zip.trim())
      .filter(Boolean);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ zips });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load zips', detail: String(err) });
  }
};
