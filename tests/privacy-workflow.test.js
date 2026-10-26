import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStore, loginAs } from './helpers.js';

/* Regression tests for the features that existed before React / Announcements:
   private vaults, requests + verification, activity privacy, share-link rules, expiry warnings. */

test('login: wrong password fails and is logged; correct one creates a session', async () => {
  const VS = await loadStore();
  assert.equal(VS.login('admin@vaultsync.com', 'wrong'), null);
  assert.ok(VS.getLogs().some((l) => l.action === 'Failed Login'));
  assert.equal(VS.getSession(), null);
  loginAs(VS, 'admin');
  assert.equal(VS.getSession().role, 'Admin');
});

test('PRIVATE VAULT: every role sees only their own documents', async () => {
  const VS = await loadStore();
  for (const [who, email, count] of [['user', 'user@vaultsync.com', 4], ['kabir', 'kabir@vaultsync.com', 2], ['manager', 'manager@vaultsync.com', 1], ['admin', 'admin@vaultsync.com', 1]]) {
    loginAs(VS, who);
    const docs = VS.visibleDocs();
    assert.equal(docs.length, count, who + ' document count');
    assert.ok(docs.every((d) => d.owner === email), who + ' sees only own files');
  }
});

test('share links are visible only to their creator', async () => {
  const VS = await loadStore();
  loginAs(VS, 'user');
  assert.equal(VS.visibleLinks().length, 2);
  for (const who of ['manager', 'admin', 'kabir']) {
    loginAs(VS, who);
    assert.equal(VS.visibleLinks().length, 0, who);
  }
});

test('requests: visibility per role', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  assert.equal(VS.visibleRequests().length, 3);
  loginAs(VS, 'manager');
  assert.deepEqual(VS.visibleRequests().map((r) => r.id).sort(), ['r1', 'r3']);
  loginAs(VS, 'user');
  assert.deepEqual(VS.visibleRequests().map((r) => r.id).sort(), ['r1', 'r2']);
  loginAs(VS, 'kabir');
  assert.deepEqual(VS.visibleRequests().map((r) => r.id).sort(), ['r1', 'r2', 'r3']);
});

test('requests: submission status rules', async () => {
  const VS = await loadStore();
  const req = (id) => VS.getRequests().find((r) => r.id === id);
  assert.equal(VS.statusFor(req('r1'), 'kabir@vaultsync.com'), 'Not submitted');
  assert.equal(VS.statusFor(req('r2'), 'kabir@vaultsync.com'), 'Approved');
  assert.equal(VS.statusFor(req('r3'), 'kabir@vaultsync.com'), 'Overdue');
  assert.equal(VS.statusFor(req('r1'), 'user@vaultsync.com'), 'Pending');
  assert.ok(VS.needsAction('Overdue') && VS.needsAction('Rejected') && !VS.needsAction('Pending') && !VS.needsAction('Approved'));
});

test('activity privacy: owner sees who accessed their file; others and Admin do not see private vault events', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  VS.addLog('Reviewer Download', 'Bonafide-Certificate.pdf', 'admin@vaultsync.com', 'org', 'kabir@vaultsync.com');
  assert.ok(!VS.visibleLogs().some((l) => l.action === 'New Version'), 'admin cannot see personal vault events');
  assert.ok(VS.visibleLogs().some((l) => l.action === 'Failed Login'), 'admin sees failed logins');
  loginAs(VS, 'kabir');
  assert.ok(VS.visibleLogs().some((l) => l.action === 'Reviewer Download'), 'owner sees the access to his file');
  loginAs(VS, 'user');
  assert.ok(!VS.visibleLogs().some((l) => l.subject === 'kabir@vaultsync.com' && l.user !== 'user@vaultsync.com'));
});

test('share link status rules: active / expired / exhausted / revoked', async () => {
  const VS = await loadStore();
  const l = VS.getLinks()[0];
  assert.equal(VS.linkStatus(l), 'active');
  assert.equal(VS.linkStatus({ ...l, expiry: Date.now() - 1 }), 'expired');
  assert.equal(VS.linkStatus({ ...l, downloads: l.maxDownloads }), 'exhausted');
  assert.equal(VS.linkStatus({ ...l, active: false }), 'revoked');
});

test('document validity warnings', async () => {
  const VS = await loadStore();
  const d5 = VS.getDocs().find((d) => d.id === 'd5');        // valid for 18 more days
  assert.equal(VS.expiryInfo(d5).cls, 'b-warn');
  assert.equal(VS.expiryInfo({ validTill: Date.now() - 86400000 * 2 }).text, 'Expired');
  assert.equal(VS.expiryInfo(VS.getDocs()[0]), null);
});

test('data layer notifies React subscribers when data changes', async () => {
  const VS = await loadStore();
  let calls = 0;
  const off = VS.subscribe(() => { calls += 1; });
  const v = VS.getVersion();
  loginAs(VS, 'admin');
  assert.ok(calls > 0 && VS.getVersion() > v);
  off();
  const c = calls;
  VS.logout();
  assert.equal(calls, c, 'unsubscribed listeners are not called');
});
