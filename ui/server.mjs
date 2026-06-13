import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const CRAWL_STATUS_PATH = path.join(DATA_DIR, 'crawl-status.json');
const CRAWL_RESULTS_PATH = path.join(DATA_DIR, 'crawl-results.json');
const CRAWL_STOP_PATH = path.join(DATA_DIR, 'crawl-stop');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const CRAWLER_CLI = path.join(
  REPO_ROOT,
  process.platform === 'win32' ? 'webcrawler_cli.exe' : 'webcrawler_cli'
);
const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ||
  process.env.VITE_DEV_ORIGIN ||
  'http://localhost:8080';

const CSP =
  "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self';";

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

let crawlProcess = null;

function readJsonFile(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateCrawlStartBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }

  const { seedUrl, depth, traversal, respectRobots } = body;
  if (!isValidHttpUrl(seedUrl)) {
    return { ok: false, error: 'seedUrl must be a valid http(s) URL' };
  }
  if (!isPositiveInt(depth) || depth > 10) {
    return { ok: false, error: 'depth must be a positive integer up to 10' };
  }

  const normalizedTraversal = String(traversal || 'BFS').toUpperCase();
  if (normalizedTraversal !== 'BFS' && normalizedTraversal !== 'DFS') {
    return { ok: false, error: 'traversal must be "BFS" or "DFS"' };
  }

  return {
    ok: true,
    value: {
      seedUrl: seedUrl.trim(),
      depth,
      traversal: normalizedTraversal,
      respectRobots: Boolean(respectRobots),
    },
  };
}

function getCrawlStatusSnapshot() {
  return readJsonFile(CRAWL_STATUS_PATH, {
    status: 'idle',
    pagesCrawled: 0,
    queueSize: 0,
    currentUrl: '',
    errors: 0,
    elapsedMs: 0,
    nodes: [],
  });
}

function startCrawlJob({ seedUrl, depth, traversal, respectRobots }) {
  if (crawlProcess) {
    return { ok: false, error: 'crawl already running' };
  }

  if (!fs.existsSync(CRAWLER_CLI)) {
    return {
      ok: false,
      error: 'webcrawler_cli not found — run `make cli` from the repo root',
    };
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(CRAWL_STOP_PATH)) fs.unlinkSync(CRAWL_STOP_PATH);

  const initialStatus = {
    status: 'running',
    pagesCrawled: 0,
    queueSize: 1,
    currentUrl: seedUrl,
    errors: 0,
    elapsedMs: 0,
    seedUrl,
    depth,
    traversal,
    nodes: [],
  };
  fs.writeFileSync(CRAWL_STATUS_PATH, JSON.stringify(initialStatus, null, 2));
  fs.writeFileSync(CRAWL_RESULTS_PATH, JSON.stringify({ nodes: [], edges: [] }, null, 2));

  const spawnArgs = [
    '--url', seedUrl,
    '--depth', String(depth),
    '--traversal', traversal,
    '--status', CRAWL_STATUS_PATH,
    '--results', CRAWL_RESULTS_PATH,
    '--stop', CRAWL_STOP_PATH,
  ];
  if (respectRobots) spawnArgs.push('--robots');

  crawlProcess = spawn(CRAWLER_CLI, spawnArgs, { cwd: REPO_ROOT, stdio: 'ignore' });

  crawlProcess.on('exit', () => {
    const snapshot = getCrawlStatusSnapshot();
    if (snapshot.status === 'complete') {
      archiveCrawlRun();
    }
    crawlProcess = null;
  });

  return { ok: true };
}

function stopCrawlJob() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CRAWL_STOP_PATH, 'stop');

  if (crawlProcess) {
    crawlProcess.kill();
    crawlProcess = null;
  }

  const snapshot = getCrawlStatusSnapshot();
  if (snapshot.status === 'running') {
    snapshot.status = 'stopped';
    fs.writeFileSync(CRAWL_STATUS_PATH, JSON.stringify(snapshot, null, 2));
  }

  return { ok: true };
}

function archiveTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function archiveCrawlRun() {
  if (!fs.existsSync(CRAWL_STATUS_PATH) || !fs.existsSync(CRAWL_RESULTS_PATH)) return;

  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  const stamp = archiveTimestamp();
  fs.copyFileSync(CRAWL_STATUS_PATH, path.join(HISTORY_DIR, `${stamp}-status.json`));
  fs.copyFileSync(CRAWL_RESULTS_PATH, path.join(HISTORY_DIR, `${stamp}-results.json`));
}

function listCrawlHistory() {
  if (!fs.existsSync(HISTORY_DIR)) return [];

  return fs.readdirSync(HISTORY_DIR)
    .filter((name) => name.endsWith('-status.json'))
    .map((name) => {
      const id = name.replace(/-status\.json$/, '');
      const snapshot = readJsonFile(path.join(HISTORY_DIR, name), null);
      if (!snapshot) return null;
      return {
        id,
        timestamp: id,
        seedUrl: snapshot.seedUrl || '',
        pagesCrawled: snapshot.pagesCrawled ?? 0,
        errors: snapshot.errors ?? 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.id.localeCompare(a.id));
}

function getHistoryResults(id) {
  const safeId = path.basename(id);
  const resultsPath = path.resolve(HISTORY_DIR, `${safeId}-results.json`);
  const historyResolved = path.resolve(HISTORY_DIR);
  if (!resultsPath.startsWith(historyResolved) || !fs.existsSync(resultsPath)) {
    return null;
  }
  return readJsonFile(resultsPath, { nodes: [], edges: [] });
}

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

  const isRateLimitedWrite =
    (url.pathname === '/api/crawl/start' && req.method === 'POST') ||
    (url.pathname === '/api/crawl/stop' && req.method === 'POST');

  if (isRateLimitedWrite && !checkRateLimit(clientIp(req))) {
    sendRateLimited(req, res);
    return;
  }

  if (url.pathname === '/api/crawl/start' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const result = validateCrawlStartBody(body);

      if (!result.ok) {
        sendJson(req, res, 400, { error: result.error });
        return;
      }

      const started = startCrawlJob(result.value);
      if (!started.ok) {
        sendJson(req, res, 409, { error: started.error });
        return;
      }

      sendJson(req, res, 202, { status: 'running' });
    } catch {
      sendJson(req, res, 400, { error: 'invalid JSON body' });
    }
    return;
  }

  if (url.pathname === '/api/crawl/status' && req.method === 'GET') {
    sendJson(req, res, 200, getCrawlStatusSnapshot());
    return;
  }

  if (url.pathname === '/api/crawl/results' && req.method === 'GET') {
    const results = readJsonFile(CRAWL_RESULTS_PATH, { nodes: [], edges: [] });
    sendJson(req, res, 200, results);
    return;
  }

  if (url.pathname === '/api/crawl/history' && req.method === 'GET') {
    sendJson(req, res, 200, listCrawlHistory());
    return;
  }

  const historyMatch = url.pathname.match(/^\/api\/crawl\/history\/([^/]+)\/results$/);
  if (historyMatch && req.method === 'GET') {
    const results = getHistoryResults(decodeURIComponent(historyMatch[1]));
    if (!results) {
      sendJson(req, res, 404, { error: 'history entry not found' });
      return;
    }
    sendJson(req, res, 200, results);
    return;
  }

  if (url.pathname === '/api/crawl/stop' && req.method === 'POST') {
    stopCrawlJob();
    res.writeHead(204, apiHeaders(req));
    res.end();
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
