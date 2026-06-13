import { getApiBase } from './config.js';

async function parseJsonResponse(res) {
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`expected application/json, got ${contentType || 'none'}`);
  }
  return res.json();
}

export async function fetchJobCurrent() {
  const res = await fetch(`${getApiBase()}/api/job/current`);
  if (!res.ok) throw new Error(`job/current ${res.status}`);
  return parseJsonResponse(res);
}

export async function fetchQueueCount() {
  const res = await fetch(`${getApiBase()}/api/queue/count`);
  if (!res.ok) throw new Error(`queue/count ${res.status}`);
  return parseJsonResponse(res);
}

export async function fetchStats() {
  const res = await fetch(`${getApiBase()}/api/stats`);
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return parseJsonResponse(res);
}

export async function pushCrawlState(partial) {
  try {
    const res = await fetch(`${getApiBase()}/api/internal/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`internal/state ${res.status}`);
    }
  } catch {
    /* best-effort sync for dev server */
  }
}
