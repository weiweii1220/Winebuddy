(function attachRecommendationEngine(root, createEngine) {
  const engine = createEngine();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.WineBuddyRecommendationEngine = engine;
})(typeof window === 'undefined' ? globalThis : window, function createEngine() {
  'use strict';

  // A match adds points; an explicit mismatch is explained but never subtracts
  // points. Unknown and unsupported budget answers remain neutral.
  const rules = [
    { key: 'wineType', points: 6, label: 'Wine type' },
    { key: 'taste', points: 3, label: 'Taste direction' },
    { key: 'sweetness', points: 3, label: 'Sweetness' },
    { key: 'body', points: 2, label: 'Body' },
    { key: 'tannin', points: 2, label: 'Tannin feel' },
    { key: 'budget', points: 2, label: 'Budget hint' },
    { key: 'occasion', points: 2, label: 'Occasion' },
    { key: 'food', points: 2, label: 'Food pairing' }
  ];

  const budgetMatch = {
    lower: 'often-accessible-sparkling',
    occasion: 'often-premium'
  };

  const answerLabels = {
    wineType: { red: 'red', white: 'white', rose: 'rosé', sparkling: 'sparkling' },
    taste: { fruit: 'fruit-driven', fresh: 'fresh and crisp', savory: 'savory or earthy', rich: 'rich and rounded', aromatic: 'aromatic or floral', bubbly: 'lively and sparkling' },
    sweetness: { dry: 'dry', 'off-dry': 'off-dry', sweet: 'sweet' },
    body: { light: 'light-bodied', medium: 'medium-bodied', full: 'full-bodied' },
    tannin: { low: 'lower-tannin', some: 'some-tannin', noticeable: 'noticeable-tannin' },
    budget: { lower: 'lower-spend', middle: 'middle-budget', occasion: 'special-occasion budget', flexible: 'flexible budget' },
    occasion: { everyday: 'everyday', meal: 'a meal', celebration: 'a celebration', gift: 'a gift', relaxed: 'a relaxed drink' },
    food: { seafood: 'seafood', poultry: 'poultry', 'red-meat': 'red meat or grilled food', vegetables: 'vegetables or salad', spicy: 'spicy dishes', cheese: 'cheese', pasta: 'pasta or pizza', snacks: 'snacks or appetizers', fruit: 'fresh fruit or dessert' }
  };

  const isKnown = value => value !== undefined && value !== null && value !== '' && value !== 'not-sure';
  const hasTag = (style, field, answer) => Array.isArray(style[field]) && style[field].includes(answer);

  function mismatchText(style, key, answer) {
    const label = answerLabels[key]?.[answer] || answer;
    switch (key) {
      case 'wineType': return `This is a ${style.type} style, while you chose ${label}.`;
      case 'taste': return `This broad profile is not tagged ${label}; individual bottles may still surprise you.`;
      case 'sweetness': return `The typical sweetness is ${style.typicalSweetness}; you chose ${label}. Bottle examples vary, so check the label.`;
      case 'body': return `This style’s typical body is ${style.typicalBody}; you chose ${label}.`;
      case 'tannin': return `The dataset lists ${style.tanninLevel} tannin; you chose ${label}. Tannin and body are different.`;
      case 'occasion': return `This is not one of the common beginner occasions listed for this style; that is not a rule.`;
      case 'food': return `This dataset does not list ${label} as a common pairing for this style; pairings are flexible.`;
      default: return '';
    }
  }

  function criteriaFor(style, answers) {
    return [
      { key: 'wineType', match: style.type === answers.wineType, explanation: `Matches your ${answerLabels.wineType[answers.wineType] || answers.wineType} wine preference.` },
      { key: 'taste', match: hasTag(style, 'tasteTags', answers.taste), explanation: `Its broad profile can align with your ${answerLabels.taste[answers.taste] || answers.taste} preference.` },
      { key: 'sweetness', match: hasTag(style, 'sweetnessMatches', answers.sweetness), explanation: `The dataset includes ${answerLabels.sweetness[answers.sweetness] || answers.sweetness} examples; verify the specific bottle.` },
      { key: 'body', match: (style.bodyMatches || [style.typicalBody]).includes(answers.body), explanation: `This style includes ${style.typicalBody} body examples, which can suit your ${answerLabels.body[answers.body] || answers.body} preference.` },
      { key: 'tannin', match: style.tanninLevel === answers.tannin, explanation: `The typical tannin level is listed as ${style.tanninLevel}, which matches your preference.` },
      { key: 'budget', match: Boolean(budgetMatch[answers.budget] && style.budgetCategory === budgetMatch[answers.budget]), explanation: style.budgetNote || 'This is a cautious relative budget hint; local prices still vary.' },
      { key: 'occasion', match: hasTag(style, 'occasions', answers.occasion), explanation: `This style is included as one possible direction for ${answerLabels.occasion[answers.occasion] || answers.occasion}.` },
      { key: 'food', match: hasTag(style, 'foodPairings', answers.food), explanation: `This style is sometimes paired with ${answerLabels.food[answers.food] || answers.food}.` }
    ];
  }

  function scoreWine(style, rawAnswers = {}) {
    const answers = rawAnswers || {};
    let score = 0;
    const reasons = [];
    const tradeoffs = [];
    const criteria = criteriaFor(style, answers);

    for (const rule of rules) {
      const answer = answers[rule.key];
      if (!isKnown(answer)) continue;

      if (rule.key === 'budget') {
        const expectedCategory = budgetMatch[answer];
        if (!expectedCategory) continue;
        if (style.budgetCategory === expectedCategory) {
          score += rule.points;
          reasons.push({ key: rule.key, label: rule.label, points: rule.points, explanation: criteria.find(item => item.key === rule.key).explanation });
        }
        // An unlabelled style is unknown for price, not a budget mismatch.
        continue;
      }

      const criterion = criteria.find(item => item.key === rule.key);
      if (criterion.match) {
        score += rule.points;
        reasons.push({ key: rule.key, label: rule.label, points: rule.points, explanation: criterion.explanation });
      } else {
        tradeoffs.push({ key: rule.key, label: rule.label, explanation: mismatchText(style, rule.key, answer) });
      }
    }

    return { wine: style, score, reasons, tradeoffs };
  }

  function rankWines(wines, answers = {}, maxResults = 3) {
    if (!Array.isArray(wines)) throw new TypeError('wine data must be an array');
    const unique = [];
    const seen = new Set();
    for (const wine of wines) {
      if (!wine || typeof wine.id !== 'string' || seen.has(wine.id)) continue;
      seen.add(wine.id);
      unique.push(wine);
    }

    const scored = unique.map((wine, index) => ({ ...scoreWine(wine, answers), order: index }));
    const matched = scored.filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.reasons.length - a.reasons.length || a.order - b.order)
      .slice(0, Math.max(1, Math.min(3, maxResults)));

    if (matched.length) {
      return {
        results: matched.map(({ order, ...item }) => item),
        usedBeginnerDefaults: false,
        budgetScored: scored.some(item => item.reasons.some(reason => reason.key === 'budget')),
        rules: rules.map(({ key, points, label }) => ({ key, points, label }))
      };
    }

    const defaults = scored.filter(item => item.wine.beginnerPick)
      .slice(0, Math.max(1, Math.min(3, maxResults)));
    const fallback = defaults.length ? defaults : scored.slice(0, Math.max(1, Math.min(3, maxResults)));
    return {
      results: fallback.map(({ order, ...item }) => item),
      usedBeginnerDefaults: true,
      budgetScored: false,
      rules: rules.map(({ key, points, label }) => ({ key, points, label }))
    };
  }

  return { rules, scoreWine, rankWines };
});
