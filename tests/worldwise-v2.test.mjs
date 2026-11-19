import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {generateGame, TOPIC_RULES, ROUND_ROLES, FAMILIAR, CATEGORY_LIMITS, matchupInventory} from '../worldwise/editions/v2-engine.js';
import {formatValue} from '../worldwise/editions/v1-engine.js';
import {CURRENT_EDITION, dailyEdition} from '../worldwise/editions.js';
import {parseRoute, gameRoute} from '../worldwise/routes.js';

const data = JSON.parse(await readFile(new URL('../worldwise/editions/v1.json', import.meta.url)));
const familiar = new Set(FAMILIAR);

test('published edition 2 stays frozen and replays the playtested questions', async () => {
  const source = await readFile(new URL('../worldwise/editions/v2-engine.js', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), '3096b4b7afe47a823e8292f56384ed7f4f26da2a1060cf809d55dd35e332a04f');
  assert.deepEqual(generateGame(data, `${data.edition}:zohwwv6s`).map(q => [q.metric.id, ...q.countries.map(c => c.id), q.winner]), [
    ['temperature', 'BGD', 'FIN', 0], ['children', 'BEL', 'PAK', 1], ['co2', 'SAU', 'ITA', 0],
    ['foreignborn', 'FRA', 'AUS', 1], ['density', 'MEX', 'NGA', 1], ['tobacco', 'SRB', 'USA', 0],
    ['beer_supply', 'NLD', 'ESP', 1], ['land', 'IDN', 'JPN', 0], ['renewables', 'CHN', 'CAN', 1],
    ['heritage', 'BRA', 'ECU', 0],
  ]);
});

test('new games have four clear contrasts, four thoughtful pairs and two contextual discoveries across 1000 seeds', () => {
  const seen = new Set(), winners = [0, 0];
  for (let seed = 0; seed < 1000; seed++) {
    const questions = generateGame(data, `balance-audit-${seed}`);
    assert.equal(questions.length, 10);
    assert.equal(new Set(questions.map(q => q.metric.id)).size, 10);
    assert.equal(new Set(questions.map(q => q.metric.family || q.metric.id)).size, 10);
    assert.equal(new Set(questions.map(q => q.countries.map(c => c.id).sort().join(':'))).size, 10);
    const countries = {}, categories = {};
    questions.forEach((q, index) => {
      const {metric: m} = q, rule = TOPIC_RULES[m.id], role = ROUND_ROLES[index];
      const values = q.countries.map(c => m.values[c.id]);
      const high = Math.max(...values), low = Math.min(...values), difference = high - low;
      seen.add(m.id); winners[q.winner]++;
      assert.ok(values.every(Number.isFinite));
      assert.ok(values[q.winner] > values[1 - q.winner]);
      assert.notEqual(formatValue(m, values[0]), formatValue(m, values[1]));
      assert.ok(q.countries.some(c => familiar.has(c.id)), 'every question has a familiar reference country');
      if (role === 'approachable') assert.ok(q.countries.every(c => familiar.has(c.id)));
      const gap = m.gapKind === 'ratio' ? high / low : difference;
      assert.ok(gap >= rule[role][0] && gap <= rule[role][1], `${m.id} ${role}: ${gap}`);
      assert.ok(difference >= (rule.absoluteFloor || 0));
      assert.ok(high >= (rule.highFloor ?? -Infinity));
      if (rule.pool) assert.ok(q.countries.every(c => rule.pool.split(' ').includes(c.id)));
      if (role === 'discovery' && rule.context) assert.ok(q.countries.every(c => rule.context.split(' ').includes(c.id)));
      q.countries.forEach(c => countries[c.id] = (countries[c.id] || 0) + 1);
      categories[m.category] = (categories[m.category] || 0) + 1;
    });
    assert.ok(Object.values(countries).every(n => n <= 2), 'no country dominates a game');
    for (const [category, n] of Object.entries(categories)) assert.ok(n <= (CATEGORY_LIMITS[category] || 2));
  }
  assert.equal(seen.size, Object.keys(TOPIC_RULES).length, 'all active topics are reachable');
  assert.ok(winners[0] > 4500 && winners[0] < 5500, 'option positions do not bias the winner');
});

test('curated pools have headroom; opaque topics and trivial food differences stay out', () => {
  const inventory = matchupInventory(data);
  assert.equal(inventory.length, 36);
  const countryIds = new Set(data.countries.map(c => c.id));
  for (const rule of Object.values(TOPIC_RULES)) for (const field of ['pool', 'context']) {
    if (rule[field]) assert.ok(rule[field].split(' ').every(id => countryIds.has(id)), `${field} contains an unknown country`);
  }
  for (const {id, counts} of inventory) for (const role of new Set(ROUND_ROLES)) {
    if (TOPIC_RULES[id][role]) assert.ok(counts[role] >= 10, `${id} ${role} is too narrow`);
  }
  for (const id of ['mobile', 'hospitalbeds', 'femalepopulation', 'economicgrowth', 'farmland']) assert.ok(!TOPIC_RULES[id]);
  const olive = TOPIC_RULES.oliveoil_supply;
  assert.ok(!olive.pool.includes('KAZ') && !olive.pool.includes('PRY'));
  assert.ok(olive.absoluteFloor >= 2 && olive.highFloor >= 4, '20-gram olive-oil differences cannot pass');
});

test('same seed and edition replay exactly; data, country order and values are not mutated', () => {
  const before = JSON.stringify(data);
  const first = generateGame(data, '09ab9ac94e11:replay12');
  assert.deepEqual(first, generateGame(data, '09ab9ac94e11:replay12'));
  assert.notDeepEqual(first, generateGame(data, '09ab9ac94e11:replay13'));
  assert.equal(JSON.stringify(data), before);
  assert.throws(() => generateGame({countries: [], metrics: []}, 'empty'), /Not enough eligible/);
});

test('new links use edition 2 while old challenges, daily games and legacy links keep their edition', () => {
  assert.equal(CURRENT_EDITION.id, '2');
  assert.equal(gameRoute('abcd1234', false, CURRENT_EDITION.id), '?challenge=abcd1234&v=2');
  assert.equal(parseRoute('?challenge=abcd1234&v=2').version, '2');
  assert.equal(parseRoute('?challenge=abcd1234').version, '1');
  assert.equal(parseRoute('?challenge=abcd1234&v=1').search, '?challenge=abcd1234');
  assert.equal(parseRoute('?seed=abc123').version, '1');
  assert.equal(parseRoute('?seed=abc123&v=2').kind, 'invalid');
  assert.equal(dailyEdition('2026-11-19').id, '1');
  assert.equal(dailyEdition('2026-11-20').id, '2');
  assert.equal(parseRoute('?date=2026-11-20', '2026-11-20').version, '2');
  assert.equal(parseRoute('?date=2026-11-20&v=2', '2026-11-20').search, '?date=2026-11-20');
  assert.equal(parseRoute('?date=2026-11-19&v=2', '2026-11-20').kind, 'invalid');
  assert.equal(parseRoute('?date=2026-11-20', '2026-11-19').kind, 'invalid');
});
