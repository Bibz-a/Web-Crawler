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
    this.defaultTraversal = 'bfs';
    this.minDepth = 1;
    this.maxDepthLimit = 10;

    this.seedsEl = $('#seed-urls');
    this.depthInput = $('#crawl-depth');
    this.depthDisplay = $('#crawl-depth-display');
    this.previewEl = $('#crawl-config-preview');
    this.launchBtn = $('#btn-start');
    this.stopBtn = $('#btn-stop');

    this._bindStepper();
    this._bindTraversal();
    this._bindPreview();

    if (settings) this.applyDefaults(settings);
    else this.renderPreview();
  }

  applyDefaults() {
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
      traversal: this.defaultTraversal,
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
}
