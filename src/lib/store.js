/* VaultSync data layer (framework independent).

   localStorage stands in for the database and backend until they are built.
   Every function here will become a REST API call later, so React components never
   touch localStorage directly: they only call functions from this file.

   Privacy rule used everywhere: a personal document is visible ONLY to its owner.
   Other people (reviewers, link visitors) get access only to what the owner
   submits to a request or shares through a link.

   Announcements: everyone logged in can read; create / update / delete are Admin-only and
   enforced here (the "server side" of this prototype), not only by hiding buttons. */
import { fmtDate, daysUntil } from './format.js';

const DATA_VERSION = '2';          // bump to reset demo data when the structure changes
export const QUOTA = 100 * 1024 * 1024;   // demo storage quota per person: 100 MB
const KEYS = {
  users: 'vs_users', session: 'vs_session', docs: 'vs_docs', links: 'vs_links',
  logs: 'vs_logs', requests: 'vs_requests', subs: 'vs_subs', announcements: 'vs_announcements'
};
export const FOLDERS = ['General', 'Academics', 'Finance', 'HR', 'Projects'];
export const CATEGORIES = ['Report', 'Certificate', 'Invoice', 'Contract', 'Notes', 'Other'];

/* ---------- change notification (lets React re-render after any write) ---------- */
const listeners = new Set();
let version = 0;
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getVersion() { return version; }
function notify() { version += 1; listeners.forEach((fn) => fn()); }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', notify);   // another browser tab changed the data
}

/* ---------- storage helpers ---------- */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); notify(); }
export function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
export function makeToken() { return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8); }

export const getUsers = () => load(KEYS.users, []);
export const saveUsers = (v) => save(KEYS.users, v);
export const getDocs = () => load(KEYS.docs, []);
export const saveDocs = (v) => save(KEYS.docs, v);
export const getLinks = () => load(KEYS.links, []);
export const saveLinks = (v) => save(KEYS.links, v);
export const getLogs = () => load(KEYS.logs, []);
export const getRequests = () => load(KEYS.requests, []);
export const saveRequests = (v) => save(KEYS.requests, v);
export const getSubs = () => load(KEYS.subs, []);
export const saveSubs = (v) => save(KEYS.subs, v);
export const getSession = () => load(KEYS.session, null);

/* ---------- demo data ---------- */
function seed() {
  if (localStorage.getItem('vs_dataversion') === DATA_VERSION && localStorage.getItem(KEYS.users)) return;
  Object.keys(KEYS).forEach((k) => localStorage.removeItem(KEYS[k]));
  localStorage.setItem('vs_dataversion', DATA_VERSION);

  const day = 86400000, now = Date.now(), KB = 1024;
  const org = 'Demo University';
  const ADMIN = 'admin@vaultsync.com', MANAGER = 'manager@vaultsync.com', RIYA = 'user@vaultsync.com', KABIR = 'kabir@vaultsync.com';

  saveUsers([
    { id: 'u1', name: 'Aarav Admin', email: ADMIN, password: 'admin123', role: 'Admin', org: org },
    { id: 'u2', name: 'Meera Manager', email: MANAGER, password: 'manager123', role: 'Manager', org: org },
    { id: 'u3', name: 'Riya User', email: RIYA, password: 'user123', role: 'User', org: org },
    { id: 'u4', name: 'Kabir User', email: KABIR, password: 'user123', role: 'User', org: org }
  ]);

  const ver = (v, sizeKB, daysAgo, by, note) => ({ v: v, size: sizeKB * KB, date: now - daysAgo * day, by: by, note: note });
  const doc = (id, name, type, size, folder, category, tags, email, owner, daysAgo, access, versions, cur, validDays) => ({
    id: id, name: name, type: type, size: size * KB, folder: folder, category: category, tags: tags,
    favorite: false, owner: email, ownerName: owner, org: org, uploadedAt: now - daysAgo * day,
    accessCount: access, versions: versions, currentVersion: cur,
    validTill: validDays === undefined ? null : now + validDays * day
  });

  saveDocs([
    doc('d1', 'Semester-5-Result.pdf', 'pdf', 820, 'Academics', 'Report', ['result', 'semester'], RIYA, 'Riya User', 12, 14,
      [ver(1, 820, 12, 'Riya User', 'Initial upload')], 1),
    doc('d2', 'Project-Proposal.docx', 'docx', 340, 'Projects', 'Report', ['proposal', 'project'], RIYA, 'Riya User', 20, 9,
      [ver(1, 280, 20, 'Riya User', 'First draft'), ver(2, 340, 6, 'Riya User', 'Added budget section')], 2),
    doc('d3', 'Fee-Receipt-2026.pdf', 'pdf', 150, 'Finance', 'Invoice', ['fee', 'receipt'], RIYA, 'Riya User', 9, 6,
      [ver(1, 150, 9, 'Riya User', 'Initial upload')], 1),
    doc('d5', 'ID-Card-Scan.png', 'image', 1400, 'General', 'Certificate', ['id', 'scan'], RIYA, 'Riya User', 3, 3,
      [ver(1, 1400, 3, 'Riya User', 'Initial upload')], 1, 18),
    doc('d6', 'Org-Policy-2026.docx', 'docx', 520, 'HR', 'Notes', ['policy'], ADMIN, 'Aarav Admin', 30, 11,
      [ver(1, 470, 30, 'Aarav Admin', 'Initial upload'), ver(2, 520, 10, 'Aarav Admin', 'Updated leave policy')], 2),
    doc('d7', 'Bonafide-Certificate.pdf', 'pdf', 240, 'Academics', 'Certificate', ['bonafide'], KABIR, 'Kabir User', 18, 2,
      [ver(1, 240, 18, 'Kabir User', 'Initial upload')], 1, 200),
    doc('d8', 'Address-Proof.pdf', 'pdf', 310, 'General', 'Other', ['address'], KABIR, 'Kabir User', 25, 1,
      [ver(1, 310, 25, 'Kabir User', 'Initial upload')], 1, 25),
    doc('d9', 'Meeting-Notes.docx', 'docx', 90, 'Projects', 'Notes', ['meeting'], MANAGER, 'Meera Manager', 5, 2,
      [ver(1, 90, 5, 'Meera Manager', 'Initial upload')], 1)
  ]);

  saveLinks([
    { id: 'l1', token: 'demo1234abcd', docId: 'd2', docName: 'Project-Proposal.docx', type: 'Public', permission: 'download',
      password: '', expiry: now + 5 * day, maxDownloads: 5, downloads: 1, createdBy: RIYA, createdAt: now - 2 * day, active: true },
    { id: 'l2', token: 'secure5678xy', docId: 'd3', docName: 'Fee-Receipt-2026.pdf', type: 'Public', permission: 'download',
      password: 'vault123', expiry: now + 3 * day, maxDownloads: 3, downloads: 0, createdBy: RIYA, createdAt: now - 1 * day, active: true }
  ]);

  saveRequests([
    { id: 'r1', title: 'Submit Fee Receipt 2026', description: 'Upload your paid fee receipt for the current semester.',
      accept: ['pdf', 'image'], deadline: now + 4 * day, createdBy: MANAGER, createdByName: 'Meera Manager', org: org,
      createdAt: now - 3 * day, assignees: [RIYA, KABIR] },
    { id: 'r2', title: 'Bonafide Certificate for Internship Records', description: 'Submit your latest bonafide certificate (PDF only).',
      accept: ['pdf'], deadline: now + 10 * day, createdBy: ADMIN, createdByName: 'Aarav Admin', org: org,
      createdAt: now - 4 * day, assignees: [RIYA, KABIR] },
    { id: 'r3', title: 'Address Proof Verification', description: 'Submit a recent address proof for the records update.',
      accept: ['pdf', 'image'], deadline: now - 1 * day, createdBy: MANAGER, createdByName: 'Meera Manager', org: org,
      createdAt: now - 8 * day, assignees: [KABIR] }
  ]);

  saveSubs([
    { id: 's1', requestId: 'r1', userEmail: RIYA, userName: 'Riya User', docId: 'd3', docName: 'Fee-Receipt-2026.pdf', docVersion: 1,
      docSize: 150 * KB, docType: 'pdf', submittedAt: now - 1 * day, status: 'Pending', remark: '', reviewedBy: null, reviewedAt: null,
      history: [{ status: 'Pending', by: 'Riya User', at: now - 1 * day, remark: '' }] },
    { id: 's2', requestId: 'r2', userEmail: KABIR, userName: 'Kabir User', docId: 'd7', docName: 'Bonafide-Certificate.pdf', docVersion: 1,
      docSize: 240 * KB, docType: 'pdf', submittedAt: now - 3 * day, status: 'Approved', remark: 'Verified', reviewedBy: 'Aarav Admin', reviewedAt: now - 2 * day,
      history: [{ status: 'Pending', by: 'Kabir User', at: now - 3 * day, remark: '' }, { status: 'Approved', by: 'Aarav Admin', at: now - 2 * day, remark: 'Verified' }] }
  ]);

  const log = (action, detail, user, hoursAgo, scope, subject) =>
    ({ id: uid('g'), time: now - hoursAgo * 3600000, user: user, action: action, detail: detail, scope: scope, subject: subject || user });
  save(KEYS.logs, [
    log('Document Submitted', 'Fee-Receipt-2026.pdf → Submit Fee Receipt 2026', RIYA, 24, 'org'),
    log('Failed Login', 'Attempt for user@vaultsync.com', RIYA, 30, 'org'),
    log('Submission Approved', 'Bonafide-Certificate.pdf (Kabir User)', ADMIN, 48, 'org', KABIR),
    log('Reviewer Download', 'Bonafide-Certificate.pdf', ADMIN, 49, 'org', KABIR),
    log('Document Submitted', 'Bonafide-Certificate.pdf → Bonafide Certificate for Internship Records', KABIR, 72, 'org'),
    log('Request Created', 'Submit Fee Receipt 2026', MANAGER, 72, 'org'),
    log('New Version', 'Project-Proposal.docx → v2', RIYA, 144, 'personal'),
    log('Upload', 'ID-Card-Scan.png → General', RIYA, 72, 'personal')
  ]);
}

// Announcement demo data is seeded separately, so projects that already have demo data
// (created before this feature existed) get the sample announcements without a reset.
function seedAnnouncements() {
  if (localStorage.getItem(KEYS.announcements) || !localStorage.getItem(KEYS.users)) return;
  const day = 86400000, now = Date.now(), ADMIN = 'admin@vaultsync.com';
  const a = (id, title, message, important, createdDaysAgo, expiresInDays) => ({
    id: id, title: title, message: message, important: important,
    createdAt: now - createdDaysAgo * day, updatedAt: now - createdDaysAgo * day,
    expiresAt: expiresInDays === null ? null : now + expiresInDays * day, createdBy: ADMIN
  });
  save(KEYS.announcements, [
    a('a1', 'Fee receipt submission deadline',
      'All students must submit their 2026 fee receipt through the Requests page before the deadline. Submissions after the deadline are marked overdue and need manual approval.', true, 1, 6),
    a('a2', 'Scheduled maintenance this Saturday',
      'VaultSync will be unavailable on Saturday between 2:00 AM and 4:00 AM for routine maintenance. Please finish any uploads before then.', false, 2, 4),
    a('a3', 'Keep your documents up to date',
      'IDs and certificates now show validity dates. Add a "valid till" date when you upload a document and VaultSync will warn you on your dashboard before it expires.', false, 5, null),
    a('a4', 'Welcome to VaultSync',
      'Your vault is private: only you can open your documents. Staff see a file only when you submit it to a request, and every access is recorded in your Activity & Access page.', false, 10, null),
    a('a5', 'Orientation week schedule',
      'Orientation sessions run Monday to Friday in the main auditorium. Bring your ID card. Timetable details were shared by the department.', false, 20, -3)
  ]);
}

/* ---------- logging ----------
   scope 'org'      = organization-level event (requests, submissions, logins, user admin, announcements)
   scope 'personal' = action on someone's own vault; only that person can see it
   subject          = whose data the event is about (so the owner can see who touched it) */
export function addLog(action, detail, who, scope, subject) {
  const logs = getLogs();
  const s = getSession();
  const actor = who || (s ? s.email : 'Guest');
  logs.unshift({
    id: uid('g'), time: Date.now(), user: actor, action: action, detail: detail || '',
    scope: scope || 'personal', subject: subject || actor
  });
  save(KEYS.logs, logs.slice(0, 300));
}

/* ---------- auth ---------- */
export function login(email, password) {
  const u = getUsers().find((x) => x.email.toLowerCase() === String(email).toLowerCase());
  if (!u || u.password !== password) {
    addLog('Failed Login', 'Attempt for ' + (email || 'unknown'), email || 'unknown', 'org');
    return null;
  }
  // "token" is a placeholder; the real backend will issue a signed JWT
  save(KEYS.session, { id: u.id, name: u.name, email: u.email, role: u.role, org: u.org, token: 'demo.' + makeToken() });
  addLog('Login', 'Signed in', u.email, 'org');
  return u;
}
export function logout() {
  addLog('Logout', 'Signed out', null, 'org');
  localStorage.removeItem(KEYS.session);
  notify();
}

/* ---------- who can see what ---------- */
export function roleOf(email) {
  const u = getUsers().find((x) => x.email === email);
  return u ? u.role : 'Guest';
}
export function nameOf(email) {
  const u = getUsers().find((x) => x.email === email);
  return u ? u.name : email;
}
// Personal vault: ONLY the owner. Admin and Manager have no way to browse other people's files.
export function visibleDocs() {
  const s = getSession();
  return s ? getDocs().filter((d) => d.owner === s.email) : [];
}
export function visibleLinks() {
  const s = getSession();
  return s ? getLinks().filter((l) => l.createdBy === s.email) : [];
}
// Requests: Admin sees all (progress overview), Manager sees the ones they created, User sees the ones assigned to them
export function visibleRequests() {
  const s = getSession();
  if (!s) return [];
  return getRequests().filter((r) => {
    if (r.org !== s.org) return false;
    if (s.role === 'Admin') return true;
    if (s.role === 'Manager') return r.createdBy === s.email;
    return r.assignees.indexOf(s.email) !== -1;
  });
}
// Activity: your own actions + anything done to your data + (staff) organization-level events
export function visibleLogs() {
  const s = getSession();
  if (!s) return [];
  return getLogs().filter((l) => {
    if (l.user === s.email || l.subject === s.email) return true;
    if (l.scope !== 'org') return false;
    if (s.role === 'Admin') return true;
    if (s.role === 'Manager') return roleOf(l.user) !== 'Admin';
    return false;
  });
}

/* ---------- request / submission helpers ---------- */
export function submissionFor(reqId, email) {
  return getSubs().find((s) => s.requestId === reqId && s.userEmail === email) || null;
}
// 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn' | 'Overdue' | 'Not submitted'
export function statusFor(req, email) {
  const sub = submissionFor(req.id, email);
  if (sub) return sub.status;
  return Date.now() > req.deadline ? 'Overdue' : 'Not submitted';
}
export function needsAction(status) {
  return ['Not submitted', 'Overdue', 'Rejected', 'Withdrawn'].indexOf(status) !== -1;
}

/* ---------- links & expiry ---------- */
export function linkStatus(l) {
  if (!l.active) return 'revoked';
  if (Date.now() > l.expiry) return 'expired';
  if (l.maxDownloads > 0 && l.downloads >= l.maxDownloads) return 'exhausted';
  return 'active';
}
export function shareUrl(token) {
  return window.location.href.split('#')[0] + '#/share/' + token;
}
// Validity of a document (e.g. ID card, certificate): returns null if it has none
export function expiryInfo(d) {
  if (!d.validTill) return null;
  const n = daysUntil(d.validTill);
  if (n < 0) return { text: 'Expired', cls: 'b-bad', days: n };
  if (n <= 30) return { text: 'Expires in ' + n + 'd', cls: 'b-warn', days: n };
  return { text: fmtDate(d.validTill), cls: '', days: n };
}

/* =====================  ANNOUNCEMENTS  =====================
   Behaves like a small REST API:
     listAnnouncements()            GET    /announcements          any logged-in user
     createAnnouncement(input)      POST   /announcements          Admin only
     updateAnnouncement(id, input)  PUT    /announcements/:id      Admin only
     deleteAnnouncement(id)         DELETE /announcements/:id      Admin only
   Failures throw ApiError(status, message, fieldErrors) with 400 / 401 / 403 / 404.
   The caller is identified from the stored session, and the role is re-checked against the users
   table, so a tampered session cannot grant Admin rights. */
export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields || null;
  }
}

export const ANNOUNCEMENT_LIMITS = { titleMin: 3, titleMax: 100, messageMin: 5, messageMax: 1000 };

function currentUser() {
  const s = getSession();
  const u = s ? getUsers().find((x) => x.email === s.email) : null;
  if (!u) throw new ApiError(401, 'Please log in to continue');
  return u;
}
function requireAdmin() {
  const u = currentUser();
  if (u.role !== 'Admin') throw new ApiError(403, 'Only an Admin can manage announcements');
  return u;
}
function readAnnouncements() {
  const list = load(KEYS.announcements, []);
  return Array.isArray(list) ? list : [];
}

export function isAnnouncementActive(a) {
  return a.expiresAt === null || a.expiresAt === undefined || a.expiresAt >= Date.now();
}

function validateAnnouncement(input, existing) {
  const L = ANNOUNCEMENT_LIMITS;
  const errors = {};
  const src = input && typeof input === 'object' ? input : {};
  const title = String(src.title === undefined || src.title === null ? '' : src.title).trim();
  const message = String(src.message === undefined || src.message === null ? '' : src.message).trim();
  if (title.length < L.titleMin || title.length > L.titleMax) {
    errors.title = 'Title must be ' + L.titleMin + ' to ' + L.titleMax + ' characters';
  }
  if (message.length < L.messageMin || message.length > L.messageMax) {
    errors.message = 'Message must be ' + L.messageMin + ' to ' + L.messageMax + ' characters';
  }
  let expiresAt = null;
  const raw = src.expiresAt;
  if (raw !== null && raw !== undefined && raw !== '') {
    const ts = typeof raw === 'number' ? raw : new Date(String(raw) + 'T23:59:59').getTime();
    if (Number.isNaN(ts)) errors.expiresAt = 'Enter a valid expiry date';
    // A new announcement cannot start already expired; when editing, a past date is allowed
    // so an Admin can take an announcement down immediately without deleting it.
    else if (!existing && ts < Date.now()) errors.expiresAt = 'Expiry date cannot be in the past';
    else expiresAt = ts;
  }
  if (Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields', errors);
  return { title: title, message: message, important: src.important === true, expiresAt: expiresAt };
}

// Newest first. Admin gets everything (including expired, flagged); everyone else gets active ones only.
export function listAnnouncements() {
  const u = currentUser();
  return readAnnouncements()
    .map((a) => Object.assign({}, a, { expired: !isAnnouncementActive(a) }))
    .filter((a) => u.role === 'Admin' || !a.expired)
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Active announcements only, newest first (same for every role): used by the dashboard
export function listActiveAnnouncements(limit) {
  currentUser();
  const list = readAnnouncements().filter(isAnnouncementActive).sort((a, b) => b.createdAt - a.createdAt);
  return typeof limit === 'number' ? list.slice(0, limit) : list;
}

export function createAnnouncement(input) {
  const admin = requireAdmin();
  const data = validateAnnouncement(input, null);
  const now = Date.now();
  const item = Object.assign({ id: uid('a'), createdAt: now, updatedAt: now, createdBy: admin.email }, data);
  const list = readAnnouncements();
  list.push(item);
  save(KEYS.announcements, list);
  addLog('Announcement Posted', item.title, admin.email, 'org');
  return item;
}

export function updateAnnouncement(id, input) {
  const admin = requireAdmin();
  const list = readAnnouncements();
  const existing = list.find((a) => a.id === id);
  if (!existing) throw new ApiError(404, 'Announcement not found');
  const data = validateAnnouncement(input, existing);
  Object.assign(existing, data, { updatedAt: Date.now() });
  save(KEYS.announcements, list);
  addLog('Announcement Updated', existing.title, admin.email, 'org');
  return existing;
}

export function deleteAnnouncement(id) {
  const admin = requireAdmin();
  const list = readAnnouncements();
  const existing = list.find((a) => a.id === id);
  if (!existing) throw new ApiError(404, 'Announcement not found');
  save(KEYS.announcements, list.filter((a) => a.id !== id));
  addLog('Announcement Deleted', existing.title, admin.email, 'org');
}

seed();
seedAnnouncements();
