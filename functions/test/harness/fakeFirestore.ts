export type OperationLogEntry =
  | { sequence: number; type: "read"; path: string }
  | {
      sequence: number;
      type: "query";
      collectionPath: string;
      filters: QueryFilter[];
    }
  | { sequence: number; type: "write"; path: string; data: unknown };
export type QueryFilter = { field: string; operator: string; value: unknown };

type State = Map<string, any>;
export class FakeDocumentRef {
  constructor(
    public readonly state: State,
    public readonly path: string,
  ) {}
  collection(path: string) {
    return new FakeCollectionRef(this.state, `${this.path}/${path}`);
  }
}
export class FakeCollectionRef {
  constructor(
    private readonly state: State,
    public readonly path: string,
  ) {}
  doc(id?: string) {
    return new FakeDocumentRef(
      this.state,
      `${this.path}/${id || `auto-${this.state.size}`}`,
    );
  }
  where(field: string, operator: string, value: unknown) {
    return new FakeQuery(this.path, [{ field, operator, value }]);
  }
}
export class FakeQuery {
  constructor(
    public readonly collectionPath: string,
    public readonly filters: QueryFilter[],
  ) {}
  where(field: string, operator: string, value: unknown) {
    return new FakeQuery(this.collectionPath, [
      ...this.filters,
      { field, operator, value },
    ]);
  }
}
function clone<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}
function matches(data: any, f: QueryFilter) {
  return f.operator === "==" ? data?.[f.field] === f.value : false;
}
export class FakeTransaction {
  constructor(
    private readonly state: State,
    private readonly log: OperationLogEntry[],
    private seq: () => number,
  ) {}
  async get(refOrQuery: FakeDocumentRef | FakeQuery) {
    if (refOrQuery instanceof FakeQuery) {
      this.log.push({
        sequence: this.seq(),
        type: "query",
        collectionPath: refOrQuery.collectionPath,
        filters: refOrQuery.filters,
      });
      const prefix = `${refOrQuery.collectionPath}/`;
      const docs = [...this.state.entries()]
        .filter(
          ([path]) =>
            path.startsWith(prefix) && !path.slice(prefix.length).includes("/"),
        )
        .filter(([, data]) => refOrQuery.filters.every((f) => matches(data, f)))
        .map(([path, data]) => ({
          ref: new FakeDocumentRef(this.state, path),
          data: () => clone(data),
          exists: true,
        }));
      return { empty: docs.length === 0, size: docs.length, docs };
    }
    this.log.push({
      sequence: this.seq(),
      type: "read",
      path: refOrQuery.path,
    });
    const data = this.state.get(refOrQuery.path);
    return {
      exists: data !== undefined,
      data: () => clone(data),
      ref: refOrQuery,
    };
  }
  set(ref: FakeDocumentRef, data: unknown) {
    const copy = clone(data);
    this.state.set(ref.path, copy);
    this.log.push({
      sequence: this.seq(),
      type: "write",
      path: ref.path,
      data: copy,
    });
  }
}
export interface FakeFirestoreHarness {
  state: State;
  operationLog: OperationLogEntry[];
  collection(path: string): FakeCollectionRef;
  doc(path: string): FakeDocumentRef;
  runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T>;
  seed(path: string, data: unknown): void;
  get(path: string): unknown;
  writesTo(prefix: string): OperationLogEntry[];
  assertReadsBeforeWrites(): void;
}
export function createFakeFirestoreHarness(
  initial: Record<string, unknown> = {},
): FakeFirestoreHarness {
  const state: State = new Map(
    Object.entries(initial).map(([k, v]) => [k, clone(v)]),
  );
  const operationLog: OperationLogEntry[] = [];
  let sequence = 0;
  const next = () => ++sequence;
  const harness: FakeFirestoreHarness = {
    state,
    operationLog,
    collection: (p) => new FakeCollectionRef(state, p),
    doc: (p) => new FakeDocumentRef(state, p),
    runTransaction: (fn) => fn(new FakeTransaction(state, operationLog, next)),
    seed: (p, d) => state.set(p, clone(d)),
    get: (p) => clone(state.get(p)),
    writesTo: (prefix) =>
      operationLog.filter(
        (op) => op.type === "write" && op.path.startsWith(prefix),
      ),
    assertReadsBeforeWrites() {
      const firstWrite = operationLog.findIndex((op) => op.type === "write");
      if (firstWrite < 0) return;
      const laterRead = operationLog
        .slice(firstWrite + 1)
        .find((op) => op.type === "read" || op.type === "query");
      if (laterRead)
        throw new Error(
          `Invalid fake Firestore read/write ordering after first write: ${JSON.stringify(laterRead)}`,
        );
    },
  };
  return harness;
}
