const dialog = document.querySelector('#finder-dialog');
const finderContent = document.querySelector('#finder-content');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');

const choices = {
  wineType: [
    ['not-sure', 'Not sure yet'], ['red', 'Red'], ['white', 'White'],
    ['rose', 'Rosé'], ['sparkling', 'Sparkling']
  ],
  taste: [
    ['not-sure', 'Not sure yet'], ['fruit', 'Fruit-driven (fruit aromas; not necessarily sweet)'],
    ['fresh', 'Fresh and crisp'], ['savory', 'Savory or earthy'],
    ['rich', 'Rich and rounded'], ['aromatic', 'Aromatic or floral'],
    ['bubbly', 'Lively and sparkling']
  ],
  sweetness: [
    ['not-sure', 'Not sure yet'], ['dry', 'Dry (little noticeable sweetness)'],
    ['off-dry', 'A hint of sweetness'], ['sweet', 'Noticeably sweet']
  ],
  body: [
    ['not-sure', 'Not sure yet'], ['light', 'Light (lighter feel)'],
    ['medium', 'Medium (some weight)'], ['full', 'Full (richer, weightier feel)']
  ],
  tannin: [
    ['not-sure', 'Not sure yet'], ['low', 'Lower tannin (less drying or grippy)'],
    ['some', 'Some tannin (a little grip)'], ['noticeable', 'Noticeable tannin (more drying or grippy)']
  ],
  occasion: [
    ['not-sure', 'Not sure yet'], ['everyday', 'An everyday glass'],
    ['meal', 'A meal with friends or family'], ['celebration', 'A celebration'],
    ['gift', 'A gift'], ['relaxed', 'A relaxed drink or aperitif']
  ],
  food: [
    ['not-sure', 'Not sure yet'], ['seafood', 'Seafood'], ['poultry', 'Poultry'],
    ['red-meat', 'Red meat or grilled food'], ['vegetables', 'Vegetables or salad'],
    ['spicy', 'Spicy dishes'], ['cheese', 'Cheese'], ['pasta', 'Pasta or pizza'],
    ['snacks', 'Snacks or appetizers'], ['fruit', 'Fresh fruit or dessert']
  ]
};

const questions = [
  { key: 'wineType', title: 'Which wine type sounds right?', help: 'Choose a color or style, or leave it open.' },
  { key: 'taste', title: 'What taste direction appeals to you?', help: 'Fruitiness describes fruit aromas or flavors. It does not tell you how sweet a wine is.' },
  { key: 'sweetness', title: 'How sweet do you like wine?', help: 'Sweetness describes residual sugar. A fruity-smelling wine can still taste dry.' },
  { key: 'body', title: 'What body do you prefer?', help: 'Body is the overall weight or fullness of a wine in your mouth.' },
  { key: 'tannin', title: 'How much tannin feels comfortable?', help: 'Tannin can feel drying or grippy, especially in many red wines. It is separate from body.' },
  { key: 'occasion', title: 'What is the occasion?', help: 'This is a gentle style preference, not a rule about what belongs at an occasion.' },
  { key: 'food', title: 'What food would you like to pair with it?', help: 'Pairings are starting points; your own taste matters most.' }
];

let currentAnswers = emptyAnswers();
let datasetPromise;
let enginePromise;

function emptyAnswers() {
  return Object.fromEntries(questions.map(question => [question.key, 'not-sure']));
}

function focusFinderTitle() {
  finderContent.querySelector('#finder-title')?.focus();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function selectedLabel(key) {
  const selected = choices[key].find(([value]) => value === currentAnswers[key]);
  return selected ? selected[1] : 'Not sure yet';
}

async function loadWineData() {
  if (!datasetPromise) {
    datasetPromise = fetch('wine-data.json?v=20261018')
      .then(response => {
        if (!response.ok) throw new Error(`Dataset request failed (${response.status}).`);
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data.wineStyles)) throw new Error('Wine dataset has no wineStyles list.');
        return data;
      })
      .catch(error => {
        datasetPromise = undefined;
        throw error;
      });
  }
  return datasetPromise;
}

async function loadRecommendationEngine() {
  const existing = window.WineBuddyRecommendationEngine;
  if (existing && typeof existing.rankWines === 'function') return existing;

  if (!enginePromise) {
    enginePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./recommendation-engine.js?v=20261018', document.baseURI).href;
      script.onload = () => {
        const engine = window.WineBuddyRecommendationEngine;
        if (engine && typeof engine.rankWines === 'function') resolve(engine);
        else reject(new Error('The recommendation engine loaded but did not expose rankWines.'));
      };
      script.onerror = () => reject(new Error(
        `Could not load recommendation-engine.js from ${script.src}. Check that the local server is running from the WineBuddy project folder, then reload.`
      ));
      document.head.append(script);
    }).catch(error => {
      enginePromise = undefined;
      throw error;
    });
  }

  return enginePromise;
}

function showFinderForm(prefillType) {
  if (prefillType && choices.wineType.some(([value]) => value === prefillType)) {
    currentAnswers.wineType = prefillType;
  }

  finderContent.innerHTML = `
    <form class="finder-pane finder-form" id="wine-finder-form">
      <p class="eyebrow">YOUR WINE, YOUR WAY</p>
      <h2 id="finder-title" tabindex="-1">A few preferences, a clearer place to start.</h2>
      <p class="finder-intro">Choose what you know; leave anything else at “Not sure yet.” We’ll rank styles from our local wine guide.</p>
      <div class="finder-fields">${questions.map(question => `
        <fieldset class="finder-field">
          <legend>${question.title}</legend>
          <label for="answer-${question.key}">Your answer</label>
          <select id="answer-${question.key}" name="${question.key}">
            ${choices[question.key].map(([value, label]) => `<option value="${value}" ${currentAnswers[question.key] === value ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
          <small>${question.help}</small>
        </fieldset>`).join('')}
      </div>
      <div class="finder-form-actions">
        <button class="button button-primary" type="submit">Show my matches <span aria-hidden="true">→</span></button>
        <button class="text-link" id="reset-finder" type="button">Start over</button>
      </div>
      <p class="finder-method">Points show which dataset tags match your answers. They are not probabilities or ratings; unanswered preferences add zero and mismatches do not subtract points.</p>
    </form>`;

  const form = document.querySelector('#wine-finder-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    currentAnswers = Object.fromEntries(new FormData(form).entries());
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Finding styles…';
    try {
      const [engine, data] = await Promise.all([loadRecommendationEngine(), loadWineData()]);
      const result = engine.rankWines(data.wineStyles, currentAnswers);
      showResults(result, data);
    } catch (error) {
      showDatasetError(error);
    }
  });
  document.querySelector('#reset-finder').addEventListener('click', () => {
    currentAnswers = emptyAnswers();
    showFinderForm();
    focusFinderTitle();
  });
}

function renderReasons(reasons) {
  return reasons.map(reason => `<li><span class="reason-points">+${reason.points}</span><span>${escapeHtml(reason.explanation)}</span></li>`).join('');
}

function renderTradeoffs(tradeoffs) {
  if (!tradeoffs.length) return '';
  return `<div class="recommendation-tradeoffs"><h4>Possible trade-offs</h4><ul>${tradeoffs.map(item => `<li>${escapeHtml(item.explanation)}</li>`).join('')}</ul></div>`;
}

function renderWineCard(match, index) {
  const wine = match.wine;
  const reasons = match.reasons.length
    ? `<h4>Why it matched</h4><ul class="match-reasons">${renderReasons(match.reasons)}</ul>`
    : '<p class="no-match-reasons">A broad beginner suggestion while your preferences are open.</p>';
  return `
    <article class="recommendation-card">
      <div class="recommendation-topline"><span>${index === 0 ? 'TOP MATCH' : `OPTION 0${index + 1}`}</span><strong>${match.score} pts</strong></div>
      <h3>${escapeHtml(wine.name)}</h3>
      <p class="wine-grapes">${escapeHtml(wine.grapeVariety.length ? wine.grapeVariety.join(' · ') : 'Grapes vary by producer')}</p>
      <p class="recommendation-description">${escapeHtml(wine.beginnerExplanation)}</p>
      <div class="wine-profile"><span><strong>Sweetness:</strong> ${escapeHtml(wine.typicalSweetness)}</span><span><strong>Body:</strong> ${escapeHtml(wine.typicalBody)}</span><span><strong>Acidity:</strong> ${escapeHtml(wine.acidity)}</span><span><strong>Tannin:</strong> ${escapeHtml(wine.tanninLevel)}</span></div>
      <p class="wine-profile-key">Acidity is the fresh or tart sensation; it is separate from sweetness. Body is overall weight; tannin is the drying or grippy feel.</p>
      <p class="wine-notes"><strong>Common flavor notes:</strong> ${escapeHtml(wine.flavourNotes.join(', '))}. These are possibilities, not promises.</p>
      ${reasons}${renderTradeoffs(match.tradeoffs)}
      <details class="wine-variability"><summary>How this style can vary</summary><p>${escapeHtml(wine.variabilityNote)}</p></details>
    </article>`;
}

function showResults(ranked, data) {
  const cards = ranked.results.map(renderWineCard).join('');
  const preferenceTradeoffs = ranked.results.some(result => result.tradeoffs.length);
  const notices = [
    ranked.usedBeginnerDefaults ? '<p class="finder-notice">Your answers did not identify a style with a supported match, so these are broad beginner starting points.</p>' : '',
    preferenceTradeoffs ? '<p class="finder-notice">Some preferences point in different directions. Matching preferences earn points; other differences are listed as trade-offs, without subtracting points.</p>' : ''
  ].join('');
  const scoreSummary = ranked.rules.map(rule => `${escapeHtml(rule.label)} +${rule.points}`).join(' · ');

  finderContent.innerHTML = `
    <div class="finder-pane finder-results">
      <p class="eyebrow">A PLACE TO BEGIN · YOUR STYLE MATCHES</p>
      <h2 id="finder-title" tabindex="-1">A few styles to explore.</h2>
      <p class="finder-intro">These are educational starting points, not guarantees. Grapes, place, producer, vintage, and winemaking all affect the bottle.</p>
      ${notices}
      <div class="recommendation-list">${cards}</div>
      <details class="scoring-details"><summary>How the points work</summary><p>Each matching preference adds points: ${scoreSummary}. “Not sure yet” adds zero. Explicit mismatches are explained but do not subtract points. Ties keep dataset order. The total only orders these style examples; it is not a probability, quality rating, or promise about a bottle.</p></details>
      <div class="finder-form-actions result-actions">
        <button class="button button-primary" id="edit-answers" type="button">Edit answers</button>
        <button class="text-link" id="restart-finder" type="button">Start over</button>
      </div>
    </div>`;
  document.querySelector('#edit-answers').addEventListener('click', () => {
    showFinderForm();
    focusFinderTitle();
  });
  document.querySelector('#restart-finder').addEventListener('click', () => {
    currentAnswers = emptyAnswers();
    showFinderForm();
    focusFinderTitle();
  });
  focusFinderTitle();
}

function showDatasetError(error) {
  finderContent.innerHTML = `
    <div class="finder-pane finder-error">
      <p class="eyebrow">WINE FINDER</p>
      <h2 id="finder-title" tabindex="-1">The local wine guide did not load.</h2>
      <p class="finder-intro">Run the site through the local server in the README, then try again. A browser opened directly to the HTML file may block local data loading.</p>
      <p class="finder-error-detail">${escapeHtml(error.message || 'Unknown data loading error.')}</p>
      <div class="finder-form-actions"><button class="button button-primary" id="return-to-answers" type="button">Return to answers</button></div>
    </div>`;
  document.querySelector('#return-to-answers').addEventListener('click', () => {
    showFinderForm();
    focusFinderTitle();
  });
  focusFinderTitle();
}

function startFinder(preference) {
  currentAnswers = emptyAnswers();
  showFinderForm(preference);
  if (!dialog.open) dialog.showModal();
  focusFinderTitle();
}

document.querySelector('#start-finder').addEventListener('click', () => startFinder());
document.querySelectorAll('.style-pick').forEach(button => button.addEventListener('click', () => {
  const explorerType = document.querySelector('#explorer-type');
  if (!explorerType) return;
  document.querySelector('#explorer-search').value = '';
  document.querySelector('#explorer-taste').value = 'all';
  document.querySelector('#explorer-food').value = 'all';
  document.querySelector('#explorer-occasion').value = 'all';
  explorerType.value = button.dataset.style;
  explorerType.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}));
document.querySelectorAll('a[href^="#guide-detail-"]').forEach(link => link.addEventListener('click', () => {
  const target = document.querySelector(link.getAttribute('href'));
  if (target) target.open = true;
}));

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  nav.classList.toggle('open', !isOpen);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}));

// The learning library is progressive enhancement: the lessons and glossary
// remain readable if JavaScript is unavailable.
const lessonCards = [...document.querySelectorAll('.lesson-card')];
const lessonFilters = [...document.querySelectorAll('[data-lesson-filter]')];
const lessonStatus = document.querySelector('#lesson-filter-status');
lessonFilters.forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.lessonFilter;
  let visible = 0;
  lessonCards.forEach(card => {
    const show = category === 'all' || card.dataset.category === category;
    card.hidden = !show;
    if (show) visible += 1;
  });
  lessonFilters.forEach(filter => {
    const selected = filter === button;
    filter.classList.toggle('is-selected', selected);
    filter.setAttribute('aria-pressed', String(selected));
  });
  if (lessonStatus) lessonStatus.textContent = `Showing ${visible} ${visible === 1 ? 'lesson' : 'lessons'}.`;
}));

const glossarySearch = document.querySelector('#glossary-search');
const glossaryEntries = [...document.querySelectorAll('.glossary-entry')];
const glossaryStatus = document.querySelector('#glossary-status');
const glossaryEmpty = document.querySelector('#glossary-empty');
if (glossarySearch) glossarySearch.addEventListener('input', () => {
  const query = glossarySearch.value.trim().toLocaleLowerCase();
  let visible = 0;
  glossaryEntries.forEach(entry => {
    const matches = entry.textContent.toLocaleLowerCase().includes(query);
    entry.hidden = !matches;
    if (matches) visible += 1;
  });
  if (glossaryStatus) glossaryStatus.textContent = query
    ? `${visible} ${visible === 1 ? 'term' : 'terms'} found.`
    : `Showing all ${visible} terms.`;
  if (glossaryEmpty) glossaryEmpty.hidden = visible !== 0;
});

function openLessonFromHash() {
  const target = document.querySelector(location.hash);
  if (!(target instanceof HTMLDetailsElement)) return;
  const card = target.closest('.lesson-card');
  if (!card) return;
  if (card.hidden) {
    lessonCards.forEach(item => { item.hidden = false; });
    lessonFilters.forEach(button => {
      const selected = button.dataset.lessonFilter === 'all';
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (lessonStatus) lessonStatus.textContent = `Showing ${lessonCards.length} lessons.`;
  }
  target.open = true;
}
document.querySelectorAll('a[href^="#lesson-"]').forEach(link => link.addEventListener('click', openLessonFromHash));
window.addEventListener('hashchange', openLessonFromHash);
openLessonFromHash();

const sections = [...document.querySelectorAll('main section[id]')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        nav.querySelectorAll('a[href^="#"]').forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  sections.forEach(section => observer.observe(section));
}

document.querySelector('#year').textContent = new Date().getFullYear();
