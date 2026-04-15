const https = require('https');
const http = require('http');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, appId, token, taskId, audioBase64 } = await parseBody(req);

  if (action === 'submit') {
    // 把base64音频提交给豆包ASR
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const boundary = '----DramaLensBoundary' + Date.now();
    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
      audioBuffer,
      `\r\n--${boundary}--\r\n`
    ];
    const totalLength = bodyParts.reduce((sum, p) => sum + (Buffer.isBuffer(p) ? p.length : Buffer.byteLength(p)), 0);
    const bodyBuffer = Buffer.concat(bodyParts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)));

    const result = await proxyRequest({
      hostname: 'openspeech.bytedance.com',
      path: '/api/v1/asr/submit',
      method: 'POST',
      headers: {
        'Authorization': `Bearer;${token}`,
        'X-Api-App-Key': appId,
        'X-Api-Request-Id': 'dl-' + Date.now(),
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength,
      }
    }, bodyBuffer);

    return res.status(200).json(JSON.parse(result));

  } else if (action === 'query') {
    const body = JSON.stringify({ task_id: taskId });
    const result = await proxyRequest({
      hostname: 'openspeech.bytedance.com',
      path: '/api/v1/asr/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${token}`,
        'X-Api-App-Key': appId,
        'Content-Length': Buffer.byteLength(body),
      }
    }, Buffer.from(body));

    return res.status(200).json(JSON.parse(result));
  }

  res.status(400).json({ error: 'unknown action' });
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch(e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function proxyRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
