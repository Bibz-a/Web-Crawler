const $ = (sel) => document.querySelector(sel);

export function initLicenseDialog() {
  const dialog = $('#license-dialog');
  const wordmark = $('.sidebar__wordmark');
  const closeBtn = $('#license-close');
  if (!dialog) return;

  let clicks = 0;
  let clickTimer = null;

  wordmark?.addEventListener('click', () => {
    clicks += 1;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clicks = 0; }, 600);
    if (clicks >= 3) {
      clicks = 0;
      dialog.hidden = false;
      dialog.setAttribute('aria-hidden', 'false');
    }
  });

  closeBtn?.addEventListener('click', () => {
    dialog.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.hidden = true;
      dialog.setAttribute('aria-hidden', 'true');
    }
  });
}
