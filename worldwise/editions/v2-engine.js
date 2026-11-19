// Edition 2: editorial topic/context rules plus numerical separation.
// Once published, freeze this file. Do not tune an edition people have played.
import {hashSeed, seededRandom, shuffle, formatValue} from './v1-engine.js';

export const ROUND_COUNT = 10;
// These are pacing roles, not measured probabilities of a player being right.
export const ROUND_ROLES = ['approachable', 'approachable', 'thoughtful', 'discovery',
  'approachable', 'thoughtful', 'thoughtful', 'approachable', 'discovery', 'thoughtful'];
export const CATEGORY_LIMITS = {people: 3, nature: 3, climate: 2, food: 2, agriculture: 1, energy: 2, economy: 1};

const codes = text => text.split(' ');
// Editorial familiarity is audience-dependent. Broader-country comparisons are
// welcome, but most questions need an accessible point of reference.
export const FAMILIAR = codes('USA CAN MEX BRA ARG CHL COL PER GBR IRL FRA DEU ITA ESP PRT NLD BEL CHE AUT SWE NOR FIN DNK POL GRC TUR EGY MAR ZAF NGA KEN IND CHN JPN KOR IDN THA VNM AUS NZL SAU RUS PAK BGD');
const recognized = new Set(FAMILIAR);
const broad = codes('ISL CZE ROU UKR HUN HRV SRB CRI PAN CUB DOM JAM ECU URY BOL VEN DZA TUN ETH GHA TZA UGA SEN MDG NPL LKA MYS PHL SGP KHM MNG KAZ IRN IRQ ISR JOR ARE');
const available = new Set([...FAMILIAR, ...broad]);
// Ratio ranges refer to high / low; absolute ranges use the metric's units.
// Context pools are country sets, never fixed questions or hand-set winners.
export const TOPIC_RULES = {
  population: {approachable: [2, 6], thoughtful: [1.5, 3], weight: 2},
  land: {approachable: [2.2, 7], thoughtful: [1.6, 3.5], weight: 2},
  density: {approachable: [3, 10], thoughtful: [2, 5], discovery: [1.5, 4],
    context: 'NLD BEL GBR DEU JPN IND BGD KOR ITA CHN', highFloor: 150},
  temperature: {approachable: [12, 25], thoughtful: [6, 13], weight: 2},
  rainfall: {approachable: [2.5, 6], thoughtful: [1.8, 3.5], discovery: [1.5, 3],
    context: 'GBR IRL NOR JPN NZL COL CRI BRA IND IDN THA VNM', highFloor: 800},
  forest: {approachable: [30, 65], thoughtful: [18, 40], discovery: [15, 40],
    context: 'JPN FIN SWE CAN BRA CRI FRA DEU GBR ESP CHN IND', highFloor: 35},
  life: {approachable: [12, 25], thoughtful: [7, 15]},
  children: {approachable: [18, 35], thoughtful: [10, 22]},
  age65: {approachable: [13, 27], thoughtful: [8, 17]},
  urban: {approachable: [35, 65], thoughtful: [22, 45]},
  gdp: {approachable: [4, 12], thoughtful: [2.2, 5]},
  economysize: {thoughtful: [2, 5]},
  foreignborn: {thoughtful: [10, 25], discovery: [8, 22],
    context: 'USA CAN AUS NZL GBR FRA DEU CHE SWE SAU ARE JPN KOR', highFloor: 15},
  heritage: {thoughtful: [12, 35], discovery: [8, 25],
    context: 'ITA CHN DEU FRA ESP IND MEX GBR JPN IRN BRA GRC EGY PER', highFloor: 15},
  tobacco: {thoughtful: [12, 28]},
  air: {thoughtful: [2.2, 5], absoluteFloor: 12},
  co2: {thoughtful: [2.5, 6], discovery: [1.6, 3.5],
    context: 'USA CAN AUS SAU ARE CHN JPN KOR DEU GBR FRA IND', absoluteFloor: 3, highFloor: 6},
  renewables: {thoughtful: [35, 75], discovery: [25, 65],
    context: 'NOR SWE CAN BRA NZL CRI DEU FRA GBR USA CHN IND AUS', highFloor: 40},
  electricityWind: {thoughtful: [15, 40], discovery: [12, 35],
    context: 'DNK IRL GBR DEU ESP PRT SWE FRA USA CHN JPN AUS', highFloor: 20},
  electricitySolar: {thoughtful: [10, 25], discovery: [8, 20],
    context: 'AUS CHL ESP DEU NLD GRC ITA JPN CHN IND EGY SAU', highFloor: 12},
  electricityHydro: {thoughtful: [35, 80], discovery: [25, 65],
    context: 'NOR CAN BRA NZL CHE AUT SWE CHN IND USA DEU FRA', highFloor: 40},
  electricityCoal: {thoughtful: [35, 80], discovery: [25, 60],
    context: 'ZAF IND CHN POL AUS DEU JPN KOR USA GBR FRA', highFloor: 40},
  oilProduction: {thoughtful: [2.5, 7], discovery: [1.6, 4],
    pool: 'USA SAU RUS CAN CHN IRQ ARE BRA IRN NOR MEX NGA KAZ GBR', highFloor: 1000000},
  coffee_supply: {thoughtful: [2.2, 5], discovery: [1.5, 3.5], absoluteFloor: 2, highFloor: 4,
    pool: 'FIN NOR SWE DNK NLD DEU ITA FRA ESP PRT GBR USA CAN BRA COL VNM JPN KOR'},
  wine_supply: {thoughtful: [2, 5], discovery: [1.5, 3], absoluteFloor: 8, highFloor: 15,
    pool: 'PRT FRA ITA ESP GRC DEU CHE AUT GBR USA ARG CHL AUS NZL ZAF'},
  beer_supply: {thoughtful: [2, 4], discovery: [1.5, 2.5], absoluteFloor: 25, highFloor: 60,
    pool: 'CZE DEU AUT POL IRL GBR BEL NLD ESP USA CAN AUS MEX BRA JPN'},
  oliveoil_supply: {thoughtful: [2.5, 6], discovery: [1.8, 4], absoluteFloor: 2, highFloor: 4,
    pool: 'GRC ESP ITA PRT TUN FRA MAR TUR USA GBR DEU AUS'},
  rice_supply: {thoughtful: [2.5, 7], discovery: [1.7, 4], absoluteFloor: 30, highFloor: 60,
    pool: 'CHN JPN KOR VNM THA IDN BGD IND PAK LKA PHL BRA PER MEX USA ITA'},
  beef_supply: {thoughtful: [2.2, 5], discovery: [1.6, 3.5], absoluteFloor: 8, highFloor: 15,
    pool: 'ARG URY BRA USA CAN AUS NZL FRA GBR DEU ESP MEX JPN KOR ZAF'},
  seafood_supply: {thoughtful: [2, 5], discovery: [1.6, 3.5], absoluteFloor: 15, highFloor: 30,
    pool: 'JPN KOR PRT ESP NOR ISL CHN VNM IDN THA FRA ITA GBR USA CAN BRA'},
  milk_supply: {thoughtful: [2.5, 6], absoluteFloor: 80, highFloor: 150,
    pool: 'FIN SWE NLD IRL GBR FRA DEU ITA USA CAN AUS NZL IND CHN JPN KOR MEX BRA'},
  wheat_harvest: {thoughtful: [2.5, 6], highFloor: 10000000,
    pool: 'CHN IND RUS USA CAN FRA DEU AUS UKR PAK TUR ARG GBR POL'},
  rice_harvest: {thoughtful: [3, 8], highFloor: 3000000,
    pool: 'CHN IND IDN BGD VNM THA PHL PAK JPN BRA USA EGY KOR'},
  banana_harvest: {thoughtful: [2.5, 6], discovery: [1.8, 4], highFloor: 1000000,
    pool: 'IND CHN IDN BRA ECU PHL COL CRI MEX THA VNM'},
  cattle: {thoughtful: [2.5, 6], discovery: [1.8, 4], highFloor: 20000000,
    pool: 'BRA IND USA CHN ARG AUS MEX ETH PAK RUS COL ZAF CAN FRA'},
  sheep: {thoughtful: [2.5, 6], discovery: [1.8, 4], highFloor: 10000000,
    pool: 'CHN AUS IND IRN NGA GBR TUR PAK NZL ZAF ESP MAR ARG FRA'},
};

const candidateCache = new WeakMap();
function allCandidates(data) {
  if (candidateCache.has(data)) return candidateCache.get(data);
  const candidates = new Map();
  for (const metric of data.metrics) {
    const rule = TOPIC_RULES[metric.id];
    if (!rule) continue;
    const pool = rule.pool ? new Set(codes(rule.pool)) : available;
    const countries = data.countries.filter(c => pool.has(c.id) && Number.isFinite(metric.values[c.id]));
    const display = new Map(countries.map(c => [c.id, formatValue(metric, metric.values[c.id])]));
    const context = rule.context ? new Set(codes(rule.context)) : pool;
    const roles = Object.fromEntries([...new Set(ROUND_ROLES)].map(role => [role, []]));
    for (let i = 0; i < countries.length; i++) for (let j = i + 1; j < countries.length; j++) {
      const a = countries[i], b = countries[j], av = metric.values[a.id], bv = metric.values[b.id];
      const high = Math.max(av, bv), low = Math.min(av, bv), difference = high - low;
      if ((!metric.allowNegative && low < 0) || display.get(a.id) === display.get(b.id)
        || high < (rule.highFloor ?? -Infinity) || difference < (rule.absoluteFloor || 0)) continue;
      if (metric.gapKind === 'ratio' && low <= 0) continue;
      const gap = metric.gapKind === 'ratio' ? high / low : difference;
      const familiarity = Number(recognized.has(a.id)) + Number(recognized.has(b.id));
      if (!familiarity) continue;
      for (const role of Object.keys(roles)) {
        const band = rule[role];
        if (!band || gap < band[0] || gap > band[1]) continue;
        if (role === 'approachable' && familiarity !== 2) continue;
        if (role === 'discovery' && (!context.has(a.id) || !context.has(b.id))) continue;
        roles[role].push({countries: [a, b], pair: [a.id, b.id].sort().join(':'), gap});
      }
    }
    candidates.set(metric.id, {metric, roles});
  }
  candidateCache.set(data, candidates);
  return candidates;
}

// Exposed for offline audits; no network or model is needed during play.
export function matchupInventory(data) {
  return [...allCandidates(data).values()].map(({metric, roles}) => ({id: metric.id,
    counts: Object.fromEntries(Object.entries(roles).map(([role, pairs]) => [role, pairs.length]))}));
}

export function generateGame(data, seed) {
  const random = seededRandom(hashSeed(`${seed}:worldwise-edition-2`));
  const inventory = allCandidates(data);
  const usedTopics = new Set(), families = new Set(), pairs = new Set(), countries = new Map(), categories = new Map();
  const questions = Array(ROUND_COUNT);
  let attempts = 2000; // Bound malformed/sparse-input searches; never loosen the rules.
  // Reserve the narrower discovery/context pools first, then build the rest.
  const slots = [3, 8, 0, 1, 4, 7, 2, 5, 6, 9];
  function fill(position) {
    if (position === slots.length) return true;
    if (--attempts < 0) return false;
    const index = slots[position], role = ROUND_ROLES[index];
    const options = [...inventory.values()].filter(({metric: m, roles}) => roles[role].length
      && !usedTopics.has(m.id) && !families.has(m.family || m.id)
      && (categories.get(m.category) || 0) < (CATEGORY_LIMITS[m.category] || 2));
    const ordered = options.map(option => ({option, priority: -Math.log(1 - random()) / (TOPIC_RULES[option.metric.id].weight || 1)}))
      .sort((a, b) => a.priority - b.priority);
    for (const {option: {metric, roles}} of ordered) {
      if (attempts < 0) return false;
      const eligible = roles[role].filter(p => !pairs.has(p.pair) && p.countries.every(c => (countries.get(c.id) || 0) < 2));
      if (!eligible.length) continue;
      const repetition = p => p.countries.reduce((n, c) => n + (countries.get(c.id) || 0), 0);
      const leastRepeated = Math.min(...eligible.map(repetition));
      const fresh = eligible.filter(p => repetition(p) === leastRepeated);
      const picked = fresh[Math.floor(random() * fresh.length)];
      const orderedCountries = shuffle(picked.countries, random);
      const family = metric.family || metric.id;
      questions[index] = {metric, countries: orderedCountries, winner: metric.values[orderedCountries[0].id] > metric.values[orderedCountries[1].id] ? 0 : 1};
      usedTopics.add(metric.id); families.add(family); pairs.add(picked.pair);
      categories.set(metric.category, (categories.get(metric.category) || 0) + 1);
      picked.countries.forEach(c => countries.set(c.id, (countries.get(c.id) || 0) + 1));
      if (fill(position + 1)) return true;
      usedTopics.delete(metric.id); families.delete(family); pairs.delete(picked.pair);
      categories.set(metric.category, categories.get(metric.category) - 1);
      picked.countries.forEach(c => countries.set(c.id, countries.get(c.id) - 1));
    }
    return false;
  }
  if (!fill(0)) throw new Error('Not enough eligible matchups for a varied game');
  return questions;
}
