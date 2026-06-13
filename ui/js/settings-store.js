const STORAGE_KEY = 'crawler_ui_settings';



export const DEFAULT_SETTINGS = {

  logLimit: '50',

};



export const GOAL_SECTIONS = [

  {

    id: 'crawler',

    title: 'Crawler behavior',

    items: [

      'Respect robots.txt (fetch, parse, filter)',

      'Optional delay / rate limit between requests',

      'Max pages cap in addition to depth',

      'Same-host only toggle',

      'Handle redirects explicitly',

      'Retry with backoff on transient failures',

    ],

  },

  {

    id: 'parser',

    title: 'Parser & URLs',

    items: [

      'Stronger href extraction',

      'Strip fragments for deduplication',

      'Normalize trailing slashes & ports',

      'MIME check — text/html only',

    ],

  },

  {

    id: 'code',

    title: 'Data structures & code quality',

    items: [

      'Align Graph README vs implementation',

      'Unit tests for Queue, Stack, HashMap, sort',

      'Remove duplicate mergesort.cpp',

      'Cross-platform path handling',

    ],

  },

  {

    id: 'persistence',

    title: 'Persistence & output',

    items: [

      'Resume crawl from saved frontier',

      'Rotate or cap log size',

    ],

  },

  {

    id: 'ux',

    title: 'UX',

    items: [

      'Non-Windows ANSI without windows.h',

      'Config file for non-interactive runs',

    ],

  },

  {

    id: 'course',

    title: 'Course / submission',

    items: [

      'UML / architecture diagram for report',

      'Record demo URL set for grading video',

      'Ethics paragraph for README / report',

    ],

  },

  {

    id: 'parking',

    title: 'Parking lot',

    items: [

      'Sitemap generation',

      'Keyword index',

      'Async fetch / politeness pool per host',

    ],

  },

];



export function loadSettings() {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);

    return { logLimit: parsed.logLimit || DEFAULT_SETTINGS.logLimit };

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


