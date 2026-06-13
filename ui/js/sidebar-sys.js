const $ = (sel) => document.querySelector(sel);
const IDLE_SPEED = '— req/s';
const POLL_MS = 1000;
const FADE_MS = 150;

function bytesToMb(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '—';
  return Math.round(bytes / (1024 * 1024));
}

function formatMem(used, limit) {
  const usedMb = bytesToMb(used);
  const limitMb = bytesToMb(limit);
  if (usedMb === '—' || limitMb === '—') return '—';
  if (used <= 0 || limit <= 0) return '—';
  return `${usedMb}MB / ${limitMb}MB`;
}

function formatSpeed(speedPerSec) {
  if (!Number.isFinite(speedPerSec) || speedPerSec <= 0) return IDLE_SPEED;
  return `${speedPerSec.toFixed(1)} req/s`;
}

function formatQueue(pending) {
  return `${pending.toLocaleString()} URLs`;
}

function crossfadeSwap(el, newValue, isError = false) {
  if (!el) return;

  const display = isError ? '—' : newValue;
  if (el.dataset.value === display && el.dataset.error === String(isError)) return;

  const current = el.querySelector('.sys-swap__val:not(.sys-swap__val--out)');
  if (!current) {
    el.replaceChildren();
    const span = document.createElement('span');
    span.className = `sys-swap__val${isError ? ' sys-swap__val--error' : ''}`;
    span.textContent = display;
    el.appendChild(span);
    el.dataset.value = display;
    el.dataset.error = String(isError);
    return;
  }

  current.classList.add('sys-swap__val--out');

  const incoming = document.createElement('span');
  incoming.className = `sys-swap__val sys-swap__val--in${isError ? ' sys-swap__val--error' : ''}`;
  incoming.textContent = display;
  el.appendChild(incoming);

  requestAnimationFrame(() => {
    incoming.classList.add('sys-swap__val--visible');
  });

  setTimeout(() => {
    current.remove();
    incoming.classList.remove('sys-swap__val--in');
    el.dataset.value = display;
    el.dataset.error = String(isError);
  }, FADE_MS);
}

function pollMem(memRow, memEl) {
  const perf = window.performance?.memory;
  if (!perf?.usedJSHeapSize || !perf?.jsHeapSizeLimit) {
    if (memRow) memRow.hidden = true;
    return;
  }

  if (memRow) memRow.hidden = false;
  crossfadeSwap(memEl, formatMem(perf.usedJSHeapSize, perf.jsHeapSizeLimit), false);
}

function pollSpeed(speedEl, engine) {
  if (!engine) {
    crossfadeSwap(speedEl, IDLE_SPEED, false);
    return;
  }

  const { running, speedPerSec } = engine.getCrawlStats();
  crossfadeSwap(speedEl, running ? formatSpeed(speedPerSec) : IDLE_SPEED, false);
}

function pollQueue(queueEl, engine) {
  if (!engine) {
    crossfadeSwap(queueEl, formatQueue(0), false);
    return;
  }

  const { queueSize } = engine.getCrawlStats();
  crossfadeSwap(queueEl, formatQueue(queueSize), false);
}

export function setStatusPill(crawling) {
  const pill = $('#status-pill');
  const label = $('#status-pill-label');
  if (!pill || !label) return;

  pill.classList.toggle('status-pill--active', crawling);
  label.textContent = crawling ? 'CRAWLING' : 'IDLE';
}

export function initSidebarSys(engine) {
  const memRow = $('#sys-mem')?.closest('.sys-row');
  const memEl = $('#sys-mem');
  const speedEl = $('#sys-speed');
  const queueEl = $('#sys-queue');
  if (!speedEl || !queueEl) return;

  const tick = () => {
    pollMem(memRow, memEl);
    pollSpeed(speedEl, engine);
    pollQueue(queueEl, engine);
  };

  tick();
  setInterval(tick, POLL_MS);
}
