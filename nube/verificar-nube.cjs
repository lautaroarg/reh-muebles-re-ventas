const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const scripts = [...fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)];
function embedded(index) { const item = new Module(__filename); item._compile(scripts[index][1], __filename); return item.exports; }
const Core = embedded(1);
const Cloud = embedded(2);
const brand = {id: 'hg-galvan', storageKey: 'flowsystem.hg-galvan.v1', categories: ['Frente de parrilla', 'Interior', 'Proyecto completo']};
const config = {url: 'https://testproject.supabase.co', publishableKey: 'sb_publishable_testonly'};
const clone = value => JSON.parse(JSON.stringify(value));
const sale = (id, amount = 10000) => ({id, date: '2026-11-05', amountCents: amount, category: 'Interior', source: 'Meta', description: ''});
function setup(options = {}) {
  const values = new Map();
  const storage = {getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  const log = [];
  const state = {data: Core.empty(brand.id), revision: 1, now: 100000, conflict: 0, noAccess: false, writes: 0, expired: false, invalidRefresh: false, network: false, ambiguous: false, forbidden: false, ...options};
  function reply(status, body) { return {ok: status >= 200 && status < 300, status, text: async () => body === null ? '' : JSON.stringify(body)}; }
  async function fetcher(input, init) {
    const url = new URL(input);
    const body = init.body ? JSON.parse(init.body) : undefined;
    log.push({url, method: init.method, body, headers: init.headers});
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password' && body.password === 'wrong') return reply(400, {});
      if (state.invalidRefresh && url.searchParams.get('grant_type') === 'refresh_token') return reply(401, {});
      return reply(200, {access_token: 'access-test', refresh_token: 'refresh-test', expires_in: state.expired ? .001 : 3600});
    }
    if (url.pathname === '/auth/v1/user') return reply(200, {id: 'test-user'});
    if (url.pathname === '/auth/v1/logout') return reply(204, null);
    if (state.network) throw new Error('offline');
    if (state.forbidden && init.method === 'PATCH') return reply(403, {});
    if (url.pathname !== '/rest/v1/flowsystem_data') return reply(404, {});
    if (state.noAccess) return reply(200, []);
    if (init.method === 'PATCH') {
      state.writes++;
      if (state.conflict > 0) {
        state.conflict--;
        state.data.sales.push(sale('other-tab-' + state.revision));
        state.revision++;
        return reply(200, []);
      }
      if (url.searchParams.get('revision') !== 'eq.' + state.revision) return reply(200, []);
      state.data = clone(body.document);
      state.revision++;
      if (state.ambiguous) throw new Error('response lost');
    }
    return reply(200, [{document: clone(state.data), revision: state.revision}]);
  }
  const client = Cloud.create(config, brand, Core, {fetch: fetcher, storage, now: () => state.now});
  return {client, storage, state, log};
}
test('nube: rechaza URL ajena, HTTP, rutas, credenciales y claves secretas', () => {
  for (const url of ['http://testproject.supabase.co', 'https://example.com', 'https://testproject.supabase.co/path', 'https://user:pass@testproject.supabase.co', 'https://testproject.supabase.co:1234']) assert.throws(() => Cloud.create({...config, url}, brand, Core));
  assert.throws(() => Cloud.create({...config, publishableKey: 'sb_secret_never-expose'}, brand, Core));
});
test('nube: sin sesión no envía consultas ni utiliza el historial local', async () => {
  const {client, log, storage} = setup();
  storage.setItem(brand.storageKey, JSON.stringify({...Core.empty(brand.id), sales: [sale('local')]}));
  await assert.rejects(client.read(), /Iniciá sesión/);
  assert.equal(log.length, 0);
});
test('nube: inicio de sesión válido, acceso por marca y contraseña no almacenada', async () => {
  const {client, log, storage} = setup();
  await client.signIn('user@example.test', 'test-password');
  const data = await client.read();
  assert.equal(data.clientId, brand.id);
  assert.equal(log[2].url.searchParams.get('client_id'), 'eq.hg-galvan');
  assert.equal(log[2].headers.Authorization, 'Bearer access-test');
  assert.equal(log[2].headers.apikey, config.publishableKey);
  assert.equal(storage.getItem(client.sessionKey).includes('test-password'), false);
});
test('nube: un inicio de sesión rechazado no deja sesión', async () => {
  const {client} = setup();
  await assert.rejects(client.signIn('user@example.test', 'wrong'), /correo y la contraseña/);
  assert.equal(client.session(), null);
});
test('nube: una marca sin acceso no se confunde con historial vacío', async () => {
  const {client, state} = setup();
  await client.signIn('user@example.test', 'test-password');
  state.noAccess = true;
  await assert.rejects(client.read(), /espacio autorizado/);
});
test('nube: se rechaza un documento que pertenece a otra marca', async () => {
  const {client, state} = setup();
  await client.signIn('user@example.test', 'test-password');
  state.data.clientId = 'reh-muebles-re';
  await assert.rejects(client.read(), /no pertenece/);
});
test('nube: alta confirmada y actualización condicionada a la revisión leída', async () => {
  const {client, log, state} = setup();
  await client.signIn('user@example.test', 'test-password');
  const result = await client.transact(next => next.sales.push(sale('new')));
  assert.equal(result.sales.length, 1);
  assert.equal(state.revision, 2);
  const request = log.find(entry => entry.method === 'PATCH');
  assert.equal(request.url.searchParams.get('revision'), 'eq.1');
  assert.deepEqual(Object.keys(request.body), ['document']);
  assert.equal(request.headers.Prefer, 'return=representation');
});
test('nube: preserva cambios de otro dispositivo al reintentar un conflicto', async () => {
  const {client, state} = setup({conflict: 1});
  await client.signIn('user@example.test', 'test-password');
  const result = await client.transact(next => next.sales.push(sale('new')));
  assert.deepEqual(result.sales.map(record => record.id).sort(), ['new', 'other-tab-1']);
  assert.equal(state.writes, 2);
});
test('nube: aborta tras tres conflictos en lugar de sobrescribir datos', async () => {
  const {client, state} = setup({conflict: 3});
  await client.signIn('user@example.test', 'test-password');
  await assert.rejects(client.transact(next => next.sales.push(sale('new'))), /simultáneos/);
  assert.equal(state.writes, 3);
  assert.equal(state.data.sales.some(record => record.id === 'new'), false);
});
test('nube: una validación fallida nunca hace PATCH', async () => {
  const {client, state} = setup();
  await client.signIn('user@example.test', 'test-password');
  await assert.rejects(client.transact(next => next.sales.push(sale('bad', -1))), /Monto inválido/);
  assert.equal(state.writes, 0);
});
test('nube: un permiso denegado no genera confirmación de guardado', async () => {
  const {client, state} = setup({forbidden: true});
  await client.signIn('user@example.test', 'test-password');
  await assert.rejects(client.transact(next => next.sales.push(sale('forbidden'))), /permiso/);
  assert.equal(state.data.sales.length, 0);
});
test('nube: pérdida de respuesta después de guardar se comprueba por lectura', async () => {
  const {client, state} = setup({ambiguous: true});
  await client.signIn('user@example.test', 'test-password');
  const result = await client.transact(next => next.sales.push(sale('saved')));
  assert.equal(result.sales.length, 1);
  assert.equal(state.writes, 1);
});
test('nube: un fallo de red no se convierte en una lista vacía exitosa', async () => {
  const {client, state} = setup();
  await client.signIn('user@example.test', 'test-password');
  state.network = true;
  await assert.rejects(client.read(), /No se pudo confirmar/);
});
test('nube: renovación compartida de sesión antes de consultas paralelas', async () => {
  const {client, state, log} = setup();
  await client.signIn('user@example.test', 'test-password');
  state.now += 3600000;
  await Promise.all([client.read(), client.read()]);
  assert.equal(log.filter(entry => entry.url.searchParams.get('grant_type') === 'refresh_token').length, 1);
});
test('nube: renovación rechazada elimina la sesión vencida', async () => {
  const {client, state} = setup();
  await client.signIn('user@example.test', 'test-password');
  state.now += 3600000;
  state.invalidRefresh = true;
  await assert.rejects(client.read());
  assert.equal(client.session(), null);
});
test('nube: cerrar sesión impide nuevas lecturas', async () => {
  const {client} = setup();
  await client.signIn('user@example.test', 'test-password');
  await client.signOut();
  assert.equal(client.session(), null);
  await assert.rejects(client.read(), /Iniciá sesión/);
});
