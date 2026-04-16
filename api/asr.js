
const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers['authorization'];
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on('data', c => chunks.push(c));
    req.on('end', resolve);
    req.on('error', reject);
  });

  // 解析请求body，强制加上 stream: false
  let bodyObj;
  try { bodyObj = JSON.parse(Buffer.concat(chunks).toString()); }
  catch(e) { return res.status(400).json({ error: 'invalid json' }); }
  bodyObj.stream = false;
  const body = Buffer.from(JSON.stringify(bodyObj));

  const response = await new Promise((resolve, reject) => {
    const r = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/v3/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      }
    }, resolve);
    r.on('error', reject);
    r.write(body);
    r.end();
  });

  const respChunks = [];
  await new Promise((resolve, reject) => {
    response.on('data', c => respChunks.push(c));
    response.on('end', resolve);
    response.on('error', reject);
  });

  const raw = Buffer.concat(respChunks).toString();
  try {
    res.status(response.statusCode).json(JSON.parse(raw));
  } catch(e) {
    res.status(500).json({ error: 'parse failed', raw: raw.slice(0, 500) });
  }
};
