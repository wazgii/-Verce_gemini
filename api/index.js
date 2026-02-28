export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;
  
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'x-goog-api-key': req.headers['x-goog-api-key'] || url.searchParams.get('key')
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
  });
  
  const data = await response.json();
  res.status(response.status).json(data);
}
