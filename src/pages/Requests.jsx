import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import { fmtDate, fmtDateTime, fmtSize, daysUntil, endOfDay, toDateInput } from '../lib/format.js';
import { demoDownload } from '../lib/download.js';
import Modal from '../components/Modal.jsx';
import { StatusBadge } from '../components/Badges.jsx';
import { useToast } from '../components/Toast.jsx';

/* Requests page.
   User view : see requests assigned to me, submit ONE chosen document, withdraw if not yet approved.
   Staff view: create requests, review submissions (approve / reject with a reason).
   Reviewers only ever see documents that were explicitly submitted to their request. */

const TYPE_LABEL = { pdf: 'PDF', docx: 'DOCX', image: 'Image' };
const acceptText = (req) => req.accept.map((t) => TYPE_LABEL[t]).join(', ');

function DeadlineBadge({ req }) {
  const n = daysUntil(req.deadline);
  if (n < 0) return <span className="badge b-bad">Overdue</span>;
  if (n === 0) return <span className="badge b-warn">Due today</span>;
  if (n <= 2) return <span className="badge b-warn">Due in {n}d</span>;
  return <span className="badge">{fmtDate(req.deadline)}</span>;
}

/* =====================  USER VIEW  ===================== */
function SubmitModal({ reqId, onClose }) {
  const S = VS.getSession();
  const toast = useToast();
  const req = VS.getRequests().find((r) => r.id === reqId);
  const docs = VS.visibleDocs().filter((d) => req.accept.indexOf(d.type) !== -1);
  const [docId, setDocId] = useState(docs.length ? docs[0].id : '');

  function onSubmit(e) {
    e.preventDefault();
    const d = VS.getDocs().find((x) => x.id === docId);
    if (!d) return;
    const subs = VS.getSubs();
    let sub = subs.find((s) => s.requestId === req.id && s.userEmail === S.email);
    if (!sub) {
      sub = { id: VS.uid('s'), requestId: req.id, userEmail: S.email, userName: S.name, history: [] };
      subs.push(sub);
    }
    Object.assign(sub, {
      docId: d.id, docName: d.name, docVersion: d.currentVersion, docSize: d.size, docType: d.type,
      submittedAt: Date.now(), status: 'Pending', remark: '', reviewedBy: null, reviewedAt: null
    });
    sub.history.push({ status: 'Pending', by: S.name, at: Date.now(), remark: '' });
    VS.saveSubs(subs);
    VS.addLog('Document Submitted', d.name + ' → ' + req.title, S.email, 'org');
    toast('Submitted for review');
    onClose();
  }

  return (
    <Modal title="Submit a document" onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <strong>{req.title}</strong>
        <div className="muted small">Accepts: {acceptText(req)} · Requested by {req.createdByName}</div>
      </div>
      {docs.length ? (
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="subDoc">Choose a document from your vault</label>
            <select id="subDoc" value={docId} onChange={(e) => setDocId(e.target.value)}>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.name} (v{d.currentVersion}, {fmtSize(d.size)})</option>)}
            </select>
          </div>
          <div className="note" style={{ marginBottom: 0 }}>Only this file is shared with the requester. Your other documents stay private.</div>
          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit</button>
          </div>
        </form>
      ) : (
        <div className="empty">
          You have no document in your vault that matches this request.<br />
          <Link to="/documents?upload=1">Upload one to My Vault</Link>, then come back.
        </div>
      )}
    </Modal>
  );
}

function UserView() {
  const S = VS.getSession();
  const toast = useToast();
  const [submitId, setSubmitId] = useState(null);
  const reqs = VS.visibleRequests().sort((a, b) => a.deadline - b.deadline);

  function withdraw(reqId) {
    if (!window.confirm('Withdraw this submission? The requester will no longer be able to see the document.')) return;
    const req = VS.getRequests().find((r) => r.id === reqId);
    const subs = VS.getSubs();
    const sub = subs.find((s) => s.requestId === reqId && s.userEmail === S.email);
    sub.status = 'Withdrawn';
    sub.history.push({ status: 'Withdrawn', by: S.name, at: Date.now(), remark: '' });
    VS.saveSubs(subs);
    VS.addLog('Submission Withdrawn', sub.docName + ' (' + req.title + ')', S.email, 'org');
    toast('Submission withdrawn');
  }

  return (
    <>
      <div className="note">
        🔒 Your vault stays private. For each request you choose <strong>one document</strong> to submit; only that file
        (that version) becomes visible to the requester, and you can withdraw it before it is approved.
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Request</th><th>Requested by</th><th>Deadline</th><th>Accepts</th><th>My status</th><th>Action</th></tr></thead>
            <tbody>
              {reqs.map((r) => {
                const sub = VS.submissionFor(r.id, S.email);
                const st = VS.statusFor(r, S.email);
                return (
                  <tr key={r.id}>
                    <td><div className="fname">{r.title}</div><div className="muted small">{r.description}</div></td>
                    <td>{r.createdByName}</td>
                    <td><DeadlineBadge req={r} /></td>
                    <td>{acceptText(r)}</td>
                    <td>
                      <StatusBadge status={st} />
                      {sub && sub.status === 'Pending' && <div className="muted small">Submitted: {sub.docName} (v{sub.docVersion})</div>}
                      {sub && sub.status === 'Approved' && <div className="muted small">Approved by {sub.reviewedBy}</div>}
                      {sub && sub.status === 'Rejected' && <div className="muted small">Reason: {sub.remark}</div>}
                    </td>
                    <td className="actions">
                      {VS.needsAction(st) && <button type="button" className="btn btn-sm btn-primary" onClick={() => setSubmitId(r.id)}>{st === 'Rejected' ? 'Resubmit' : 'Submit'}</button>}
                      {st === 'Pending' && <button type="button" className="btn btn-sm btn-danger" onClick={() => withdraw(r.id)}>Withdraw</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!reqs.length && <div className="empty">No requests have been assigned to you.</div>}
      </div>
      {submitId && <SubmitModal reqId={submitId} onClose={() => setSubmitId(null)} />}
    </>
  );
}

/* =====================  STAFF VIEW  ===================== */
function CreateModal({ onClose }) {
  const S = VS.getSession();
  const toast = useToast();
  const members = VS.getUsers().filter((u) => u.org === S.org && u.role === 'User');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [deadline, setDeadline] = useState(toDateInput(Date.now() + 7 * 86400000));
  const [accept, setAccept] = useState({ pdf: true, docx: true, image: true });
  const [assignees, setAssignees] = useState([]);

  const toggleAssignee = (email) => setAssignees((a) => (a.indexOf(email) === -1 ? a.concat(email) : a.filter((x) => x !== email)));

  function onSubmit(e) {
    e.preventDefault();
    const types = Object.keys(accept).filter((k) => accept[k]);
    if (title.trim().length < 3) { toast('Enter a title', 'error'); return; }
    if (!deadline) { toast('Pick a deadline', 'error'); return; }
    if (!types.length) { toast('Choose at least one file type', 'error'); return; }
    if (!assignees.length) { toast('Select at least one person', 'error'); return; }
    const reqs = VS.getRequests();
    reqs.push({
      id: VS.uid('r'), title: title.trim(), description: desc.trim() || 'Please submit the requested document.',
      accept: types, deadline: endOfDay(deadline),
      createdBy: S.email, createdByName: S.name, org: S.org, createdAt: Date.now(), assignees: assignees
    });
    VS.saveRequests(reqs);
    VS.addLog('Request Created', title.trim() + ' (' + assignees.length + ' people)', S.email, 'org');
    toast('Request created');
    onClose();
  }

  return (
    <Modal title="New document request" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="field"><label htmlFor="rqTitle">Title</label>
          <input type="text" id="rqTitle" placeholder="e.g. Submit Fee Receipt 2026" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="field"><label htmlFor="rqDesc">What do you need?</label>
          <input type="text" id="rqDesc" placeholder="Short instructions for the person submitting" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="row">
          <div className="field"><label htmlFor="rqDeadline">Deadline</label>
            <input type="date" id="rqDeadline" min={toDateInput(Date.now())} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          <div className="field">
            <label>Accepted file types</label>
            {Object.keys(TYPE_LABEL).map((k) => (
              <label key={k} className="checkline" style={{ display: 'inline-flex', marginRight: 10 }}>
                <input type="checkbox" checked={accept[k]} onChange={(e) => setAccept({ ...accept, [k]: e.target.checked })} /> {TYPE_LABEL[k]}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Assign to</label>
          <label className="checkline">
            <input type="checkbox" checked={members.length > 0 && assignees.length === members.length}
              onChange={(e) => setAssignees(e.target.checked ? members.map((u) => u.email) : [])} /> Select all
          </label>
          <div className="assignee-list">
            {members.length ? members.map((u) => (
              <label key={u.email} className="checkline" style={{ display: 'flex' }}>
                <input type="checkbox" checked={assignees.indexOf(u.email) !== -1} onChange={() => toggleAssignee(u.email)} />
                {u.name} <span className="muted small">{u.email}</span>
              </label>
            )) : <div className="muted">No members to assign yet.</div>}
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Create request</button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewModal({ reqId, onClose }) {
  useData();
  const S = VS.getSession();
  const toast = useToast();
  const req = VS.getRequests().find((r) => r.id === reqId);
  const review = req.createdBy === S.email;     // even Admin cannot open files submitted to someone else's request

  function act(kind, email) {
    const subs = VS.getSubs();
    const sub = subs.find((s) => s.requestId === req.id && s.userEmail === email);
    if (!review || !sub) return;
    if (kind === 'download') {
      demoDownload(sub.docName, 'Submitted by: ' + sub.userName + ' for "' + req.title + '"');
      VS.addLog('Reviewer Download', sub.docName, S.email, 'org', email);
      toast('Download started (demo file). This access is recorded.');
    } else if (kind === 'approve') {
      sub.status = 'Approved'; sub.remark = 'Verified'; sub.reviewedBy = S.name; sub.reviewedAt = Date.now();
      sub.history.push({ status: 'Approved', by: S.name, at: Date.now(), remark: 'Verified' });
      VS.saveSubs(subs);
      VS.addLog('Submission Approved', sub.docName + ' (' + sub.userName + ')', S.email, 'org', email);
      toast('Approved');
    } else if (kind === 'reject') {
      const reason = (window.prompt('Reason for rejection (the person will see this):') || '').trim();
      if (!reason) { toast('A reason is required to reject', 'error'); return; }
      sub.status = 'Rejected'; sub.remark = reason; sub.reviewedBy = S.name; sub.reviewedAt = Date.now();
      sub.history.push({ status: 'Rejected', by: S.name, at: Date.now(), remark: reason });
      VS.saveSubs(subs);
      VS.addLog('Submission Rejected', sub.docName + ' (' + sub.userName + '): ' + reason, S.email, 'org', email);
      toast('Rejected with reason');
    }
  }

  return (
    <Modal title={req.title} onClose={onClose} wide>
      <div className="muted" style={{ marginBottom: 12 }}>
        {review
          ? 'Approve or reject each submission. Every view and download is recorded and visible to the document owner.'
          : 'Progress only. Submitted documents are visible just to the person who created this request.'}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Person</th><th>Status</th><th>Submitted document</th><th>Actions</th></tr></thead>
          <tbody>
            {req.assignees.map((email) => {
              const sub = VS.submissionFor(req.id, email);
              const st = VS.statusFor(req, email);
              const showDoc = sub && (sub.status === 'Pending' || sub.status === 'Approved') && review;
              return (
                <tr key={email}>
                  <td><strong>{VS.nameOf(email)}</strong></td>
                  <td><StatusBadge status={st} /></td>
                  <td>
                    {showDoc ? (
                      <>
                        <div className="fname">{sub.docName}</div>
                        <div className="muted small">v{sub.docVersion} · {fmtSize(sub.docSize)} · {fmtDateTime(sub.submittedAt)}</div>
                      </>
                    ) : (sub && sub.remark ? <span className="muted small">{sub.remark}</span> : <span className="muted">-</span>)}
                  </td>
                  <td className="actions">
                    {showDoc && <button type="button" className="btn btn-sm" onClick={() => act('download', email)}>Download</button>}
                    {showDoc && sub.status === 'Pending' && <button type="button" className="btn btn-sm btn-primary" onClick={() => act('approve', email)}>Approve</button>}
                    {showDoc && sub.status === 'Pending' && <button type="button" className="btn btn-sm btn-danger" onClick={() => act('reject', email)}>Reject</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function StaffView() {
  const S = VS.getSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const reqs = VS.visibleRequests().sort((a, b) => b.createdAt - a.createdAt);
  const allSubs = VS.getSubs();

  return (
    <>
      <div className="toolbar">
        <div className="grow muted">
          {S.role === 'Admin'
            ? 'You can see progress on every request. You can open submitted documents only for requests you created.'
            : 'Requests you created. You only see documents people choose to submit to them.'}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ New request</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Request</th><th>Created by</th><th>Deadline</th><th>Assigned</th><th>Awaiting review</th><th>Approved</th><th>Not submitted</th><th></th></tr></thead>
            <tbody>
              {reqs.map((r) => {
                const subs = allSubs.filter((s) => s.requestId === r.id);
                const pending = subs.filter((s) => s.status === 'Pending').length;
                const approved = subs.filter((s) => s.status === 'Approved').length;
                return (
                  <tr key={r.id}>
                    <td><div className="fname">{r.title}</div><div className="muted small">Accepts: {acceptText(r)}</div></td>
                    <td>{r.createdByName}</td>
                    <td><DeadlineBadge req={r} /></td>
                    <td>{r.assignees.length}</td>
                    <td>{pending ? <span className="badge b-warn">{pending}</span> : '0'}</td>
                    <td>{approved}</td>
                    <td>{r.assignees.length - pending - approved}</td>
                    <td className="actions"><button type="button" className="btn btn-sm" onClick={() => setReviewId(r.id)}>{r.createdBy === S.email ? 'Review' : 'View progress'}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!reqs.length && <div className="empty">No requests yet. Create one to start collecting documents.</div>}
      </div>
      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} />}
      {reviewId && <ReviewModal reqId={reviewId} onClose={() => setReviewId(null)} />}
    </>
  );
}

export default function Requests() {
  useData();
  const S = VS.getSession();
  return S.role === 'User' ? <UserView /> : <StaffView />;
}
