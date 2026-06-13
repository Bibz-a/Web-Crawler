import { fetchCrawlResults } from './api.js';

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

function merge(arr, str, mid, end) {
  const temp = [];
  let i = str;
  let j = mid + 1;
  while (i <= mid && j <= end) {
    if (arr[i] <= arr[j]) temp.push(arr[i++]);
    else temp.push(arr[j++]);
  }
  while (i <= mid) temp.push(arr[i++]);
  while (j <= end) temp.push(arr[j++]);
  for (let k = 0; k < temp.length; k++) {
    arr[str + k] = temp[k];
  }
}

function mergesort(arr, str, end) {
  if (str < end) {
    const mid = Math.floor((str + end) / 2);
    mergesort(arr, str, mid);
    mergesort(arr, mid + 1, end);
    merge(arr, str, mid, end);
  }
}

function sortUrlsAlphabetically(nodes) {
  const urls = nodes.map((n) => n.url);
  if (urls.length <= 1) return [...nodes];
  mergesort(urls, 0, urls.length - 1);
  const byUrl = new Map(nodes.map((n) => [n.url, n]));
  return urls.map((url) => byUrl.get(url)).filter(Boolean);
}

function nodeStatusCode(node) {
  if (node.failed) return 'failed';
  return '200';
}

function glyphForNode(node) {
  if (node.failed) return { char: '✗', className: 'dash-row__glyph--fail' };
  return { char: '✓', className: 'dash-row__glyph--done' };
}

export class ResultsPage {
  constructor() {
    this.listEl = $('#results-list');
    this.emptyEl = $('#results-empty');
    this.countEl = $('#results-count');
    this.searchEl = $('#results-search');
    this.statusEl = $('#results-status-filter');
    this.depthEl = $('#results-depth-filter');
    this.nodes = [];
    this.maxDepth = 0;

    this.searchEl?.addEventListener('input', () => this.render());
    this.statusEl?.addEventListener('change', () => this.render());
    this.depthEl?.addEventListener('change', () => this.render());
  }

  async refresh() {
    try {
      const data = await fetchCrawlResults();
      this.nodes = sortUrlsAlphabetically(Array.isArray(data.nodes) ? data.nodes : []);
      this.maxDepth = this.nodes.reduce((max, n) => Math.max(max, n.depth ?? 0), 0);
      this._populateDepthFilter();
      this.render();
    } catch {
      this.nodes = [];
      this.maxDepth = 0;
      this.render();
    }
  }

  _populateDepthFilter() {
    if (!this.depthEl) return;
    const current = this.depthEl.value;
    this.depthEl.innerHTML = '<option value="all">All depths</option>';
    for (let d = 0; d <= this.maxDepth; d++) {
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = `Depth ${d}`;
      this.depthEl.appendChild(opt);
    }
    this.depthEl.value = [...this.depthEl.options].some((o) => o.value === current) ? current : 'all';
  }

  _filtered() {
    const keyword = (this.searchEl?.value || '').trim().toLowerCase();
    const status = this.statusEl?.value || 'all';
    const depth = this.depthEl?.value || 'all';

    return this.nodes.filter((node) => {
      if (keyword && !node.url.toLowerCase().includes(keyword)) return false;
      const code = nodeStatusCode(node);
      if (status === 'failed' && code !== 'failed') return false;
      if (status === '404' && code !== 'failed') return false;
      if (status === '200' && code !== '200') return false;
      if (status === '301') return false;
      if (depth !== 'all' && String(node.depth) !== depth) return false;
      return true;
    });
  }

  render() {
    if (!this.listEl) return;

    const filtered = this._filtered();
    const total = this.nodes.length;

    if (this.countEl) {
      this.countEl.textContent = `SHOWING ${filtered.length} / ${total} URLS`;
    }

    if (filtered.length === 0) {
      this.listEl.innerHTML = '';
      if (this.emptyEl) this.emptyEl.hidden = false;
      return;
    }

    if (this.emptyEl) this.emptyEl.hidden = true;
    this.listEl.innerHTML = filtered
      .map((node, i) => {
        const g = glyphForNode(node);
        const code = node.failed ? '404' : '200';
        return `
          <div class="dash-row${i % 2 === 0 ? ' dash-row--alt' : ''}">
            <span class="dash-row__glyph ${g.className}">${g.char}</span>
            <span class="dash-row__url" title="${escapeHtml(node.url)}">${escapeHtml(truncateUrl(node.url))}</span>
            <span class="dash-row__meta">d${node.depth}</span>
            <span class="dash-row__meta">—</span>
            <span class="dash-row__meta">${code}</span>
          </div>`;
      })
      .join('');
  }
}
