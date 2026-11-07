import { readLocalCmsState, writeLocalCmsState } from '../src/services/localCmsStorage.ts';

const fail = (message: string): never => {
  throw new Error(`[CMS storage regression] ${message}`);
};

const values = new Map<string, string>();
let rejectWrites = false;
const storageMock = {
  get length() { return values.size; },
  clear: () => values.clear(),
  getItem: (key: string) => values.get(key) ?? null,
  key: (index: number) => [...values.keys()][index] ?? null,
  removeItem: (key: string) => { values.delete(key); },
  setItem: (key: string, value: string) => {
    if (rejectWrites) throw new Error('storage quota exceeded');
    values.set(key, String(value));
  },
} as Storage;

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storageMock,
});

const fallback = { theme: 'dark', language: 'fa' };
if (readLocalCmsState('missing', fallback) !== fallback) {
  fail('missing keys must return the supplied fallback');
}

const saved = { theme: 'light', language: 'fa', revision: 2 };
if (!writeLocalCmsState('settings', saved)) fail('valid state should be written');
const restored = readLocalCmsState<typeof saved>('settings', fallback);
if (JSON.stringify(restored) !== JSON.stringify(saved)) {
  fail('saved CMS state must survive a read-after-write cycle');
}

storageMock.setItem('malformed', '{invalid-json');
if (readLocalCmsState('malformed', fallback) !== fallback) {
  fail('malformed stored JSON must fall back safely');
}

rejectWrites = true;
if (writeLocalCmsState('quota', saved)) {
  fail('storage quota errors must be reported without throwing');
}
