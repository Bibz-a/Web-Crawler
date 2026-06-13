import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ||
  process.env.VITE_DEV_ORIGIN ||
  'http://localhost:8080';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self';";

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map();

let crawlState = {
  status: 'idle',
  depth: 0,
  threads: 0,
  queue: 0,
  traversal: 'BFS',
  threadsTotal: 16,
};

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    rateLimitMap.set(ip, entry);
  }

  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

function requestOrigin(req) {
  return req.headers.origin || '';
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return origin === ALLOWED_ORIGIN;
}

function cspHeaders() {
  return { 'Content-Security-Policy': CSP };
}

function apiCorsHeaders(req) {
  const origin = requestOrigin(req);
  if (origin && isAllowedOrigin(origin)) {
    return { 'Access-Control-Allow-Origin': origin };
  }
  if (!origin) {
    return { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN };
  }
  return null;
}

function apiHeaders(req, extra = {}) {
  const cors = apiCorsHeaders(req);
  return {
    ...cspHeaders(),
    ...(cors || {}),
    ...extra,
  };
}

function staticHeaders(filePath, extra = {}) {
  const ext = path.extname(filePath);
  if (ext === '.html') {
    return { ...cspHeaders(), ...extra };
  }
  return { ...extra };
}

function sendJson(req, res, status, body) {
  res.writeHead(status, apiHeaders(req, { 'Content-Type': 'application/json' }));
  res.end(JSON.stringify(body));
}

function sendRateLimited(req, res) {
  sendJson(req, res, 429, { error: 'rate limit exceeded' });
}

function sendForbidden(req, res) {
  sendJson(req, res, 403, { error: 'origin not allowed' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInt(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateStateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }

  const allowed = new Set(['status', 'depth', 'threads', 'queue', 'traversal']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      return { ok: false, error: `unknown field: ${key}` };
    }
  }

  const { status, depth, threads, queue, traversal } = body;

  if (status !== undefined && typeof status !== 'string') {
    return { ok: false, error: 'status must be a string' };
  }
  if (depth !== undefined && !isPositiveInt(depth)) {
    return { ok: false, error: 'depth must be a positive integer' };
  }
  if (threads !== undefined && !isNonNegativeInt(threads)) {
    return { ok: false, error: 'threads must be a non-negative integer' };
  }
  if (queue !== undefined && !isNonNegativeInt(queue)) {
    return { ok: false, error: 'queue must be a non-negative integer' };
  }
  if (traversal !== undefined && traversal !== 'BFS' && traversal !== 'DFS') {
    return { ok: false, error: 'traversal must be "BFS" or "DFS"' };
  }

  return {
    ok: true,
    value: {
      ...(status !== undefined ? { status } : {}),
      ...(depth !== undefined ? { depth } : {}),
      ...(threads !== undefined ? { threads } : {}),
      ...(queue !== undefined ? { queue } : {}),
      ...(traversal !== undefined ? { traversal } : {}),
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const origin = requestOrigin(req);
  const isApi = url.pathname.startsWith('/api/');

  if (isApi && origin && !isAllowedOrigin(origin)) {
    sendForbidden(req, res);
    return;
  }

  if (req.method === 'OPTIONS' && isApi) {
    if (origin && !isAllowedOrigin(origin)) {
      sendForbidden(req, res);
      return;
    }

    res.writeHead(
      204,
      apiHeaders(req, {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
    );
    res.end();
    return;
  }

  if (isApi) {
    if (!checkRateLimit(clientIp(req))) {
      sendRateLimited(req, res);
      return;
    }
  }

  if (url.pathname === '/api/job/current' && req.method === 'GET') {
    sendJson(req, res, 200, {
      threadsActive: crawlState.threads,
      threadsTotal: crawlState.threadsTotal,
    });
    return;
  }

  if (url.pathname === '/api/queue/count' && req.method === 'GET') {
    sendJson(req, res, 200, { pending: crawlState.queue });
    return;
  }

  if (url.pathname === '/api/stats' && req.method === 'GET') {
    const mem = process.memoryUsage();
    sendJson(req, res, 200, {
      usedJSHeapSize: mem.heapUsed,
      jsHeapSizeLimit: mem.heapTotal + mem.heapUsed,
    });
    return;
  }

  if (url.pathname === '/api/internal/state' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const result = validateStateBody(body);

      if (!result.ok) {
        sendJson(req, res, 400, { error: result.error });
        return;
      }

      crawlState = { ...crawlState, ...result.value };
      res.writeHead(204, apiHeaders(req));
      res.end();
    } catch {
      sendJson(req, res, 400, { error: 'invalid JSON body' });
    }
    return;
  }

  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, staticHeaders(filePath));
    res.end();
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, staticHeaders(filePath, { 'Content-Type': 'text/plain' }));
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(
    200,
    staticHeaders(filePath, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  );
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`CRAWLER UI + API → http://localhost:${PORT}`);
  console.log(`Allowed origin: ${ALLOWED_ORIGIN}`);
});
