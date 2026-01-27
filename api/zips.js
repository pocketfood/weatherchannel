module.exports = (req, res) => {
  const raw = process.env.WEATHER_ZIPS || '';
  const stateRaw = process.env.WEATHER_STATE_JSON || '';
  let zips = raw
    .split(/[\n,]+/)
    .map((zip) => zip.trim())
    .filter(Boolean);

  if (!zips.length && stateRaw) {
    try {
      const parsed = JSON.parse(stateRaw);
      zips = Array.isArray(parsed.locations)
        ? parsed.locations.map((loc) => loc.zip).filter(Boolean)
        : [];
    } catch (_err) {
      zips = [];
    }
  }

  if (!zips.length) {
    res.status(200).json({ zips: [] });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).json({ zips });
};
