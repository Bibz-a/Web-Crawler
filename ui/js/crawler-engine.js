/**
 * Crawl engine — simulates BFS/DFS crawl for the UI.
 * Replace fetch calls with a real backend API when available.
 */

const DEMO_SITES = {
  'https://example.com': {
    pages: [
      { path: '/', links: ['/about', '/docs', '/blog'] },
      { path: '/about', links: ['/team', '/contact'] },
      { path: '/docs', links: ['/docs/api', '/docs/guide', '/about'] },
      { path: '/docs/api', links: ['/docs'] },
      { path: '/docs/guide', links: ['/docs', '/blog'] },
      { path: '/blog', links: ['/blog/post-1', '/blog/post-2', '/about'] },
      { path: '/blog/post-1', links: ['/blog'] },
      { path: '/blog/post-2', links: ['/blog', '/docs'] },
      { path: '/team', links: ['/about'] },
      { path: '/contact', links: ['/about'] },
    ],
  },
};

function normalizeUrl(input) {
  let raw = input.trim();
  if (!raw) return null;

  // Accept bare domains like "example.com"
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

function resolveLink(base, href) {
  try {
    const resolved = new URL(href, base);
    if (!['http:', 'https:'].includes(resolved.protocol)) return null;
    resolved.hash = '';
    if (resolved.pathname === '/' || resolved.pathname === '') {
      return resolved.origin;
    }
    return resolved.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function buildDemoGraph(seedUrl) {
  const origin = getOrigin(seedUrl);
  const seed = normalizeUrl(seedUrl) || seedUrl;
  const template = DEMO_SITES['https://example.com'].pages;

  const graph = new Map();
  for (const page of template) {
    const full = resolveLink(origin + '/', page.path.startsWith('/') ? page.path : '/' + page.path);
    const links = page.links
      .map(l => resolveLink(full, l))
      .filter(Boolean);
    graph.set(full, links);
  }

  if (!graph.has(seed)) {
    graph.set(seed, template[0]?.links
      .map(l => resolveLink(seed, l))
      .filter(Boolean) || []);
  }

  return graph;
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname : u.hostname + u.pathname;
  } catch {
    return url;
  }
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
    this.parentMap = new Map();
    this.depthMap = new Map();
    this._timer = null;
    this._pageGraph = null;
    this._frontier = [];
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

  async start(seedUrl, depth, method) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

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
    this.parentMap.clear();
    this.depthMap.clear();
    this._pageGraph = buildDemoGraph(this.seedUrl);
    this._totalPages = this._countReachablePages();

    const seed = this.seedUrl;
    this.parentMap.set(seed, null);
    this.depthMap.set(seed, 0);
    this._frontier = [{ url: seed, depth: 0 }];

    this.queueSize = this._frontier.length;
    this._emit('start', { seedUrl: seed, depth: this.maxDepth, method });
    this._log(`INIT ${method.toUpperCase()} crawl → ${shortUrl(seed)}`, 'fetch');
    this._emitStats();

    await this._step();
  }

  _countReachablePages() {
    const visited = new Set();
    const queue = [{ url: this.seedUrl, depth: 0 }];

    while (queue.length > 0) {
      const { url, depth } = queue.shift();
      if (visited.has(url) || depth > this.maxDepth) continue;
      visited.add(url);
      for (const link of this._pageGraph.get(url) || []) {
        if (!visited.has(link)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }

    return Math.max(visited.size, 1);
  }

  stop() {
    this.aborted = true;
    this.running = false;
    if (this._timer) clearTimeout(this._timer);
    this._emit('stop', {});
    this._log('Crawl aborted by user', 'error');
  }

  async _step() {
    if (this.aborted) {
      this._finish();
      return;
    }

    if (this._frontier.length === 0) {
      this._finish();
      return;
    }

    try {
      let current;
      if (this.method === 'bfs') {
        current = this._frontier.shift();
      } else {
        current = this._frontier.pop();
      }

      const { url, depth } = current;
      this.queueSize = this._frontier.length;
      this._emit('queue', this.queueSize);

      if (depth > this.maxDepth) {
        this._timer = setTimeout(() => this._step(), 30);
        return;
      }

      const visited = this.nodes.some(n => n.url === url);
      if (visited) {
        this._timer = setTimeout(() => this._step(), 30);
        return;
      }

      const parentId = this.parentMap.get(url);
      const failed = !this._pageGraph.has(url) && url !== this.seedUrl;
      if (failed) this.errors++;

      const node = {
        id: url,
        url,
        depth,
        parentId: parentId ?? null,
        failed,
        status: failed ? 'fail' : 'ok',
      };

      this.nodes.push(node);
      if (parentId) {
        this.edges.push({ from: parentId, to: url });
      }

      this._emit('node', node);
      this._log(
        failed
          ? `FAIL ${shortUrl(url)} — unreachable`
          : `FETCH d=${depth} ${shortUrl(url)}`,
        failed ? 'error' : 'fetch'
      );

      if (!failed) {
        const links = this._pageGraph.get(url) || [];
        const newLinks = [];

        for (const link of links) {
          if (!this.nodes.some(n => n.url === link) && !this._frontier.some(f => f.url === link)) {
            if ((this.depthMap.get(link) ?? depth + 1) <= this.maxDepth) {
              this.parentMap.set(link, url);
              this.depthMap.set(link, depth + 1);
              newLinks.push(link);
            }
          }
        }

        if (this.method === 'dfs') {
          newLinks.reverse();
        }

        for (const link of newLinks) {
          this._frontier.push({ url: link, depth: depth + 1 });
          this._emit('discover', { url: link, depth: depth + 1, parent: url });
          this._log(`LINK + ${shortUrl(link)}`, 'link');
        }

        this.queueSize = this._frontier.length;
        this._emit('queue', this.queueSize);
      }

      this._emitStats();
    } catch (err) {
      console.error('Crawl step failed:', err);
      this._log(`ERROR ${err.message}`, 'error');
      this._emitStats();
    }

    const delay = 180 + Math.random() * 220;
    this._timer = setTimeout(() => this._step(), delay);
  }

  _emitStats() {
    const elapsed = Date.now() - this.startTime;
    const rate = this.nodes.length / (elapsed / 1000 || 1);
    const progress = this.running
      ? Math.min(99, Math.round((this.nodes.length / this._totalPages) * 100) || (this.nodes.length > 0 ? 1 : 0))
      : 100;

    this._emit('stats', {
      pages: this.nodes.length,
      rate: rate.toFixed(1),
      elapsed,
      errors: this.errors,
      progress,
    });
  }

  _finish() {
    this.running = false;
    this.queueSize = 0;
    this._emit('queue', 0);
    this._emit('stats', {
      pages: this.nodes.length,
      rate: '0.0',
      elapsed: Date.now() - this.startTime,
      errors: this.errors,
      progress: 100,
    });
    this._emit('complete', {
      nodes: this.nodes,
      edges: this.edges,
      logs: this.logs,
    });
    this._log(`DONE — ${this.nodes.length} pages indexed`, 'done');
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
      .map(n => n.url)
      .sort((a, b) => a.localeCompare(b));
  }
}
