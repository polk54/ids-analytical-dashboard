# IDS country analytical table

**Live page: https://www.parulagarwal.com/ids-analytical-dashboard/**

A static page that rebuilds the International Debt Statistics
[country analytical table](https://datatopics.worldbank.org/debt/ids/countryanalytical/AFG)
from the World Bank API. Data is fetched live in the browser, so there is no build step or server code.

- `index.html`: the page
- `ids-tables.js`: table rows, formulas and number formatting
- `tools/verify.mjs`: compares the table with the published pages

## Check against the published pages

Rerun after each data release (requires Node):

```bash
node tools/verify.mjs
```

## Notes

- The API's data endpoint sends no CORS header, so the page uses JSONP.
- API responses can be cached for up to 24 hours. To force fresh data after a release, change `DATA_VERSION` in `index.html`.
