export const config = { runtime: 'edge' };

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const rawUrl = request.url;
  const targetMatch = rawUrl.match(/[?&]target=([^&]*)/);
  const target = targetMatch ? decodeURIComponent(targetMatch[1]) : null;

  if (!target) {
    return new Response(JSON.stringify({ error: 'missing target', url: rawUrl }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!['host', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  const body = request.method !== 'GET' ? await request.arrayBuffer() : null;

  try {
    const response = await fetch(target, { method: request.method, headers, body });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
