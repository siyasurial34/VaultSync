// Test helper: gives every test a fresh in-memory localStorage and a fresh copy of the store module.
let counter = 0;
const mem = {};

globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }
};

export function wipeStorage() {
  Object.keys(mem).forEach((k) => delete mem[k]);
}

export function rawGet(key) {
  const v = localStorage.getItem(key);
  return v === null ? null : JSON.parse(v);
}

// Re-imports store.js so seeding runs again against whatever is currently in storage.
export async function loadStore({ fresh = true } = {}) {
  if (fresh) wipeStorage();
  counter += 1;
  return import('../src/lib/store.js?run=' + counter);
}

export const ACCOUNTS = {
  admin: ['admin@vaultsync.com', 'admin123'],
  manager: ['manager@vaultsync.com', 'manager123'],
  user: ['user@vaultsync.com', 'user123'],
  kabir: ['kabir@vaultsync.com', 'user123']
};

export function loginAs(VS, who) {
  const [email, pass] = ACCOUNTS[who];
  if (!VS.login(email, pass)) throw new Error('login failed for ' + who);
}
