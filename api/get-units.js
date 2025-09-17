export const config = { runtime: 'edge' };
export default async function handler() {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    const key = 'surcovivo:founders:remaining';
    let remaining = 5;
    if (url && token) {
      const r = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const txt = await r.text(); const n = Number(txt); if (!Number.isNaN(n)) remaining = n; }
    }
    return new Response(JSON.stringify({ total: 5, remaining, sold: Math.max(0,5-remaining) }), { headers: { 'content-type':'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ total:5, remaining:5, sold:0 }), { headers: { 'content-type':'application/json' } });
  }
}
