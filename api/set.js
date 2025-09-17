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
  const url = new URL(req.url);
  const value = Number(url.searchParams.get('value'));
  if (!Number.isFinite(value)) return new Response('Bad value', { status: 400 });
  const key = 'surcovivo:founders:remaining';
  await fetch(`${kv.url}/set/${key}/${Math.max(0, value)}`, { method: 'POST', headers: { Authorization: `Bearer ${kv.token}` } });
  return new Response('ok', { status: 200 });
}
