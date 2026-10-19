/* Wine Explorer: dependency-free data joining, filtering and comparison. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WineBuddyExplorer = api;
  if (root && root.document) api.init(root.document);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function joinProfiles(explorerData, wineData) {
    if (!explorerData || !Array.isArray(explorerData.profiles) || !wineData || !Array.isArray(wineData.wineStyles)) {
      throw new Error('The local Explorer or wine-style data is missing or has an unexpected format.');
    }
    const byId = new Map(wineData.wineStyles.map(wine => [wine.id, wine]));
    const seen = new Set();
    return explorerData.profiles.map(extra => {
      const wine = byId.get(extra.wineStyleId);
      if (!wine || seen.has(extra.wineStyleId)) throw new Error(`Explorer profile ${extra.wineStyleId} is missing or duplicated in wine-data.json.`);
      seen.add(extra.wineStyleId);
      return { ...wine, ...extra, id: wine.id };
    });
  }

  function filterProfiles(profiles, criteria) {
    const filters = criteria || {};
    const query = String(filters.query || '').trim().toLocaleLowerCase();
    const type = filters.type || 'all';
    const taste = filters.taste || 'all';
    const food = filters.food || 'all';
    const occasion = filters.occasion || 'all';
    return profiles.filter(profile => {
      const matchesQuery = !query || `${profile.name} ${(profile.grapeVariety || []).join(' ')}`.toLocaleLowerCase().includes(query);
      return matchesQuery && (type === 'all' || profile.type === type) && (taste === 'all' || (profile.tasteTags || []).includes(taste)) && (food === 'all' || (profile.foodPairings || []).includes(food)) && (occasion === 'all' || (profile.occasions || []).includes(occasion));
    });
  }

  function compareProfiles(profiles, ids) {
    const selected = [...new Set(ids || [])].slice(0, 3).map(id => profiles.find(profile => profile.id === id)).filter(Boolean);
    if (selected.length < 2) return { profiles: selected, characteristics: [], summary: 'Choose at least two wine styles to compare.' };
    const characteristics = [
      ['Sweetness', 'typicalSweetness', 'Sugar left after fermentation; fruit aromas do not mean a wine is sweet.'],
      ['Body', 'typicalBody', 'Overall weight or fullness in the mouth; it is not the same as tannin.'],
      ['Acidity', 'acidity', 'Freshness or mouth-watering sensation; it can occur in dry or sweet wine.'],
      ['Tannin', 'tanninLevel', 'A drying or grippy sensation, especially noticeable in many red wines.']
    ].map(([label, key, description]) => ({ label, key, description, values: selected.map(profile => profile[key] || 'not specified') }));
    const differences = characteristics.filter(item => new Set(item.values).size > 1).map(item => item.label.toLowerCase());
    const summary = differences.length
      ? `These styles differ in ${differences.slice(0, -1).join(', ')}${differences.length > 1 ? ' and ' : ''}${differences[differences.length - 1]}. The notes describe typical examples; individual bottles vary.`
      : 'These styles share similar broad structural descriptions in this guide; their grape, aromas and individual bottles can still differ.';
    return { profiles: selected, characteristics, summary };
  }

  const categoryLabel = type => ({ red: 'Red', white: 'White', rose: 'Rosé', sparkling: 'Sparkling' }[type] || type);

  const characteristicNote = (name, value) => {
    const map = {
      typicalSweetness: { dry: 'Little noticeable sweetness is typical', 'off-dry': 'A hint of sweetness may be noticeable', sweet: 'Noticeable sweetness is typical', variable: 'Can range from dry to sweet' },
      typicalBody: { light: 'Often feels lighter in weight', medium: 'Often feels medium in weight', full: 'Often feels fuller in weight', variable: 'Body can vary' },
      acidity: { low: 'Often less mouth-watering freshness', medium: 'Often moderate freshness', high: 'Often pronounced freshness', variable: 'Acidity can vary' },
      tanninLevel: { low: 'Tannin is often less prominent', some: 'Some drying grip may be noticeable', noticeable: 'A more noticeable drying grip is typical' }
    };
    return (map[name] && map[name][value]) || value;
  };

  function init(doc) {
    const view = doc.querySelector('#explorer-view');
    if (!view) return;
    const search = doc.querySelector('#explorer-search');
    const type = doc.querySelector('#explorer-type');
    const taste = doc.querySelector('#explorer-taste');
    const food = doc.querySelector('#explorer-food');
    const occasion = doc.querySelector('#explorer-occasion');
    const status = doc.querySelector('#explorer-status');
    const clear = doc.querySelector('#explorer-clear');
    const state = { profiles: [], selected: [], currentView: 'results' };
    const finderLink = '<a class="button button-primary" href="#finder" data-explorer-finder>Get guided suggestions <span aria-hidden="true">→</span></a>';

    function renderComparison() {
      if (state.selected.length < 2) return '';
      const result = compareProfiles(state.profiles, state.selected);
      return `<section class="explorer-comparison" aria-labelledby="compare-heading"><div class="explorer-subheading"><div><p class="eyebrow">Side by side</p><h3 id="compare-heading">Compare styles</h3></div><button type="button" class="explorer-text-button" data-action="clear-compare">Clear comparison</button></div><p>${escapeHtml(result.summary)}</p><div class="compare-grid">${result.profiles.map(profile => `<article class="compare-card"><h4>${escapeHtml(profile.name)}</h4><p>${escapeHtml(categoryLabel(profile.type))}</p></article>`).join('')}</div><dl class="compare-facts">${result.characteristics.map(item => `<div><dt>${escapeHtml(item.label)}</dt><dd>${item.values.map((value, index) => `<span><strong>${escapeHtml(result.profiles[index].name)}:</strong> ${escapeHtml(characteristicNote(item.key, value))}</span>`).join('')}</dd><small>${escapeHtml(item.description)}</small></div>`).join('')}</dl><p class="explorer-caveat">These are typical tendencies, not specifications for every bottle.</p></section>`;
    }

    function renderResults() {
      state.currentView = 'results';
      const matches = filterProfiles(state.profiles, { query: search.value, type: type.value, taste: taste.value, food: food.value, occasion: occasion.value });
      status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'profile' : 'profiles'} found. ${state.selected.length ? `${state.selected.length} selected for comparison.` : ''}` : 'No styles match those filters. Try a broader search or clear a filter.';
      if (!matches.length) {
        view.innerHTML = `<div class="explorer-empty"><h3>No styles found</h3><p>Try a grape name, remove a filter, or show all styles.</p><button class="button button-primary" type="button" data-action="clear-filters">Show all styles</button></div>`;
        return;
      }
      view.innerHTML = `${renderComparison()}<div class="explorer-results-grid">${matches.map(profile => {
        const chosen = state.selected.includes(profile.id);
        const disabled = !chosen && state.selected.length >= 3;
        return `<article class="explorer-card"><p class="card-kicker">${escapeHtml(categoryLabel(profile.type))} · ${escapeHtml((profile.grapeVariety || []).join(' / ') || 'varies by producer')}</p><h3>${escapeHtml(profile.name)}</h3><p>${escapeHtml(profile.introduction)}</p><div class="explorer-tags"><span>${escapeHtml(characteristicNote('typicalBody', profile.typicalBody))}</span><span>${escapeHtml(characteristicNote('acidity', profile.acidity))}</span></div><div class="explorer-card-actions"><button class="explorer-text-button" type="button" data-action="details" data-id="${escapeHtml(profile.id)}">Explore profile <span aria-hidden="true">↗</span></button><button class="compare-toggle" type="button" data-action="compare" data-id="${escapeHtml(profile.id)}" aria-pressed="${chosen}" ${disabled ? 'disabled' : ''}>${chosen ? 'Selected' : 'Compare'}</button></div></article>`;
      }).join('')}</div>`;
    }

    function renderDetail(id) {
      const profile = state.profiles.find(item => item.id === id);
      if (!profile) return renderResults();
      state.currentView = 'detail';
      status.textContent = `Profile: ${profile.name}.`;
      const similar = (profile.similarStyleIds || []).map(similarId => state.profiles.find(item => item.id === similarId)).filter(Boolean);
      const sources = (profile.sources || []).map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} (opens in a new tab)</a>`).join(' · ');
      view.innerHTML = `<article class="explorer-detail"><button class="explorer-back" type="button" data-action="back">← Back to results</button><p class="eyebrow">${escapeHtml(profile.type)} wine profile</p><h3 tabindex="-1" data-profile-heading>${escapeHtml(profile.name)}</h3><p class="explorer-detail-intro">${escapeHtml(profile.introduction)}</p><p class="explorer-grapes"><strong>Grape:</strong> ${escapeHtml((profile.grapeVariety || []).join(', ') || 'Varies by producer and region')}</p><div class="profile-facts"><div><h4>Sweetness</h4><p>${escapeHtml(characteristicNote('typicalSweetness', profile.typicalSweetness))}</p></div><div><h4>Body</h4><p>${escapeHtml(characteristicNote('typicalBody', profile.typicalBody))}</p></div><div><h4>Acidity</h4><p>${escapeHtml(characteristicNote('acidity', profile.acidity))}</p></div><div><h4>Tannin</h4><p>${escapeHtml(characteristicNote('tanninLevel', profile.tanninLevel))}</p></div></div><p class="explorer-explainer">${escapeHtml(profile.beginnerExplanation)}</p><div class="explorer-detail-columns"><section><h4>Common aroma or flavour possibilities</h4><p>${escapeHtml((profile.flavourNotes || []).join(', '))}. These are commonly described notes, not guaranteed flavours.</p></section><section><h4>Representative regions</h4><ul>${profile.representativeRegions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section><h4>Styles you may see</h4><ul>${profile.styles.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section><h4>Food pairing ideas</h4><p>${escapeHtml((profile.foodPairings || []).map(pairing => pairing.replace(/-/g, ' ')).join(', '))}. Pairing is personal; these are starting ideas.</p></section></div><p class="explorer-who"><strong>You might enjoy it if:</strong> ${escapeHtml(profile.whoMightEnjoy)}</p><p class="explorer-variability"><strong>How it varies:</strong> ${escapeHtml(profile.variabilityNote)}</p><p class="explorer-sources"><strong>Learn more:</strong> ${sources}</p><div class="explorer-detail-actions">${finderLink}<button type="button" class="compare-toggle" data-action="compare" data-id="${escapeHtml(profile.id)}" aria-pressed="${state.selected.includes(profile.id)}">${state.selected.includes(profile.id) ? 'Selected for comparison' : 'Add to comparison'}</button></div>${similar.length ? `<aside class="explorer-related"><h4>Explore next</h4>${similar.map(item => `<button type="button" class="explorer-text-button" data-action="details" data-id="${escapeHtml(item.id)}">${escapeHtml(item.name)} →</button>`).join('')}</aside>` : ''}</article>`;
    }

    async function load() {
      try {
        const [extraResponse, wineResponse] = await Promise.all([fetch('wine-explorer-data.json'), fetch('wine-data.json')]);
        if (!extraResponse.ok || !wineResponse.ok) throw new Error('A local data file could not be reached.');
        const [extra, wines] = await Promise.all([extraResponse.json(), wineResponse.json()]);
        state.profiles = joinProfiles(extra, wines);
        renderResults();
      } catch (error) {
        status.textContent = 'The Wine Explorer guide could not be loaded.';
        view.innerHTML = `<div class="explorer-empty" role="alert"><h3>We could not open the local wine guide.</h3><p>Start the local server from the WineBuddy project folder, then reload this page. Check that wine-explorer-data.json and wine-data.json are present.</p><p class="explorer-error-detail">${escapeHtml(error.message || 'Unknown loading error.')}</p><button type="button" class="button button-primary" data-action="retry">Try again</button></div>`;
      }
    }

    [search, type, taste, food, occasion].forEach(control => control.addEventListener('input', renderResults));
    clear.addEventListener('click', () => {
      search.value = ''; type.value = 'all'; taste.value = 'all'; food.value = 'all'; occasion.value = 'all'; state.selected = []; renderResults(); search.focus();
    });
    view.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === 'details') { renderDetail(id); view.querySelector('[data-profile-heading]')?.focus(); }
      if (action === 'back') { renderResults(); view.querySelector('[data-action="details"]')?.focus(); }
      if (action === 'retry') load();
      if (action === 'clear-filters') { search.value = ''; type.value = 'all'; taste.value = 'all'; food.value = 'all'; occasion.value = 'all'; state.selected = []; renderResults(); search.focus(); }
      if (action === 'clear-compare') { state.selected = []; renderResults(); view.querySelector('[data-action="compare"]')?.focus(); }
      if (action === 'compare') {
        if (state.selected.includes(id)) state.selected = state.selected.filter(item => item !== id);
        else if (state.selected.length < 3) state.selected.push(id);
        if (state.currentView === 'detail') { renderDetail(id); view.querySelector('[data-profile-heading]')?.focus(); }
        else { renderResults(); view.querySelector(`[data-action="compare"][data-id="${id}"]`)?.focus(); }
      }
    });
    view.addEventListener('click', event => {
      if (event.target.closest('[data-explorer-finder]')) {
        event.preventDefault();
        const finder = doc.querySelector('#start-finder');
        if (finder) finder.click();
      }
    });
    load();
  }

  return { joinProfiles, filterProfiles, compareProfiles, characteristicNote, categoryLabel, init };
});
