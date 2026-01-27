module.exports = (req, res) => {
  const raw = process.env.WEATHER_STATE_JSON || '';
  const base64 = process.env.WEATHER_STATE_BASE64 || '';
  let payload = raw;

  if (!payload && base64) {
    try {
      payload = Buffer.from(base64, 'base64').toString('utf8');
    } catch (err) {
      res.status(500).json({ error: 'Invalid WEATHER_STATE_BASE64' });
      return;
    }
  }

  if (!payload) {
    res.status(500).json({ error: 'WEATHER_STATE_JSON not set' });
    return;
  }

  try {
    const parsed = JSON.parse(payload);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Invalid WEATHER_STATE_JSON', detail: String(err) });
  }
};
