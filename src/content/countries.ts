// Shipping countries in live display order (_capture/site/shipping-countries.json). Codes missing here fall back to Intl names.
const COUNTRIES: [code: string, name: string][] = [
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["BH", "Bahrain"],
  ["BE", "Belgium"],
  ["BG", "Bulgaria"],
  ["CH", "CHE"],
  ["HR", "Croatia"],
  ["CY", "Cyprus‌"],
  ["CZ", "Czech Republic"],
  ["DK", "Denmark"],
  ["EE", "Estonia"],
  ["FI", "Finland"],
  ["FR", "France"],
  ["DE", "Germany"],
  ["GR", "Greece"],
  ["HU", "Hungary"],
  ["IE", "Ireland"],
  ["IT", "Italy"],
  ["KW", "Kuwait"],
  ["LV", "Latvia"],
  ["LT", "Lithuania"],
  ["LU", "Luxembourg"],
  ["MY", "Malaysia"],
  ["NL", "Netherlands"],
  ["NO", "Norway"],
  ["QM", "Oman"],
  ["PH", "Philippines"],
  ["PL", "Poland"],
  ["PT", "Portugal"],
  ["PR", "Puerto Rico"],
  ["QA", "Qatar"],
  ["RO", "Romania"],
  ["SA", "Saudi Arabia"],
  ["SG", "Singapore"],
  ["SK", "Slovakia"],
  ["ES", "Spain"],
  ["SE", "Sweden"],
  ["AE", "United Arab Emirates"],
];

const ORDER = new Map(COUNTRIES.map(([code], i) => [code, i]));
const NAMES = new Map(COUNTRIES);
const intl = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  return NAMES.get(code) ?? (() => {
    try {
      return intl.of(code) ?? code;
    } catch {
      return code;
    }
  })();
}

/** Countries a warehouse ships to, as {code, name}, in live display order. */
export function countryOptions(codes: string[]): { code: string; name: string }[] {
  return [...new Set(codes)]
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => (ORDER.get(a.code) ?? 999) - (ORDER.get(b.code) ?? 999) || a.name.localeCompare(b.name));
}
