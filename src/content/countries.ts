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
  ["OM", "Oman"],
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

/** Every ISO 3166-1 alpha-2 country code: what a worldwide warehouse (CNFC) ships to. Keep in sync with drizzle/0007. */
export const WORLD_COUNTRIES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

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
