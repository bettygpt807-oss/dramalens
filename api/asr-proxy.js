export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const target = req.query.target;
  if (!target) return res.status(400).json({ error: 'missing target' });

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!['host', 'content-length', 'transfer-encoding'].includes(k)) {
      headers[k] = v;
    }
  }

  try {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const response = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    const data = await response.arrayBuffer();
    res.status(response.status);
    const ct = response.headers.get('Content-Type');
    if (ct) res.setHeader('Content-Type', ct);
    res.send(Buffer.from(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
