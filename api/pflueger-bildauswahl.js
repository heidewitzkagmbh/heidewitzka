const { get, put, BlobPreconditionFailedError } = require('@vercel/blob');
const path = 'bildauswahl/v1.json';

async function read() {
  const blob = await get(path, { access: 'private', useCache: false });
  if (!blob) return { state: {}, etag: null };
  return { state: await new Response(blob.stream).json(), etag: blob.blob.etag };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json((await read()).state);
    if (req.method !== 'POST') return res.status(405).end();
    if (req.headers.origin !== 'https://' + req.headers.host) return res.status(403).end();
    if (!req.headers['content-type']?.startsWith('application/json')) return res.status(415).end();
    const { id, field, value } = req.body || {};
    if (!Number.isInteger(id) || id < 0 || id >= 561 ||
        !(field === 'rating' && ['yes', 'no', ''].includes(value) ||
          field === 'removed' && typeof value === 'boolean')) return res.status(400).end();
    for (let attempt = 0; attempt < 4; attempt++) {
      const { state, etag } = await read();
      const item = state[id] || {};
      if ((item[field] || (field === 'rating' ? '' : false)) === value) return res.status(200).json(state);
      if (value) item[field] = value;
      else delete item[field];
      if (Object.keys(item).length) state[id] = item;
      else delete state[id];
      try {
        await put(path, JSON.stringify(state), { access: 'private', contentType: 'application/json', addRandomSuffix: false, ...(etag ? { ifMatch: etag } : { allowOverwrite: false }) });
        return res.status(200).json(state);
      } catch (error) {
        if (etag && !(error instanceof BlobPreconditionFailedError)) throw error;
        if (attempt === 3) throw error;
      }
    }
  } catch (error) {
    console.error('Bildauswahl', error.name, error.message);
    return res.status(503).json({ error: 'Die Bildauswahl ist vorübergehend nicht erreichbar.' });
  }
};
