import {
  loadSettings,
  saveSettings,
  resetSettings,
  GOAL_SECTIONS,
  loadGoalState,
  setGoalDone,
  countGoals,
} from './settings-store.js';

const $ = (sel) => document.querySelector(sel);

export class SettingsPanel {
  constructor(onSave) {
    this.onSave = onSave;
    this.settings = loadSettings();

    this.statusEl = $('#settings-status');
    this.goalsEl = $('#goals-board');
    this.progressEl = $('#goals-progress');
    this.delayEl = $('#settings-delay');
    this.maxPagesEl = $('#settings-max-pages');
    this.logLimitEl = $('#settings-log-limit');

    this._bindForm();
    this._renderGoals();
    this.loadIntoForm(this.settings);
  }

  loadIntoForm(s) {
    this.settings = s;
    this.delayEl.value = String(s.requestDelayMs);
    this.maxPagesEl.value = String(s.maxPages);
    this.logLimitEl.value = s.logLimit || '50';
  }

  collectFromForm() {
    return {
      requestDelayMs: Math.max(0, parseInt(this.delayEl.value, 10) || 0),
      maxPages: Math.max(0, parseInt(this.maxPagesEl.value, 10) || 0),
      logLimit: this.logLimitEl.value,
    };
  }

  _bindForm() {
    $('#settings-save')?.addEventListener('click', () => this.save());
    $('#settings-reset')?.addEventListener('click', () => this.reset());

    this.goalsEl?.addEventListener('change', (e) => {
      const cb = e.target.closest('.goal-item__check');
      if (!cb) return;
      setGoalDone(cb.dataset.goalId, cb.checked);
      this._updateGoalProgress();
    });
  }

  save() {
    const next = saveSettings(this.collectFromForm());
    this.settings = next;
    this._flashStatus('Saved to browser storage');
    this.onSave?.(next);
  }

  reset() {
    const next = resetSettings();
    this.loadIntoForm(next);
    this._flashStatus('Restored defaults');
    this.onSave?.(next);
  }

  _flashStatus(msg) {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg;
    this.statusEl.hidden = false;
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => {
      this.statusEl.hidden = true;
    }, 2800);
  }

  _renderGoals() {
    if (!this.goalsEl) return;
    const state = loadGoalState();

    this.goalsEl.innerHTML = GOAL_SECTIONS.map((section) => {
      const doneInSection = section.items.filter((i) => state[i.id]).length;
      return `
        <div class="goal-section">
          <div class="goal-section__head">
            <span class="goal-section__title">${section.title}</span>
            <span class="goal-section__count">${doneInSection}/${section.items.length}</span>
          </div>
          <ul class="goal-section__list">
            ${section.items
              .map(
                (item) => `
              <li class="goal-item">
                <label class="goal-item__label">
                  <input type="checkbox" class="goal-item__check" data-goal-id="${item.id}"${state[item.id] ? ' checked' : ''}>
                  <span class="goal-item__box"></span>
                  <span class="goal-item__text${state[item.id] ? ' goal-item__text--done' : ''}">${item.label}</span>
                </label>
              </li>`
              )
              .join('')}
          </ul>
        </div>`;
    }).join('');

    this._updateGoalProgress();
  }

  _updateGoalProgress() {
    const { done, total } = countGoals();
    if (this.progressEl) {
      this.progressEl.textContent = `${done} / ${total} complete`;
    }
    this.goalsEl?.querySelectorAll('.goal-section').forEach((el, idx) => {
      const section = GOAL_SECTIONS[idx];
      const state = loadGoalState();
      const doneInSection = section.items.filter((i) => state[i.id]).length;
      const countEl = el.querySelector('.goal-section__count');
      if (countEl) countEl.textContent = `${doneInSection}/${section.items.length}`;
      section.items.forEach((item) => {
        const cb = el.querySelector(`[data-goal-id="${item.id}"]`);
        const text = cb?.closest('.goal-item__label')?.querySelector('.goal-item__text');
        if (text) text.classList.toggle('goal-item__text--done', !!state[item.id]);
      });
    });
  }
}
