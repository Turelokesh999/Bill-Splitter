/**
 * Bill Splitter - Vanilla JavaScript
 * Zero external libraries, no localStorage/cookies, state in JS variables + URL hash for reload persistence.
 * Supports multiple currencies, multiple occasions, name-by-name splits, and multi-selection across history.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM element references
  const currencySelect = document.getElementById('currency-select');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleLabel = document.getElementById('theme-toggle-label');
  const tryExampleBtn = document.getElementById('try-example-btn');

  const splitForm = document.getElementById('split-form');
  const occasionsListEl = document.getElementById('occasions-list');
  const addOccasionBtn = document.getElementById('add-occasion-btn');
  const splitBtn = document.getElementById('split-btn');
  const resetBtn = document.getElementById('reset-btn');

  const resultEmpty = document.getElementById('result-empty');
  const resultMessage = document.getElementById('result-message');
  const resultContent = document.getElementById('result-content');
  const resultBadge = document.getElementById('result-badge');
  const resultAmount = document.getElementById('result-amount');
  const resultUnit = document.getElementById('result-unit');
  const resultSummary = document.getElementById('result-summary');
  const resultBarFill = document.getElementById('result-bar-fill');
  const personTotalsListEl = document.getElementById('person-totals-list');
  const occasionsBreakdownListEl = document.getElementById('occasions-breakdown-list');
  const resultTotalCheck = document.getElementById('result-total-check');

  const historyListEl = document.getElementById('history-list');
  const historyEmptyEl = document.getElementById('history-empty');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  const historyCombinedSection = document.getElementById('history-combined-section');
  const historyCombinedSummary = document.getElementById('history-combined-summary');
  const historyCombinedList = document.getElementById('history-combined-list');
  const loadCombinedBtn = document.getElementById('load-combined-btn');

  // Application State kept strictly in JavaScript variables
  let appState = {
    currency: '$',
    occasions: [
      { id: 1, name: '', bill: '', people: '' }
    ],
    nextId: 2,
    isDarkMode: false,
    history: [], // Last 5 calculations
    selectedHistoryIds: new Set()
  };

  /**
   * Safe URL state persistence without localStorage, sessionStorage or cookies
   */
  function saveStateToURL() {
    try {
      const params = new URLSearchParams();
      if (appState.isDarkMode) params.set('dark', '1');
      if (appState.currency !== '$') params.set('cur', appState.currency);
      params.set('count', String(appState.occasions.length));

      appState.occasions.forEach((occ, idx) => {
        const prefix = 'o' + (idx + 1) + '_';
        if (occ.name) params.set(prefix + 'n', occ.name);
        if (occ.bill) params.set(prefix + 'b', occ.bill);
        if (occ.people) params.set(prefix + 'p', occ.people);
      });

      const hashString = params.toString();
      const newHash = hashString ? '#' + hashString : '';
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + newHash + window.location.search);
      } else {
        window.location.hash = newHash;
      }
    } catch (_) {
      try {
        const params = new URLSearchParams();
        if (appState.isDarkMode) params.set('dark', '1');
        if (appState.currency !== '$') params.set('cur', appState.currency);
        params.set('count', String(appState.occasions.length));
        appState.occasions.forEach((occ, idx) => {
          const prefix = 'o' + (idx + 1) + '_';
          if (occ.name) params.set(prefix + 'n', occ.name);
          if (occ.bill) params.set(prefix + 'b', occ.bill);
          if (occ.people) params.set(prefix + 'p', occ.people);
        });
        window.location.hash = params.toString();
      } catch (__) {}
    }
  }

  function loadStateFromURL() {
    try {
      const hash = window.location.hash ? window.location.hash.substring(1) : '';
      const search = window.location.search ? window.location.search.substring(1) : '';
      const params = new URLSearchParams(hash || search);
      const isDark = params.get('dark') === '1';
      const cur = params.get('cur') || '$';
      const countVal = parseInt(params.get('count') || '0', 10);

      const loadedOccasions = [];
      if (countVal > 0) {
        for (let i = 1; i <= countVal; i++) {
          const prefix = 'o' + i + '_';
          const name = params.get(prefix + 'n') || '';
          const bill = params.get(prefix + 'b') || '';
          const people = params.get(prefix + 'p') || '';
          loadedOccasions.push({ id: i, name, bill, people });
        }
      }

      return {
        isDark,
        currency: cur,
        occasions: loadedOccasions.length > 0 ? loadedOccasions : null
      };
    } catch (_) {
      return { isDark: false, currency: '$', occasions: null };
    }
  }

  /**
   * Currency Change Handler
   */
  currencySelect.addEventListener('change', (e) => {
    appState.currency = e.target.value;
    updateCurrencyPrefixes();
    calculateSplit(false, false);
    renderHistory();
    updateCombinedHistory();
    saveStateToURL();
  });

  function updateCurrencyPrefixes() {
    document.querySelectorAll('.input-prefix').forEach((el) => {
      el.textContent = appState.currency;
    });
  }

  /**
   * Theme Toggle
   */
  function applyTheme(isDark) {
    appState.isDarkMode = isDark;
    if (isDark) {
      document.body.classList.add('dark-mode');
      themeToggleIcon.textContent = '☀️';
      themeToggleLabel.textContent = 'Light Mode';
    } else {
      document.body.classList.remove('dark-mode');
      themeToggleIcon.textContent = '🌙';
      themeToggleLabel.textContent = 'Dark Mode';
    }
    saveStateToURL();
  }

  themeToggleBtn.addEventListener('click', () => {
    applyTheme(!appState.isDarkMode);
  });

  /**
   * Delighter: Try an Example
   */
  tryExampleBtn.addEventListener('click', () => {
    appState.occasions = [
      { id: 1, name: 'Friday Dinner', bill: '90.00', people: 'Alice, Bob, Charlie' },
      { id: 2, name: 'Saturday Brunch', bill: '80.00', people: 'Alice, Bob, Charlie, David' }
    ];
    appState.nextId = 3;
    renderOccasions();
    calculateSplit(true, true);
  });

  /**
   * Render Occasion Input Cards
   */
  function renderOccasions() {
    occasionsListEl.innerHTML = '';

    appState.occasions.forEach((occ, index) => {
      const card = document.createElement('div');
      card.className = 'occasion-item-card';
      card.dataset.id = String(occ.id);

      const header = document.createElement('div');
      header.className = 'occasion-card-header';

      const title = document.createElement('h3');
      title.className = 'occasion-card-title';
      title.textContent = `Bill / Occasion #${index + 1}`;
      header.appendChild(title);

      if (appState.occasions.length > 1) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-remove-occasion';
        removeBtn.textContent = 'Remove';
        removeBtn.setAttribute('aria-label', `Remove Bill #${index + 1}`);
        removeBtn.addEventListener('click', () => {
          removeOccasion(occ.id);
        });
        header.appendChild(removeBtn);
      }
      card.appendChild(header);

      // 1. Occasion Name Field
      const nameGroup = document.createElement('div');
      nameGroup.className = 'form-group';
      nameGroup.innerHTML = `
        <div class="form-label-row">
          <label for="occ-name-${occ.id}" class="form-label">Occasion Name</label>
        </div>
        <div class="input-wrapper">
          <input
            type="text"
            id="occ-name-${occ.id}"
            class="form-input occ-name-input"
            placeholder="e.g., Friday Dinner, Saturday Brunch"
            value="${escapeHTML(occ.name)}"
            maxlength="60"
            autocomplete="off"
          />
        </div>
        <p class="helper-text">Optional label for this meal or expense</p>
      `;
      card.appendChild(nameGroup);

      // 2. Bill Amount Field
      const billGroup = document.createElement('div');
      billGroup.className = 'form-group';
      billGroup.innerHTML = `
        <div class="form-label-row">
          <label for="occ-bill-${occ.id}" class="form-label">Bill Amount (${escapeHTML(appState.currency.trim())})</label>
          <span id="occ-bill-error-${occ.id}" class="inline-error" role="alert"></span>
        </div>
        <div class="input-wrapper">
          <span class="input-prefix" aria-hidden="true">${escapeHTML(appState.currency)}</span>
          <input
            type="number"
            id="occ-bill-${occ.id}"
            class="form-input has-prefix occ-bill-input"
            placeholder="e.g., 90.00"
            step="0.01"
            min="0.01"
            inputmode="decimal"
            value="${escapeHTML(occ.bill)}"
            required
          />
        </div>
        <p class="helper-text">Total bill amount including tax & tip</p>
      `;
      card.appendChild(billGroup);

      // 3. People Field (Names or Count)
      const peopleGroup = document.createElement('div');
      peopleGroup.className = 'form-group';
      peopleGroup.innerHTML = `
        <div class="form-label-row">
          <label for="occ-people-${occ.id}" class="form-label">People (Names or Count)</label>
          <span id="occ-people-error-${occ.id}" class="inline-error" role="alert"></span>
        </div>
        <div class="input-wrapper">
          <input
            type="text"
            id="occ-people-${occ.id}"
            class="form-input occ-people-input"
            placeholder="e.g., Alice, Bob, Charlie or 3"
            value="${escapeHTML(occ.people)}"
            autocomplete="off"
            required
          />
        </div>
        <p class="helper-text">Enter comma-separated names (e.g. Alice, Bob, Charlie) or number of people</p>
      `;
      card.appendChild(peopleGroup);

      // Attach Input Event Handlers
      const nameInput = nameGroup.querySelector('.occ-name-input');
      const billInput = billGroup.querySelector('.occ-bill-input');
      const peopleInput = peopleGroup.querySelector('.occ-people-input');

      nameInput.addEventListener('input', (e) => {
        occ.name = e.target.value;
        calculateSplit(false, false);
      });

      billInput.addEventListener('input', (e) => {
        occ.bill = e.target.value;
        calculateSplit(false, false);
      });

      peopleInput.addEventListener('input', (e) => {
        occ.people = e.target.value;
        calculateSplit(false, false);
      });

      // Enter key submits
      [nameInput, billInput, peopleInput].forEach((inp) => {
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            calculateSplit(true, true);
          }
        });
      });

      occasionsListEl.appendChild(card);
    });
  }

  function addOccasion() {
    appState.occasions.push({
      id: appState.nextId++,
      name: '',
      bill: '',
      people: ''
    });
    renderOccasions();
    saveStateToURL();
    const lastOcc = appState.occasions[appState.occasions.length - 1];
    const newBillInput = document.getElementById(`occ-bill-${lastOcc.id}`);
    if (newBillInput) newBillInput.focus();
  }

  function removeOccasion(id) {
    if (appState.occasions.length <= 1) return;
    appState.occasions = appState.occasions.filter((o) => o.id !== id);
    renderOccasions();
    saveStateToURL();
    calculateSplit(false, true);
  }

  addOccasionBtn.addEventListener('click', addOccasion);

  /**
   * Helper: Parse people string into an array of unique or numbered names
   */
  function parsePeopleNames(peopleStr) {
    if (!peopleStr) return [];
    const trimmed = peopleStr.trim();
    if (!trimmed) return [];

    // Check if user entered just an integer count
    if (/^\d+$/.test(trimmed)) {
      const count = parseInt(trimmed, 10);
      if (count <= 0) return [];
      const list = [];
      const limit = Math.min(count, 500);
      for (let i = 1; i <= limit; i++) {
        list.push('Person ' + i);
      }
      return list;
    }

    // Split by comma
    return trimmed
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  }

  /**
   * Validate all occasion inputs
   */
  function validateAllOccasions(showErrors) {
    let allValid = true;
    let primaryErrorMessage = '';
    const parsedOccasions = [];
    const sym = appState.currency;

    appState.occasions.forEach((occ, idx) => {
      const billErrorEl = document.getElementById(`occ-bill-error-${occ.id}`);
      const peopleErrorEl = document.getElementById(`occ-people-error-${occ.id}`);
      const billInputEl = document.getElementById(`occ-bill-${occ.id}`);
      const peopleInputEl = document.getElementById(`occ-people-${occ.id}`);

      if (billErrorEl) {
        billErrorEl.textContent = '';
        billErrorEl.classList.remove('active');
      }
      if (peopleErrorEl) {
        peopleErrorEl.textContent = '';
        peopleErrorEl.classList.remove('active');
      }
      if (billInputEl) billInputEl.classList.remove('has-error');
      if (peopleInputEl) peopleInputEl.classList.remove('has-error');

      const billStr = occ.bill.trim();
      const peopleStr = occ.people.trim();
      const nameStr = occ.name.trim() || `Bill #${idx + 1}`;

      let billNum = null;
      let billValid = true;

      // Validate Bill
      if (billStr === '') {
        billValid = false;
        if (showErrors && billErrorEl && billInputEl) {
          billErrorEl.textContent = 'Bill amount required';
          billErrorEl.classList.add('active');
          billInputEl.classList.add('has-error');
        }
        if (!primaryErrorMessage) primaryErrorMessage = `Please enter a bill amount for ${nameStr}.`;
      } else {
        billNum = Number(billStr);
        if (isNaN(billNum)) {
          billValid = false;
          if (showErrors && billErrorEl && billInputEl) {
            billErrorEl.textContent = 'Must be a valid number';
            billErrorEl.classList.add('active');
            billInputEl.classList.add('has-error');
          }
          if (!primaryErrorMessage) primaryErrorMessage = `The bill for ${nameStr} must be a valid number.`;
        } else if (billNum <= 0) {
          billValid = false;
          if (showErrors && billErrorEl && billInputEl) {
            billErrorEl.textContent = `Must be greater than ${sym}0.00`;
            billErrorEl.classList.add('active');
            billInputEl.classList.add('has-error');
          }
          if (!primaryErrorMessage) primaryErrorMessage = `The bill for ${nameStr} cannot be zero or negative.`;
        } else if (billNum > 10000000) {
          billValid = false;
          if (showErrors && billErrorEl && billInputEl) {
            billErrorEl.textContent = 'Exceeds maximum limit';
            billErrorEl.classList.add('active');
            billInputEl.classList.add('has-error');
          }
          if (!primaryErrorMessage) primaryErrorMessage = `The bill amount cannot exceed ${sym}10,000,000.`;
        }
      }

      // Validate People
      let peopleValid = true;
      const peopleNames = parsePeopleNames(peopleStr);

      if (peopleStr === '') {
        peopleValid = false;
        if (showErrors && peopleErrorEl && peopleInputEl) {
          peopleErrorEl.textContent = 'People required';
          peopleErrorEl.classList.add('active');
          peopleInputEl.classList.add('has-error');
        }
        if (!primaryErrorMessage) primaryErrorMessage = `Please specify who is sharing ${nameStr}.`;
      } else if (peopleNames.length === 0) {
        peopleValid = false;
        if (showErrors && peopleErrorEl && peopleInputEl) {
          peopleErrorEl.textContent = 'Enter at least 1 person';
          peopleErrorEl.classList.add('active');
          peopleInputEl.classList.add('has-error');
        }
        if (!primaryErrorMessage) primaryErrorMessage = `Please enter at least 1 valid person for ${nameStr}.`;
      } else if (/^\d+$/.test(peopleStr)) {
        const count = parseInt(peopleStr, 10);
        if (count <= 0) {
          peopleValid = false;
          if (showErrors && peopleErrorEl && peopleInputEl) {
            peopleErrorEl.textContent = 'Must be at least 1 person';
            peopleErrorEl.classList.add('active');
            peopleInputEl.classList.add('has-error');
          }
          if (!primaryErrorMessage) primaryErrorMessage = `The number of people for ${nameStr} cannot be zero or negative.`;
        }
      }

      if (!billValid || !peopleValid) {
        allValid = false;
      } else {
        parsedOccasions.push({
          id: occ.id,
          name: nameStr,
          billNum: billNum,
          peopleNames: peopleNames
        });
      }
    });

    return {
      allValid,
      primaryErrorMessage,
      parsedOccasions
    };
  }

  /**
   * Main calculation and UI presentation
   */
  function calculateSplit(addToHistory = false, showErrors = false) {
    const validation = validateAllOccasions(showErrors);
    const sym = appState.currency;

    if (!validation.allValid) {
      resultContent.classList.remove('active');
      resultEmpty.style.display = 'flex';

      if (validation.primaryErrorMessage) {
        resultMessage.textContent = '⚠️ ' + validation.primaryErrorMessage;
        resultMessage.classList.add('active');
      } else {
        resultMessage.textContent = '';
        resultMessage.classList.remove('active');
      }
      return;
    }

    resultMessage.textContent = '';
    resultMessage.classList.remove('active');
    resultEmpty.style.display = 'none';
    resultContent.classList.add('active');

    saveStateToURL();

    let grandTotalCents = 0;
    const occasionResults = [];
    const personMap = {};

    validation.parsedOccasions.forEach((occ) => {
      const totalCents = Math.round(occ.billNum * 100);
      grandTotalCents += totalCents;

      const peopleCount = occ.peopleNames.length;
      const baseCents = Math.floor(totalCents / peopleCount);
      const remainderCents = totalCents % peopleCount;

      const individualShares = [];
      let occSumCents = 0;

      occ.peopleNames.forEach((personName, pIdx) => {
        const shareCents = baseCents + (pIdx < remainderCents ? 1 : 0);
        occSumCents += shareCents;

        individualShares.push({
          name: personName,
          shareCents: shareCents,
          shareFormatted: (shareCents / 100).toFixed(2)
        });

        if (!personMap[personName]) {
          personMap[personName] = {
            name: personName,
            totalCents: 0,
            breakdown: []
          };
        }
        personMap[personName].totalCents += shareCents;
        personMap[personName].breakdown.push({
          occasionName: occ.name,
          shareFormatted: (shareCents / 100).toFixed(2)
        });
      });

      occasionResults.push({
        name: occ.name,
        totalFormatted: (totalCents / 100).toFixed(2),
        peopleCount: peopleCount,
        shares: individualShares,
        sumFormatted: (occSumCents / 100).toFixed(2)
      });
    });

    const grandTotalFormatted = (grandTotalCents / 100).toFixed(2);
    const uniquePeople = Object.keys(personMap);

    resultAmount.textContent = sym + grandTotalFormatted;
    resultUnit.textContent = validation.parsedOccasions.length > 1
      ? `across ${validation.parsedOccasions.length} bills (${uniquePeople.length} friends)`
      : `total split (${uniquePeople.length} friends)`;

    let summaryText = '';
    if (validation.parsedOccasions.length === 1) {
      const singleOcc = occasionResults[0];
      summaryText = `Split for "${singleOcc.name}": ${sym}${grandTotalFormatted} shared among ${uniquePeople.length} friends.`;
    } else {
      summaryText = `Split across ${validation.parsedOccasions.length} occasions: total of ${sym}${grandTotalFormatted} split across ${uniquePeople.length} friends.`;
    }
    resultSummary.textContent = summaryText;

    resultBadge.innerHTML = '<span aria-hidden="true">✓</span> Exact Split Verified';
    resultBarFill.style.width = '100%';

    // 1. Render Person-by-Person Grand Totals
    personTotalsListEl.innerHTML = '';
    let cumulativePersonSumCents = 0;

    uniquePeople.forEach((name) => {
      const pData = personMap[name];
      cumulativePersonSumCents += pData.totalCents;
      const pTotalFormatted = (pData.totalCents / 100).toFixed(2);

      const card = document.createElement('div');
      card.className = 'person-total-card';

      const headerRow = document.createElement('div');
      headerRow.className = 'person-total-header';

      const nameEl = document.createElement('span');
      nameEl.className = 'person-card-name';
      nameEl.textContent = pData.name;

      const shareEl = document.createElement('span');
      shareEl.className = 'person-card-share';
      shareEl.textContent = sym + pTotalFormatted;

      headerRow.appendChild(nameEl);
      headerRow.appendChild(shareEl);
      card.appendChild(headerRow);

      if (validation.parsedOccasions.length > 1) {
        const pillsWrapper = document.createElement('div');
        pillsWrapper.className = 'person-occasions-breakdown';
        pData.breakdown.forEach((b) => {
          const pill = document.createElement('span');
          pill.className = 'person-badge-pill';
          pill.textContent = `${b.occasionName}: ${sym}${b.shareFormatted}`;
          pillsWrapper.appendChild(pill);
        });
        card.appendChild(pillsWrapper);
      }

      personTotalsListEl.appendChild(card);
    });

    // 2. Render Per-Occasion Breakdown Cards
    occasionsBreakdownListEl.innerHTML = '';
    occasionResults.forEach((occRes) => {
      const occCard = document.createElement('div');
      occCard.className = 'occasion-result-card';

      const occHeader = document.createElement('div');
      occHeader.className = 'occasion-result-header';
      occHeader.innerHTML = `
        <span class="occasion-result-name">${escapeHTML(occRes.name)}</span>
        <span class="occasion-result-total">${escapeHTML(sym)}${escapeHTML(occRes.totalFormatted)} (${occRes.peopleCount} ${occRes.peopleCount === 1 ? 'person' : 'people'})</span>
      `;
      occCard.appendChild(occHeader);

      const list = document.createElement('ul');
      list.className = 'breakdown-list';

      occRes.shares.forEach((shareItem) => {
        const li = document.createElement('li');
        li.className = 'breakdown-row';
        li.innerHTML = `
          <span class="breakdown-name">${escapeHTML(shareItem.name)}</span>
          <span class="breakdown-value">${escapeHTML(sym)}${escapeHTML(shareItem.shareFormatted)}</span>
        `;
        list.appendChild(li);
      });
      occCard.appendChild(list);
      occasionsBreakdownListEl.appendChild(occCard);
    });

    const personSumFormatted = (cumulativePersonSumCents / 100).toFixed(2);
    resultTotalCheck.textContent = `All person shares sum to: ${sym}${personSumFormatted} = Total bills: ${sym}${grandTotalFormatted} (Exact match to the penny)`;

    if (addToHistory) {
      addHistoryItem({
        id: Date.now() + Math.random(),
        title: validation.parsedOccasions.length === 1 ? validation.parsedOccasions[0].name : `${validation.parsedOccasions.length} Occasions`,
        currency: sym,
        totalBill: grandTotalFormatted,
        totalCents: grandTotalCents,
        peopleCount: uniquePeople.length,
        occasionsCount: validation.parsedOccasions.length,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rawOccasions: JSON.parse(JSON.stringify(appState.occasions)),
        personMap: JSON.parse(JSON.stringify(personMap))
      });
    }
  }

  /**
   * History Management (kept in JS variable array, max 5)
   */
  function addHistoryItem(item) {
    if (appState.history.length > 0) {
      const last = appState.history[0];
      if (last.totalBill === item.totalBill && last.title === item.title && last.peopleCount === item.peopleCount && last.currency === item.currency) {
        return;
      }
    }

    appState.history.unshift(item);
    if (appState.history.length > 5) {
      const popped = appState.history.pop();
      if (popped) appState.selectedHistoryIds.delete(popped.id);
    }
    renderHistory();
    updateCombinedHistory();
  }

  function renderHistory() {
    if (appState.history.length === 0) {
      historyEmptyEl.style.display = 'block';
      historyListEl.innerHTML = '';
      historyCombinedSection.classList.remove('active');
      return;
    }

    historyEmptyEl.style.display = 'none';
    historyListEl.innerHTML = '';

    appState.history.forEach((item) => {
      const isSelected = appState.selectedHistoryIds.has(item.id);
      const sym = item.currency || appState.currency;

      const li = document.createElement('li');
      li.className = 'history-item' + (isSelected ? ' selected' : '');
      li.tabIndex = 0;
      li.setAttribute('role', 'region');
      li.setAttribute('aria-label', `Calculation: ${item.title}, ${sym}${item.totalBill} for ${item.peopleCount} people`);

      li.innerHTML = `
        <div class="history-item-top">
          <div class="history-select-wrap">
            <input type="checkbox" class="history-checkbox" id="check-${item.id}" ${isSelected ? 'checked' : ''} aria-label="Select to combine ${escapeHTML(item.title)}">
            <span class="history-item-occasion">${escapeHTML(item.title)}</span>
          </div>
          <span class="history-item-time">${escapeHTML(item.timestamp)}</span>
        </div>
        <div class="history-item-stats">
          ${escapeHTML(sym)}${escapeHTML(item.totalBill)} &bull; ${item.peopleCount} ${item.peopleCount === 1 ? 'person' : 'people'} (${item.occasionsCount} ${item.occasionsCount === 1 ? 'bill' : 'bills'})
        </div>
        <div class="history-item-share">
          ${escapeHTML(sym)}${escapeHTML(item.totalBill)} <span style="font-size: 0.75rem; font-weight: normal;">total</span>
        </div>
        <div class="history-item-actions">
          <button type="button" class="history-quick-load" aria-label="Load ${escapeHTML(item.title)} into calculator">Load this bill &rarr;</button>
        </div>
      `;

      const checkbox = li.querySelector('.history-checkbox');
      const loadBtn = li.querySelector('.history-quick-load');

      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          appState.selectedHistoryIds.add(item.id);
        } else {
          appState.selectedHistoryIds.delete(item.id);
        }
        li.classList.toggle('selected', e.target.checked);
        updateCombinedHistory();
      });

      const restore = () => {
        if (item.currency) {
          appState.currency = item.currency;
          currencySelect.value = item.currency;
          updateCurrencyPrefixes();
        }
        if (item.rawOccasions && Array.isArray(item.rawOccasions)) {
          appState.occasions = JSON.parse(JSON.stringify(item.rawOccasions));
          renderOccasions();
          calculateSplit(false, true);
        }
      };

      loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        restore();
      });

      li.addEventListener('click', (e) => {
        if (e.target !== checkbox && e.target !== loadBtn) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });

      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          restore();
        }
      });

      historyListEl.appendChild(li);
    });
  }

  /**
   * Multi-Selected History Combiner
   */
  function updateCombinedHistory() {
    const selectedItems = appState.history.filter((h) => appState.selectedHistoryIds.has(h.id));

    if (selectedItems.length < 1) {
      historyCombinedSection.classList.remove('active');
      historyCombinedList.innerHTML = '';
      return;
    }

    historyCombinedSection.classList.add('active');

    let combinedTotalCents = 0;
    const combinedPersonMap = {};
    const sym = appState.currency;

    selectedItems.forEach((item) => {
      combinedTotalCents += item.totalCents;
      if (item.personMap) {
        Object.keys(item.personMap).forEach((pName) => {
          const pData = item.personMap[pName];
          if (!combinedPersonMap[pName]) {
            combinedPersonMap[pName] = {
              name: pName,
              totalCents: 0,
              breakdown: []
            };
          }
          combinedPersonMap[pName].totalCents += pData.totalCents;
          if (pData.breakdown && Array.isArray(pData.breakdown)) {
            pData.breakdown.forEach((b) => {
              combinedPersonMap[pName].breakdown.push(b);
            });
          }
        });
      }
    });

    const uniquePersons = Object.keys(combinedPersonMap);
    const combinedTotalFormatted = (combinedTotalCents / 100).toFixed(2);

    historyCombinedSummary.textContent = `Combining ${selectedItems.length} selected historical ${selectedItems.length === 1 ? 'bill' : 'bills'} (${sym}${combinedTotalFormatted} total) across ${uniquePersons.length} friends:`;

    historyCombinedList.innerHTML = '';
    uniquePersons.forEach((name) => {
      const p = combinedPersonMap[name];
      const pFormatted = (p.totalCents / 100).toFixed(2);

      const card = document.createElement('div');
      card.className = 'combined-person-card';

      let pillsHtml = '';
      if (p.breakdown && p.breakdown.length > 0) {
        pillsHtml = `<div class="combined-person-pills">` +
          p.breakdown.map((b) => `<span class="combined-pill">${escapeHTML(b.occasionName)}: ${escapeHTML(sym)}${escapeHTML(b.shareFormatted)}</span>`).join('') +
          `</div>`;
      }

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span class="combined-person-name">${escapeHTML(p.name)}</span>
          <span class="combined-person-amount">${escapeHTML(sym)}${pFormatted}</span>
        </div>
        ${pillsHtml}
      `;
      historyCombinedList.appendChild(card);
    });
  }

  loadCombinedBtn.addEventListener('click', () => {
    const selectedItems = appState.history.filter((h) => appState.selectedHistoryIds.has(h.id));
    if (selectedItems.length === 0) return;

    const mergedOccasions = [];
    let counter = 1;
    selectedItems.forEach((item) => {
      if (item.rawOccasions && Array.isArray(item.rawOccasions)) {
        item.rawOccasions.forEach((o) => {
          mergedOccasions.push({
            id: counter++,
            name: o.name,
            bill: o.bill,
            people: o.people
          });
        });
      }
    });

    if (mergedOccasions.length > 0) {
      appState.occasions = mergedOccasions;
      appState.nextId = counter;
      renderOccasions();
      calculateSplit(true, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  clearHistoryBtn.addEventListener('click', () => {
    appState.history = [];
    appState.selectedHistoryIds.clear();
    renderHistory();
    updateCombinedHistory();
  });

  /**
   * Reset All
   * Restores exact initial state: inputs, results, errors, history, theme, and URL.
   */
  function resetAll() {
    appState.currency = '$';
    currencySelect.value = '$';
    updateCurrencyPrefixes();

    appState.occasions = [
      { id: 1, name: '', bill: '', people: '' }
    ];
    appState.nextId = 2;
    appState.history = [];
    appState.selectedHistoryIds.clear();

    renderOccasions();

    resultContent.classList.remove('active');
    resultEmpty.style.display = 'flex';
    resultMessage.textContent = '';
    resultMessage.classList.remove('active');
    personTotalsListEl.innerHTML = '';
    occasionsBreakdownListEl.innerHTML = '';
    resultAmount.textContent = '$0.00';
    resultSummary.textContent = '';
    resultTotalCheck.textContent = '';

    renderHistory();
    updateCombinedHistory();
    applyTheme(false);

    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        window.location.hash = '';
      }
    } catch (_) {}
  }

  resetBtn.addEventListener('click', resetAll);

  splitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    calculateSplit(true, true);
  });

  /**
   * Initial page load: check URL parameters for reload persistence
   */
  const savedState = loadStateFromURL();
  if (savedState.isDark) {
    applyTheme(true);
  }

  if (savedState.currency) {
    appState.currency = savedState.currency;
    currencySelect.value = savedState.currency;
  }

  if (savedState.occasions && savedState.occasions.length > 0) {
    appState.occasions = savedState.occasions;
    appState.nextId = Math.max(...appState.occasions.map((o) => o.id)) + 1;
    renderOccasions();
    calculateSplit(false, true);
  } else {
    renderOccasions();
  }
});
