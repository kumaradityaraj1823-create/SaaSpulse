/**
 * API tests — run with `npm test`.
 * Uses a throwaway in-memory MongoDB, so they never touch your real data.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connectDB, disconnectDB } = require('../src/config/db');
const { seedDatabase } = require('../src/data/seed');
const createApp = require('../src/app');

let server;
let base;

async function call(method, path, body) {
  const isForm = body instanceof FormData;
  const res = await fetch(base + path, {
    method,
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* CSV */ }
  return { status: res.status, json, text };
}

before(async () => {
  await connectDB();
  await seedDatabase();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await disconnectDB();
});

test('health reports a connected database', async () => {
  const { json } = await call('GET', '/health');
  assert.equal(json.db.state, 'connected');
});

test('MRR rebuilt from events equals live MRR', async () => {
  const { json } = await call('GET', '/metrics/overview?months=12');
  const { kpis, trend } = json.data;
  assert.equal(trend.length, 12);
  assert.equal(trend.at(-1).mrr, kpis.mrr);
  assert.equal(kpis.arr, kpis.mrr * 12);
  assert.equal(trend.at(-1).activeCustomers, kpis.activeCustomers);
});

test('rejects an invalid months value', async () => {
  const { status } = await call('GET', '/metrics/overview?months=7');
  assert.equal(status, 400);
});

test('customer lifecycle: create → upgrade → churn → reactivate → delete', async () => {
  const plans = (await call('GET', '/plans')).json.data;
  const basic = plans.find((p) => p.name === 'Basic');
  const pro = plans.find((p) => p.name === 'Pro');
  const before = (await call('GET', '/metrics/overview')).json.data.kpis.mrr;

  const created = await call('POST', '/customers', { name: 'Test Person', email: 'TEST@acme.in', planId: basic.id });
  assert.equal(created.status, 201);
  const id = created.json.data.id;
  assert.equal(created.json.data.email, 'test@acme.in');

  const dup = await call('POST', '/customers', { name: 'Again', email: 'test@acme.in', planId: basic.id });
  assert.equal(dup.status, 409);

  const up = await call('PATCH', `/customers/${id}`, { planId: pro.id });
  assert.equal(up.json.data.mrr, pro.monthlyPrice);
  assert.deepEqual(up.json.data.activity.map((a) => a.type), ['upgrade', 'signup']);

  let mrr = (await call('GET', '/metrics/overview')).json.data.kpis.mrr;
  assert.equal(mrr, before + pro.monthlyPrice);

  const churn = await call('PATCH', `/customers/${id}/status`, { status: 'churned', reason: 'Too expensive' });
  assert.equal(churn.json.data.status, 'churned');
  assert.equal((await call('PATCH', `/customers/${id}/status`, { status: 'churned' })).status, 409);
  assert.equal((await call('GET', '/metrics/overview')).json.data.kpis.mrr, before);

  await call('PATCH', `/customers/${id}/status`, { status: 'active' });
  const o = (await call('GET', '/metrics/overview')).json.data;
  assert.equal(o.kpis.mrr, before + pro.monthlyPrice);
  assert.equal(o.trend.at(-1).mrr, o.kpis.mrr);

  assert.equal((await call('DELETE', `/customers/${id}`)).status, 200);
  assert.equal((await call('GET', `/customers/${id}`)).status, 404);
  assert.equal((await call('GET', '/metrics/overview')).json.data.kpis.mrr, before);
});

test('validation errors list each bad field', async () => {
  const { status, json } = await call('POST', '/customers', { name: 'x', email: 'nope', planId: '1' });
  assert.equal(status, 400);
  assert.deepEqual(json.error.details.map((d) => d.field).sort(), ['email', 'name', 'planId']);
});

test('list supports search, filters, sort and pagination', async () => {
  const { json } = await call('GET', '/customers?status=active&sort=-mrr&limit=5&page=2');
  assert.equal(json.data.length, 5);
  assert.equal(json.meta.page, 2);
  assert.ok(json.data.every((c) => c.status === 'active'));
  assert.ok(json.data[0].mrr >= json.data[4].mrr);
  assert.equal(json.meta.counts.all, json.meta.counts.active + json.meta.counts.churned);
});

test('plans: duplicate names rejected, used plans cannot be deleted', async () => {
  assert.equal((await call('POST', '/plans', { name: 'pro', monthlyPrice: 10 })).status, 409);
  const pro = (await call('GET', '/plans')).json.data.find((p) => p.name === 'Pro');
  assert.equal((await call('DELETE', `/plans/${pro.id}`)).status, 409);
  const fresh = await call('POST', '/plans', { name: 'Growth', monthlyPrice: 999 });
  assert.equal(fresh.status, 201);
  assert.equal((await call('DELETE', `/plans/${fresh.json.data.id}`)).status, 200);
});

test('CSV import: dry run reports problems, commit inserts only valid rows', async () => {
  const csv = 'name,email,plan,signup_date,status,churn_date\nA Person,a@x.in,Pro,2026-03-01,active,\nB,bad-email,Pro,,,\nC Person,c@x.in,Gold,,,\nD Person,d@x.in,Basic,2026-02-01,churned,2026-05-01\n';
  const form = () => {
    const fd = new FormData();
    fd.append('file', new Blob([csv], { type: 'text/csv' }), 'customers.csv');
    return fd;
  };
  const dry = await call('POST', '/imports/customers?dryRun=true', form());
  assert.deepEqual(dry.json.data.summary, { total: 4, valid: 2, invalid: 2, imported: 0 });

  const real = await call('POST', '/imports/customers', form());
  assert.equal(real.json.data.summary.imported, 2);
  const again = await call('POST', '/imports/customers?dryRun=true', form());
  assert.equal(again.json.data.summary.valid, 0);
});

test('export returns CSV', async () => {
  const { text } = await call('GET', '/customers/export?status=churned');
  assert.match(text.split('\n')[0], /^name,email,company/);
});
