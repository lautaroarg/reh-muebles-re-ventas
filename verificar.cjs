const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const coreHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const coreSource = [...coreHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
const coreModule = new (require('node:module'))(path.join(__dirname, 'embedded-core.cjs'));
coreModule._compile(coreSource, path.join(__dirname, 'embedded-core.cjs'));
const Core = coreModule.exports;
const HG = {id: 'hg-galvan', storageKey: 'flowsystem.hg-galvan.v1', categories: ['Frente de parrilla', 'Interior', 'Proyecto completo']};
const REH = {id: 'reh-muebles-re', storageKey: 'flowsystem.reh-muebles-re.v1', categories: ['Sillones', 'Juegos de comedor', 'Muebles a medida', 'Otros']};
const sale = (id, source, amount, date = '2026-11-05', category = HG.categories[0]) => ({id, source, amountCents: Core.parseAmount(amount), date, category, description: ''});
const spend = (id, platform, amount, date = '2026-11-05') => ({id, platform, amountCents: Core.parseAmount(amount), date, notes: ''});
const fixture = {schemaVersion: 1, clientId: HG.id, sales: [sale('meta', 'Meta', '4800000'), sale('google', 'Google', '1200000'), sale('organic', 'Orgánico', '6000000'), sale('referral', 'Recomendación', '1000000'), sale('other', 'Otro', '500000')], spend: [spend('meta-spend', 'Meta', '400000'), spend('google-spend', 'Google', '100000')]};
function memoryStorage() {
  const values = new Map();
  return {getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value)};
}
test('ROAS usa exclusivamente Meta y Google, no toda la facturación', () => {
  const result = Core.metrics(fixture);
  assert.equal(result.revenue, 1350000000);
  assert.equal(result.adRevenue, 600000000);
  assert.equal(result.count, 5);
  assert.equal(result.paidCount, 2);
  assert.equal(result.spend, 50000000);
  assert.equal(result.roas, 12);
  assert.equal(result.cpa, 25000000);
});
test('ROAS de 12x para 4,8 millones atribuidos y 400 mil de gasto', () => {
  assert.equal(Core.metrics({...fixture, sales: [fixture.sales[0]], spend: [fixture.spend[0]]}).roas, 12);
});
test('los valores de cada plataforma solo usan su propio gasto y sus ventas', () => {
  assert.equal(Core.platformMetrics(fixture, 'Meta').roas, 12);
  assert.equal(Core.platformMetrics(fixture, 'Google').roas, 12);
  assert.equal(Core.platformMetrics(fixture, 'Meta').count, 1);
  assert.equal(Core.platformMetrics(fixture, 'Google').cpa, 10000000);
});
test('sin gasto: ROAS indefinido; sin ventas con gasto: ROAS cero y CPA indefinido', () => {
  assert.equal(Core.metrics(Core.empty(HG.id)).roas, null);
  assert.equal(Core.metrics(Core.empty(HG.id)).cpa, null);
  assert.equal(Core.metrics({...fixture, spend: []}).roas, null);
  const noSales = Core.metrics({...fixture, sales: []});
  assert.equal(noSales.roas, 0);
  assert.equal(noSales.cpa, null);
});
test('ventas orgánicas con gasto no generan ROAS ni ventas atribuidas', () => {
  const result = Core.metrics({...fixture, sales: [fixture.sales[2]]});
  assert.equal(result.roas, 0);
  assert.equal(result.paidCount, 0);
  assert.equal(result.cpa, null);
});
test('importes decimales exactos y coma argentina sin errores acumulados', () => {
  assert.equal(Core.parseAmount('125000,50'), 12500050);
  assert.equal(Core.parseAmount('125000.50'), 12500050);
  assert.equal(Core.parseAmount('0,01'), 1);
  const records = Array.from({length: 100}, (_, index) => sale('small-' + index, 'Meta', '0.10'));
  assert.equal(Core.metrics({...Core.empty(HG.id), sales: records}).revenue, 1000);
});
test('montos inválidos se rechazan sin redondearlos ni aceptar miles ambiguos', () => {
  for (const value of ['0', '-1', '1.000', '1,000', '1.000,50', '1,000.50', '1e5', 'Infinity', 'NaN', '0.001', '', '100000000001']) assert.throws(() => Core.parseAmount(value));
});
test('validación de fechas reales, bisiestos y límites', () => {
  assert.ok(Core.dateValid('2024-02-29'));
  for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-04-31', '2026-1-01', '1999-12-31', '2100-01-01', 'malicious']) assert.equal(Core.dateValid(value), false);
});
test('rangos de mes y trimestre incluyen los últimos días correctos', () => {
  assert.deepEqual(Core.range('month', '2024-02-15'), {start: '2024-02-01', end: '2024-02-29'});
  assert.deepEqual(Core.range('quarter', '2026-11-05'), {start: '2026-10-01', end: '2026-12-31'});
  assert.deepEqual(Core.range('year', '2026-11-05'), {start: '2026-01-01', end: '2026-12-31'});
  assert.throws(() => Core.range('custom', '2026-11-05', '2026-12-01', '2026-11-01'));
});
test('filtros y gráficos respetan las mismas fechas inclusive en meses parciales', () => {
  const data = {...fixture, sales: [...fixture.sales, sale('october', 'Meta', '900000', '2026-10-31'), sale('november-late', 'Meta', '150000', '2026-11-30')], spend: [...fixture.spend, spend('october-spend', 'Meta', '10000', '2026-10-31')]};
  const filtered = Core.filtered(data, Core.range('custom', '2026-11-05', '2026-11-05', '2026-11-05'));
  assert.equal(filtered.sales.length, 5);
  const rows = Core.monthly(filtered);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].month, '2026-11');
  assert.equal(rows[0].revenue, Core.metrics(filtered).revenue);
  assert.equal(rows[0].spend, Core.metrics(filtered).spend);
});
test('meses con solo gastos y cambio de año se agregan correctamente', () => {
  const data = {...Core.empty(HG.id), sales: [sale('jan', 'Google', '1000', '2027-01-02')], spend: [spend('dec', 'Google', '100', '2026-12-31')]};
  const rows = Core.monthly(data);
  assert.deepEqual(rows.map(row => row.month), ['2026-12', '2027-01']);
  assert.equal(rows[0].roas, 0);
  assert.equal(rows[1].roas, null);
});
test('separación de marcas aun en el mismo navegador', () => {
  const storage = memoryStorage();
  Core.transact(storage, HG, next => Object.assign(next, fixture));
  assert.equal(Core.read(storage, REH).sales.length, 0);
  Core.transact(storage, REH, next => next.sales.push(sale('reh-sale', 'Meta', '500', '2026-11-05', 'Sillones')));
  assert.equal(Core.read(storage, HG).sales.length, 5);
  assert.equal(Core.read(storage, REH).sales.length, 1);
  assert.throws(() => Core.merge(Core.empty(REH.id), fixture, REH));
});
test('copias con otra marca o categorías incorrectas no se aceptan', () => {
  assert.throws(() => Core.validateData({...fixture, clientId: REH.id}, HG));
  assert.throws(() => Core.validateData({...fixture, sales: [sale('bad', 'Meta', '10', '2026-11-05', 'Sillones')]}, HG));
  assert.throws(() => Core.validateData({...fixture, sales: [sale('bad', 'Desconocido', '10')]}, HG));
  assert.throws(() => Core.validateData({...fixture, spend: [{...fixture.spend[0], platform: 'Orgánico'}]}, HG));
});
test('crear, leer, editar, eliminar y restaurar una venta persiste correctamente', () => {
  const storage = memoryStorage();
  const record = sale('roundtrip', 'Meta', '1000,35');
  Core.transact(storage, HG, next => next.sales.push(record));
  assert.equal(Core.read(storage, HG).sales[0].amountCents, 100035);
  Core.transact(storage, HG, next => next.sales[0].amountCents = 200001);
  const edited = Core.read(storage, HG).sales[0];
  Core.transact(storage, HG, next => next.sales = []);
  assert.equal(Core.read(storage, HG).sales.length, 0);
  Core.transact(storage, HG, next => next.sales.push(edited));
  assert.equal(Core.read(storage, HG).sales[0].amountCents, 200001);
});
test('los gastos retroactivos y ediciones actualizan el cálculo', () => {
  const storage = memoryStorage();
  Core.transact(storage, HG, next => next.sales.push(sale('retro-sale', 'Meta', '1000', '2026-01-12')));
  Core.transact(storage, HG, next => next.spend.push(spend('retro-spend', 'Meta', '100', '2026-01-01')));
  assert.equal(Core.metrics(Core.read(storage, HG)).roas, 10);
  Core.transact(storage, HG, next => next.spend[0].amountCents = Core.parseAmount('200'));
  assert.equal(Core.metrics(Core.read(storage, HG)).roas, 5);
});
test('la lectura de cada modificación preserva cargas desde otras pestañas', () => {
  const storage = memoryStorage();
  Core.transact(storage, HG, next => next.sales.push(sale('tab-one', 'Meta', '100')));
  Core.transact(storage, HG, next => next.sales.push(sale('tab-two', 'Meta', '200')));
  assert.equal(Core.read(storage, HG).sales.length, 2);
});
test('un fallo de almacenamiento o validación no produce un guardado aparente', () => {
  const storage = memoryStorage();
  Core.transact(storage, HG, next => next.sales.push(sale('original', 'Meta', '100')));
  const original = storage.getItem(HG.storageKey);
  assert.throws(() => Core.transact(storage, HG, next => next.sales[0].amountCents = -1));
  assert.equal(storage.getItem(HG.storageKey), original);
  const failedStorage = {...storage, setItem: () => {throw new Error('QuotaExceededError');}};
  assert.throws(() => Core.transact(failedStorage, HG, next => next.sales.push(sale('new', 'Meta', '10'))));
  assert.equal(storage.getItem(HG.storageKey), original);
});
test('datos dañados no se reemplazan por un historial vacío', () => {
  const storage = memoryStorage();
  storage.setItem(HG.storageKey, '{invalid');
  assert.throws(() => Core.read(storage, HG));
  assert.throws(() => Core.transact(storage, HG, next => next.sales.push(sale('new', 'Meta', '10'))));
  assert.equal(storage.getItem(HG.storageKey), '{invalid');
});
test('importar una copia dos veces es idempotente y conserva lo existente', () => {
  const first = Core.merge(Core.empty(HG.id), fixture, HG);
  const second = Core.merge(first, fixture, HG);
  assert.deepEqual(first, second);
  const more = {...Core.empty(HG.id), sales: [sale('extra', 'Orgánico', '100')]};
  assert.equal(Core.merge(second, more, HG).sales.length, 6);
});
test('duplicados en copia y conflictos con el mismo ID se rechazan sin alterar los datos', () => {
  assert.throws(() => Core.validateData({...fixture, sales: [fixture.sales[0], fixture.sales[0]]}, HG));
  const conflict = {...fixture, sales: [{...fixture.sales[0], amountCents: 123}]};
  const original = JSON.stringify(fixture);
  assert.throws(() => Core.merge(fixture, conflict, HG));
  assert.equal(JSON.stringify(fixture), original);
});
test('descripciones se guardan como texto, con límites de tamaño y campos conocidos', () => {
  const record = {...fixture.sales[0], description: '<img src=x onerror=alert(1)>', unwanted: 'ignored'};
  assert.equal(Core.validateRecord(record, 'sales', HG).description, record.description);
  assert.equal(Core.validateRecord(record, 'sales', HG).unwanted, undefined);
  assert.throws(() => Core.validateRecord({...record, description: 'x'.repeat(241)}, 'sales', HG));
});
for (const filename of ['index.html']) {
  test(filename + ': scripts válidos, tres pantallas y conexión declarada sin URL heredada', () => {
    const html = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    assert.ok(!/__\w+__/.test(html));
    assert.ok(!/script\.google|googleapis|cdnjs/i.test(html));
    assert.equal((html.match(/class="nav-item/g) || []).length, 3);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 4);
    const config = vm.runInNewContext(scripts[0][1] + '; BRAND');
    if (config.cloud.url) {
      assert.ok(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.cloud.url));
      assert.ok(config.cloud.publishableKey.startsWith('sb_publishable_'));
      assert.ok(html.includes('connect-src ' + config.cloud.url + ';'));
    } else {
      assert.ok(!/https?:\/\//i.test(html));
      assert.ok(html.includes("connect-src 'none'"));
    }
    scripts.forEach((match, index) => new vm.Script(match[1], {filename: filename + ':' + index}));
  });
}
