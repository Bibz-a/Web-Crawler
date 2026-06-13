import { getApiBase } from './config.js';

async function parseJsonResponse(res) {
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`expected application/json, got ${contentType || 'none'}`);
  }
  return res.json();
}

async function throwHttpError(res, label) {
  const body = await res.text().catch(() => '(unreadable)');
  const err = new Error(`${label} ${res.status}`);
  err.status = res.status;
  err.statusText = res.statusText;
  err.responseBody = body;
  throw err;
}

export async function startCrawl({ seedUrl, depth, traversal }) {
  const res = await fetch(`${getApiBase()}/api/crawl/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seedUrl, depth, traversal }),
  });
  if (!res.ok) {
    await throwHttpError(res, 'crawl/start');
  }
  return parseJsonResponse(res);
}

export async function fetchCrawlStatus() {
  const res = await fetch(`${getApiBase()}/api/crawl/status`);
  if (!res.ok) {
    await throwHttpError(res, 'crawl/status');
  }
  return parseJsonResponse(res);
}

export async function fetchCrawlResults() {
  const res = await fetch(`${getApiBase()}/api/crawl/results`);
  if (!res.ok) throw new Error(`crawl/results ${res.status}`);
  return parseJsonResponse(res);
}

export async function stopCrawl() {
  const res = await fetch(`${getApiBase()}/api/crawl/stop`, { method: 'POST' });
  if (!res.ok && res.status !== 204) {
    await throwHttpError(res, 'crawl/stop');
  }
}
