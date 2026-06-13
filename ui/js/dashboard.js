const $ = (sel) => document.querySelector(sel);

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateUrl(url, max = 42) {
  if (url.length <= max) return url;
  return url.slice(0, max - 1) + '…';
}

function formatUptime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function makeJobName(seedUrl) {
  const d = new Date();
  const ym = `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
  let slug = 'crawl';
  try {
    const u = new URL(seedUrl);
    slug = (u.hostname + u.pathname.replace(/\//g, '-'))
      .replace(/^-+|-+$/g, '')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .slice(0, 24) || 'crawl';
  } catch {
    /* keep default */
  }
  return `JOB_${ym}_${slug}`;
}

export function animateCounter(el, target, duration = 1200, options = {}) {
  if (!el) return;

  const { decimals = 0, suffix = '' } = options;
  const start = performance.now();
  const from = 0;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    const val = from + (target - from) * eased;

    if (decimals > 0) {
      el.textContent = val.toFixed(decimals) + suffix;
    } else {
      el.textContent = Math.round(val).toLocaleString() + suffix;
    }

    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export class Dashboard {
  constructor() {
    this.queueItems = new Map();
    this.errorItems = [];
    this.responseTimes = [];
    this.dataBytes = 0;
    this.liveMode = false;
    this.maxDepth = 5;
    this.currentDepth = 0;
    this.uptimeStart = null;
    this.uptimeTimer = null;
  }

  initPlaceholders() {
    animateCounter($('#metric-pages'), 1247, 1400);
    animateCounter($('#metric-errors'), 3, 900);
    animateCounter($('#metric-response'), 142, 1100, { suffix: 'ms' });
    animateCounter($('#metric-data'), 48.2, 1300, { decimals: 1, suffix: ' MB' });
  }

  resetForCrawl(seedUrl, maxDepth) {
    this.liveMode = true;
    this.queueItems.clear();
    this.errorItems = [];
    this.responseTimes = [];
    this.dataBytes = 0;
    this.maxDepth = maxDepth;
    this.currentDepth = 0;

    $('#dash-job-name').textContent = makeJobName(seedUrl);
    $('#dash-job-badge').classList.remove('dash-bar__badge--hidden');

    $('#metric-pages').textContent = '0';
    $('#metric-errors').textContent = '0';
    $('#metric-response').textContent = '0ms';
    $('#metric-data').textContent = '0.0 MB';

    this.renderQueue();
    this.renderErrors();
    this.updateErrorCount(0);

    this.uptimeStart = Date.now();
    if (this.uptimeTimer) clearInterval(this.uptimeTimer);
    this.uptimeTimer = setInterval(() => this.tickUptime(), 1000);
    this.tickUptime();
  }

  finishCrawl() {
    this.liveMode = false;
    $('#dash-job-badge').classList.add('dash-bar__badge--hidden');
    if (this.uptimeTimer) {
      clearInterval(this.uptimeTimer);
      this.uptimeTimer = null;
    }
    this.markAllQueueDone();
  }

  abortCrawl() {
    this.finishCrawl();
  }

  tickUptime() {
    if (!this.uptimeStart) return;
    const el = $('#dash-stat-uptime');
    if (el) el.textContent = `UPTIME ${formatUptime(Date.now() - this.uptimeStart)}`;
  }

  updateBarStats({ depth, maxDepth, speed, elapsed }) {
    if (depth !== undefined) this.currentDepth = depth;
    if (maxDepth !== undefined) this.maxDepth = maxDepth;

    const depthEl = $('#dash-stat-depth');
    if (depthEl) {
      depthEl.textContent = `DEPTH ${this.currentDepth}/${this.maxDepth}`;
    }

    const speedEl = $('#dash-stat-speed');
    if (speedEl && speed !== undefined) {
      speedEl.textContent = `SPEED ${Math.round(parseFloat(speed) || 0)} req/s`;
    }

    if (elapsed !== undefined) {
      const uptimeEl = $('#dash-stat-uptime');
      if (uptimeEl) uptimeEl.textContent = `UPTIME ${formatUptime(elapsed)}`;
    }
  }

  addQueueItem(node, responseMs) {
    const status = node.failed ? 'failed' : 'processing';
    this.queueItems.set(node.url, {
      url: node.url,
      status,
      responseMs,
      depth: node.depth,
    });

    if (node.depth > this.currentDepth) {
      this.currentDepth = node.depth;
      this.updateBarStats({ depth: this.currentDepth });
    }

    if (!node.failed) {
      this.responseTimes.push(responseMs);
      this.dataBytes += 45000 + Math.floor(Math.random() * 120000);
    }

    this.renderQueue();
    this.updateMetrics();
  }

  markAllQueueDone() {
    for (const item of this.queueItems.values()) {
      if (item.status === 'processing') item.status = 'done';
    }
    this.renderQueue();
  }

  addError(type, url) {
    this.errorItems.unshift({ type, url, time: new Date() });
    if (this.errorItems.length > 50) this.errorItems.pop();
    this.renderErrors();
    this.updateErrorCount(this.errorItems.length);
    this.updateMetrics();
  }

  updateMetrics() {
    if (!this.liveMode) return;

    const pages = [...this.queueItems.values()].filter(i => i.status !== 'pending').length;
    const errors = this.errorItems.length;
    const avg =
      this.responseTimes.length > 0
        ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
        : 0;
    const mb = this.dataBytes / (1024 * 1024);

    $('#metric-pages').textContent = pages.toLocaleString();
    $('#metric-errors').textContent = String(errors);
    $('#metric-response').textContent = `${avg}ms`;
    $('#metric-data').textContent = `${mb.toFixed(1)} MB`;
  }

  updateErrorCount(n) {
    const badge = $('#error-count');
    if (badge) badge.textContent = String(n);
    if (this.liveMode) {
      $('#metric-errors').textContent = String(n);
    }
  }

  glyphForStatus(status) {
    if (status === 'done') return { char: '✓', className: 'dash-row__glyph--done' };
    if (status === 'failed') return { char: '✗', className: 'dash-row__glyph--fail' };
    return { char: '▶', className: 'dash-row__glyph--active' };
  }

  renderQueue() {
    const list = $('#queue-list');
    if (!list) return;

    const items = [...this.queueItems.values()];
    if (items.length === 0) {
      list.innerHTML = '<p class="dash-list__empty">No URLs in queue.</p>';
      return;
    }

    list.innerHTML = items
      .map((item, i) => {
        const g = this.glyphForStatus(item.status);
        return `
          <div class="dash-row${i % 2 === 0 ? ' dash-row--alt' : ''}">
            <span class="dash-row__glyph ${g.className}">${g.char}</span>
            <span class="dash-row__url" title="${escapeHtml(item.url)}">${escapeHtml(truncateUrl(item.url))}</span>
            <span class="dash-row__meta">${item.responseMs}ms</span>
          </div>`;
      })
      .join('');
  }

  renderErrors() {
    const list = $('#error-list');
    if (!list) return;

    if (this.errorItems.length === 0) {
      list.innerHTML = '<p class="dash-list__empty">No errors recorded.</p>';
      return;
    }

    list.innerHTML = this.errorItems
      .map((item, i) => `
        <div class="dash-row dash-row--error${i % 2 === 0 ? ' dash-row--alt' : ''}">
          <span class="dash-row__glyph dash-row__glyph--error">✗</span>
          <span class="dash-row__error-body">
            <span class="dash-row__error-type">${escapeHtml(item.type)}</span>
            <span class="dash-row__url" title="${escapeHtml(item.url)}">${escapeHtml(truncateUrl(item.url, 36))}</span>
          </span>
        </div>`)
      .join('');
  }
}

export function randomResponseMs() {
  return 72 + Math.floor(Math.random() * 180);
}
