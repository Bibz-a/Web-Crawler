import { startCrawl, fetchCrawlStatus, fetchCrawlResults, stopCrawl } from './api.js';

const POLL_MS = 2000;
const SPEED_WINDOW_MS = 10000;

function normalizeUrl(input) {
  let raw = input.trim();
  if (!raw) return null;

  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    u.hash = '';
    if (u.pathname === '/' || u.pathname === '') {
      return u.origin;
    }
    return u.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.hostname + u.pathname;
  } catch {
    return url;
  }
}

function mapApiNode(node) {
  return {
    id: node.url,
    url: node.url,
    depth: node.depth ?? 0,
    parentId: node.parentUrl || null,
    failed: Boolean(node.failed),
    status: node.failed ? 'fail' : 'ok',
  };
}

export class CrawlerEngine {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.running = false;
    this.aborted = false;
    this.nodes = [];
    this.edges = [];
    this.logs = [];
    this.errors = 0;
    this.startTime = null;
    this.queueSize = 0;
    this.maxDepth = 3;
    this.seedUrl = '';
    this.method = 'bfs';
    this._pollTimer = null;
    this._seenNodeUrls = new Set();
    this._lastCurrentUrl = '';
    this._finished = false;
    this._pageTimestamps = [];
    this._lastNodeAt = null;
  }

  getCrawlStats() {
    const now = Date.now();
    this._pageTimestamps = this._pageTimestamps.filter((t) => now - t <= SPEED_WINDOW_MS);
    const speedPerSec = this.running && this._pageTimestamps.length > 0
      ? this._pageTimestamps.length / (SPEED_WINDOW_MS / 1000)
      : 0;

    return {
      running: this.running,
      queueSize: this.running ? this.queueSize : 0,
      speedPerSec,
      pagesCrawled: this.nodes.length,
      errors: this.errors,
      elapsedMs: this.startTime ? now - this.startTime : 0,
    };
  }

  on(event, fn) {
    this.callbacks[event] = fn;
  }

  _emit(event, data) {
    this.callbacks[event]?.(data);
  }

  _log(message, type = 'fetch') {
    const entry = {
      time: new Date(),
      message,
      type,
    };
    this.logs.push(entry);
    this._emit('log', entry);
  }

  _clearPoll() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  _recordPage() {
    const now = Date.now();
    this._pageTimestamps.push(now);
    if (this._lastNodeAt) {
      this._lastResponseMs = now - this._lastNodeAt;
    }
    this._lastNodeAt = now;
  }

  getLastResponseMs() {
    return this._lastResponseMs ?? null;
  }

  _applyStatus(status) {
    this.queueSize = status.queueSize ?? 0;
    this.errors = status.errors ?? 0;
    this._emit('queue', this.queueSize);

    const apiNodes = Array.isArray(status.nodes) ? status.nodes : [];
    for (const apiNode of apiNodes) {
      if (!apiNode?.url || this._seenNodeUrls.has(apiNode.url)) continue;

      this._seenNodeUrls.add(apiNode.url);
      const node = mapApiNode(apiNode);
      this.nodes.push(node);
      this._recordPage();
      this._emit('node', node);
      this._log(
        node.failed
          ? `FAIL ${shortUrl(node.url)} — fetch failed`
          : `FETCH d=${node.depth} ${shortUrl(node.url)}`,
        node.failed ? 'error' : 'fetch'
      );
    }

    const currentUrl = status.currentUrl || '';
    if (currentUrl && currentUrl !== this._lastCurrentUrl && status.status === 'running') {
      this._lastCurrentUrl = currentUrl;
      if (!this._seenNodeUrls.has(currentUrl)) {
        this._log(`QUEUE → ${shortUrl(currentUrl)}`, 'link');
      }
    }

    this._emitStats(status);
  }

  async _loadResults() {
    const results = await fetchCrawlResults();
    const apiNodes = Array.isArray(results.nodes) ? results.nodes : [];
    const apiEdges = Array.isArray(results.edges) ? results.edges : [];

    this.nodes = apiNodes.map(mapApiNode);
    this.edges = apiEdges.map((edge) => ({
      from: edge.from,
      to: edge.to,
    }));
    this._seenNodeUrls = new Set(this.nodes.map((node) => node.url));
    this.errors = this.nodes.filter((node) => node.failed).length;
  }

  async start(seedUrl, depth, method) {
    this._clearPoll();

    this.running = true;
    this.aborted = false;
    this.nodes = [];
    this.edges = [];
    this.logs = [];
    this.errors = 0;
    this.startTime = Date.now();
    this.maxDepth = Number.isFinite(depth) ? Math.min(10, Math.max(1, depth)) : 3;
    this.seedUrl = normalizeUrl(seedUrl) || seedUrl;
    this.method = method;
    this.queueSize = 0;
    this._seenNodeUrls = new Set();
    this._lastCurrentUrl = '';
    this._finished = false;
    this._pageTimestamps = [];
    this._lastNodeAt = null;
    this._lastResponseMs = null;

    const traversal = method === 'dfs' ? 'DFS' : 'BFS';

    try {
      await startCrawl({
        seedUrl: this.seedUrl,
        depth: this.maxDepth,
        traversal,
      });

      this._emit('start', { seedUrl: this.seedUrl, depth: this.maxDepth, method });
      this._log(`INIT ${traversal} crawl → ${shortUrl(this.seedUrl)}`, 'fetch');
      this._emitStats({ status: 'running', pagesCrawled: 0, queueSize: 1, elapsedMs: 0 });

      this._pollTimer = setInterval(() => {
        this._poll().catch((err) => {
          this._log(
            `ERROR ${err.message} | status=${err.status ?? '—'} ` +
            `statusText=${err.statusText ?? '—'} | body=${err.responseBody ?? '—'}`,
            'error'
          );
        });
      }, POLL_MS);

      await this._poll();
    } catch (err) {
      this.running = false;
      this._log(`ERROR ${err.message}`, 'error');
      this._emit('stop', {});
      throw err;
    }
  }

  async _poll() {
    if (!this.running || this.aborted) return;

    const status = await fetchCrawlStatus();
    if (!this.running || this.aborted) return;

    this._applyStatus(status);

    if (status.status === 'complete') {
      await this._loadResults();
      this._finish('complete');
      return;
    }

    if (status.status === 'stopped' || status.status === 'error') {
      await this._loadResults().catch(() => {});
      this._finish(status.status === 'stopped' ? 'stop' : 'error');
    }
  }

  async stop() {
    if (!this.running) return;

    this.aborted = true;
    this.running = false;
    this._clearPoll();

    try {
      await stopCrawl();
      await this._loadResults().catch(() => {});
    } catch (err) {
      this._log(`ERROR ${err.message}`, 'error');
    }

    this._emit('stop', {});
    this._log('Crawl aborted by user', 'error');
    this._finish('stop');
  }

  _emitStats(status = {}) {
    const elapsed = status.elapsedMs ?? (Date.now() - this.startTime);
    const pages = status.pagesCrawled ?? this.nodes.length;
    const stats = this.getCrawlStats();
    const rate = stats.speedPerSec;

    this._emit('stats', {
      pages,
      rate: rate.toFixed(1),
      elapsed,
      errors: status.errors ?? this.errors,
      progress: this.running ? Math.min(99, pages > 0 ? Math.max(1, pages * 10) : 0) : 100,
    });
  }

  _finish(mode = 'complete') {
    if (this._finished) return;
    this._finished = true;

    this.running = false;
    this._clearPoll();
    this.queueSize = 0;
    this._pageTimestamps = [];
    this._emit('queue', 0);
    this._emit('stats', {
      pages: this.nodes.length,
      rate: '0.0',
      elapsed: Date.now() - this.startTime,
      errors: this.errors,
      progress: 100,
    });

    if (mode === 'complete') {
      this._emit('complete', {
        nodes: this.nodes,
        edges: this.edges,
        logs: this.logs,
      });
      this._log(`DONE — ${this.nodes.length} pages indexed`, 'done');
    }
  }

  buildSpanningTree() {
    if (!this.seedUrl || this.nodes.length === 0) return '— no crawl data —';

    const children = new Map();
    for (const node of this.nodes) {
      if (node.parentId) {
        if (!children.has(node.parentId)) children.set(node.parentId, []);
        children.get(node.parentId).push(node.url);
      }
    }

    const lines = [];
    const visited = new Set();

    function walk(url, prefix, isLast) {
      if (visited.has(url)) return;
      visited.add(url);

      const label = shortUrl(url);
      if (prefix === '') {
        lines.push(`* ${label}`);
      } else {
        lines.push(`${prefix}${isLast ? '└── ' : '├── '}${label}`);
      }

      const kids = children.get(url) || [];
      const childPrefix = prefix + (prefix === '' ? '' : isLast ? '    ' : '│   ');
      kids.forEach((child, i) => {
        walk(child, childPrefix, i === kids.length - 1);
      });
    }

    walk(this.seedUrl, '', true);
    return lines.join('\n');
  }

  getSortedUrls() {
    return [...this.nodes]
      .map((n) => n.url)
      .sort((a, b) => a.localeCompare(b));
  }
}
