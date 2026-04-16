// api/asr-submit.js
// 提交录音文件识别任务 → 返回 task_id
// 使用旧版控制台认证：X-Api-App-Key + X-Api-Access-Key

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { audioUrl, appId, token } = req.body;
  if (!audioUrl || !appId || !token) {
    return res.status(400).json({ error: 'missing audioUrl / appId / token' });
  }

  // 生成唯一 task_id（UUID v4 简化版）
  const taskId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

  try {
    const resp = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-App-Key':    appId,
        'X-Api-Access-Key': token,
        'X-Api-Resource-Id': 'volc.seedasr.auc',
        'X-Api-Request-Id':  taskId,
        'X-Api-Sequence':    '-1',
      },
      body: JSON.stringify({
        user: { uid: 'dramalens' },
        audio: {
          url:      audioUrl,
          format:   'wav',
          language: 'en-US',
        },
        request: {
          model_name:      'bigmodel',
          enable_punc:     true,
          show_utterances: true,   // 返回分句+时间戳
        },
      }),
    });

    const statusCode = resp.headers.get('X-Api-Status-Code');
    const message    = resp.headers.get('X-Api-Message');

    // 20000000 = 提交成功
    if (statusCode !== '20000000') {
      return res.status(400).json({ error: `ASR submit failed: ${message} (${statusCode})` });
    }

    res.status(200).json({ taskId });
  } catch (err) {
    console.error('[asr-submit error]', err);
    res.status(500).json({ error: err.message });
  }
}
