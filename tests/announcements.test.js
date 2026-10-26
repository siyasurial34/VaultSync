import test from 'node:test';
import assert from 'node:assert/strict';
import { loadStore, loginAs, rawGet, ACCOUNTS } from './helpers.js';
import { toDateInput } from '../src/lib/format.js';

const DAY = 86400000;
const GOOD = { title: 'Library closed on Friday', message: 'The central library will stay closed on Friday for inventory.', important: false, expiresAt: '' };

function expectApiError(fn, status) {
  assert.throws(fn, (e) => e.name === 'ApiError' && e.status === status, 'expected ApiError ' + status);
}

/* ---------------- sample data + visibility ---------------- */
test('sample announcements are seeded (4 active, 1 expired)', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  const all = VS.listAnnouncements();
  assert.equal(all.length, 5);
  assert.equal(all.filter((a) => a.expired).length, 1);
  assert.ok(all.some((a) => a.important), 'at least one Important sample');
});

test('all three roles see the same active announcements; only Admin also gets expired ones', async () => {
  const VS = await loadStore();
  const seen = {};
  for (const who of ['admin', 'manager', 'user', 'kabir']) {
    loginAs(VS, who);
    seen[who] = VS.listActiveAnnouncements().map((a) => a.id);
  }
  assert.deepEqual(seen.manager, seen.admin);
  assert.deepEqual(seen.user, seen.admin);
  assert.deepEqual(seen.kabir, seen.admin);
  assert.equal(seen.admin.length, 4);

  loginAs(VS, 'admin');
  assert.equal(VS.listAnnouncements().length, 5, 'admin page lists expired too');
  for (const who of ['manager', 'user']) {
    loginAs(VS, who);
    const list = VS.listAnnouncements();
    assert.equal(list.length, 4, who + ' page lists active only');
    assert.ok(list.every((a) => !a.expired), who + ' never receives an expired announcement');
  }
});

test('lists are newest first and the dashboard list is capped at 3', async () => {
  const VS = await loadStore();
  loginAs(VS, 'user');
  const dash = VS.listActiveAnnouncements(3);
  assert.equal(dash.length, 3);
  for (let i = 1; i < dash.length; i++) assert.ok(dash[i - 1].createdAt >= dash[i].createdAt);
  const page = VS.listAnnouncements();
  for (let i = 1; i < page.length; i++) assert.ok(page[i - 1].createdAt >= page[i].createdAt);
});

/* ---------------- Admin create / edit / delete ---------------- */
test('Admin can create, edit and delete; data is persisted and logged', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  const created = VS.createAnnouncement({ ...GOOD, important: true, expiresAt: toDateInput(Date.now() + 3 * DAY) });
  assert.equal(created.title, GOOD.title);
  assert.equal(created.important, true);
  assert.equal(created.createdBy, ACCOUNTS.admin[0]);
  assert.ok(created.expiresAt > Date.now());

  assert.ok(rawGet('vs_announcements').some((a) => a.id === created.id), 'stored in persistent storage');
  assert.equal(VS.listActiveAnnouncements(1)[0].id, created.id, 'newest appears first');

  const updated = VS.updateAnnouncement(created.id, { title: 'Library closed Friday (updated)', message: 'Updated message text here.', important: false, expiresAt: '' });
  assert.equal(updated.title, 'Library closed Friday (updated)');
  assert.equal(updated.expiresAt, null);
  assert.equal(updated.important, false);
  assert.equal(updated.createdAt, created.createdAt, 'creation date is kept on edit');
  assert.ok(updated.updatedAt >= created.updatedAt);

  VS.deleteAnnouncement(created.id);
  assert.ok(!rawGet('vs_announcements').some((a) => a.id === created.id));

  const actions = VS.getLogs().map((l) => l.action);
  for (const a of ['Announcement Posted', 'Announcement Updated', 'Announcement Deleted']) assert.ok(actions.includes(a), a + ' logged');
});

test('announcements survive a reload and are not re-seeded over', async () => {
  let VS = await loadStore();
  loginAs(VS, 'admin');
  const created = VS.createAnnouncement(GOOD);
  VS = await loadStore({ fresh: false });          // simulates reloading the page with the same storage
  assert.equal(rawGet('vs_announcements').length, 6);
  loginAs(VS, 'user');
  assert.ok(VS.listAnnouncements().some((a) => a.id === created.id));
});

test('projects that already have demo data (but no announcements yet) get the samples without losing data', async () => {
  let VS = await loadStore();
  localStorage.removeItem('vs_announcements');
  const docsBefore = localStorage.getItem('vs_docs');
  VS = await loadStore({ fresh: false });
  assert.equal(rawGet('vs_announcements').length, 5);
  assert.equal(localStorage.getItem('vs_docs'), docsBefore);
});

/* ---------------- validation ---------------- */
test('input validation returns 400 with field messages', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  const bad = [
    [{ ...GOOD, title: 'ab' }, 'title'],
    [{ ...GOOD, title: 'x'.repeat(101) }, 'title'],
    [{ ...GOOD, title: '   ' }, 'title'],
    [{ ...GOOD, message: 'hey' }, 'message'],
    [{ ...GOOD, message: 'x'.repeat(1001) }, 'message'],
    [{ ...GOOD, expiresAt: 'not-a-date' }, 'expiresAt'],
    [{ ...GOOD, expiresAt: toDateInput(Date.now() - 2 * DAY) }, 'expiresAt'],
    [null, 'title'],
    [undefined, 'title']
  ];
  const before = rawGet('vs_announcements').length;
  for (const [input, field] of bad) {
    assert.throws(() => VS.createAnnouncement(input), (e) => Boolean(e.status === 400 && e.fields && e.fields[field]), 'invalid ' + field);
  }
  assert.equal(rawGet('vs_announcements').length, before, 'nothing saved by rejected requests');

  const ok = VS.createAnnouncement({ ...GOOD, expiresAt: toDateInput(Date.now()) });   // today is allowed (end of day)
  assert.ok(ok.expiresAt >= Date.now());
});

test('title and message are trimmed; unknown fields cannot override server-set ones', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  const a = VS.createAnnouncement({ ...GOOD, title: '  Padded title  ', id: 'hacked', createdBy: 'evil@x.com', createdAt: 1 });
  assert.equal(a.title, 'Padded title');
  assert.notEqual(a.id, 'hacked');
  assert.equal(a.createdBy, ACCOUNTS.admin[0]);
  assert.ok(a.createdAt > 1);
});

test('update / delete of an unknown id return 404, and bad edits return 400', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  expectApiError(() => VS.updateAnnouncement('nope', GOOD), 404);
  expectApiError(() => VS.deleteAnnouncement('nope'), 404);
  const existing = VS.listAnnouncements()[0];
  expectApiError(() => VS.updateAnnouncement(existing.id, { ...GOOD, title: '' }), 400);
  expectApiError(() => VS.updateAnnouncement(existing.id, { ...GOOD, message: 'no' }), 400);
  expectApiError(() => VS.updateAnnouncement(existing.id, { ...GOOD, expiresAt: 'garbage' }), 400);
});

/* ---------------- expiry filtering ---------------- */
test('expiry: expired announcements disappear for Manager/User but stay manageable for Admin', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  const a = VS.createAnnouncement({ ...GOOD, expiresAt: toDateInput(Date.now() + 2 * DAY) });
  for (const who of ['manager', 'user']) {
    loginAs(VS, who);
    assert.ok(VS.listAnnouncements().some((x) => x.id === a.id), who + ' sees it while active');
  }

  loginAs(VS, 'admin');
  VS.updateAnnouncement(a.id, { ...GOOD, expiresAt: toDateInput(Date.now() - 1 * DAY) });   // expire it (past date allowed on edit)
  for (const who of ['manager', 'user']) {
    loginAs(VS, who);
    assert.ok(!VS.listAnnouncements().some((x) => x.id === a.id), who + ' no longer sees it');
    assert.ok(!VS.listActiveAnnouncements().some((x) => x.id === a.id), who + ' dashboard no longer shows it');
  }
  loginAs(VS, 'admin');
  const adminView = VS.listAnnouncements().find((x) => x.id === a.id);
  assert.ok(adminView && adminView.expired === true, 'Admin still sees it, flagged as expired');
  assert.ok(!VS.listActiveAnnouncements().some((x) => x.id === a.id), 'but it is not on the Admin dashboard');

  VS.updateAnnouncement(a.id, { ...GOOD, expiresAt: toDateInput(Date.now() + 5 * DAY) });    // Admin can reactivate it
  loginAs(VS, 'user');
  assert.ok(VS.listAnnouncements().some((x) => x.id === a.id));
});

test('an announcement with no expiry never expires', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  const a = VS.createAnnouncement(GOOD);
  assert.equal(a.expiresAt, null);
  assert.equal(VS.isAnnouncementActive(a), true);
});

/* ---------------- permissions: direct "API" calls ---------------- */
test('Manager and User cannot create, edit or delete (403) and nothing changes', async () => {
  const VS = await loadStore();
  const snapshot = localStorage.getItem('vs_announcements');
  const target = rawGet('vs_announcements')[0];
  for (const who of ['manager', 'user', 'kabir']) {
    loginAs(VS, who);
    expectApiError(() => VS.createAnnouncement(GOOD), 403);
    expectApiError(() => VS.updateAnnouncement(target.id, { ...GOOD, title: 'Defaced by ' + who }), 403);
    expectApiError(() => VS.deleteAnnouncement(target.id), 403);
  }
  assert.equal(localStorage.getItem('vs_announcements'), snapshot, 'stored announcements are byte-for-byte unchanged');
  assert.ok(!VS.getLogs().some((l) => l.action.startsWith('Announcement')), 'no announcement activity was logged');
});

test('permission is checked before validation or existence (no information leak to non-admins)', async () => {
  const VS = await loadStore();
  loginAs(VS, 'user');
  expectApiError(() => VS.createAnnouncement({}), 403);          // invalid body, still 403 not 400
  expectApiError(() => VS.updateAnnouncement('does-not-exist', GOOD), 403);   // unknown id, still 403 not 404
  expectApiError(() => VS.deleteAnnouncement('does-not-exist'), 403);
});

test('a logged-out caller gets 401 for every announcement call', async () => {
  const VS = await loadStore();
  VS.logout();
  expectApiError(() => VS.listAnnouncements(), 401);
  expectApiError(() => VS.listActiveAnnouncements(3), 401);
  expectApiError(() => VS.createAnnouncement(GOOD), 401);
  expectApiError(() => VS.updateAnnouncement('a1', GOOD), 401);
  expectApiError(() => VS.deleteAnnouncement('a1'), 401);
});

test('a tampered session cannot grant Admin rights (role is re-checked against the users table)', async () => {
  const VS = await loadStore();
  loginAs(VS, 'manager');
  const s = rawGet('vs_session');
  localStorage.setItem('vs_session', JSON.stringify({ ...s, role: 'Admin' }));   // forge the role claim
  expectApiError(() => VS.createAnnouncement(GOOD), 403);
  expectApiError(() => VS.deleteAnnouncement('a1'), 403);

  localStorage.setItem('vs_session', JSON.stringify({ ...s, email: 'ghost@nowhere.com', role: 'Admin' }));   // user that does not exist
  expectApiError(() => VS.createAnnouncement(GOOD), 401);
});

test('a demoted Admin loses write access immediately', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  VS.createAnnouncement(GOOD);
  const users = VS.getUsers();
  users.find((u) => u.email === ACCOUNTS.admin[0]).role = 'User';
  VS.saveUsers(users);
  expectApiError(() => VS.createAnnouncement(GOOD), 403);
});

/* ---------------- regression: existing features untouched ---------------- */
test('announcement operations never touch documents, requests, submissions or share links', async () => {
  const VS = await loadStore();
  const keys = ['vs_docs', 'vs_requests', 'vs_subs', 'vs_links', 'vs_users'];
  const before = keys.map((k) => localStorage.getItem(k));
  loginAs(VS, 'admin');
  const a = VS.createAnnouncement(GOOD);
  VS.updateAnnouncement(a.id, { ...GOOD, title: 'Changed title here' });
  VS.deleteAnnouncement(a.id);
  assert.deepEqual(keys.map((k) => localStorage.getItem(k)), before);
});

test('announcement log entries are organization-level: Admin sees them, Users do not', async () => {
  const VS = await loadStore();
  loginAs(VS, 'admin');
  VS.createAnnouncement(GOOD);
  assert.ok(VS.visibleLogs().some((l) => l.action === 'Announcement Posted'));
  loginAs(VS, 'user');
  assert.ok(!VS.visibleLogs().some((l) => l.action === 'Announcement Posted'));
});
