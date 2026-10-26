import { Link } from 'react-router-dom';
import * as VS from '../lib/store.js';
import { useData } from '../lib/hooks.js';
import { fmtDate, fmtDateTime, fmtSize, daysUntil } from '../lib/format.js';
import AnnouncementItem from '../components/AnnouncementItem.jsx';

/* Dashboard: different content for members (Users) and staff (Manager / Admin).
   Nobody sees another person's private documents here: staff see request progress only. */

function Stat({ label, value, to, note }) {
  return (
    <Link className="card stat stat-link" to={to}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note && <div className="muted small">{note}</div>}
    </Link>
  );
}

function Row({ left, right }) {
  return <li><span>{left}</span><span>{right}</span></li>;
}

export default function Dashboard() {
  useData();
  const S = VS.getSession();
  const isStaff = S.role !== 'User';
  const myDocs = VS.visibleDocs();
  const reqs = VS.visibleRequests();
  const subs = VS.getSubs();
  const announcements = VS.listActiveAnnouncements(3);

  let welcomeSub, stats, leftTitle, rightTitle, leftRows, rightRows;

  if (!isStaff) {
    /* ---------- member view ---------- */
    welcomeSub = 'Your private vault and the requests assigned to you';
    const statuses = reqs.map((r) => ({ r: r, st: VS.statusFor(r, S.email) }));
    const todo = statuses.filter((x) => VS.needsAction(x.st)).sort((a, b) => a.r.deadline - b.r.deadline);
    const expiring = myDocs.filter((d) => d.validTill && daysUntil(d.validTill) <= 30);
    stats = [
      <Stat key="1" label="Requests to do" value={todo.length} to="/requests" note={todo.some((x) => x.st === 'Overdue') ? 'Some are overdue' : ''} />,
      <Stat key="2" label="Awaiting review" value={statuses.filter((x) => x.st === 'Pending').length} to="/requests" />,
      <Stat key="3" label="Approved" value={statuses.filter((x) => x.st === 'Approved').length} to="/requests" />,
      <Stat key="4" label="Documents expiring soon" value={expiring.length} to="/documents" note="Within 30 days or expired" />
    ];

    leftTitle = 'Requests waiting for you';
    leftRows = todo.length ? todo.slice(0, 5).map((x) => (
      <Row key={x.r.id}
        left={<><strong>{x.r.title}</strong><br /><span className="muted small">from {x.r.createdByName}</span></>}
        right={x.st === 'Overdue' ? <span className="badge b-bad">Overdue</span> : <span className="badge">{fmtDate(x.r.deadline)}</span>} />
    )) : <li className="muted">Nothing pending. You are all caught up.</li>;

    rightTitle = 'Document validity';
    const withValidity = myDocs.filter((d) => d.validTill).sort((a, b) => a.validTill - b.validTill);
    rightRows = withValidity.length ? withValidity.slice(0, 5).map((d) => {
      const info = VS.expiryInfo(d);
      return <Row key={d.id} left={<strong>{d.name}</strong>} right={<span className={'badge ' + info.cls}>{info.text}</span>} />;
    }) : <li className="muted">Add a "valid till" date when uploading to get expiry warnings.</li>;
  } else {
    /* ---------- staff view ---------- */
    const isAdmin = S.role === 'Admin';
    welcomeSub = isAdmin
      ? 'Organization overview. You manage accounts and requests; personal vaults stay private.'
      : 'Your requests and review queue';
    const mine = reqs.filter((r) => r.createdBy === S.email);
    const scope = isAdmin ? reqs : mine;                       // Admin: progress of every request
    const scopeIds = scope.map((r) => r.id);
    const mineIds = mine.map((r) => r.id);
    const pendingMine = subs.filter((s) => mineIds.indexOf(s.requestId) !== -1 && s.status === 'Pending');
    const pendingScope = subs.filter((s) => scopeIds.indexOf(s.requestId) !== -1 && s.status === 'Pending');
    const approvedScope = subs.filter((s) => scopeIds.indexOf(s.requestId) !== -1 && s.status === 'Approved');

    // Overdue = deadline passed and the person has no submission under review or approved
    const overdue = [];
    scope.forEach((r) => {
      if (Date.now() <= r.deadline) return;
      r.assignees.forEach((email) => {
        if (VS.needsAction(VS.statusFor(r, email))) overdue.push({ r: r, email: email });
      });
    });

    stats = [
      isAdmin
        ? <Stat key="1" label="Members" value={VS.getUsers().filter((u) => u.org === S.org).length} to="/users" />
        : <Stat key="1" label="My requests" value={mine.length} to="/requests" />,
      <Stat key="2" label={isAdmin ? 'Awaiting review (all)' : 'Awaiting my review'} value={isAdmin ? pendingScope.length : pendingMine.length} to="/requests" />,
      <Stat key="3" label="Approved" value={approvedScope.length} to="/requests" />,
      <Stat key="4" label="Overdue submissions" value={overdue.length} to="/requests" />
    ];

    leftTitle = 'Needs your review';
    leftRows = pendingMine.length ? pendingMine.slice(0, 5).map((s) => {
      const r = mine.find((x) => x.id === s.requestId);
      return (
        <Row key={s.id}
          left={<><strong>{s.userName}</strong><br /><span className="muted small">{r.title}</span></>}
          right={<span className="muted small">{fmtDate(s.submittedAt)}</span>} />
      );
    }) : <li className="muted">No submissions waiting for your review.</li>;

    rightTitle = 'Overdue submissions';
    rightRows = overdue.length ? overdue.slice(0, 5).map((o) => (
      <Row key={o.r.id + o.email}
        left={<><strong>{VS.nameOf(o.email)}</strong><br /><span className="muted small">{o.r.title}</span></>}
        right={<span className="badge b-bad">{Math.abs(daysUntil(o.r.deadline))}d late</span>} />
    )) : <li className="muted">Nobody is overdue.</li>;
  }

  // Own vault storage (counts every stored version)
  const used = myDocs.reduce((sum, d) => sum + d.versions.reduce((s, v) => s + v.size, 0), 0);
  const pct = Math.min(100, (used / VS.QUOTA) * 100);
  const logs = VS.visibleLogs().slice(0, 6);

  return (
    <>
      <div className="welcome">
        <div>
          <h2>Welcome back, {S.name.split(' ')[0]}</h2>
          <div className="muted">{welcomeSub}</div>
        </div>
        <Link className="btn btn-primary" to="/documents?upload=1">+ Upload to my vault</Link>
      </div>

      <div className="grid-4">{stats}</div>

      <div className="card" style={{ marginBottom: 16 }} id="dashboardAnnouncements">
        <div className="card-head">
          <h2>Announcements</h2>
          <Link className="btn btn-sm" to="/announcements">View All</Link>
        </div>
        {announcements.length ? (
          <div className="ann-list">
            {announcements.map((a) => <AnnouncementItem key={a.id} a={a} compact />)}
          </div>
        ) : <div className="muted">No announcements right now.</div>}
      </div>

      <div className="grid-2">
        <div className="card"><h2>{leftTitle}</h2><ul className="simple-list">{leftRows}</ul></div>
        <div className="card"><h2>{rightTitle}</h2><ul className="simple-list">{rightRows}</ul></div>
      </div>

      <div className="grid-2">
        <div className="card stat">
          <div className="label">My vault storage</div>
          <div className="value">{fmtSize(used)}</div>
          <div className="bar"><div style={{ width: pct.toFixed(1) + '%' }} /></div>
          <div className="muted small">{pct.toFixed(1)}% of {fmtSize(VS.QUOTA)} · {myDocs.length} documents</div>
        </div>
        <div className="card">
          <h2>Recent activity</h2>
          <ul className="timeline">
            {logs.length ? logs.map((l) => (
              <li key={l.id}>
                <span className="dot" />
                <div>
                  <strong>{l.action}</strong> {l.detail}
                  <small>{VS.nameOf(l.user)} · {fmtDateTime(l.time)}</small>
                </div>
              </li>
            )) : <li className="muted">No activity yet.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
