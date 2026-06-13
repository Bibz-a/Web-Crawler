import { fetchCrawlHistory, fetchHistoryResults } from './api.js';

const $ = (sel) => document.querySelector(sel);

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTimestamp(id) {
  const normalized = id.replace(/-/g, (match, offset) => {
    if (offset === 10 || offset === 13) return ':';
    return match;
  });
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return id;
  return date.toLocaleString();
}

export class CrawlHistoryPage {
  constructor(onLoad) {
    this.onLoad = onLoad;
    this.listEl = $('#history-list');
    this.emptyEl = $('#history-empty');
    this._bind();
  }

  _bind() {
    this.listEl?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-history-load]');
      if (!btn) return;
      const id = btn.dataset.historyLoad;
      try {
        const results = await fetchHistoryResults(id);
        const seedNode = results.nodes?.find((n) => n.depth === 0);
        const seedUrl = seedNode?.url || results.nodes?.[0]?.url || '';
        this.onLoad?.(results, seedUrl);
      } catch (err) {
        console.error(err);
      }
    });
  }

  async refresh() {
    if (!this.listEl) return;

    try {
      const entries = await fetchCrawlHistory();
      if (!entries.length) {
        this.listEl.innerHTML = '';
        if (this.emptyEl) this.emptyEl.hidden = false;
        return;
      }

      if (this.emptyEl) this.emptyEl.hidden = true;
      this.listEl.innerHTML = entries
        .map((entry) => `
          <tr>
            <td>${escapeHtml(formatTimestamp(entry.timestamp))}</td>
            <td class="history-table__url" title="${escapeHtml(entry.seedUrl)}">${escapeHtml(entry.seedUrl)}</td>
            <td class="col-num">${entry.pagesCrawled}</td>
            <td class="col-num">${entry.errors}</td>
            <td><button type="button" class="graph-filter" data-history-load="${escapeHtml(entry.id)}">LOAD</button></td>
          </tr>`)
        .join('');
    } catch {
      this.listEl.innerHTML = '';
      if (this.emptyEl) {
        this.emptyEl.hidden = false;
        this.emptyEl.textContent = 'Could not load crawl history.';
      }
    }
  }
}
