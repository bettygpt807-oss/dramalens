export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get('target');
  if (!target) return new Response('missing target', { status: 400 });

  const headers = {};
  for (const [k, v] of req.headers.entries()) {
    if (!['host','content-length'].includes(k)) headers[k] = v;
  }

  const body = req.method !== 'GET' ? await req.arrayBuffer() : undefined;

  const resp = await fetch(target, {
    method: req.method,
    headers,
    body,
  });

  const resHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': resp.headers.get('Content-Type') || 'application/json',
  };

  return new Response(resp.body, {
    status: resp.status,
    headers: resHeaders,
  });
}
