// api/upload.js
// 接收前端上传的音频 blob → 存入 Vercel Blob → 返回公开 URL
// Vercel Blob 会自动读取环境变量 BLOB_READ_WRITE_TOKEN

import { put, del } from '@vercel/blob';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  try {
    // 生成唯一文件名，1小时后可手动删除
    const filename = `asr-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;

    // 把请求体（音频流）直接上传到 Blob
    const blob = await put(filename, req, {
      access: 'public',          // ASR 服务需要能公开访问
      contentType: 'audio/wav',
    });

    res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    console.error('[upload error]', err);
    res.status(500).json({ error: err.message });
  }
}
