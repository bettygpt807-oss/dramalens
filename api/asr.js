const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
console.log('headers:', JSON.stringify(req.headers));
  const appId = req.headers['x-app-id'];
  const token = req.headers['x-token'];

  try {
    const { action, taskId, audioBuffer } = await parseMultipart(req);

    if (action === 'submit') {
      const audioBase64 = audioBuffer.toString('base64');
     const reqBody = JSON.stringify({
  appid: appId,
  token: token,
  audio: { format: 'wav', data: audioBase64 },
  request: { model_name: 'bigasr', language: 'en-US' }
});
      const result = await httpsPost('openspeech.bytedance.com', '/api/v1/auc/submit', {
        'Authorization': `Bearer;${token}`,
        'X-Api-App-Key': appId,
        'X-Api-Request-Id': 'dl-' + Date.now(),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqBody),
      }, Buffer.from(reqBody));
      console.log('ASR submit response:', result);
      try {
        return res.status(200).json(JSON.parse(result));
      } catch(e) {
        return res.status(200).json({ raw: result, parseError: e.message });
      }

    } else if (action === 'query') {
      const body = Buffer.from(JSON.stringify({ task_id: taskId }));
      const result = await httpsPost('openspeech.bytedance.com', '/api/v1/auc/query', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${token}`,
        'X-Api-App-Key': appId,
        'Content-Length': body.length,
      }, body);
      return res.status(200).json(JSON.parse(result));

    } else {
      res.status(400).json({ error: 'unknown action' });
    }

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) return reject(new Error('no boundary'));
        const boundary = Buffer.from('--' + boundaryMatch[1].trim());
        const parts = splitBuffer(body, boundary);
        let action = '', taskId = '', audioBuffer = null;
        for (const part of parts) {
          if (!part.length) continue;
          const headerEnd = indexOfBuffer(part, Buffer.from('\r\n\r\n'));
          if (headerEnd === -1) continue;
          const header = part.slice(0, headerEnd).toString();
          const content = part.slice(headerEnd + 4);
          const trimmed = content.slice(0, content.length - 2);
          if (header.includes('name="action"')) action = trimmed.toString().trim();
          else if (header.includes('name="taskId"')) taskId = trimmed.toString().trim();
          else if (header.includes('name="audio"')) audioBuffer = trimmed;
        }
        resolve({ action, taskId, audioBuffer });
      } catch(e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let pos = indexOfBuffer(buf, delimiter, start);
  while (pos !== -1) {
    parts.push(buf.slice(start, pos));
    start = pos + delimiter.length;
    if (buf[start] === 13 && buf[start+1] === 10) start += 2;
    pos = indexOfBuffer(buf, delimiter, start);
  }
  parts.push(buf.slice(start));
  return parts;
}

function indexOfBuffer(buf, search, offset = 0) {
  for (let i = offset; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i+j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'POST', headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
