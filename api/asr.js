const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers['authorization'];
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on('data', c => chunks.push(c));
    req.on('end', resolve);
    req.on('error', reject);
  });
  const body = Buffer.concat(chunks);

  const response = await new Promise((resolve, reject) => {
    const r = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/v3/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': req.headers['content-type'],
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

  res.status(response.statusCode).json(
    JSON.parse(Buffer.concat(respChunks).toString())
  );
};
