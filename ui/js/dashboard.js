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

export class Dashboard {
  constructor() {
    this.queueItems = new Map();
    this.errorItems = [];
    this.liveMode = false;
    this.maxDepth = 3;
    this.currentDepth = 0;
    this.uptimeStart = null;
    this.uptimeTimer = null;
  }

  resetIdle() {
    this.liveMode = false;
    $('#dash-job-name').textContent = '—';
    $('#dash-job-badge').classList.add('dash-bar__badge--hidden');
    $('#dash-stat-depth').textContent = 'DEPTH —/—';
    $('#dash-stat-speed').textContent = 'SPEED — req/s';
    $('#dash-stat-uptime').textContent = 'UPTIME 00:00:00';
    $('#metric-pages').textContent = '0';
    $('#metric-errors').textContent = '0';
    $('#metric-response').textContent = '—';
    $('#metric-queue').textContent = '0';
    this.updateErrorCount(0);
  }

  resetForCrawl(seedUrl, maxDepth) {
    this.liveMode = true;
    this.queueItems.clear();
    this.errorItems = [];
    this.maxDepth = maxDepth;
    this.currentDepth = 0;

    $('#dash-job-name').textContent = makeJobName(seedUrl);
    $('#dash-job-badge').classList.remove('dash-bar__badge--hidden');

    $('#metric-pages').textContent = '0';
    $('#metric-errors').textContent = '0';
    $('#metric-response').textContent = '—';
    $('#metric-queue').textContent = '0';

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
      const n = parseFloat(speed) || 0;
      speedEl.textContent = n > 0 ? `SPEED ${Math.round(n)} req/s` : 'SPEED — req/s';
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

    const pages = [...this.queueItems.values()].filter((i) => i.status !== 'pending').length;
    const errors = this.errorItems.length;
    const times = [...this.queueItems.values()]
      .map((i) => i.responseMs)
      .filter((ms) => typeof ms === 'number' && ms > 0);
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

    $('#metric-pages').textContent = pages.toLocaleString();
    $('#metric-errors').textContent = String(errors);
    $('#metric-response').textContent = avg !== null ? `${avg}ms` : '—';
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
        const meta = typeof item.responseMs === 'number' && item.responseMs > 0
          ? `${item.responseMs}ms`
          : '—';
        return `
          <div class="dash-row${i % 2 === 0 ? ' dash-row--alt' : ''}">
            <span class="dash-row__glyph ${g.className}">${g.char}</span>
            <span class="dash-row__url" title="${escapeHtml(item.url)}">${escapeHtml(truncateUrl(item.url))}</span>
            <span class="dash-row__meta">${meta}</span>
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
      .map((item, i) => {
        const typeColor =
          item.type === 'API_ERR' ? '#FF8C00' : item.type === 'PAGE_ERR' ? '#FF3B3B' : '';
        const typeStyle = typeColor ? ` style="color:${typeColor}"` : '';
        return `
        <div class="dash-row dash-row--error${i % 2 === 0 ? ' dash-row--alt' : ''}">
          <span class="dash-row__glyph dash-row__glyph--error">✗</span>
          <span class="dash-row__error-body">
            <span class="dash-row__error-type"${typeStyle}>${escapeHtml(item.type)}</span>
            <span class="dash-row__url" title="${escapeHtml(item.url)}">${escapeHtml(truncateUrl(item.url, 36))}</span>
          </span>
        </div>`;
      })
      .join('');
  }
}
