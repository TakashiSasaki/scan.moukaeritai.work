import { beforeEach, describe, expect, test, vi } from 'vitest';
import { submitFactCommand } from '../src/submitFactCommand';
import { resetValidatorsCache } from '../src/logicalFactBuilder';

const { fake } = vi.hoisted(() => {
  type Doc = Record<string, any>;
  const state = new Map<string, Doc>();
  const writes: Array<{ path: string; data: any }> = [];
  const makeRef = (path: string): any => ({ path, id: path.split('/').pop(), collection: (name: string) => makeCollection(`${path}/${name}`) });
  const makeQuery = (collectionPath: string, wheres: any[] = []): any => ({
    _isQuery: true,
    collectionPath,
    wheres,
    where(field: string, op: string, value: any) { return makeQuery(collectionPath, [...wheres, { field, op, value }]); }
  });
  const makeCollection = (path: string): any => ({ path, doc: (id: string) => makeRef(`${path}/${id}`), where: (field: string, op: string, value: any) => makeQuery(path, [{ field, op, value }]) });
  const getValue = (obj: any, dotted: string) => dotted.split('.').reduce((acc, key) => acc?.[key], obj);
  const get = vi.fn(async (ref: any) => {
    if (ref?._isQuery) {
      const prefix = `${ref.collectionPath}/`;
      const docs = [...state.entries()]
        .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
        .filter(([, data]) => ref.wheres.every((w: any) => w.op === '==' && getValue(data, w.field) === w.value))
        .map(([path, data]) => ({ ref: makeRef(path), data: () => data, exists: true }));
      return { docs };
    }
    const data = state.get(ref.path);
    return { exists: Boolean(data), data: () => data ?? null, ref };
  });
  const set = vi.fn((ref: any, data: any) => { writes.push({ path: ref.path, data }); state.set(ref.path, data); });
  const runTransaction = vi.fn(async (callback: any) => callback({ get, set }));
  const db = { collection: (name: string) => makeCollection(name), runTransaction };
  function reset() {
    state.clear(); writes.length = 0; get.mockClear(); set.mockClear(); runTransaction.mockClear();
    state.set('objects/object1', { ownerId: 'test-user' });
    state.set('objects/object2', { ownerId: 'test-user' });
    state.set('objects/urn:example:object:123', { ownerId: 'test-user' });
    state.set('markers/marker1', { ownerId: 'test-user', identityModelVersion: 'v2', canonicalizationVersion: 'v1' });
    state.set('markers/marker2', { ownerId: 'test-user', identityModelVersion: 'v3', canonicalizationVersion: 'v2' });
    state.set('markers/foreign-marker', { ownerId: 'other-user' });
    state.set('places/place1', { ownerId: 'test-user' });
    state.set('associations/assoc1', { ownerId: 'test-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] });
    state.set('associations/assocReplace', { ownerId: 'test-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] });
    state.set('associations/assocForeign', { ownerId: 'other-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] });
    state.set('associations/assocDetached', { ownerId: 'test-user', operation: 'detach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] });
  }
  return { fake: { state, writes, get, set, runTransaction, db, reset } };
});

vi.mock('firebase-functions/v2/https', () => ({ onCall: (handler: any) => handler, HttpsError: class HttpsError extends Error { constructor(public code: string, message: string) { super(message); } } }));
vi.mock('firebase-admin', () => ({ app: vi.fn().mockReturnValue({}), initializeApp: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => fake.db,
  Timestamp: class Timestamp { constructor(public seconds = 0, public nanoseconds = 0) {} static now() { return new Timestamp(Date.now(), 0); } static fromDate(date: Date) { return new Timestamp(date.getTime(), 0); } },
  GeoPoint: class GeoPoint { constructor(public latitude: number, public longitude: number) {} }
}));

const auth = { uid: 'test-user' };
const cmd = (suffix: string) => `123e4567-e89b-42d3-a456-4266141740${suffix.padStart(2, '0')}`;
function eventPayload(commandId = cmd('01'), participant = { role: 'object', ref: { entityType: 'object', id: 'object1' } }) { return { commandId, factType: 'event', data: { eventType: 'test', time: { occurredAt: '2026-07-12T05:00:00Z' }, provenance: { source: 'user_confirmed', confidence: 'high' }, participants: [participant] } }; }
function associationPayload(commandId: string, operation: string, participants: any[], subjectAssociationId?: string) { const data: any = { operation, effectiveAt: '2026-07-12T05:00:00Z', provenance: { source: 'user_confirmed', confidence: 'high' }, participants }; if (subjectAssociationId) data.subjectAssociationId = subjectAssociationId; return { commandId, factType: 'association', data }; }
const objectMarker = (objectId='object1', markerId='marker1') => [{ role:'object', ref:{entityType:'object', id:objectId}}, { role:'marker', ref:{entityType:'marker', id:markerId}}];
const factWrites = () => fake.writes.filter(w => /^(associations|observations|measurements|events)\//.test(w.path));
const receiptWrites = () => fake.writes.filter(w => w.path.startsWith('users/'));

beforeEach(() => { resetValidatorsCache(); fake.reset(); });

describe('Owner-aware fake Firestore', () => {
  test('preserves nested receipt path and colon IDs', async () => {
    await submitFactCommand({ auth, data: eventPayload(cmd('10'), { role:'object', ref:{ entityType:'object', id:'urn:example:object:123' } }) });
    expect(receiptWrites()[0].path).toBe(`users/test-user/factCommands/${cmd('10')}`);
    expect([...fake.state.keys()]).toContain('objects/urn:example:object:123');
  });
});

describe('Idempotency matrix', () => {
  test('exact replay returns same factId and writes nothing', async () => {
    const payload = eventPayload(cmd('11'));
    const first = await submitFactCommand({ auth, data: payload });
    expect(factWrites()).toHaveLength(1); expect(receiptWrites()).toHaveLength(1);
    expect(receiptWrites()[0].data.requestHashVersion).toBe("sha256-canonical-json-v1");
    expect(receiptWrites()[0].data.canonicalJsonVersion).toBe(1);
    fake.writes.length = 0;
    const replay = await submitFactCommand({ auth, data: payload });
    expect(replay.factId).toBe(first.factId);
    expect(factWrites()).toHaveLength(0); expect(receiptWrites()).toHaveLength(0);
  });
  test('same owner command drift rejects without writes', async () => {
    const payload = eventPayload(cmd('12'));
    await submitFactCommand({ auth, data: payload });
    const receiptPath = `users/test-user/factCommands/${cmd('12')}`;
    for (const mutate of [
      (p:any) => { p.data.eventType = 'other'; },
      (p:any) => { p.factType = 'measurement'; p.data = { measurementType:'temperature', time:{measuredAt:'2026-07-12T05:00:00Z'}, provenance:{source:'location_measurement', confidence:'high'}, participants: objectMarker('object1','marker1').slice(0,1) }; },
    ]) { fake.writes.length = 0; const p=JSON.parse(JSON.stringify(payload)); mutate(p); await expect(submitFactCommand({ auth, data:p })).rejects.toThrow(); expect(fake.writes).toHaveLength(0); }
    for (const field of ['callableApiVersion','requestHashVersion','canonicalJsonVersion']) { const saved={...fake.state.get(receiptPath)}; fake.state.set(receiptPath, { ...saved, [field]: field==='canonicalJsonVersion' ? 999 : 'drift' }); fake.writes.length=0; await expect(submitFactCommand({ auth, data:payload })).rejects.toThrow(); expect(fake.writes).toHaveLength(0); fake.state.set(receiptPath, saved); }
    fake.state.set(receiptPath, { commandId: cmd('12'), ownerId:'test-user', factId:'legacy' }); fake.writes.length=0; await expect(submitFactCommand({ auth, data:payload })).rejects.toThrow(); expect(fake.writes).toHaveLength(0);
  });
  test('different owner same commandId is independent', async () => {
    const payload = eventPayload(cmd('13'), { role:'user', ref:{ entityType:'user', id:'shared-user' } });
    const first = await submitFactCommand({ auth, data: payload });
    const second = await submitFactCommand({ auth:{uid:'other-user'}, data: payload });
    expect(first.factId).not.toBe(second.factId);
    expect(fake.state.has(`users/test-user/factCommands/${cmd('13')}`)).toBe(true);
    expect(fake.state.has(`users/other-user/factCommands/${cmd('13')}`)).toBe(true);
  });
});

describe('Participant validation and association transition matrix', () => {
  test('nonexistent or foreign participants reject without writes', async () => {
    for (const payload of [eventPayload(cmd('20'), {role:'place', ref:{entityType:'place', id:'missing'}}), { ...eventPayload(cmd('21')), factType:'measurement', data:{ measurementType:'temperature', time:{measuredAt:'2026-07-12T05:00:00Z'}, provenance:{source:'location_measurement', confidence:'high'}, participants:[{role:'marker', ref:{entityType:'marker', id:'foreign-marker'}}] } }]) { fake.writes.length=0; await expect(submitFactCommand({ auth, data:payload })).rejects.toThrow(); expect(fake.writes).toHaveLength(0); }
  });
  test('valid attach detach replace and negative transitions', async () => {
    await expect(submitFactCommand({ auth, data: associationPayload(cmd('30'),'attach',objectMarker()) })).resolves.toMatchObject({ success:true });
    await expect(submitFactCommand({ auth, data: associationPayload(cmd('31'),'detach',objectMarker(),'assoc1') })).resolves.toMatchObject({ success:true });
    fake.state.delete('associations/existingDetach');
    await expect(submitFactCommand({ auth, data: associationPayload(cmd('32'),'replace',objectMarker('object1','marker2'),'assocReplace') })).resolves.toMatchObject({ success:true });
    const negatives = [
      associationPayload(cmd('33'),'detach',objectMarker(),'missing'),
      associationPayload(cmd('34'),'detach',objectMarker(),'assocForeign'),
      associationPayload(cmd('35'),'detach',objectMarker(),'assocDetached'),
      associationPayload(cmd('36'),'detach',objectMarker('object2','marker1'),'assoc1'),
      associationPayload(cmd('37'),'detach',objectMarker('object1','marker2'),'assoc1'),
      associationPayload(cmd('38'),'replace',objectMarker('object1','marker1'),'assoc1'),
      associationPayload(cmd('39'),'replace',[{role:'object', ref:{entityType:'object', id:'object1'}}],'assoc1'),
      associationPayload(cmd('40'),'replace',[...objectMarker('object1','marker1'), {role:'marker', ref:{entityType:'marker', id:'marker2'}}],'assoc1'),
      associationPayload(cmd('41'),'replace',objectMarker('object1','missing'),'assoc1'),
      associationPayload(cmd('42'),'replace',objectMarker('object1','foreign-marker'),'assoc1'),
    ];
    fake.state.set('associations/existingDetach', { ownerId:'test-user', operation:'detach', subjectAssociationId:'assoc1' });
    negatives.push(associationPayload(cmd('43'),'detach',objectMarker(),'assoc1'));
    fake.state.delete('associations/existingDetach'); fake.state.set('associations/existingReplace', { ownerId:'test-user', operation:'replace', subjectAssociationId:'assoc1' });
    negatives.push(associationPayload(cmd('44'),'replace',objectMarker('object1','marker2'),'assoc1'));
    for (const payload of negatives) { fake.writes.length=0; await expect(submitFactCommand({ auth, data: payload })).rejects.toThrow(); expect(factWrites()).toHaveLength(0); expect(receiptWrites()).toHaveLength(0); }
  });
});
