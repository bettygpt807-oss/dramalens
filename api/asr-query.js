// api/asr-query.js
// 查询录音识别任务结果，前端每5秒轮询一次
// 返回 { status: 'pending'|'done'|'error', utterances?, text? }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { taskId, appId, token } = req.body;
  if (!taskId || !appId || !token) {
    return res.status(400).json({ error: 'missing taskId / appId / token' });
  }

  try {
    const resp = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-App-Key':    appId,
        'X-Api-Access-Key': token,
        'X-Api-Resource-Id': 'volc.seedasr.auc',
        'X-Api-Request-Id':  taskId,
      },
      body: JSON.stringify({}),
    });

    const statusCode = resp.headers.get('X-Api-Status-Code');

    // 处理中 / 队列中
    if (statusCode === '20000001' || statusCode === '20000002') {
      return res.status(200).json({ status: 'pending' });
    }

    // 成功
    if (statusCode === '20000000') {
      const data = await resp.json();
      const utterances = (data.result?.utterances || []).map(u => ({
        start: u.start_time / 1000,   // 毫秒→秒
        end:   u.end_time   / 1000,
        text:  u.text.trim(),
      }));
      // 如果没有 utterances，fallback 用整段文本
      if (!utterances.length && data.result?.text) {
        utterances.push({ start: 0, end: 0, text: data.result.text });
      }
      return res.status(200).json({ status: 'done', utterances });
    }

    // 失败
    const message = resp.headers.get('X-Api-Message') || statusCode;
    return res.status(200).json({ status: 'error', error: message });

  } catch (err) {
    console.error('[asr-query error]', err);
    res.status(500).json({ error: err.message });
  }
}
