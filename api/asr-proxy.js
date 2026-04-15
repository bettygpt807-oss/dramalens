export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('target');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  if (!target) {
    return new Response(JSON.stringify({ error: 'missing target' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!['host', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  const body = request.method !== 'GET' ? await request.arrayBuffer() : null;

  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
