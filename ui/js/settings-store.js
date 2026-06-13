const STORAGE_KEY = 'crawler_ui_settings';
const GOALS_KEY = 'crawler_ui_goals';

export const DEFAULT_SETTINGS = {
  requestDelayMs: 250,
  maxPages: 0,
  logLimit: '50',
};

export const GOAL_SECTIONS = [
  {
    id: 'crawler',
    title: 'Crawler behavior',
    items: [
      { id: 'robots-txt', label: 'Respect robots.txt (fetch, parse, filter)' },
      { id: 'rate-limit', label: 'Optional delay / rate limit between requests' },
      { id: 'max-pages', label: 'Max pages cap in addition to depth' },
      { id: 'same-host', label: 'Same-host only toggle' },
      { id: 'redirects', label: 'Handle redirects explicitly' },
      { id: 'retry', label: 'Retry with backoff on transient failures' },
    ],
  },
  {
    id: 'parser',
    title: 'Parser & URLs',
    items: [
      { id: 'href-extract', label: 'Stronger href extraction' },
      { id: 'fragments', label: 'Strip fragments for deduplication' },
      { id: 'trailing-slash', label: 'Normalize trailing slashes & ports' },
      { id: 'mime-check', label: 'MIME check — text/html only' },
    ],
  },
  {
    id: 'code',
    title: 'Data structures & code quality',
    items: [
      { id: 'graph-docs', label: 'Align Graph README vs implementation' },
      { id: 'unit-tests', label: 'Unit tests for Queue, Stack, HashMap, sort' },
      { id: 'mergesort-dup', label: 'Remove duplicate mergesort.cpp' },
      { id: 'cross-platform', label: 'Cross-platform path handling' },
    ],
  },
  {
    id: 'persistence',
    title: 'Persistence & output',
    items: [
      { id: 'data-export', label: 'Write crawl results under data/' },
      { id: 'resume', label: 'Resume crawl from saved frontier' },
      { id: 'log-rotate', label: 'Rotate or cap log size' },
    ],
  },
  {
    id: 'ux',
    title: 'UX',
    items: [
      { id: 'ansi-cross', label: 'Non-Windows ANSI without windows.h' },
      { id: 'config-file', label: 'Config file for non-interactive runs' },
      { id: 'progress', label: 'Progress indicator for long crawls' },
      { id: 'web-ui-backend', label: 'Connect web UI to C++ crawler backend' },
    ],
  },
  {
    id: 'course',
    title: 'Course / submission',
    items: [
      { id: 'uml', label: 'UML / architecture diagram for report' },
      { id: 'demo-video', label: 'Record demo URL set for grading video' },
      { id: 'ethics', label: 'Ethics paragraph for README / report' },
    ],
  },
  {
    id: 'parking',
    title: 'Parking lot',
    items: [
      { id: 'sitemap', label: 'Sitemap generation' },
      { id: 'keyword-index', label: 'Keyword index' },
      { id: 'async-fetch', label: 'Async fetch / politeness pool per host' },
    ],
  },
];

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetSettings() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS };
}

export function loadGoalState() {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setGoalDone(goalId, done) {
  const state = loadGoalState();
  if (done) state[goalId] = true;
  else delete state[goalId];
  localStorage.setItem(GOALS_KEY, JSON.stringify(state));
  return state;
}

export function countGoals() {
  const state = loadGoalState();
  const total = GOAL_SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = Object.keys(state).filter((k) => state[k]).length;
  return { done, total };
}
