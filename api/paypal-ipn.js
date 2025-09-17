export const config = { runtime: 'edge' };

async function verifyIPN(bodyText) {
  const verifyBody = 'cmd=_notify-validate&' + bodyText;
  const res = await fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': String(verifyBody.length) },
    body: verifyBody
  });
  const txt = await res.text();
  return txt.trim() === 'VERIFIED';
}

async function kvGet(url, token, key) {
  const r = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return await r.text();
}

async function kvSet(url, token, key, value) {
  return await fetch(`${url}/set/${key}/${value}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
}

export default async function handler(req) {
  try {
    const raw = await req.text();
    const ok = await verifyIPN(raw);
    if (!ok) return new Response('INVALID', { status: 400 });

    const params = new URLSearchParams(raw);
    const paymentStatus = params.get('payment_status');
    const receiver = (params.get('receiver_email') || '').toLowerCase();
    const gross = Number(params.get('mc_gross') || '0');
    const currency = params.get('mc_currency') || '';
    const txnId = params.get('txn_id') || '';

    // Basic checks
    if (paymentStatus !== 'Completed') return new Response('IGNORED', { status: 200 });
    if (receiver !== (process.env.PAYPAL_EMAIL || '').toLowerCase()) return new Response('WRONG_RECEIVER', { status: 200 });
    if (currency !== 'EUR') return new Response('WRONG_CCY', { status: 200 });
    if (Math.abs(gross - 2150) > 0.01) return new Response('WRONG_AMOUNT', { status: 200 });

    // Idempotency: if already processed, do nothing
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken) return new Response('KV_NOT_CONFIGURED', { status: 500 });
    const processedKey = `surcovivo:paypal:txn:${txnId}`;
    const seen = await kvGet(kvUrl, kvToken, processedKey);
    if (seen) return new Response('ALREADY_DONE', { status: 200 });

    // Decrement remaining
    const remainingKey = 'surcovivo:founders:remaining';
    let remaining = Number(await kvGet(kvUrl, kvToken, remainingKey)); if (!Number.isFinite(remaining)) remaining = 5;
    remaining = Math.max(0, remaining - 1);
    await kvSet(kvUrl, kvToken, remainingKey, remaining);
    await kvSet(kvUrl, kvToken, processedKey, '1');

    return new Response('OK', { status: 200 });
  } catch (e) {
    return new Response('ERR', { status: 200 });
  }
}
