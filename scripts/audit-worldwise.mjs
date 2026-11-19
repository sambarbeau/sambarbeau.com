// Offline gameplay audit. Does not predict human accuracy; playtest separately.
// node scripts/audit-worldwise.mjs [number of games]
import {readFile} from 'node:fs/promises';
import {generateGame, matchupInventory, ROUND_ROLES, FAMILIAR} from '../worldwise/editions/v2-engine.js';
const data = JSON.parse(await readFile(new URL('../worldwise/editions/v1.json', import.meta.url)));
const games = Number(process.argv[2] || 1000);
if (!Number.isInteger(games) || games < 1 || games > 10000) throw new Error('Choose 1–10000 games');
const familiar = new Set(FAMILIAR), topics = {}, counts = {}, unique = new Set(), ratioGaps = {}, weakReferences = [];
for (let seed = 0; seed < games; seed++) {
  generateGame(data, `${data.edition}:audit-${seed}`).forEach((q, index) => {
    const role = ROUND_ROLES[index], values = q.countries.map(c => q.metric.values[c.id]);
    topics[q.metric.id] = (topics[q.metric.id] || 0) + 1;
    counts[role] = (counts[role] || 0) + 1;
    unique.add(`${q.metric.id}:${q.countries.map(c => c.id).sort().join(':')}`);
    if (!q.countries.some(c => familiar.has(c.id))) weakReferences.push(seed);
    if (q.metric.gapKind === 'ratio') (ratioGaps[role] ||= []).push(Math.max(...values) / Math.min(...values));
  });
}
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(JSON.stringify({games, counts, uniqueMatchupsSeen: unique.size, activeTopicsSeen: Object.keys(topics).length,
  questionsWithoutFamiliarReference: weakReferences.length,
  medianHighToLowRatio: Object.fromEntries(Object.entries(ratioGaps).map(([role, values]) => [role, +median(values).toFixed(2)])),
  mostFrequentTopics: Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 10),
  inventory: matchupInventory(data)}, null, 2));
