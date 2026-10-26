import { useState } from 'react';
import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import { fmtDateTime } from '../lib/format.js';

/* Activity & Access: audit trail of uploads, submissions, reviews, sharing, logins, announcements and failed attempts.
   Each role only sees what the privacy rules allow. */

function badgeClass(action) {
  if (action.indexOf('Failed') === 0 || action === 'Submission Rejected' || action === 'Announcement Deleted') return 'b-bad';
  if (['Upload', 'New Version', 'Submission Approved', 'Document Submitted', 'Announcement Posted'].indexOf(action) !== -1) return 'b-ok';
  if (action.indexOf('Share') === 0 || ['Revoke Link', 'Reviewer Download', 'Submission Withdrawn', 'Announcement Updated'].indexOf(action) !== -1) return 'b-warn';
  return '';
}

export default function Activity() {
  useData();
  const S = VS.getSession();
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const all = VS.visibleLogs();
  const actions = Array.from(new Set(all.map((l) => l.action))).sort();
  const needle = q.trim().toLowerCase();
  const rows = all.filter((l) => {
    if (action && l.action !== action) return false;
    if (needle && (l.user + ' ' + VS.nameOf(l.user) + ' ' + l.detail).toLowerCase().indexOf(needle) === -1) return false;
    return true;
  }).slice(0, 100);

  const note = S.role === 'Admin'
    ? 'You see organization events (logins, failed logins, requests, reviews, announcements, user changes) plus everything about your own vault. Other people\'s private vault actions are never shown to you.'
    : S.role === 'Manager'
      ? 'You see request and review events for your team, plus everything about your own vault. Other people\'s private vault actions are not shown.'
      : 'This is your personal trail: what you did, and who accessed your documents (reviewers or people using your share links).';

  return (
    <>
      <div className="note">{note}</div>
      <div className="toolbar">
        <input type="text" className="grow" placeholder="Search by user or detail..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className="muted">{fmtDateTime(l.time)}</td>
                  <td><strong>{VS.nameOf(l.user)}</strong><div className="muted small">{VS.roleOf(l.user)}</div></td>
                  <td><span className={'badge ' + badgeClass(l.action)}>{l.action}</span></td>
                  <td>
                    {l.detail}
                    {l.subject && l.subject !== l.user && <div className="muted small">Document owner: {VS.nameOf(l.subject)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="empty">No activity found.</div>}
      </div>
    </>
  );
}
