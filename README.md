# IDS country tables

**Live pages:**

- Analytical table: https://www.parulagarwal.com/ids-analytical-dashboard/
- Standard table: https://www.parulagarwal.com/ids-analytical-dashboard/standard/

Static pages that rebuild the International Debt Statistics
[analytical](https://datatopics.worldbank.org/debt/ids/countryanalytical/AFG) and
[standard](https://datatopics.worldbank.org/debt/ids/country/AFG) country tables
from the World Bank API. Data is fetched live in the browser, so there is no build step or server code.

- `index.html`, `standard/index.html`: the two pages
- `ids-dashboard.js`, `ids-dashboard.css`: code and styling shared by both pages
- `ids-tables.js`: analytical table rows, formulas and number formatting
- `ids-standard-table.js`: standard table rows
- `tools/verify.mjs`: compares both tables with the published pages

Link to a country by adding `?country=KEN` to either page.

## Check against the published pages

Rerun after each data release (requires Node):

```bash
node tools/verify.mjs
```

## Notes

- The API's data endpoint sends no CORS header, so the page uses JSONP.
- "Reserves to imports (months)" shows the API value. The published standard table shows 0.0 for this row.
- API responses can be cached for up to 24 hours. To force fresh data after a release, change `DATA_VERSION` in `ids-dashboard.js`. Then change `?v=` as below.
- Browsers can keep the JS and CSS files for 4 hours. After changing any of them, raise the `?v=` number everywhere in `index.html` and `standard/index.html`, or visitors can end up with mismatched files.
