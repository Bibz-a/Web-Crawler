import {

  loadSettings,

  saveSettings,

  resetSettings,

  GOAL_SECTIONS,

} from './settings-store.js';



const $ = (sel) => document.querySelector(sel);



export class SettingsPanel {

  constructor(onSave) {

    this.onSave = onSave;

    this.settings = loadSettings();



    this.statusEl = $('#settings-status');

    this.goalsEl = $('#goals-board');

    this.logLimitEl = $('#settings-log-limit');



    this._bindForm();

    this._renderGoals();

    this.loadIntoForm(this.settings);

  }



  loadIntoForm(s) {

    this.settings = s;

    this.logLimitEl.value = s.logLimit || '50';

  }



  collectFromForm() {

    return {

      logLimit: this.logLimitEl.value,

    };

  }



  _bindForm() {

    $('#settings-save')?.addEventListener('click', () => this.save());

    $('#settings-reset')?.addEventListener('click', () => this.reset());

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



    this.goalsEl.innerHTML = GOAL_SECTIONS.map((section) => `

        <div class="goal-section">

          <div class="goal-section__head">

            <span class="goal-section__title">${section.title}</span>

            <span class="goal-section__count">${section.items.length}</span>

          </div>

          <ul class="goal-section__list">

            ${section.items

              .map((label) => `

              <li class="goal-item">

                <span class="goal-item__text">${label}</span>

              </li>`)

              .join('')}

          </ul>

        </div>`).join('');

  }

}


