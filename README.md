# WineBuddy

WineBuddy is a responsive, beginner-friendly wine knowledge and buying assistant. The website uses plain HTML, CSS, and JavaScript. Its wine guide is a local JSON file; no AI, database, paid service, package manager, or API key is needed to run the site.

WineBuddy keeps the homepage, a single main Wine Explorer, the Wine School and glossary. The Explorer searches and filters the existing styles by wine category, taste, food pairing, and occasion. A small guided-question option still uses the existing recommendation engine. The separate food/gift tools and personal journal are postponed and hidden; their source code and data remain in the project. Because there are no verified bottle prices, the visible site has no budget control and states once that prices and availability are not verified. Lessons can be filtered by topic, opened from related links, and the searchable glossary announces match counts and no-result states to assistive technology.

## Run it on a Mac

1. Open **Terminal** (Applications → Utilities → Terminal).
2. Move into this project folder:

   ```sh
   cd "/Users/tanmavis/Documents/Codex/2026-10-16/code-plugin-code-openai-curated-remote"
   ```

3. Start Python’s built-in local web server:

   ```sh
   python3 -m http.server 8000
   ```

4. Open [http://localhost:8000](http://localhost:8000) in a browser.
5. Stop the server with **Control-C** in Terminal.

Use the local server because the Wine Explorer and guided recommendations load JSON data in the browser. Directly opening `index.html` may prevent the browser from reading those local data files.

## Wine dataset

`wine-data.json` contains 25 beginner-oriented examples:

- 10 red styles, 9 white styles, 2 rosé styles, and 4 sparkling styles.
- Each record has a unique `id`, `name`, `type`, `grapeVariety`, `typicalSweetness`, `sweetnessMatches`, `typicalBody`, `acidity`, `tanninLevel`, `flavourNotes`, `tasteTags`, `foodPairings`, `occasions`, `budgetCategory`, `budgetNote`, `beginnerExplanation`, and `variabilityNote`. `bodyMatches` is included when a style has a broad range of body examples; rosé entries leave `grapeVariety` empty because the grape depends on the producer.
- `budgetCategory` and `budgetNote` are `null` when the dataset has no defensible relative budget hint. Only Prosecco has a cautious “often accessible sparkling” hint, and the note says local prices still vary. This is not a bottle price or a promise about affordability.
- Style profiles use broad tendencies. Fruit aromas do not establish sweetness; acidity is distinct from residual sugar; body describes overall weight; tannin describes a drying or grippy sensation.
- Selected references for regulated or regional context are listed at the end of the JSON file. For example, Comité Champagne explains dosage and sweetness terms, and the Rioja regulator describes Tempranillo’s role in Rioja. [Champagne dosage](https://www.champagne.fr/en/about-champagne/how-champagne-is-made/dosage), [Rioja Tempranillo](https://riojawine.com/en-gb/the-designation/grape-varieties/tempranillo/), [Prosecco DOC market context](https://www.prosecco.wine/en/data-analysis-prosecco/).

## How the recommendations are ranked

The UI is in `script.js`; the reusable scoring logic is in `recommendation-engine.js`; the profiles come from `wine-data.json`.

Each matching answer adds preference points:

| Preference | Points |
| --- | ---: |
| Wine type | +6 |
| Taste direction | +3 |
| Sweetness | +3 |
| Body | +2 |
| Tannin | +2 |
| Budget | +2, only for a matching, explicitly tagged dataset hint |
| Occasion | +2 |
| Food pairing | +2 |

“Not sure yet” adds no points. A mismatch is shown as a possible trade-off and does not subtract points. Styles with a positive score are ranked by score and then by number of matching answers; remaining ties follow dataset order. Duplicate IDs are ignored. Up to three results are shown. If no answer has a supported match, the finder uses the dataset’s beginner picks.

Budget categories are incomplete by design: prices depend on country, taxes, producer, and retailer. An untagged style is unknown for price, not a poor or unaffordable match. The reusable engine retains support for cautious dataset-level budget hints, but the visible Explorer and guided questionnaire do not ask for a budget or imply affordability.

## Run the automated checks

From the project folder, run all checks with macOS’s built-in JavaScript for Automation and Python’s standard library (no Node.js install or package manager is required):

```sh
osascript -l JavaScript tests/recommendation-engine.test.js
python3 tests/learning-library.test.py
python3 -m json.tool wine-data.json
python3 -m json.tool wine-explorer-data.json
osascript -l JavaScript tests/wine-explorer.test.js
python3 tests/wine-explorer.test.py
osascript -l JavaScript tests/interactive-tools.test.js
python3 tests/interactive-tools.test.py
```

The recommendation script checks JSON parsing and required fields, unique IDs, valid recommendations, preference-driven ranking changes, budget handling, missing or uncertain answers, and trade-offs for conflicting answers. Explorer tests cover profile joining, unique/reference IDs, category, taste, food and occasion filters, search, comparisons, accessible markup, static paths and fragment targets. Interactive Tools tests still exercise the postponed source code and its data logic; they do not mean those tools are currently shown on the site. The learning-library check validates the 10 lesson accordions, glossary terms, internal links and loading-error behavior. These checks use no package manager or third-party test library.


## Manual website check

After starting the local server:

1. In Wine Explorer, search for a grape and filter by category, taste, food pairing, and occasion. Combine filters and confirm the result count and styles update; use **Clear filters** to restore all profiles.
2. Open a profile, return to results, and check its food pairing notes and typical style description. Use the homepage’s red, white, or rosé/bubbles cards to jump to the corresponding Explorer category.
3. Open **Get step-by-step suggestions** from the Explorer. Submit all “Not sure yet” answers, then try a specific style/taste/food/occasion set. Edit an answer, restart the flow, and close the dialog with Escape.
4. In Wine School, use each topic filter and open several lessons. Follow a related lesson link and confirm the destination lesson expands.
5. Search the glossary for `tannin`, then enter an unmatched word and confirm the empty message appears. Clear the field and confirm all terms return.
6. At a 390 × 844 phone viewport, open the mobile menu, follow Wine Explorer or Glossary, and confirm the menu closes without horizontal overflow. Use Tab and Shift+Tab to check visible focus on navigation and Explorer controls.

Explorer checks validate joined profiles, references, category/taste/food/occasion filtering, search, comparisons, accessible markup hooks and internal fragment paths. The automated scripts do not replace a browser check. The Explorer does not list specific bottles, prices, retailer stock, or purchase links.

## Learning library and sources

`index.html` holds the homepage, Wine School articles, glossary definitions, and Explorer controls. `script.js` handles the guided recommendation dialog, lesson and glossary interactions; `wine-explorer.js` joins local data and filters profiles by category, taste, food and occasion. `recommendation-engine.js` and all 25 wine examples remain unchanged.

Lesson claims use cautious language because wine style varies across producers, places, vintages, and winemaking. Source links are included next to relevant explanations. Main references include Wine & Spirit Education Trust (WSET) learning material on [acidity](https://www.wsetglobal.com/knowledge-centre/blog/2026/understanding-acidity-in-wine/), [wine styles and body](https://www.wsetglobal.com/knowledge-centre/blog/2023/october/03/how-many-wine-types-and-styles-are-there/), [reading labels](https://www.wsetglobal.com/knowledge-centre/blog/2019/how-to-read-wine-labels-part-one-common-features-on-wine-labels), and [food pairing](https://www.wsetglobal.com/knowledge-centre/blog/2023/july/13/four-rules-to-masterful-food-and-wine-pairing); the official [Comité Champagne](https://www.champagne.fr/en/champagne-frequently-asked-questions?nid=609) explains Champagne sweetness terms and service, [Rioja Wine](https://riojawine.com/en-us/the-designation/grape-varieties/) provides regional grape context, and [EU wine labelling rules](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A02009R0607-20120526) illustrate why labelling claims are jurisdiction-specific. The responsible-drinking note links to the [World Health Organization alcohol factsheet](https://www.who.int/news-room/fact-sheets/detail/alcohol).

## Wine Explorer

The Explorer has search, category, taste, food and occasion filters, detailed profiles, up to three side-by-side comparisons, and related-style navigation. The guided questionnaire remains available from the Explorer for beginners who prefer step-by-step prompts. It asks about style, taste, sweetness, body, tannin, occasion, and food; it does not ask about spending. The Explorer has 21 profiles covering 7 red, 8 white, 2 rosé, and 4 sparkling examples. Explorer profiles reference IDs in `wine-data.json`; the original 25 style examples remain the shared source for grape, sweetness, body, acidity, tannin, flavour notes, food pairing, beginner explanation, and variability. `wine-explorer-data.json` adds introductory text, representative regions, style forms, who-might-enjoy guidance, related profile IDs, and source links.

Filters use existing `type`, `tasteTags`, `foodPairings`, and `occasions` fields; search matches profile name and grape name. All selected filters apply together. Comparison presents typical sweetness, body, acidity, and tannin as separate attributes and describes differences in plain language. The Explorer does not score quality, predict a specific bottle, show prices, or check availability. There are no verified bottle prices in the data, so the visible Explorer has no budget control and displays one concise price/availability note.

The data-linked profiles use educational sources including [WSET on wine styles and body](https://www.wsetglobal.com/knowledge-centre/blog/2023/october/03/how-many-wine-types-and-styles-are-there/), [WSET on tasting](https://www.wsetglobal.com/knowledge-centre/blog/2019/november/how-to-build-your-wine-tasting-skills), [Comité Champagne on dosage](https://www.champagne.fr/en/about-champagne/how-champagne-is-made/dosage), and official regional bodies such as [the Rhône Valley](https://www.vins-rhone.com/en/rhone-valley-vineyards/grape-varieties), [Weinviertel DAC](https://www.weinvierteldac.at/en/weinviertel-dac/gruener-veltliner/), [Cava](https://www.cava.wine/en/regulatory-board/cava-designation-of-origin/), [Prosecco DOC](https://www.prosecco.wine/en/prosecco/discover/types/), and [New Zealand Wine](https://www.nzwine.com/en/winestyles/sauvignonblanc/?page=1). Links are provided per profile where available. These sources support general regional and style context, not a claim about every bottle.

## Postponed tools

The old Food Pairing Assistant, Gift & Occasion Assistant, and My Wine Journal markup and `interactive-tools.js` implementation are retained locally for possible future reuse, but are hidden and are not loaded by the website. Their tests remain available to guard the retained logic. Their separate budget input has been removed from the visitor experience because no verified bottle prices are available. Food and occasion discovery now use the Explorer’s existing dataset tags.

## Publishing as a static website

The project is a static site: it needs no server-side code or build step. Its local data and scripts use relative paths, so it can be hosted from a repository subfolder as well as a domain root. Google Fonts are the only external presentation resource; system-font fallbacks keep the site usable when those fonts cannot load.

The `?v=...` suffix on local CSS, JavaScript, and JSON URLs is a cache version. When publishing later edits to those files, update the value in `index.html` and `script.js` so returning visitors fetch the new assets. A browser may also need a hard refresh to replace a cached copy of `index.html`.

GitHub Pages is a straightforward low-cost option if you are comfortable putting the website source in a public GitHub repository. GitHub documents Pages as available for public repositories on GitHub Free. The current project folder is not a Git repository, so publishing would require creating a repository, adding and pushing these project files, then choosing the repository's root folder as the Pages publishing source in its settings. Do not include private information or secrets in a public repository. A custom domain is optional and is purchased separately. See [GitHub's Pages publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Before a public launch, decide which countries the site is intended for and check the applicable rules for alcohol-related education, advertising, age disclosures, and responsible-drinking notices. WineBuddy does not currently verify a visitor's age or location. This is a jurisdiction-specific release check, not a feature of the current recommendation engine.

## Known limitations

- Wine style suggestions are educational examples, not predictions for a specific bottle.
- The dataset is a curated starting point, not an exhaustive global wine catalog. Regional and producer variation is substantial.
- Price guidance is sparse; the finder does not compare actual prices, retailer stock, ratings, reviews, or availability.
- Food pairings are flexible suggestions, not rules.
- Lesson material is introductory and does not replace region-specific legal labelling rules or professional advice. Sources are linked as further reading; WineBuddy does not independently verify a specific bottle's claims.
- Explorer, guided recommendations, glossary, and lesson filtering work locally in the page; browser testing is still recommended after editing content or scripts.
- The Finder's loading-error recovery is checked structurally, but a failed data request was not induced in the browser during this review.
- Google Fonts load over the internet. The site falls back to local system fonts if they are unavailable.
- GitHub Pages or another static host can serve the current files; no backend or build step is required. Public launch still requires checking local alcohol-related rules for the intended audience and countries.

## Files

- `index.html` — homepage structure and script loading.
- `styles.css` — existing site styling and Wine Finder result styles.
- `script.js` — form, dialog, navigation, and rendering.
- `recommendation-engine.js` — UI-independent scoring and trade-off logic.
- `wine-data.json` — local structured wine profiles shared by the Finder and Explorer.
- `wine-explorer-data.json` — 21 editorial Explorer profiles that reference existing wine-style IDs.
- `wine-explorer.js` — local filtering, profile joining, comparison logic, and Explorer interface.
- `interactive-tools.js` — retained source for the postponed food/gift tools and local journal; not loaded by the current site.
- `tests/interactive-tools.test.js` and `tests/interactive-tools.test.py` — dependency-free interactive-tool checks.
- `tests/wine-explorer.test.js` and `tests/wine-explorer.test.py` — dependency-free Explorer checks.
- `tests/recommendation-engine.test.js` — dependency-free automated checks for macOS or Node.js.
