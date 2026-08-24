const json = (response, status, body) => response.status(status).json(body);

const allowedOrigins = new Set([
  'https://millian.website',
  'https://www.millian.website',
  'https://njiijnokiio-debug.github.io'
]);

module.exports = async function handler(request, response) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) return response.status(403).end();
    return response.status(204).end();
  }
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' });
  if (origin && !allowedOrigins.has(origin)) return json(response, 403, { error: 'Origin is not allowed' });

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {});
  } catch {
    return json(response, 400, { error: 'Invalid request' });
  }
  const clean = value => typeof value === 'string' ? value.trim().slice(0, 1500) : '';
  const name = clean(body.name);
  const contact = clean(body.contact);
  const project = clean(body.project);
  const estimate = clean(body.estimate);
  const format = clean(body.format);

  if (body.website) return json(response, 200, { ok: true });
  if (name.length < 2 || contact.length < 3) return json(response, 400, { error: 'Invalid fields' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return json(response, 503, { error: 'Telegram is not configured' });

  const text = [
    'Новая заявка с сайта MILLIAN',
    `Имя: ${name}`,
    `Контакт: ${contact}`,
    `Формат: ${format || '—'}`,
    `Расчёт: ${estimate || '—'}`,
    `Задача: ${project || 'Обсудить лично'}`
  ].join('\n');

  try {
    const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
    });
    if (!telegram.ok) return json(response, 502, { error: 'Telegram rejected the message' });
    return json(response, 200, { ok: true });
  } catch {
    return json(response, 502, { error: 'Telegram is unavailable' });
  }
}
