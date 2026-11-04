// Compares the dashboard's table logic with the published World Bank country pages.
//
//   node tools/verify.mjs            every country on the published site
//   node tools/verify.mjs KEN BRA    only these countries
//
// Rerun after every data release. Exits with 1 if anything differs.
import '../ids-tables.js';

const IDS = globalThis.IDS;
const TABLE = IDS.tables.analytical;
const PAGE = 'https://datatopics.worldbank.org/debt/ids/countryanalytical/';
const CONCURRENCY = 3;

async function text(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ids-table-verify' }, signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (err) {
      if (attempt === 3) throw err;
    }
  }
}

const clean = (html) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();

function parsePage(html) {
  const years = [...html.matchAll(/cell-separator header"><div>(\d{4})/g)].map((m) => m[1]);
  const rows = [...html.matchAll(/<tr class="rowdata[^"]*">(.*?)<\/tr>/gs)].map((m) => {
    const cells = [...m[1].matchAll(/<td([^>]*)>(.*?)<\/td>/gs)];
    return {
      id: cells[0][1].match(/cell-(R\d+)/)[1],
      label: clean(cells[0][2]),
      values: cells.slice(1).map((c) => clean(c[2])),
    };
  });
  const select = html.match(/<select[^>]*id="ddp-Country".*?<\/select>/s);
  const countries = select ? [...select[0].matchAll(/&\[([A-Z0-9]+)\]/g)].map((m) => m[1]) : [];
  return { years, rows, countries };
}

async function apiData(country, years) {
  const path = IDS.dataPath(country, IDS.seriesOf(TABLE), years);
  const res = IDS.parseResponse(JSON.parse(await text(`${IDS.API_BASE}${path}?format=json&per_page=5000`)));
  if (res.pages !== 1) throw new Error('Response was split across pages');
  return res.series;
}

async function check(country) {
  const page = parsePage(await text(PAGE + country));
  if (!page.rows.length) throw new Error('No table rows on the page');
  const data = await apiData(country, page.years);
  const issues = [];
  const defined = IDS.rowsOf(TABLE);

  const pageOrder = page.rows.map((r) => r.id).join();
  if (pageOrder !== defined.map((r) => r.id).join()) issues.push(`row order differs: ${pageOrder}`);

  let cells = 0;
  for (const pub of page.rows) {
    const row = defined.find((r) => r.id === pub.id);
    if (!row) { issues.push(`${pub.id} "${pub.label}" is not in the dashboard`); continue; }
    if (row.label !== pub.label) issues.push(`${pub.id} label: page "${pub.label}", dashboard "${row.label}"`);
    pub.values.forEach((value, i) => {
      cells++;
      const ours = IDS.cellText(row, data, page.years[i]);
      if (ours !== value) issues.push(`${pub.id} ${row.label} ${page.years[i]}: page ${value}, dashboard ${ours}`);
    });
  }
  return { country, cells, issues, years: page.years, countries: page.countries };
}

const apiCountries = JSON.parse(await text(`${IDS.API_BASE}/sources/6/country?format=json&per_page=500`))
  .source[0].concept[0].variable.map((c) => c.id).filter((id) => !IDS.AGGREGATES.includes(id));

const first = await check(process.argv[2] ?? 'AFG');
const published = first.countries;
const missingFromApi = published.filter((c) => !apiCountries.includes(c));
const extraInApi = apiCountries.filter((c) => !published.includes(c));
const queue = process.argv.length > 2 ? process.argv.slice(3) : published.filter((c) => c !== 'AFG');

const results = [first];
const failures = [];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const country = queue.shift();
    try { results.push(await check(country)); }
    catch (err) { failures.push(`${country}: ${err.message}`); }
  }
}));

const withIssues = results.filter((r) => r.issues.length);
const cells = results.reduce((n, r) => n + r.cells, 0);
const issueCount = withIssues.reduce((n, r) => n + r.issues.length, 0);

console.log(`Years: ${first.years[0]}-${first.years.at(-1)}`);
console.log(`Dropdown: published ${published.length}, dashboard ${apiCountries.length}`);
if (missingFromApi.length) console.log('  on published page only:', missingFromApi.join(', '));
if (extraInApi.length) console.log('  in dashboard only:', extraInApi.join(', '));
console.log(`Countries compared: ${results.length}. Cells compared: ${cells}. Differences: ${issueCount}.`);
if (failures.length) console.log(`Could not compare ${failures.length}:\n  ${failures.join('\n  ')}`);
for (const r of withIssues) {
  console.log(`\n${r.country} (${r.issues.length})`);
  r.issues.slice(0, 15).forEach((issue) => console.log('  ' + issue));
}
process.exit(issueCount || failures.length || missingFromApi.length || extraInApi.length ? 1 : 0);
