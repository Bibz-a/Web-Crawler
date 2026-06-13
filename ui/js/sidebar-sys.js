import { fetchJobCurrent, fetchQueueCount, fetchStats } from './api.js';

const $ = (sel) => document.querySelector(sel);
const ERROR = '—';
const POLL_MS = 3000;
const FADE_MS = 150;

function bytesToMb(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return ERROR;
  return Math.round(bytes / (1024 * 1024));
}

function formatMem(used, limit) {
  const usedMb = bytesToMb(used);
  const limitMb = bytesToMb(limit);
  if (usedMb === ERROR || limitMb === ERROR) return ERROR;
  if (used <= 0 || limit <= 0) return ERROR;
  return `${usedMb}MB / ${limitMb}MB`;
}

function isValidMem(used, limit) {
  return (
    typeof used === 'number' &&
    typeof limit === 'number' &&
    !Number.isNaN(used) &&
    !Number.isNaN(limit) &&
    used > 0 &&
    limit > 0
  );
}

function isValidThreads(active, total) {
  return (
    Number.isInteger(active) &&
    Number.isInteger(total) &&
    active >= 0 &&
    total > 0 &&
    active <= total
  );
}

function isValidQueue(pending) {
  return Number.isInteger(pending) && pending >= 0;
}

function formatThreads(active, total) {
  return `${active} / ${total}`;
}

function formatQueue(pending) {
  return `${pending.toLocaleString()} URLs`;
}

function crossfadeSwap(el, newValue, isError = false) {
  if (!el) return;

  const display = isError ? ERROR : newValue;
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

async function pollMem(memEl) {
  try {
    const perf = window.performance?.memory;
    if (perf?.usedJSHeapSize && perf?.jsHeapSizeLimit) {
      if (!isValidMem(perf.usedJSHeapSize, perf.jsHeapSizeLimit)) {
        crossfadeSwap(memEl, ERROR, true);
        return;
      }
      crossfadeSwap(memEl, formatMem(perf.usedJSHeapSize, perf.jsHeapSizeLimit), false);
      return;
    }

    const data = await fetchStats();
    if (!isValidMem(data.usedJSHeapSize, data.jsHeapSizeLimit)) {
      crossfadeSwap(memEl, ERROR, true);
      return;
    }
    crossfadeSwap(memEl, formatMem(data.usedJSHeapSize, data.jsHeapSizeLimit), false);
  } catch {
    crossfadeSwap(memEl, ERROR, true);
  }
}

async function pollThreads(threadsEl) {
  try {
    const data = await fetchJobCurrent();
    const active = data.threadsActive;
    const total = data.threadsTotal;

    if (!isValidThreads(active, total)) {
      crossfadeSwap(threadsEl, ERROR, true);
      return;
    }

    crossfadeSwap(threadsEl, formatThreads(active, total), false);
  } catch {
    crossfadeSwap(threadsEl, ERROR, true);
  }
}

async function pollQueue(queueEl) {
  try {
    const data = await fetchQueueCount();
    const pending = data.pending;

    if (!isValidQueue(pending)) {
      crossfadeSwap(queueEl, ERROR, true);
      return;
    }

    crossfadeSwap(queueEl, formatQueue(pending), false);
  } catch {
    crossfadeSwap(queueEl, ERROR, true);
  }
}

export function setStatusPill(crawling) {
  const pill = $('#status-pill');
  const label = $('#status-pill-label');
  if (!pill || !label) return;

  pill.classList.toggle('status-pill--active', crawling);
  label.textContent = crawling ? 'CRAWLING' : 'IDLE';
}

export function initSidebarSys() {
  const memEl = $('#sys-mem');
  const threadsEl = $('#sys-threads');
  const queueEl = $('#sys-queue');
  if (!memEl || !threadsEl || !queueEl) return;

  const tick = () => {
    pollMem(memEl);
    pollThreads(threadsEl);
    pollQueue(queueEl);
  };

  tick();
  setInterval(tick, POLL_MS);
}
