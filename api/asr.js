const https = require('https');
const { IncomingForm } = require('formidable');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const appId = req.headers['x-app-id'];
  const token = req.headers['x-token'];

  // 解析 FormData
  const form = new IncomingForm();
  const { fields, files } = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const action = Array.isArray(fields.action) ? fields.action[0] : fields.action;

  if (action === 'submit') {
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    const fs = require('fs');
    const audioBuffer = fs.readFileSync(audioFile.filepath);

    const boundary = '----DL' + Date.now();
    const part1 = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`
    );
    const part2 = Buffer.from(`\r\n--${boundary}--\r\n`);
    const bodyBuffer = Buffer.concat([part1, audioBuffer, part2]);

    const result = await httpsPost({
      hostname: 'openspeech.bytedance.com',
      path: '/api/v1/asr/submit',
      headers: {
        'Authorization': `Bearer;${token}`,
        'X-Api-App-Key': appId,
        'X-Api-Request-Id': 'dl-' + Date.now(),
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
      }
    }, bodyBuffer);

    return res.status(200).json(JSON.parse(result));

  } else if (action === 'query') {
    const taskId = Array.isArray(fields.taskId) ? fields.taskId[0] : fields.taskId;
    const body = Buffer.from(JSON.stringify({ task_id: taskId }));

    const result = await httpsPost({
      hostname: 'openspeech.bytedance.com',
      path: '/api/v1/asr/query',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${token}`,
        'X-Api-App-Key': appId,
        'Content-Length': body.length,
      }
    }, body);

    return res.status(200).json(JSON.parse(result));
  }

  res.status(400).json({ error: 'unknown action' });
};

function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, method: 'POST' }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
