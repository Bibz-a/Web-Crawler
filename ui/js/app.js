import { LinkGraph } from './link-graph.js';
import { CrawlerEngine } from './crawler-engine.js';
import { initSidebarSys, setStatusPill } from './sidebar-sys.js';
import { Dashboard } from './dashboard.js';
import { CrawlJobForm } from './crawl-form.js';
import { loadSettings } from './settings-store.js';
import { SettingsPanel } from './settings-panel.js';
import { initLicenseDialog } from './license.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

initLicenseDialog();

function boot() {
  const dashboard = new Dashboard();
  dashboard.resetIdle();

  if (location.protocol === 'file:') {
    const list = $('#queue-list');
    if (list) {
      list.innerHTML =
        '<p class="dash-list__empty" style="color:#FF3B3B">Open via local server: node server.mjs</p>';
    }
    return;
  }

  const linkGraph = new LinkGraph(
    $('#linkgraph-container'),
    $('#linkgraph-tooltip'),
    $('#linkgraph-meta')
  );
  const storedSettings = loadSettings();
  const crawlForm = new CrawlJobForm(storedSettings);
  const settingsPanel = new SettingsPanel((next) => {
    const logLimit = $('#log-limit');
    if (logLimit) logLimit.value = next.logLimit || '50';
  });
  const engine = new CrawlerEngine();
  initSidebarSys(engine);

  let sortedMode = false;
  let crawlMaxDepth = 3;
  let activeTraversal = 'bfs';

  function formatClock(date) {
    return date.toTimeString().slice(0, 8);
  }

  function setEngineStatus(running) {
    setStatusPill(running);
    crawlForm.setRunning(running);
  }

  function renderUrlTable(filter = '') {
    const tbody = $('#url-table-body');
    const empty = $('#urls-empty');
    tbody.innerHTML = '';

    let urls = engine.nodes;
    if (sortedMode) {
      const sorted = engine.getSortedUrls();
      urls = sorted.map((url) => engine.nodes.find((n) => n.url === url)).filter(Boolean);
    }

    const q = filter.toLowerCase();
    const filtered = q ? urls.filter((n) => n.url.toLowerCase().includes(q)) : urls;

    if (filtered.length === 0) {
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    filtered.forEach((node, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-num">${String(i + 1).padStart(3, '0')}</td>
        <td>${escapeHtml(node.url)}</td>
        <td class="col-depth">${node.depth}</td>
        <td class="col-status"><span class="status-badge status-badge--${node.status}">${node.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderLogs(limit = '50') {
    const viewer = $('#log-viewer');
    viewer.innerHTML = '';

    let lines = engine.logs;
    if (limit === '20') lines = lines.slice(-20);
    else if (limit === '50') lines = lines.slice(-50);

    if (lines.length === 0) {
      viewer.innerHTML = '<span style="color:var(--text-muted)">— no log entries —</span>';
      return;
    }

    lines.forEach((entry, i) => {
      const line = document.createElement('div');
      line.className = `log-viewer__line${entry.type === 'error' ? ' log-viewer__line--error' : ''}`;
      const idx = document.createElement('span');
      idx.className = 'log-viewer__idx';
      idx.textContent = String(i + 1);
      line.appendChild(idx);
      line.appendChild(document.createTextNode(`[${formatClock(entry.time)}] ${entry.message}`));
      viewer.appendChild(line);
    });

    viewer.scrollTop = viewer.scrollHeight;
  }

  function switchView(viewId) {
    $$('.view').forEach((v) => v.classList.remove('view--active'));
    $(`#view-${viewId}`).classList.add('view--active');
    $$('.nav-item').forEach((n) => {
      n.classList.toggle('nav-item--active', n.dataset.view === viewId);
    });

    if (viewId === 'results') renderUrlTable($('#url-search').value);
    if (viewId === 'link-graph') linkGraph.resize();
    if (viewId === 'jobs') renderLogs($('#log-limit').value);
    if (viewId === 'dashboard' && !dashboard.liveMode) {
      dashboard.resetIdle();
    }
  }

  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  $('#crawl-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const config = crawlForm.getConfig();
    if (!config.seeds.length) {
      $('#seed-urls').focus();
      return;
    }

    const url = config.seeds[0];
    crawlMaxDepth = config.maxDepth;
    activeTraversal = config.traversal;

    linkGraph.clearForCrawl(url);
    sortedMode = false;

    setEngineStatus(true);

    dashboard.resetForCrawl(url, crawlMaxDepth);
    dashboard.updateBarStats({ depth: 0, maxDepth: crawlMaxDepth, speed: 0, elapsed: 0 });

    switchView('dashboard');

    engine.start(url, crawlMaxDepth, activeTraversal).catch((err) => {
      setEngineStatus(false);
      dashboard.addError('CRAWL_ERR', err.message);
    });
  });

  $('#btn-stop').addEventListener('click', () => {
    engine.stop();
    setEngineStatus(false);
    dashboard.abortCrawl();
  });

  $('#url-search').addEventListener('input', (e) => {
    renderUrlTable(e.target.value);
  });

  $('#btn-sort-urls').addEventListener('click', () => {
    sortedMode = !sortedMode;
    $('#btn-sort-urls').textContent = sortedMode ? 'Original Order' : 'Merge Sort';
    renderUrlTable($('#url-search').value);
  });

  $('#log-limit').addEventListener('change', (e) => {
    renderLogs(e.target.value);
  });

  engine.on('queue', (size) => {
    if (dashboard.liveMode) {
      $('#metric-queue').textContent = String(size);
    }
  });

  engine.on('node', (node) => {
    const responseMs = engine.getLastResponseMs();

    dashboard.addQueueItem(node, responseMs);
    linkGraph.syncFromEngine(engine, responseMs);

    if (node.failed) {
      dashboard.addError('FETCH_FAIL', node.url);
    } else {
      const prev = engine.nodes.filter((n) => n.url !== node.url && !n.failed);
      prev.slice(-3).forEach((n) => {
        const item = dashboard.queueItems.get(n.url);
        if (item && item.status === 'processing') item.status = 'done';
      });
      dashboard.renderQueue();
    }

    renderUrlTable($('#url-search').value);
  });

  engine.on('log', (entry) => {
    if (entry.type === 'error' && !entry.message.startsWith('Crawl aborted')) {
      const msg = entry.message;
      if (msg.includes('crawl/status') || msg.includes('Failed to fetch')) {
        const urlMatch = msg.match(/([\w.-]+\/[^\s|]+)/);
        dashboard.addError('API_ERR', urlMatch ? urlMatch[1] : msg);
      } else if (msg.startsWith('FAIL')) {
        const failMatch = msg.match(/^FAIL (.+?) — fetch failed/);
        dashboard.addError('PAGE_ERR', failMatch ? failMatch[1] : msg);
      } else {
        const urlMatch = msg.match(/([\w.-]+\/[^\s]+)/);
        dashboard.addError('CRAWL_ERR', urlMatch ? urlMatch[1] : msg);
      }
    }
    renderLogs($('#log-limit').value);
  });

  engine.on('stats', ({ rate, elapsed }) => {
    dashboard.updateBarStats({
      maxDepth: crawlMaxDepth,
      speed: rate,
      elapsed,
    });
  });

  engine.on('complete', () => {
    setEngineStatus(false);
    dashboard.finishCrawl();
    linkGraph.syncFromEngine(engine);
    renderLogs($('#log-limit').value);
  });

  engine.on('stop', () => {
    setEngineStatus(false);
  });

  const logLimitEl = $('#log-limit');
  if (logLimitEl) logLimitEl.value = storedSettings.logLimit || '50';

  switchView('dashboard');
}

boot();
