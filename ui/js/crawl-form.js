const $ = (sel) => document.querySelector(sel);

export function normalizeSeedUrl(raw) {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    u.hash = '';
    if (u.pathname === '/' || u.pathname === '') return u.origin;
    return u.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function highlightJson(jsonString) {
  const escaped = jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-str';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function isValidSeedLine(line) {
  let s = line.trim();
  if (!s) return false;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

function buildPreviewHtml(display, rawSeeds) {
  const lines = ['{'];

  lines.push('  <span class="json-key">"seeds"</span>: [');
  if (rawSeeds.length === 0) {
    lines.push('  ],');
  } else {
    rawSeeds.forEach((line, i) => {
      const comma = i < rawSeeds.length - 1 ? ',' : '';
      if (isValidSeedLine(line)) {
        const escaped = JSON.stringify(line);
        lines.push(`    ${highlightJson(escaped)}${comma}`);
      } else {
        lines.push(`    <span style="color:#FF3B3B">"invalid url"</span>${comma}`);
      }
    });
    lines.push('  ],');
  }

  const { seeds: _seeds, ...rest } = display;
  const restLines = JSON.stringify(rest, null, 2).split('\n').slice(1, -1);
  restLines.forEach((line, idx) => {
    const trimmed = line.trim().replace(/,$/, '');
    if (!trimmed) return;
    const comma = idx < restLines.length - 1 ? ',' : '';
    lines.push(`  ${highlightJson(trimmed)}${comma}`);
  });

  lines.push('}');
  return lines.join('\n');
}

export class CrawlJobForm {
  constructor(settings = null) {
    this.filters = [];
    this.robotsTxt = true;
    this.outputFormat = 'json';
    this.defaultTraversal = 'bfs';
    this.requestDelayMs = 250;
    this.maxPages = 0;
    this.sameHostOnly = true;
    this.minDepth = 1;
    this.maxDepthLimit = 10;

    this.seedsEl = $('#seed-urls');
    this.depthInput = $('#crawl-depth');
    this.depthDisplay = $('#crawl-depth-display');
    this.threadsEl = $('#crawl-threads');
    this.threadsValue = $('#crawl-threads-value');
    this.threadsFill = $('#threads-fill');
    this.previewEl = $('#crawl-config-preview');
    this.tagsEl = $('#url-filters-tags');
    this.filterInput = $('#url-filters-input');
    this.launchBtn = $('#btn-start');
    this.stopBtn = $('#btn-stop');

    this._bindStepper();
    this._bindSlider();
    this._bindToggle();
    this._bindTags();
    this._bindSegmented();
    this._bindTraversal();
    this._bindPreview();

    if (settings) this.applyDefaults(settings);
    else this.renderPreview();
  }

  applyDefaults(s) {
    if (!s) return;
    this.requestDelayMs = s.requestDelayMs ?? 250;
    this.maxPages = s.maxPages ?? 0;
    this.renderPreview();
  }

  getConfig() {
    const seeds = this.seedsEl.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map(normalizeSeedUrl)
      .filter(Boolean);

    return {
      seeds,
      maxDepth: parseInt(this.depthInput.value, 10) || 3,
      maxThreads: parseInt(this.threadsEl.value, 10) || 8,
      respectRobotsTxt: this.robotsTxt,
      urlFilters: [...this.filters],
      outputFormat: this.outputFormat,
      traversal: this.defaultTraversal,
      requestDelayMs: this.requestDelayMs,
      maxPages: this.maxPages,
      sameHostOnly: this.sameHostOnly,
    };
  }

  renderPreview() {
    const config = this.getConfig();
    const rawSeeds = this.seedsEl.value
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const display = {
      seeds: rawSeeds,
      maxDepth: config.maxDepth,
      maxThreads: config.maxThreads,
      respectRobotsTxt: config.respectRobotsTxt,
      sameHostOnly: config.sameHostOnly,
      requestDelayMs: config.requestDelayMs,
      maxPages: config.maxPages || null,
      urlFilters: config.urlFilters,
      outputFormat: config.outputFormat,
      traversal: config.traversal,
    };

    this.previewEl.innerHTML = buildPreviewHtml(display, rawSeeds);
  }

  setRunning(running) {
    this.launchBtn.disabled = running;
    this.stopBtn.disabled = !running;
    this.seedsEl.disabled = running;
  }

  _bindStepper() {
    $('#depth-stepper').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      let val = parseInt(this.depthInput.value, 10) || 3;
      if (btn.dataset.action === 'inc') val = Math.min(this.maxDepthLimit, val + 1);
      else val = Math.max(this.minDepth, val - 1);

      this.depthInput.value = String(val);
      this.depthDisplay.textContent = String(val);
      this.renderPreview();
    });
  }

  _bindSlider() {
    this.threadsEl.addEventListener('input', () => this._updateSliderUi());
    this._updateSliderUi();
  }

  _updateSliderUi() {
    const val = parseInt(this.threadsEl.value, 10);
    const pct = ((val - 1) / 15) * 100;
    this.threadsValue.textContent = String(val);
    this.threadsFill.style.width = `${pct}%`;
    this.renderPreview();
  }

  _bindToggle() {
    const group = $('#robots-toggle');
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.flat-toggle__opt');
      if (!btn) return;

      this.robotsTxt = btn.dataset.value === 'true';
      group.querySelectorAll('.flat-toggle__opt').forEach((b) => {
        b.classList.toggle('flat-toggle__opt--active', b === btn);
      });
      this.renderPreview();
    });
  }

  _bindTags() {
    this.filterInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();

      const val = this.filterInput.value.trim();
      if (!val || this.filters.includes(val)) {
        this.filterInput.value = '';
        return;
      }

      this.filters.push(val);
      this.filterInput.value = '';
      this._renderTags();
      this.renderPreview();
    });

    this.tagsEl.addEventListener('click', (e) => {
      const remove = e.target.closest('[data-remove]');
      if (!remove) return;
      const idx = parseInt(remove.dataset.remove, 10);
      this.filters.splice(idx, 1);
      this._renderTags();
      this.renderPreview();
    });
  }

  _renderTags() {
    this.tagsEl.innerHTML = this.filters
      .map(
        (tag, i) => `
        <span class="tag-chip">
          <span class="tag-chip__text">${this._esc(tag)}</span>
          <button type="button" class="tag-chip__remove" data-remove="${i}" aria-label="Remove filter">×</button>
        </span>`
      )
      .join('');
  }

  _bindSegmented() {
    $('#output-format').addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented__btn');
      if (!btn) return;

      this.outputFormat = btn.dataset.format;
      $('#output-format').querySelectorAll('.segmented__btn').forEach((b) => {
        b.classList.toggle('segmented__btn--active', b === btn);
      });
      this.renderPreview();
    });
  }

  _bindTraversal() {
    $('#crawl-traversal')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented__btn');
      if (!btn) return;

      this.defaultTraversal = btn.dataset.traversal === 'dfs' ? 'dfs' : 'bfs';
      $('#crawl-traversal')?.querySelectorAll('.segmented__btn').forEach((b) => {
        b.classList.toggle('segmented__btn--active', b === btn);
      });
      this.renderPreview();
    });
  }

  _bindPreview() {
    this.seedsEl.addEventListener('input', () => this.renderPreview());
  }

  _esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
