import initSqlJs, { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const IDB_NAME = 'fambai_sqlite_idb';
const IDB_STORE = 'sqlite_snapshots';
const IDB_KEY = 'fambai_main_db';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readSnapshotFromIDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return await new Promise<Uint8Array | null>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result) : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeSnapshotToIDB(bytes: Uint8Array): Promise<void> {
  try {
    const idb = await openIDB();
    await new Promise<void>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(bytes, IDB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Fallback silently to localStorage mirror if IndexedDB is restricted
  }
}

function hasWasmMagicBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  );
}

async function fetchValidWasmBinary(): Promise<Uint8Array | null> {
  const candidates = Array.from(new Set([sqlWasmUrl, '/sql-wasm.wasm'].filter(Boolean)));
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (hasWasmMagicBytes(bytes)) {
        return bytes;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

export type SqliteTableName =
  | 'commuters'
  | 'private_profile'
  | 'routes'
  | 'fare_reports'
  | 'status_reports'
  | 'intercity_reports'
  | 'transporters'
  | 'social_interactions'
  | 'social_replies'
  | 'social_reactions'
  | 'notifications'
  | 'boarding_confirmations'
  | 'location_anchors'
  | 'outbox_pending';

const ALL_TABLES: SqliteTableName[] = [
  'commuters',
  'private_profile',
  'routes',
  'fare_reports',
  'status_reports',
  'intercity_reports',
  'transporters',
  'social_interactions',
  'social_replies',
  'social_reactions',
  'notifications',
  'boarding_confirmations',
  'location_anchors',
  'outbox_pending',
];

class LocalSqliteDatabase {
  private db: Database | null = null;
  private ready: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  public async init(): Promise<boolean> {
    if (this.ready && this.db) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const wasmBytes = await fetchValidWasmBinary();
        if (!wasmBytes) {
          this.ready = false;
          return false;
        }
        // Pass validated wasmBinary directly (ArrayBuffer) so WebAssembly.instantiateStreaming is bypassed
        const SQL = await initSqlJs({
          wasmBinary: wasmBytes.buffer as ArrayBuffer,
        });
        const existingBytes = await readSnapshotFromIDB();
        if (existingBytes) {
          try {
            this.db = new SQL.Database(existingBytes);
          } catch {
            this.db = new SQL.Database();
          }
        } else {
          this.db = new SQL.Database();
        }
        this.createTables();
        this.ready = true;
        return true;
      } catch {
        this.ready = false;
        return false;
      }
    })();

    return this.initPromise;
  }

  private createTables(): void {
    if (!this.db) return;
    const ddl = ALL_TABLES.map(
      (t) => `
      CREATE TABLE IF NOT EXISTS ${t} (
        id TEXT PRIMARY KEY,
        updated_at INTEGER NOT NULL,
        data_json TEXT NOT NULL
      );`
    ).join('\n');
    this.db.run(ddl);
  }

  public isReady(): boolean {
    return this.ready && this.db !== null;
  }

  private schedulePersist(): void {
    if (!this.db) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      if (!this.db) return;
      try {
        const binary = this.db.export();
        writeSnapshotToIDB(binary);
      } catch {
        // Ignore export errors
      }
    }, 120);
  }

  public upsertRecord<T>(table: SqliteTableName, id: string, item: T, updatedAt = Date.now()): void {
    if (!this.db || !this.ready) return;
    try {
      this.db.run(
        `INSERT OR REPLACE INTO ${table} (id, updated_at, data_json) VALUES (?, ?, ?)`,
        [id, updatedAt, JSON.stringify(item)]
      );
      this.schedulePersist();
    } catch {
      // Ignore write error cleanly
    }
  }

  public deleteRecord(table: SqliteTableName, id: string): void {
    if (!this.db || !this.ready) return;
    try {
      this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      this.schedulePersist();
    } catch {
      // Ignore delete error cleanly
    }
  }

  public clearTable(table: SqliteTableName): void {
    if (!this.db || !this.ready) return;
    try {
      this.db.run(`DELETE FROM ${table}`);
      this.schedulePersist();
    } catch {
      // Ignore clear error cleanly
    }
  }

  public replaceTable<T extends { id?: string; device_id?: string; deviceId?: string }>(
    table: SqliteTableName,
    items: T[]
  ): void {
    if (!this.db || !this.ready) return;
    try {
      this.db.run(`DELETE FROM ${table}`);
      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO ${table} (id, updated_at, data_json) VALUES (?, ?, ?)`
      );
      const now = Date.now();
      for (const item of items) {
        const key = item.id || item.device_id || item.deviceId;
        if (!key) continue;
        stmt.run([key, now, JSON.stringify(item)]);
      }
      stmt.free();
      this.schedulePersist();
    } catch {
      // Ignore replaceTable error cleanly
    }
  }

  public getAll<T>(table: SqliteTableName): T[] {
    if (!this.db || !this.ready) return [];
    try {
      const res = this.db.exec(`SELECT data_json FROM ${table} ORDER BY updated_at DESC`);
      if (!res.length || !res[0].values.length) return [];
      return res[0].values
        .map((row) => {
          try {
            return JSON.parse(String(row[0])) as T;
          } catch {
            return null;
          }
        })
        .filter((x): x is T => x !== null);
    } catch {
      return [];
    }
  }

  public getTotalRowCount(): number {
    if (!this.db || !this.ready) return 0;
    let total = 0;
    for (const t of ALL_TABLES) {
      try {
        const res = this.db.exec(`SELECT COUNT(*) FROM ${t}`);
        if (res.length && res[0].values.length) {
          total += Number(res[0].values[0][0] || 0);
        }
      } catch {
        // Ignore missing table
      }
    }
    return total;
  }

  public clearAllUserTables(): void {
    if (!this.db || !this.ready) return;
    const tables: SqliteTableName[] = [
      'fare_reports',
      'status_reports',
      'intercity_reports',
      'transporters',
      'social_interactions',
      'social_replies',
      'social_reactions',
      'notifications',
      'boarding_confirmations',
      'outbox_pending',
    ];
    for (const t of tables) {
      try {
        this.db.run(`DELETE FROM ${t}`);
      } catch {
        // Ignore
      }
    }
    this.schedulePersist();
  }
}

export const sqliteDb = new LocalSqliteDatabase();
