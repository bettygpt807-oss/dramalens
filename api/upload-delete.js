// api/upload-delete.js
// ASR 完成后清理 Blob 存储里的临时音频文件

import { del } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { pathname } = req.body;
    if (pathname) await del(pathname);
    res.status(200).json({ ok: true });
  } catch (err) {
    // 清理失败不影响主流程，静默返回
    res.status(200).json({ ok: false, error: err.message });
  }
}
