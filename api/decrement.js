export const config = { runtime: 'edge' };
async function getKV() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}
export default async function handler(req) {
  const sec = req.headers.get('x-order-secret') || '';
  if (sec !== (process.env.ORDER_SECRET || '')) return new Response('Unauthorized', { status: 401 });
  const kv = await getKV();
  if (!kv) return new Response('KV not configured', { status: 500 });
  const key = 'surcovivo:founders:remaining';
  const getRes = await fetch(`${kv.url}/get/${key}`, { headers: { Authorization: `Bearer ${kv.token}` } });
  let remaining = 5;
  if (getRes.ok) { const txt = await getRes.text(); const n = Number(txt); remaining = Number.isNaN(n) ? 5 : n; }
  const url = new URL(req.url);
  const qty = Number(url.searchParams.get('qty') || 1);
  remaining = Math.max(0, remaining - qty);
  await fetch(`${kv.url}/set/${key}/${remaining}`, { method: 'POST', headers: { Authorization: `Bearer ${kv.token}` } });
  return new Response(String(remaining), { status: 200 });
}
